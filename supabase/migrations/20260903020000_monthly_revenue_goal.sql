-- Meta de faturamento do mês (item 8 das diretrizes do dashboard).
-- Um valor por usuário, guardado junto da âncora de saldo em
-- cash_flow_settings (mesma tabela user-scoped que a Previsão de caixa já usa).

alter table public.cash_flow_settings
  add column if not exists monthly_revenue_goal_cents bigint;

comment on column public.cash_flow_settings.monthly_revenue_goal_cents is
  'Meta de faturamento bruto do mês corrente, em centavos. NULL = sem meta definida.';
