-- Guarda o momento exato do cancelamento para o webhook do Asaas conseguir
-- distinguir um PAYMENT_CONFIRMED atrasado (referente a uma cobrança que já
-- estava em voo antes do cancelamento — não deve reativar o plano) de um
-- pagamento genuinamente novo feito depois de cancelar (deve reativar).
alter table public.subscriptions
  add column if not exists canceled_at timestamptz;
