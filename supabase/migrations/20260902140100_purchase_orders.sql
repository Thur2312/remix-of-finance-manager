-- Aposta C, Fase 1 — pedidos de compra ao fornecedor em aberto ("estoque em
-- trânsito"). Sem isto, o plano de reposição manda pedir de novo o que já
-- está a caminho. Também amarra na previsão de caixa: um pedido não recebido
-- com data de pagamento na janela vira uma SAÍDA projetada.
--
-- `received_at is null` = ainda em trânsito. Ao receber, o vendedor marca a
-- data e soma as unidades no estoque (inventory_settings.stock_units) na mão —
-- a Fase 2 (sync de catálogo) tira essa etapa manual.
create table public.purchase_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  sku              text not null,
  item_name        text,
  qty_units        integer not null check (qty_units > 0),
  -- custo de compra unitário pago ao fornecedor (≠ preço de venda)
  unit_cost_cents  bigint not null default 0,
  ordered_at       date not null default current_date,
  -- previsão de chegada no estoque
  expected_at      date,
  -- vencimento do pagamento ao fornecedor (prazo). null → usa expected_at na
  -- projeção de caixa
  payment_due_at   date,
  -- null enquanto em trânsito; data real quando entra no estoque
  received_at      date,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;

create policy "purchase_orders_all_own" on public.purchase_orders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index purchase_orders_open_idx
  on public.purchase_orders (user_id, sku)
  where received_at is null;
