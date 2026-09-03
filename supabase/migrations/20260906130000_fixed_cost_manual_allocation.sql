-- Bloco D, Fase 2 — rateio manual por % nos custos fixos.
--
-- O rateio de um custo `geral` (ou `plataforma`) hoje é sempre proporcional ao
-- faturamento do período. Às vezes o usuário sabe a divisão certa (ex.: a
-- contabilidade cobra 60/40 entre os dois CNPJs, independente da receita).
-- `allocation_pct` guarda esse split explícito: { "<companyId>": 60, "<companyId>": 40 }.
-- null = rateio automático (comportamento atual).

alter table public.fixed_costs
  add column if not exists allocation_pct jsonb;

comment on column public.fixed_costs.allocation_pct is
  'Rateio manual por empresa: { companyId: percentual }. Só vale para scope geral/plataforma. null = rateio automático por faturamento.';
