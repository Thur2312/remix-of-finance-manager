-- Aposta C (reposição de estoque), Fase 1. O buraco central é o mesmo da
-- previsão de caixa: um dado que só o vendedor tem. Lá era o saldo do banco;
-- aqui é "quantas unidades de cada SKU você tem agora". Shopee e ML têm isso
-- na API de catálogo, mas o sync nunca puxou — sincronizar é a Fase 2. Por
-- ora o vendedor informa, e a UI avisa quando o número está velho.
--
-- Uma linha por (usuário, SKU). Só existe linha pra SKU que o vendedor
-- quis configurar; SKU sem linha usa os padrões da lib (lead time 14d,
-- estoque de segurança 7 dias de venda).
create table public.inventory_settings (
  user_id           uuid not null references auth.users(id) on delete cascade,
  sku               text not null,
  item_name         text,
  -- estoque físico informado + quando foi informado (pra alertar quando velho)
  stock_units       integer not null default 0,
  stock_updated_at  timestamptz not null default now(),
  -- dias entre fazer o pedido ao fornecedor e a mercadoria entrar no estoque
  lead_time_days    integer not null default 14,
  -- estoque de segurança, em DIAS de venda (não em unidades — escala com o giro)
  safety_days       integer not null default 7,
  -- lote mínimo do fornecedor (caixa fechada). null = sem restrição
  moq_units         integer,
  -- false = SKU descontinuado, some do plano de reposição
  active            boolean not null default true,
  updated_at        timestamptz not null default now(),
  primary key (user_id, sku)
);

alter table public.inventory_settings enable row level security;

create policy "inventory_settings_all_own" on public.inventory_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
