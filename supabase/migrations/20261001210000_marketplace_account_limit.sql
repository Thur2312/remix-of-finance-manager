-- Limite de contas conectadas por marketplace (Shopee/ML/TikTok), por
-- usuário e por plano. Antes disso não existia NENHUMA trava técnica: dava
-- pra conectar quantas lojas quisesse em qualquer plano (a permissão
-- "integracao" em plan_permissions com limit_value=1 no starter nunca foi
-- checada em código nenhum -- starter/profissional também são planos
-- legados da era Stripe, sem cliente ativo hoje).
--
-- Planos reais em produção hoje: trial, mensal, semestral, anual (ver
-- PAID_PLANS em src/lib/plan-status.ts). Qualquer plano sem linha aqui
-- (cancelado, starter, profissional, desconhecido) cai no default
-- restritivo de 1 aplicado em código -- fail-safe em vez de liberar geral.
insert into public.plan_permissions (plan, permission, limit_value)
values
  ('trial', 'contas_por_marketplace', 1),
  ('mensal', 'contas_por_marketplace', 2),
  ('semestral', 'contas_por_marketplace', 3),
  ('anual', 'contas_por_marketplace', 5)
on conflict (plan, permission) do update set limit_value = excluded.limit_value;
