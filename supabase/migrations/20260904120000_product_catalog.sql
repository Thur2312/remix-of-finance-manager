-- Bloco C das diretrizes do dashboard — fundação Produto.
--
-- Não existe entidade Produto: as vendas por SKU (order_items, ml_orders,
-- tiktok_orders), o custo (product_costs), o estoque (product_stock,
-- inventory_settings) e a precificação (anuncios) vivem soltos. A tela
-- /produtos projeta um catálogo por SKU em runtime (src/lib/catalog.ts);
-- esta tabela guarda só o que não tem casa: nome de exibição, arquivar e o
-- ponteiro de alias cross-marketplace (Fase 2 — sem UI ainda).
--
-- Chave = sku_key: o resultado de skuKey() (lowercase, sem separadores),
-- a mesma chave canônica que a reposição de estoque já usa. Segue o padrão
-- de 20260902120100_cash_flow_settings.sql: PK composta, uma policy `for all`
-- do dono, sem trigger de proteção de coluna (config single-tenant).

create table if not exists public.product_catalog (
  user_id      uuid not null references auth.users(id) on delete cascade,
  sku_key      text not null,
  display_name text,
  archived     boolean not null default false,
  alias_of     text,
  updated_at   timestamptz not null default now(),
  primary key (user_id, sku_key)
);

comment on column public.product_catalog.sku_key is
  'Chave canônica do SKU: skuKey() = lowercase sem separadores. Mesma chave da reposição de estoque.';
comment on column public.product_catalog.alias_of is
  'Fase 2: aponta pro sku_key "dono" quando dois SKUs (ex. entre marketplaces) são o mesmo produto. Sem UI na v1.';

alter table public.product_catalog enable row level security;

create policy "product_catalog_all_own" on public.product_catalog
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
