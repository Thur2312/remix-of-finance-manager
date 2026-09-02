-- Finn proativo (Aposta F, parte 1) — agenda o cron diário que dispara a
-- function `finn-alerts`. Mesmo padrão do `trigger_auto_sync`: função
-- security definer que lê segredos do vault e faz um net.http_post
-- fire-and-forget. Reaproveita o segredo `integration_sync_cron_secret`
-- (mesma fronteira de confiança: "o cron pode chamar isto").
--
-- A function `finn-alerts` processa todos os usuários com plano ativo numa
-- execução, então aqui é um único POST por disparo (sem loop).

create or replace function public.trigger_finn_alerts()
returns void
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
    url := supabase_url || '/functions/v1/finn-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object('cron_secret', cron_secret)
  );
end;
$function$;

revoke all on function public.trigger_finn_alerts() from public, anon, authenticated;

-- Diário às 11:00 UTC (08:00 em Brasília) — o vendedor abre o app de manhã e
-- já encontra o aviso. unschedule antes por idempotência.
select cron.unschedule('finn-alerts-daily')
where exists (select 1 from cron.job where jobname = 'finn-alerts-daily');

select cron.schedule('finn-alerts-daily', '0 11 * * *', 'select public.trigger_finn_alerts()');
