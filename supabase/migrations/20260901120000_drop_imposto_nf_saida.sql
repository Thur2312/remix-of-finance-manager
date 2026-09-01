-- Aposenta o modelo antigo de imposto por config de marketplace
-- (docs/DIAGNOSTICO-FINANCEIRO.md, BUG-01). O imposto sobre vendas agora vem
-- de `companies.tax_rate` / `companies.tax_base` via `applyTax` — nos dashboards
-- (TaxSummaryRow) e na DRE (CompanySelector). Nenhum código lê mais estas
-- colunas.
--
-- `desconto_nf_saida` era só a base reduzida do cálculo de `imposto_nf_saida` —
-- sai junto. `IF EXISTS` porque `ml_settings` não está no baseline de migrations
-- (criada direto no painel).
ALTER TABLE IF EXISTS public.settings
  DROP COLUMN IF EXISTS imposto_nf_saida,
  DROP COLUMN IF EXISTS desconto_nf_saida;

ALTER TABLE IF EXISTS public.tiktok_settings
  DROP COLUMN IF EXISTS imposto_nf_saida,
  DROP COLUMN IF EXISTS desconto_nf_saida;

ALTER TABLE IF EXISTS public.ml_settings
  DROP COLUMN IF EXISTS imposto_nf_saida,
  DROP COLUMN IF EXISTS desconto_nf_saida;
