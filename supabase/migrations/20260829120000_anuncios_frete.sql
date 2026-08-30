-- BUG-06 (docs/DIAGNOSTICO-FINANCEIRO.md): a Calculadora de Precificação não
-- tinha campo de frete, então "planejado" (Tela B) e "realizado" (Tela A) nunca
-- reconciliavam. Coluna aditiva; 0 = comprador paga ou o marketplace subsidia
-- (o padrão em boa parte das vendas Shopee, ver shopee_shipping_rebate).
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS frete numeric NOT NULL DEFAULT 0;
