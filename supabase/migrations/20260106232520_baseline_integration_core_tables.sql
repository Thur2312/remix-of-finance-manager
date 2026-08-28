-- ─────────────────────────────────────────────────────────────────────────────
-- BASELINE — orders / order_items / fees / payments / integration_connections
-- ─────────────────────────────────────────────────────────────────────────────
-- Essas 5 tabelas foram criadas fora do controle de migration (via UI/edge
-- function, antes deste repo versionar schema). Este arquivo é um SNAPSHOT DO
-- ESTADO ATUAL (28/08/2026), montado por introspecção
-- (information_schema / pg_constraint / pg_indexes / pg_policies) — ver
-- docs/schema-introspection-queries.sql.
--
-- Objetivo: poder auditar e versionar mudança de schema daqui pra frente.
-- Inclui as colunas *_cents e as triggers sync_money_cents que a migration
-- 20260828150000_money_cents_core.sql também gerencia (lá com
-- `create or replace` / `drop trigger if exists`, idempotente — re-rodar em
-- cima deste baseline é no-op).
--
-- Em ambiente que JÁ TEM essas tabelas (produção), marcar como aplicada sem
-- rodar:  supabase migration repair --status applied 20260106232520 --linked
--
-- Tudo aqui é idempotente (`if not exists` / `create or replace` /
-- `drop policy if exists`) — seguro rodar em base limpa junto com as demais.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── integration_connections ──────────────────────────────────────────────────
create table if not exists public.integration_connections (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  provider                    text not null,
  status                      text not null default 'disconnected',
  external_shop_id            text,
  shop_name                   text,
  access_token                text,
  refresh_token               text,
  token_expires_at            timestamptz,
  refresh_token_expires_at    timestamptz,
  scopes                      text,
  last_sync_at                timestamptz,
  next_sync_at                timestamptz,
  auto_sync_enabled           boolean default false,
  auto_sync_frequency_minutes integer default 60,
  last_error_code             text,
  last_error_message          text,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),
  constraint integration_connections_provider_check
    check (provider = any (array['shopee'::text, 'tiktok'::text, 'mercadolivre'::text, 'mercadolivre_pending'::text])),
  -- gerida também por 20260826160000_integration_connections_multi_shop.sql
  constraint integration_connections_user_provider_shop_key
    unique (user_id, provider, external_shop_id)
);

-- ── orders ───────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  integration_id      uuid not null references public.integration_connections(id) on delete cascade,
  external_order_id   varchar(128) not null,
  status             varchar(64)  not null,
  total_amount       numeric(18,4) not null default 0,
  currency           varchar(10)  not null default 'BRL',
  buyer_username     varchar(255) not null default '',
  shipping_carrier   varchar(128) not null default '',
  tracking_number    varchar(128) not null default '',
  paid_at            timestamptz,
  order_created_at   timestamptz not null,
  order_updated_at   timestamptz not null,
  synced_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  product_name       text,
  product_id         text,
  total_amount_cents bigint not null default 0,
  constraint orders_integration_external_id_unique unique (integration_id, external_order_id)
);

-- ── order_items ──────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  external_item_id  varchar(128) not null,
  item_name         varchar(512) not null,
  sku               varchar(255) not null default '',
  quantity          integer not null default 1,
  unit_price        numeric(18,4) not null default 0,
  total_price       numeric(18,4) not null default 0,
  created_at        timestamptz not null default now(),
  total_price_cents bigint not null default 0,
  unit_price_cents  bigint not null default 0,
  constraint order_items_order_id_external_item_id_key unique (order_id, external_item_id),
  -- redundante com order_items_order_id_external_item_id_key — candidato a drop
  constraint uq_order_items_order_item unique (order_id, external_item_id)
);

-- ── payments ─────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                      uuid primary key default uuid_generate_v4(),
  integration_id          uuid not null references public.integration_connections(id) on delete cascade,
  order_id                uuid references public.orders(id) on delete set null,
  external_transaction_id varchar(256) not null,
  amount                  numeric(18,4) not null,
  currency                varchar(10) not null default 'BRL',
  payment_method          varchar(128) not null default '',
  marketplace_fee         numeric(18,4) not null default 0,
  net_amount              numeric(18,4) not null default 0,
  status                  varchar(32) not null default 'PENDING',
  transaction_date        timestamptz not null,
  description             text not null default '',
  synced_at               timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  amount_cents            bigint not null default 0,
  marketplace_fee_cents   bigint not null default 0,
  net_amount_cents        bigint not null default 0,
  constraint payments_external_transaction_id_key unique (external_transaction_id),
  constraint payments_integration_external_id_unique unique (integration_id, external_transaction_id),
  -- redundante com payments_integration_external_id_unique — candidato a drop
  constraint uq_payments_integration_transaction unique (integration_id, external_transaction_id)
);

-- ── fees ─────────────────────────────────────────────────────────────────────
create table if not exists public.fees (
  id              uuid primary key default gen_random_uuid(),
  integration_id  uuid not null references public.integration_connections(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  external_fee_id text not null,
  fee_type        text not null,
  amount          numeric(12,2) not null,
  currency        text not null,
  description     text,
  fee_date        timestamptz not null,
  synced_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  amount_cents    bigint not null default 0,
  constraint fees_external_fee_id_key unique (external_fee_id),
  constraint fee_type_check
    check (fee_type = any (array['commission'::text, 'transaction_fee'::text, 'service_fee'::text, 'shipping_fee'::text, 'ads_fee'::text, 'withdrawal_fee'::text, 'adjustment'::text]))
);

-- FKs de fees nomeadas como no banco (fk_fees_*), adicionadas fora do
-- create table pra manter os nomes exatos.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_fees_integration' and conrelid = 'public.fees'::regclass) then
    alter table public.fees add constraint fk_fees_integration
      foreign key (integration_id) references public.integration_connections(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_fees_order' and conrelid = 'public.fees'::regclass) then
    alter table public.fees add constraint fk_fees_order
      foreign key (order_id) references public.orders(id) on delete set null;
  end if;
end $$;

-- ── Índices (os não gerados por constraint) ──────────────────────────────────
create index        if not exists fees_date_idx                 on public.fees        using btree (fee_date);
create index        if not exists fees_integration_idx           on public.fees        using btree (integration_id);
create unique index if not exists fees_external_unique           on public.fees        using btree (integration_id, external_fee_id);
create index        if not exists idx_order_items_order_id        on public.order_items using btree (order_id);
create index        if not exists idx_orders_integration_id       on public.orders      using btree (integration_id);
create index        if not exists idx_orders_order_created_at      on public.orders      using btree (order_created_at desc);
create index        if not exists idx_orders_status               on public.orders      using btree (status);
create index        if not exists idx_payments_integration_id     on public.payments    using btree (integration_id);
create index        if not exists idx_payments_order_id           on public.payments    using btree (order_id);
create index        if not exists idx_payments_status             on public.payments    using btree (status);
create index        if not exists idx_payments_transaction_date   on public.payments    using btree (transaction_date desc);

-- ── Colunas *_cents em sincronia (BEFORE INSERT/UPDATE) ──────────────────────
-- Idêntico ao que 20260828150000_money_cents_core.sql define (por isso
-- `create or replace` — não conflita).
create or replace function public.sync_orders_money_cents()
returns trigger language plpgsql as $$
begin
  new.total_amount_cents := round(new.total_amount * 100);
  return new;
end;
$$;
drop trigger if exists sync_money_cents on public.orders;
create trigger sync_money_cents before insert or update on public.orders
  for each row execute function public.sync_orders_money_cents();

create or replace function public.sync_order_items_money_cents()
returns trigger language plpgsql as $$
begin
  new.total_price_cents := round(new.total_price * 100);
  new.unit_price_cents := round(new.unit_price * 100);
  return new;
end;
$$;
drop trigger if exists sync_money_cents on public.order_items;
create trigger sync_money_cents before insert or update on public.order_items
  for each row execute function public.sync_order_items_money_cents();

create or replace function public.sync_fees_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  return new;
end;
$$;
drop trigger if exists sync_money_cents on public.fees;
create trigger sync_money_cents before insert or update on public.fees
  for each row execute function public.sync_fees_money_cents();

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
create trigger sync_money_cents before insert or update on public.payments
  for each row execute function public.sync_payments_money_cents();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Padrão: posse via integration_connections.user_id = auth.uid()
-- (order_items pela cadeia order_id -> orders -> integration_connections).
alter table public.integration_connections enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.payments                enable row level security;
alter table public.fees                    enable row level security;

drop policy if exists user_own_integration_connections on public.integration_connections;
create policy user_own_integration_connections on public.integration_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- duplicata exata de user_own_integration_connections — candidata a drop
drop policy if exists "users can manage own connections" on public.integration_connections;
create policy "users can manage own connections" on public.integration_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists orders_policy on public.orders;
create policy orders_policy on public.orders
  for all using (integration_id in (
    select integration_connections.id from public.integration_connections
    where integration_connections.user_id = auth.uid()));

drop policy if exists fees_policy on public.fees;
create policy fees_policy on public.fees
  for all using (integration_id in (
    select integration_connections.id from public.integration_connections
    where integration_connections.user_id = auth.uid()));

drop policy if exists payments_policy on public.payments;
create policy payments_policy on public.payments
  for all using (integration_id in (
    select integration_connections.id from public.integration_connections
    where integration_connections.user_id = auth.uid()));

drop policy if exists order_items_policy on public.order_items;
create policy order_items_policy on public.order_items
  for all using (order_id in (
    select o.id from public.orders o
    join public.integration_connections ic on ic.id = o.integration_id
    where ic.user_id = auth.uid()));
