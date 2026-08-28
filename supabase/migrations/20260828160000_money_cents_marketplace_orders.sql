-- Continuação da padronização em centavos (docs/DIAGNOSTICO-FINANCEIRO.md,
-- seção 6) para as tabelas legadas por-marketplace: raw_orders (Shopee upload
-- manual), tiktok_orders, ml_orders. Mesma estratégia expand da
-- 20260828150000_money_cents_core.sql (coluna nova + backfill + trigger
-- BEFORE INSERT/UPDATE), com uma diferença: todas as colunas fonte aqui são
-- nullable, então a coluna _cents também fica nullable e NÃO precisa de
-- DEFAULT — Postgres propaga NULL através de round()/multiplicação
-- automaticamente (round(null::numeric * 100) = null), sem erro.
--
-- taxa_ml em ml_orders é valor monetário (R$), não percentual — confirmado em
-- src/hooks/useMercadolivreData.ts:96 (`fees = taxa_ml + frete_ml`, somado
-- direto, não multiplicado como razão).
--
-- Rollback: drop trigger/function por tabela + drop column *_cents. A coluna
-- original nunca é tocada.

-- ── raw_orders ───────────────────────────────────────────────────────────────
alter table public.raw_orders add column if not exists custo_unitario_cents bigint;
alter table public.raw_orders add column if not exists rebate_shopee_cents bigint;
alter table public.raw_orders add column if not exists total_faturado_cents bigint;
update public.raw_orders set
  custo_unitario_cents = round(custo_unitario * 100),
  rebate_shopee_cents = round(rebate_shopee * 100),
  total_faturado_cents = round(total_faturado * 100)
where custo_unitario_cents is null and rebate_shopee_cents is null and total_faturado_cents is null;

create or replace function public.sync_raw_orders_money_cents()
returns trigger language plpgsql as $$
begin
  new.custo_unitario_cents := round(new.custo_unitario * 100);
  new.rebate_shopee_cents := round(new.rebate_shopee * 100);
  new.total_faturado_cents := round(new.total_faturado * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.raw_orders;
create trigger sync_money_cents
  before insert or update on public.raw_orders
  for each row execute function public.sync_raw_orders_money_cents();

-- ── tiktok_orders ────────────────────────────────────────────────────────────
alter table public.tiktok_orders add column if not exists custo_unitario_cents bigint;
alter table public.tiktok_orders add column if not exists desconto_plataforma_cents bigint;
alter table public.tiktok_orders add column if not exists desconto_vendedor_cents bigint;
alter table public.tiktok_orders add column if not exists total_faturado_cents bigint;
update public.tiktok_orders set
  custo_unitario_cents = round(custo_unitario * 100),
  desconto_plataforma_cents = round(desconto_plataforma * 100),
  desconto_vendedor_cents = round(desconto_vendedor * 100),
  total_faturado_cents = round(total_faturado * 100)
where custo_unitario_cents is null and desconto_plataforma_cents is null
  and desconto_vendedor_cents is null and total_faturado_cents is null;

create or replace function public.sync_tiktok_orders_money_cents()
returns trigger language plpgsql as $$
begin
  new.custo_unitario_cents := round(new.custo_unitario * 100);
  new.desconto_plataforma_cents := round(new.desconto_plataforma * 100);
  new.desconto_vendedor_cents := round(new.desconto_vendedor * 100);
  new.total_faturado_cents := round(new.total_faturado * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.tiktok_orders;
create trigger sync_money_cents
  before insert or update on public.tiktok_orders
  for each row execute function public.sync_tiktok_orders_money_cents();

-- ── ml_orders ────────────────────────────────────────────────────────────────
alter table public.ml_orders add column if not exists custo_unitario_cents bigint;
alter table public.ml_orders add column if not exists desconto_plataforma_cents bigint;
alter table public.ml_orders add column if not exists desconto_vendedor_cents bigint;
alter table public.ml_orders add column if not exists frete_ml_cents bigint;
alter table public.ml_orders add column if not exists taxa_ml_cents bigint;
alter table public.ml_orders add column if not exists total_faturado_cents bigint;
update public.ml_orders set
  custo_unitario_cents = round(custo_unitario * 100),
  desconto_plataforma_cents = round(desconto_plataforma * 100),
  desconto_vendedor_cents = round(desconto_vendedor * 100),
  frete_ml_cents = round(frete_ml * 100),
  taxa_ml_cents = round(taxa_ml * 100),
  total_faturado_cents = round(total_faturado * 100)
where custo_unitario_cents is null and desconto_plataforma_cents is null
  and desconto_vendedor_cents is null and frete_ml_cents is null
  and taxa_ml_cents is null and total_faturado_cents is null;

create or replace function public.sync_ml_orders_money_cents()
returns trigger language plpgsql as $$
begin
  new.custo_unitario_cents := round(new.custo_unitario * 100);
  new.desconto_plataforma_cents := round(new.desconto_plataforma * 100);
  new.desconto_vendedor_cents := round(new.desconto_vendedor * 100);
  new.frete_ml_cents := round(new.frete_ml * 100);
  new.taxa_ml_cents := round(new.taxa_ml * 100);
  new.total_faturado_cents := round(new.total_faturado * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.ml_orders;
create trigger sync_money_cents
  before insert or update on public.ml_orders
  for each row execute function public.sync_ml_orders_money_cents();
