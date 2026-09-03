-- Push notifications reais (Web Push) pra vendas novas — "ativar notificações"
-- no /vendas. Guarda a inscrição PushSubscription de cada dispositivo e
-- dispara o envio via trigger em sale_events (mesmo padrão de
-- trigger_finn_alerts: security definer + net.http_post fire-and-forget).

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- O client só gerencia a própria inscrição (criar/apagar ao ativar/desativar).
-- Leitura pra enviar o push é sempre via service_role na edge function.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

-- Upsert por `endpoint` (reativar depois de já ter ativado antes) precisa de
-- UPDATE além de INSERT — restrito à própria linha, como as demais policies.
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

-- ── Trigger: nova linha em sale_events → dispara o envio do push ────────────
-- Mesmo padrão do trigger_finn_alerts (20260902170000_finn_alerts_cron.sql):
-- function security definer lê os segredos do vault e faz um net.http_post
-- fire-and-forget pra edge function, validada pelo mesmo segredo do
-- auto-sync (integration_sync_cron_secret). Dispara por linha, então cobre
-- tanto o webhook do Mercado Livre (instantâneo) quanto o sync da Shopee
-- (a cada 15 min) — em ambos os casos só quando o pedido é realmente novo,
-- já que sale_events tem unique(integration_id, external_order_id).
create or replace function public.trigger_send_sale_push()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  supabase_url text;
  anon_key     text;
  cron_secret  text;
begin
  select decrypted_secret into supabase_url
  from vault.decrypted_secrets where name = 'supabase_url';

  select decrypted_secret into anon_key
  from vault.decrypted_secrets where name = 'anon_key';

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'integration_sync_cron_secret';
  cron_secret := coalesce(cron_secret, 'sellerfinance-cron-2026');

  perform net.http_post(
    url := supabase_url || '/functions/v1/send-sale-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('cron_secret', cron_secret, 'sale_event_id', new.id)
  );
  return new;
end;
$function$;

revoke all on function public.trigger_send_sale_push() from public, anon, authenticated;

create trigger send_sale_push_trigger
  after insert on public.sale_events
  for each row
  execute function public.trigger_send_sale_push();
