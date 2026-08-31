-- Revert do BUG-06 (docs/DIAGNOSTICO-FINANCEIRO.md): o campo de frete na
-- Calculadora de Precificação foi removido a pedido do cliente. A coluna era
-- aditiva (numeric NOT NULL DEFAULT 0) — o DROP perde só valores que tenham
-- sido digitados, e o front já parou de referenciar `anuncios.frete`.
ALTER TABLE public.anuncios DROP COLUMN IF EXISTS frete;
