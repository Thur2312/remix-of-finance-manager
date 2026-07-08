-- Colunas para rastrear assinaturas/checkouts da Asaas (substitui o Stripe)
alter table public.subscriptions
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_subscription_id text,
  add column if not exists asaas_checkout_id text;

create index if not exists subscriptions_asaas_subscription_id_idx
  on public.subscriptions (asaas_subscription_id);
