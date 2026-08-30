-- Versiona a função de cron `trigger_auto_sync` (até agora fora de migration —
-- achado 3 da auditoria) e corrige o bug que deixou o auto-sync de TODOS os
-- clientes morto há meses:
--
--   trigger_auto_sync mandava  cron_secret := 'sellerfinance-cron-2026'  hardcoded.
--   integration-sync foi refatorado pra validar contra a env var
--   INTEGRATION_SYNC_CRON_SECRET. Secret não batia -> isCronCall = false ->
--   cai no auth.getUser() -> request do cron só tem Bearer anon_key -> 401.
--   Como o cron faz `perform net.http_post` (fire-and-forget), o 401 sumia:
--   status ficava 'connected', last_error_message null, e a conexão só
--   sincronizava quando o cliente clicava "Sincronizar" na mão.
--
-- Agora o secret vem do vault (`integration_sync_cron_secret`), com fallback pro
-- valor legado enquanto a rotação não acontece.
--
-- COORDENAÇÃO (fazer nesta ordem):
--   1. supabase secrets set INTEGRATION_SYNC_CRON_SECRET=sellerfinance-cron-2026
--      (destrava JÁ, sem depender desta migration)
--   2. aplicar esta migration
--   3. rotacionar pra um valor novo e forte:
--        select vault.create_secret('<novo-valor>', 'integration_sync_cron_secret');
--        supabase secrets set INTEGRATION_SYNC_CRON_SECRET=<novo-valor>
--      (o 'sellerfinance-cron-2026' vaza em plaintext no pg_proc — trocar)

create or replace function public.trigger_auto_sync()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  conn record;
  supabase_url text;
  anon_key text;
  cron_secret text;
begin
  select decrypted_secret into supabase_url
  from vault.decrypted_secrets where name = 'supabase_url';

  select decrypted_secret into anon_key
  from vault.decrypted_secrets where name = 'anon_key';

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets where name = 'integration_sync_cron_secret';

  -- Fallback pro valor legado enquanto o secret novo não é criado no vault.
  cron_secret := coalesce(cron_secret, 'sellerfinance-cron-2026');

  for conn in
    select id
    from integration_connections
    where status = 'connected'
      and auto_sync_enabled = true
      and (next_sync_at is null or next_sync_at <= now())
  loop
    perform net.http_post(
      url := supabase_url || '/functions/v1/integration-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'connection_id', conn.id,
        'cron_secret', cron_secret
      )
    );
  end loop;
end;
$function$;

-- EXECUTE continua revogado do público (auditoria achado 1, migrations
-- 20260806230000 / 20260826120000 / 20260826120100). Re-revoga por garantia
-- caso o CREATE OR REPLACE tenha reconcedido a PUBLIC.
revoke all on function public.trigger_auto_sync() from public, anon, authenticated;
