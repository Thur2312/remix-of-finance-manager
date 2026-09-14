-- Item 5 do pedido: estado de sync resumível. Uma linha por
-- (connection_id, resource) — "resource" existe já pensando em orders/
-- settlements/products, mas só "orders" é de fato persistido nesta leva
-- (ver tiktok-sync/index.ts — settlements/products ficam pra quando o
-- shape real da API for confirmado contra sandbox).
create table if not exists public.tiktok_sync_state (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  resource text not null check (resource in ('orders', 'settlements', 'products')),
  -- null = não tem paginação em andamento; próxima invocação começa uma
  -- passada nova a partir de window_since. Não-null = retomar dali.
  cursor text,
  -- janela incremental: só busca o que mudou desde aqui. Avança pra "agora"
  -- quando uma passada completa termina (cursor volta a null).
  window_since timestamptz not null,
  status text not null default 'idle' check (status in ('idle', 'running', 'error')),
  attempts int not null default 0,
  last_error text,
  updated_at timestamptz not null default now(),
  unique (connection_id, resource)
);

-- RLS sem nenhuma policy — só service_role (mesmo padrão de oauth_state).
-- Estado de sync não é algo que o client precise ler ou escrever.
alter table public.tiktok_sync_state enable row level security;

-- ── Claim atômico: SELECT FOR UPDATE SKIP LOCKED + marca 'running' ────────
-- Mesmo padrão de claim_tiktok_token_refresh (migration 20260914120000) —
-- trava a linha só pelo tempo desta função (sem rede aqui dentro), libera
-- assim que volta. SKIP LOCKED: se outra invocação já está processando essa
-- (connection, resource), esta desiste em vez de esperar ou duplicar
-- trabalho.
create or replace function public.claim_tiktok_sync(
  p_connection_id uuid,
  p_resource text
)
returns table (id uuid, cursor text, window_since timestamptz, attempts int)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id uuid;
begin
  -- `status <> 'running'` sozinho não bastaria: se uma invocação morrer no
  -- meio (crash, kill do processo) sem nunca voltar pra 'idle'/'error', a
  -- linha ficaria "running" pra sempre e nenhuma invocação futura a
  -- reivindicaria de novo. `updated_at` funciona como HEARTBEAT — a Edge
  -- Function atualiza ele a cada página processada (ver tiktok-sync/
  -- index.ts); se passou de 10 minutos sem heartbeat, assume que quem
  -- reivindicou morreu e libera pra reivindicar de novo.
  select s.id into v_id
  from public.tiktok_sync_state s
  where s.connection_id = p_connection_id
    and s.resource = p_resource
    and (s.status <> 'running' or s.updated_at < now() - interval '10 minutes')
  for update skip locked;

  if v_id is null then
    return; -- nada pra reivindicar: não existe linha, ou já está rodando em outra invocação
  end if;

  update public.tiktok_sync_state
  set status = 'running', updated_at = now()
  where public.tiktok_sync_state.id = v_id;

  return query
    select s.id, s.cursor, s.window_since, s.attempts
    from public.tiktok_sync_state s
    where s.id = v_id;
end;
$function$;

revoke all on function public.claim_tiktok_sync(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_tiktok_sync(uuid, text) to service_role;

-- ── Agendamento — mesmo padrão de trigger_tiktok_token_refresh ────────────
create or replace function public.trigger_tiktok_sync()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  supabase_url text;
  anon_key text;
  cron_secret text;
  conn record;
begin
  select decrypted_secret into supabase_url from vault.decrypted_secrets where name = 'supabase_url';
  select decrypted_secret into anon_key from vault.decrypted_secrets where name = 'anon_key';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'integration_sync_cron_secret';

  if supabase_url is null or anon_key is null or cron_secret is null then
    raise warning 'trigger_tiktok_sync: secrets do vault ausentes';
    return;
  end if;

  for conn in
    select id from public.integration_connections
    where provider = 'tiktok' and status = 'connected'
  loop
    perform net.http_post(
      url := supabase_url || '/functions/v1/tiktok-sync',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('connection_id', conn.id, 'cron_secret', cron_secret)
    );
  end loop;
end;
$function$;

revoke all on function public.trigger_tiktok_sync() from public, anon, authenticated;

-- A cada 3 min — cada invocação processa um número limitado de páginas
-- (MAX_PAGES_PER_INVOCATION na Edge Function) e devolve; se sobrou cursor,
-- a PRÓXIMA batida do cron (não um auto-agendamento em cascata) continua de
-- onde parou. Mais simples e mais seguro que a function se re-agendar
-- sozinha (sem risco de um bug virar loop infinito de invocações).
select cron.schedule(
  'tiktok-sync-every-3-min',
  '*/3 * * * *',
  $$select public.trigger_tiktok_sync();$$
);

-- ── Reconciliação periódica (janela de 48h) ───────────────────────────────
-- Sync incremental (window_since avançando) pode perder uma atualização
-- tardia: um pedido criado ANTES da janela atual, mas que muda de status
-- (cancelamento, devolução) DEPOIS que a janela já passou por ele. Em vez
-- de rastrear isso, é mais simples e mais robusto "puxar a janela de volta"
-- periodicamente — não precisa de tabela nova nem de lógica extra na Edge
-- Function: o PRÓXIMO tick normal do sync (já agendado acima, a cada 3 min)
-- automaticamente busca esse intervalo de novo, como se fosse incremental
-- de verdade. `where status = 'idle'` — não mexe numa linha que uma
-- invocação está processando agora, pra não competir com ela.
create or replace function public.reconcile_tiktok_orders_window()
returns void
language sql
security definer
set search_path = public
as $function$
  update public.tiktok_sync_state
  set window_since = least(window_since, now() - interval '48 hours'),
      updated_at = now()
  where resource = 'orders' and status = 'idle';
$function$;

revoke all on function public.reconcile_tiktok_orders_window() from public, anon, authenticated;

select cron.schedule(
  'tiktok-reconcile-orders-48h',
  '0 */6 * * *', -- a cada 6 horas
  $$select public.reconcile_tiktok_orders_window();$$
);
