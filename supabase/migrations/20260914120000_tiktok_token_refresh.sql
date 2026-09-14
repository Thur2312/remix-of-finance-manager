-- Item 2 do pedido: refresh proativo de token TikTok + trava de concorrência
-- + tokens inacessíveis ao client. NÃO cria tabela nova — integration_
-- connections já tem shop_id (external_shop_id), access_token, refresh_
-- token, expires_at (token_expires_at/refresh_token_expires_at), scopes e
-- timestamps, e o unique constraint (user_id, provider, external_shop_id)
-- já suporta multi-loja (migration 20260826160000).

-- ── 1) Tokens inacessíveis ao client (privilégio por COLUNA, não RLS) ──────
-- RLS filtra LINHA; aqui queremos bloquear só as colunas sensíveis, sem
-- quebrar os 6+ hooks do frontend que já leem status/shop_name/company_id
-- dessa mesma tabela (nenhum deles seleciona token hoje — conferido).
revoke select (access_token, refresh_token, token_expires_at, refresh_token_expires_at, scopes)
  on public.integration_connections from authenticated, anon;

-- ── 2) Tokens só graváveis por service_role (mesmo padrão de
--       protect_paywall_columns em profiles.plan/trial_ends_at) ───────────
create or replace function public.protect_integration_token_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'UPDATE' then
      new.access_token := old.access_token;
      new.refresh_token := old.refresh_token;
      new.token_expires_at := old.token_expires_at;
      new.refresh_token_expires_at := old.refresh_token_expires_at;
      new.scopes := old.scopes;
    else -- INSERT: client não pode criar linha já com token
      new.access_token := null;
      new.refresh_token := null;
      new.token_expires_at := null;
      new.refresh_token_expires_at := null;
      new.scopes := null;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_integration_token_columns_trigger on public.integration_connections;
create trigger protect_integration_token_columns_trigger
  before insert or update on public.integration_connections
  for each row
  execute function public.protect_integration_token_columns();

-- ── 3) Claim atômico pra refresh — SELECT FOR UPDATE SKIP LOCKED ──────────
-- Trava a linha só pelo tempo desta função (sem chamada de rede aqui
-- dentro) — quem chama pega o refresh_token ainda cifrado, a trava já foi
-- liberada quando o resultado volta. SKIP LOCKED: se outra invocação já
-- está processando essa mesma conexão, esta desiste em vez de esperar.
create or replace function public.claim_tiktok_token_refresh(
  p_connection_id uuid,
  p_margin_seconds int default 300
)
returns table (id uuid, refresh_token text, external_shop_id text)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
    select c.id, c.refresh_token, c.external_shop_id
    from public.integration_connections c
    where c.id = p_connection_id
      and c.provider = 'tiktok'
      and c.status = 'connected'
      and c.refresh_token is not null
      and c.token_expires_at < now() + make_interval(secs => p_margin_seconds)
    for update skip locked;
end;
$function$;

-- só service_role chama (a Edge Function) — nunca o client direto.
revoke all on function public.claim_tiktok_token_refresh(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_tiktok_token_refresh(uuid, int) to service_role;

-- ── 4) Agendamento: pg_cron, MESMO padrão exato de trigger_auto_sync
--       (migration 20260829150000_trigger_auto_sync_versioned.sql) — vault
--       pros secrets, Authorization: Bearer <anon_key> (satisfaz o gateway
--       de JWT da própria Supabase), cron_secret vai no BODY e é quem a
--       Edge Function confere de fato (reusa o mesmo
--       integration_sync_cron_secret — não crio segredo novo só pra isto).
--       A cada 5 min, varre conexões TikTok a ≤10 min de expirar e dispara
--       UMA invocação por conexão; a Edge Function decide se ainda vale a
--       pena (o claim pode vir vazio se outra invocação já refreshed).
create or replace function public.trigger_tiktok_token_refresh()
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
  select decrypted_secret into supabase_url
    from vault.decrypted_secrets where name = 'supabase_url';
  select decrypted_secret into anon_key
    from vault.decrypted_secrets where name = 'anon_key';
  select decrypted_secret into cron_secret
    from vault.decrypted_secrets where name = 'integration_sync_cron_secret';

  if supabase_url is null or anon_key is null or cron_secret is null then
    raise warning 'trigger_tiktok_token_refresh: secrets do vault ausentes';
    return;
  end if;

  for conn in
    select id from public.integration_connections
    where provider = 'tiktok'
      and status = 'connected'
      and refresh_token is not null
      and token_expires_at < now() + interval '10 minutes'
  loop
    perform net.http_post(
      url := supabase_url || '/functions/v1/tiktok-token-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('connection_id', conn.id, 'cron_secret', cron_secret)
    );
  end loop;
end;
$function$;

revoke all on function public.trigger_tiktok_token_refresh() from public, anon, authenticated;

select cron.schedule(
  'tiktok-token-refresh-every-5-min',
  '*/5 * * * *',
  $$select public.trigger_tiktok_token_refresh();$$
);
