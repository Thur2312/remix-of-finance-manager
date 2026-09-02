-- Aposta C (reposição de estoque), Fase 2 — estoque sincronizado do catálogo
-- do marketplace. A Fase 1 dependia do vendedor digitar e manter o estoque de
-- cada SKU; aqui o sync (Shopee get_item_base_info / ML /items available_
-- quantity) grava sozinho, e a tela passa a preferir esse número, deixando o
-- manual como override pra quem controla estoque por fora.
--
-- Chave por (user_id, sku): se o mesmo SKU tem estoque diferente em cada
-- marketplace (listagens independentes), vale o do último sync — o override
-- manual cobre quem precisa de precisão. `source` diz de onde veio.
create table public.product_stock (
  user_id      uuid not null references auth.users(id) on delete cascade,
  sku          text not null,
  item_name    text,
  stock_units  integer not null default 0,
  source       text not null check (source in ('shopee', 'mercadolivre')),
  external_id  text,
  synced_at    timestamptz not null default now(),
  primary key (user_id, sku)
);

alter table public.product_stock enable row level security;

-- Só leitura pro dono. A escrita é exclusiva do sync (service_role, que
-- ignora RLS) — não há policy de insert/update pra authenticated de propósito.
create policy "product_stock_select_own" on public.product_stock
  for select to authenticated
  using (user_id = auth.uid());
