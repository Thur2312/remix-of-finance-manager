-- Continuação da padronização em centavos pro DRE: fixed_costs e
-- tiktok_settlements (as duas tabelas que faltavam pra calculateDRE ficar
-- Cents-ready). Mesma estratégia expand de sempre.
--
-- tiktok_settlements: todas as colunas fonte são nullable -> _cents nullable,
-- sem DEFAULT (round(null) = null, sem erro). Excluídas chargeable_weight
-- (peso, não dinheiro) e quantidade (contagem). As ~33 colunas restantes são
-- todas monetárias -- confirmado em src/lib/dre-calculations.ts, que usa
-- Math.abs(x.<campo>) em praticamente todas pra deduzir taxas/descontos/
-- reembolsos do DRE.
--
-- fixed_costs.amount é NOT NULL com DEFAULT já existente -> _cents também
-- ganha DEFAULT 0 (mesmo motivo do Commit money_cents_core_defaults: sem
-- DEFAULT, o gerador de tipos do Supabase marca a coluna como obrigatória no
-- Insert e quebra os inserts que não passam _cents explicitamente).

-- ── fixed_costs ──────────────────────────────────────────────────────────────
alter table public.fixed_costs add column if not exists amount_cents bigint;
update public.fixed_costs set amount_cents = round(amount * 100) where amount_cents is null;

create or replace function public.sync_fixed_costs_money_cents()
returns trigger language plpgsql as $$
begin
  new.amount_cents := round(new.amount * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.fixed_costs;
create trigger sync_money_cents
  before insert or update on public.fixed_costs
  for each row execute function public.sync_fixed_costs_money_cents();

alter table public.fixed_costs alter column amount_cents set not null;
alter table public.fixed_costs alter column amount_cents set default 0;

-- ── tiktok_settlements ───────────────────────────────────────────────────────
alter table public.tiktok_settlements add column if not exists actual_return_shipping_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists adjustment_amount_cents bigint;
alter table public.tiktok_settlements add column if not exists affiliate_commission_cents bigint;
alter table public.tiktok_settlements add column if not exists affiliate_partner_commission_cents bigint;
alter table public.tiktok_settlements add column if not exists affiliate_shop_ads_commission_cents bigint;
alter table public.tiktok_settlements add column if not exists bonus_cashback_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists customer_payment_cents bigint;
alter table public.tiktok_settlements add column if not exists customer_refund_cents bigint;
alter table public.tiktok_settlements add column if not exists customer_shipping_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists fee_per_item_cents bigint;
alter table public.tiktok_settlements add column if not exists icms_difal_cents bigint;
alter table public.tiktok_settlements add column if not exists icms_penalty_cents bigint;
alter table public.tiktok_settlements add column if not exists live_specials_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists net_sales_cents bigint;
alter table public.tiktok_settlements add column if not exists platform_cofunded_discount_cents bigint;
alter table public.tiktok_settlements add column if not exists platform_discounts_cents bigint;
alter table public.tiktok_settlements add column if not exists platform_discounts_refund_cents bigint;
alter table public.tiktok_settlements add column if not exists refund_seller_discounts_cents bigint;
alter table public.tiktok_settlements add column if not exists refund_subtotal_cents bigint;
alter table public.tiktok_settlements add column if not exists refunded_shipping_cents bigint;
alter table public.tiktok_settlements add column if not exists seller_cofunded_discount_cents bigint;
alter table public.tiktok_settlements add column if not exists seller_cofunded_discount_refund_cents bigint;
alter table public.tiktok_settlements add column if not exists seller_discounts_cents bigint;
alter table public.tiktok_settlements add column if not exists sfp_service_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists shipping_incentive_cents bigint;
alter table public.tiktok_settlements add column if not exists shipping_incentive_refund_cents bigint;
alter table public.tiktok_settlements add column if not exists shipping_subsidy_cents bigint;
alter table public.tiktok_settlements add column if not exists shipping_total_cents bigint;
alter table public.tiktok_settlements add column if not exists subtotal_before_discounts_cents bigint;
alter table public.tiktok_settlements add column if not exists tiktok_commission_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists tiktok_shipping_fee_cents bigint;
alter table public.tiktok_settlements add column if not exists total_fees_cents bigint;
alter table public.tiktok_settlements add column if not exists total_settlement_amount_cents bigint;
alter table public.tiktok_settlements add column if not exists voucher_xtra_fee_cents bigint;

update public.tiktok_settlements set
  actual_return_shipping_fee_cents = round(actual_return_shipping_fee * 100),
  adjustment_amount_cents = round(adjustment_amount * 100),
  affiliate_commission_cents = round(affiliate_commission * 100),
  affiliate_partner_commission_cents = round(affiliate_partner_commission * 100),
  affiliate_shop_ads_commission_cents = round(affiliate_shop_ads_commission * 100),
  bonus_cashback_fee_cents = round(bonus_cashback_fee * 100),
  customer_payment_cents = round(customer_payment * 100),
  customer_refund_cents = round(customer_refund * 100),
  customer_shipping_fee_cents = round(customer_shipping_fee * 100),
  fee_per_item_cents = round(fee_per_item * 100),
  icms_difal_cents = round(icms_difal * 100),
  icms_penalty_cents = round(icms_penalty * 100),
  live_specials_fee_cents = round(live_specials_fee * 100),
  net_sales_cents = round(net_sales * 100),
  platform_cofunded_discount_cents = round(platform_cofunded_discount * 100),
  platform_discounts_cents = round(platform_discounts * 100),
  platform_discounts_refund_cents = round(platform_discounts_refund * 100),
  refund_seller_discounts_cents = round(refund_seller_discounts * 100),
  refund_subtotal_cents = round(refund_subtotal * 100),
  refunded_shipping_cents = round(refunded_shipping * 100),
  seller_cofunded_discount_cents = round(seller_cofunded_discount * 100),
  seller_cofunded_discount_refund_cents = round(seller_cofunded_discount_refund * 100),
  seller_discounts_cents = round(seller_discounts * 100),
  sfp_service_fee_cents = round(sfp_service_fee * 100),
  shipping_incentive_cents = round(shipping_incentive * 100),
  shipping_incentive_refund_cents = round(shipping_incentive_refund * 100),
  shipping_subsidy_cents = round(shipping_subsidy * 100),
  shipping_total_cents = round(shipping_total * 100),
  subtotal_before_discounts_cents = round(subtotal_before_discounts * 100),
  tiktok_commission_fee_cents = round(tiktok_commission_fee * 100),
  tiktok_shipping_fee_cents = round(tiktok_shipping_fee * 100),
  total_fees_cents = round(total_fees * 100),
  total_settlement_amount_cents = round(total_settlement_amount * 100),
  voucher_xtra_fee_cents = round(voucher_xtra_fee * 100)
where total_settlement_amount_cents is null;

create or replace function public.sync_tiktok_settlements_money_cents()
returns trigger language plpgsql as $$
begin
  new.actual_return_shipping_fee_cents := round(new.actual_return_shipping_fee * 100);
  new.adjustment_amount_cents := round(new.adjustment_amount * 100);
  new.affiliate_commission_cents := round(new.affiliate_commission * 100);
  new.affiliate_partner_commission_cents := round(new.affiliate_partner_commission * 100);
  new.affiliate_shop_ads_commission_cents := round(new.affiliate_shop_ads_commission * 100);
  new.bonus_cashback_fee_cents := round(new.bonus_cashback_fee * 100);
  new.customer_payment_cents := round(new.customer_payment * 100);
  new.customer_refund_cents := round(new.customer_refund * 100);
  new.customer_shipping_fee_cents := round(new.customer_shipping_fee * 100);
  new.fee_per_item_cents := round(new.fee_per_item * 100);
  new.icms_difal_cents := round(new.icms_difal * 100);
  new.icms_penalty_cents := round(new.icms_penalty * 100);
  new.live_specials_fee_cents := round(new.live_specials_fee * 100);
  new.net_sales_cents := round(new.net_sales * 100);
  new.platform_cofunded_discount_cents := round(new.platform_cofunded_discount * 100);
  new.platform_discounts_cents := round(new.platform_discounts * 100);
  new.platform_discounts_refund_cents := round(new.platform_discounts_refund * 100);
  new.refund_seller_discounts_cents := round(new.refund_seller_discounts * 100);
  new.refund_subtotal_cents := round(new.refund_subtotal * 100);
  new.refunded_shipping_cents := round(new.refunded_shipping * 100);
  new.seller_cofunded_discount_cents := round(new.seller_cofunded_discount * 100);
  new.seller_cofunded_discount_refund_cents := round(new.seller_cofunded_discount_refund * 100);
  new.seller_discounts_cents := round(new.seller_discounts * 100);
  new.sfp_service_fee_cents := round(new.sfp_service_fee * 100);
  new.shipping_incentive_cents := round(new.shipping_incentive * 100);
  new.shipping_incentive_refund_cents := round(new.shipping_incentive_refund * 100);
  new.shipping_subsidy_cents := round(new.shipping_subsidy * 100);
  new.shipping_total_cents := round(new.shipping_total * 100);
  new.subtotal_before_discounts_cents := round(new.subtotal_before_discounts * 100);
  new.tiktok_commission_fee_cents := round(new.tiktok_commission_fee * 100);
  new.tiktok_shipping_fee_cents := round(new.tiktok_shipping_fee * 100);
  new.total_fees_cents := round(new.total_fees * 100);
  new.total_settlement_amount_cents := round(new.total_settlement_amount * 100);
  new.voucher_xtra_fee_cents := round(new.voucher_xtra_fee * 100);
  return new;
end;
$$;

drop trigger if exists sync_money_cents on public.tiktok_settlements;
create trigger sync_money_cents
  before insert or update on public.tiktok_settlements
  for each row execute function public.sync_tiktok_settlements_money_cents();
