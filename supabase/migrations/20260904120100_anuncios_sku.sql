-- Bloco C — liga a precificação manual (anuncios) ao catálogo derivado.
--
-- `anuncios` nasceu sem SKU: é chaveado por nome_anuncio + marketplace (texto
-- livre). Sem um SKU não dá pra casar o preço/custo que o vendedor cadastrou
-- na Calculadora com as vendas reais daquele produto. Coluna nullable: o
-- vínculo é opcional, o vendedor preenche quando quer. Sem backfill.

alter table public.anuncios add column if not exists sku text;

create index if not exists anuncios_user_sku_idx
  on public.anuncios (user_id, sku) where sku is not null;

comment on column public.anuncios.sku is
  'SKU do produto — liga o anúncio de precificação manual ao catálogo derivado (/produtos). Nullable: preenchido quando o vendedor quer o vínculo.';
