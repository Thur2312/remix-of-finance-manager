-- Incidente 22/09→01/10: a Live API Partner Key do app Shopee expirou. Toda
-- renovação de token passou a falhar (assinatura inválida pro parceiro
-- inteiro, não um problema de refresh_token de loja nenhuma), e
-- integration-sync marcava `status = 'expired'` na PRIMEIRA falha — o cron
-- (trigger_auto_sync) só pega `status = 'connected'`, então cada loja saiu
-- do auto-sync permanentemente e exigiria reconexão manual uma por uma,
-- mesmo com o refresh_token de cada uma continuando perfeitamente válido.
--
-- consecutive_refresh_failures dá uma margem: só marca 'expired' depois de
-- algumas falhas seguidas, então um blip (chave de parceiro, Shopee fora do
-- ar, rede) não derruba ninguém — o cron tenta de novo sozinho nos próximos
-- ciclos e zera o contador no primeiro sucesso.
alter table public.integration_connections
  add column if not exists consecutive_refresh_failures integer not null default 0;
