-- Add kit/bundle support to anuncios.
-- tipo_produto: "individual" (custo digitado manualmente) ou "kit" (custo
-- somado automaticamente a partir dos itens do kit).
-- kit_itens: array de objetos { "nome": string, "custo_unitario": number, "quantidade": number }
-- Ex: Kit "Top Academia 3 Uni" -> [{ "nome": "Top Academia", "custo_unitario": 12.5, "quantidade": 3 }]
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS tipo_produto text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS kit_itens jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.anuncios
  ADD CONSTRAINT anuncios_tipo_produto_check CHECK (tipo_produto IN ('individual', 'kit'));
