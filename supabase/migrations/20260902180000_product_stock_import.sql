-- Import de estoque por planilha (plano B enquanto a API de catálogo Shopee
-- está bloqueada por KYC do vendedor). O vendedor exporta a lista de produtos
-- do Seller Center e sobe o arquivo; a tela grava em product_stock com
-- source='import'.
--
-- Até aqui a escrita em product_stock era exclusiva do sync (service_role).
-- Agora o dono também pode escrever, mas SÓ com source='import' — o
-- with_check trava qualquer tentativa de forjar uma linha 'shopee'/'ml'.

alter table public.product_stock drop constraint if exists product_stock_source_check;
alter table public.product_stock add constraint product_stock_source_check
  check (source in ('shopee', 'mercadolivre', 'import'));

create policy "product_stock_import_own" on public.product_stock
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and source = 'import');
