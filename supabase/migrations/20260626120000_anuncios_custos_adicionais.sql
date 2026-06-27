-- Add additional costs (custos adicionais) to anuncios.
-- Stored as a JSON array of objects: { "nome": string, "valor": number, "tipo": "valor" | "percent" }
-- "valor"   -> custo fixo em R$
-- "percent" -> percentual sobre o custo base do produto (coluna custo)
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS custos_adicionais jsonb NOT NULL DEFAULT '[]'::jsonb;

