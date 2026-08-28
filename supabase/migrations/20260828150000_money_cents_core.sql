-- Fase 2 da padronização em centavos (docs/DIAGNOSTICO-FINANCEIRO.md, seção 6).
-- Escopo: só o núcleo do pipeline financeiro — as tabelas que
-- computeShopeeFinance, DRE e os dashboards realmente usam hoje. Calculadora
-- (anuncios), configs de comissão (settings/ml_settings/tiktok_settings) e
-- tiktok_settlements (~33 colunas monetárias) ficam de fora por ora — cada
-- uma vira sua própria migration depois, com o mesmo cuidado.
--
-- Estratégia EXPAND: adiciona coluna "<campo>_cents" bigint ao lado da coluna
-- float existente em cada tabela, backfilla o histórico e mantém as duas em
-- sincronia via trigger BEFORE INSERT/UPDATE. Nenhum código de aplicação
-- precisa mudar para esta migration ser segura de rodar — o app continua
-- lendo/escrevendo as colunas float normalmente, a coluna _cents só
-- acompanha. CONTRACT (dropar a coluna float e a trigger) é uma migration
-- futura e deliberada, só depois que o domínio (Fase 4) migrar de fato para
-- ler/escrever em Cents.
--
-- Rollback (não há dado a perder — a coluna float original nunca é tocada):
--   drop trigger if exists sync_money_cents on public.orders;
--   drop trigger if exists sync_money_cents on public.order_items;
--   drop trigger if exists sync_money_cents on public.fees;
--   drop trigger if exists sync_money_cents on public.payments;
--   drop trigger if exists sync_money_cents on public.payouts;
--   drop trigger if exists sync_money_cents on public.cash_flow_entries;
--   drop trigger if exists sync_money_cents on public.sale_events;
--   drop function if exists public.sync_orders_money_cents();
--   drop function if exists public.sync_order_items_money_cents();
--   drop function if exists public.sync_fees_money_cents();
--   drop function if exists public.sync_payments_money_cents();
--   drop function if exists public.sync_payouts_money_cents();
--   drop function if exists public.sync_cash_flow_entries_money_cents();
--   drop function if exists public.sync_sale_events_money_cents();
--   alter table public.orders            drop column if exists total_amount_cents;
--   alter table public.order_items       drop column if exists total_price_cents;
--   alter table public.order_items       drop column if exists unit_price_cents;
--   alter table public.fees              drop column if exists amount_cents;
--   alter table public.payments          drop column if exists amount_cents;
--   alter table public.payments          drop column if exists marketplace_fee_cents;
--   alter table public.payments          drop column if exists net_amount_cents;
--   alter table public.payouts           drop column if exists amount_cents;
--   alter table public.cash_flow_entries drop column if exists amount_cents;
--   alter table public.sale_events       drop column if exists total_amount_cents;

-- ── orders.total_amount ─────────────────────────────────────────────────────
alter table public.orders add column if not exists total_amount_cents bigint;
update public.orders set total_amount_cents = round(total_amount * 100) where total_amount_cents is null;

create or replace function public.sync_orders_money_cents()
returns trigger language plpgsql as $$
begin
  new.total_amount_cents := round(new.total_amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.orders;
create trigger sync_money_cents
  before insert or update on public.orders
  for each row execute function public.sync_orders_money_cents();

alter table public.orders alter column total_amount_cents set not null;

-- ── order_items.total_price / unit_price ────────────────────────────────────
alter table public.order_items add column if not exists total_price_cents bigint;
alter table public.order_items add column if not exists unit_price_cents bigint;
update public.order_items set
  total_price_cents = round(total_price * 100),
  unit_price_cents = round(unit_price * 100)
where total_price_cents is null or unit_price_cents is null;

create or replace function public.sync_order_items_money_cents()
returns trigger language plpgsql as $$
begin
  new.total_price_cents := round(new.total_price * 100);
  new.unit_price_cents := round(new.unit_price * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.order_items;
create trigger sync_money_cents
  before insert or update on public.order_items
  for each row execute function public.sync_order_items_money_cents();

alter table public.order_items alter column total_price_cents set not null;
alter table public.order_items alter column unit_price_cents set not null;

-- ── fees.amount ──────────────────────────────────────────────────────────────
alter table public.fees add column if not exists amount_cents bigint;
update public.fees set amount_cents = round(amount * 100) where amount_cents is null;

create or replace function public.sync_fees_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.fees;
create trigger sync_money_cents
  before insert or update on public.fees
  for each row execute function public.sync_fees_money_cents();

alter table public.fees alter column amount_cents set not null;

-- ── payments.amount / marketplace_fee / net_amount ──────────────────────────
alter table public.payments add column if not exists amount_cents bigint;
alter table public.payments add column if not exists marketplace_fee_cents bigint;
alter table public.payments add column if not exists net_amount_cents bigint;
update public.payments set
  amount_cents = round(amount * 100),
  marketplace_fee_cents = round(marketplace_fee * 100),
  net_amount_cents = round(net_amount * 100)
where amount_cents is null or marketplace_fee_cents is null or net_amount_cents is null;

create or replace function public.sync_payments_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  new.marketplace_fee_cents := round(new.marketplace_fee * 100);
  new.net_amount_cents := round(new.net_amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.payments;
create trigger sync_money_cents
  before insert or update on public.payments
  for each row execute function public.sync_payments_money_cents();

alter table public.payments alter column amount_cents set not null;
alter table public.payments alter column marketplace_fee_cents set not null;
alter table public.payments alter column net_amount_cents set not null;

-- ── payouts.amount ───────────────────────────────────────────────────────────
alter table public.payouts add column if not exists amount_cents bigint;
update public.payouts set amount_cents = round(amount * 100) where amount_cents is null;

create or replace function public.sync_payouts_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.payouts;
create trigger sync_money_cents
  before insert or update on public.payouts
  for each row execute function public.sync_payouts_money_cents();

alter table public.payouts alter column amount_cents set not null;

-- ── cash_flow_entries.amount ─────────────────────────────────────────────────
alter table public.cash_flow_entries add column if not exists amount_cents bigint;
update public.cash_flow_entries set amount_cents = round(amount * 100) where amount_cents is null;

create or replace function public.sync_cash_flow_entries_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.cash_flow_entries;
create trigger sync_money_cents
  before insert or update on public.cash_flow_entries
  for each row execute function public.sync_cash_flow_entries_money_cents();

alter table public.cash_flow_entries alter column amount_cents set not null;

-- ── sale_events.total_amount ─────────────────────────────────────────────────
alter table public.sale_events add column if not exists total_amount_cents bigint;
update public.sale_events set total_amount_cents = round(total_amount * 100) where total_amount_cents is null;

create or replace function public.sync_sale_events_money_cents()
returns trigger language plpgsql as $$
begin
  new.total_amount_cents := round(new.total_amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.sale_events;
create trigger sync_money_cents
  before insert or update on public.sale_events
  for each row execute function public.sync_sale_events_money_cents();

alter table public.sale_events alter column total_amount_cents set not null;
