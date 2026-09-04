-- Meta de faturamento do mês POR EMPRESA (CNPJ).
--
-- O item 8 das diretrizes guardou a meta em cash_flow_settings — um valor por
-- usuário. Quem opera 2+ CNPJs quer uma meta pra cada. Modelo:
--   - companies.monthly_revenue_goal_cents = meta daquela empresa (NULL = sem meta).
--   - cash_flow_settings.monthly_revenue_goal_cents continua sendo a meta
--     CONSOLIDADA ("Todas as empresas") — usada quando nenhuma empresa está
--     selecionada em /meta.
--
-- Nullable. RLS de companies já é por user_id — nada a mudar.

alter table public.companies
  add column if not exists monthly_revenue_goal_cents bigint;

comment on column public.companies.monthly_revenue_goal_cents is
  'Meta de faturamento bruto do mês corrente desta empresa, em centavos. NULL = sem meta. A meta consolidada fica em cash_flow_settings.';

-- Backfill só pra quem tem EXATAMENTE uma empresa: a meta que já existia em
-- cash_flow_settings passa a valer pra essa empresa (senão ela sumiria da tela,
-- já que /meta com 1 empresa passa a ler de companies). 0 ou 2+ empresas: a
-- meta consolidada segue em cash_flow_settings, intacta.
update public.companies c
set monthly_revenue_goal_cents = s.monthly_revenue_goal_cents
from public.cash_flow_settings s
where s.user_id = c.user_id
  and s.monthly_revenue_goal_cents is not null
  and c.monthly_revenue_goal_cents is null
  and (select count(*) from public.companies c2 where c2.user_id = c.user_id) = 1;
