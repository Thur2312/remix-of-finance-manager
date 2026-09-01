import { describe, it, expect } from 'vitest';
import {
  calculateDRE,
  type ShopeeOrderDRE,
  type TikTokOrder,
  type TikTokSettlement,
  type FixedCost,
  type ShopeeSettings,
  type TikTokSettings,
  type MlOrder,
  type CashFlowEntry,
  type DREPeriod,
} from './dre-calculations';
import { toCents } from './money';

const PERIOD: DREPeriod = {
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-01-31T23:59:59Z'),
  label: 'Janeiro',
};

const shopeeSettings: ShopeeSettings = {
  taxa_comissao_shopee: 14,
  adicional_por_item: 0.5,
  percentual_nf_entrada: 2,
  gasto_shopee_ads: 45.9,
};

const tiktokSettings: TikTokSettings = {
  taxa_comissao_tiktok: 6,
  taxa_afiliado: 2,
  adicional_por_item: 0.3,
  percentual_nf_entrada: 1,
  gasto_tiktok_ads: 20,
};

function shopeeOrder(p: Partial<ShopeeOrderDRE> = {}): ShopeeOrderDRE {
  const total_faturado = p.total_faturado ?? 100;
  const custo_unitario = p.custo_unitario ?? 20;
  return {
    id: p.id ?? 's1',
    total_faturado,
    total_faturado_cents: p.total_faturado_cents ?? Math.round(total_faturado * 100),
    custo_unitario,
    custo_unitario_cents: p.custo_unitario_cents ?? Math.round(custo_unitario * 100),
    quantidade: p.quantidade ?? 1,
    data_pedido: p.data_pedido ?? '2026-01-15',
  };
}

function tiktokOrder(p: Partial<TikTokOrder> = {}): TikTokOrder {
  const total_faturado = p.total_faturado ?? 80;
  const custo_unitario = p.custo_unitario ?? 15;
  return {
    id: p.id ?? 't1',
    user_id: 'u1',
    order_id: p.order_id ?? 'ext-t1',
    nome_produto: null,
    variacao: null,
    sku: null,
    quantidade: p.quantidade ?? 1,
    total_faturado,
    total_faturado_cents: p.total_faturado_cents ?? Math.round(total_faturado * 100),
    custo_unitario,
    custo_unitario_cents: p.custo_unitario_cents ?? Math.round(custo_unitario * 100),
    data_pedido: p.data_pedido ?? '2026-01-15',
    status_pedido: 'concluido',
    desconto_plataforma: 0,
    desconto_vendedor: 0,
  };
}

function settlement(p: Partial<TikTokSettlement> = {}): TikTokSettlement {
  const base: TikTokSettlement = {
    id: p.id ?? 'st1',
    user_id: 'u1',
    order_id: null,
    statement_date: p.statement_date ?? '2026-01-15',
    data_criacao_pedido: null,
    data_entrega: null,
    nome_produto: null,
    variacao: null,
    sku_id: null,
    quantidade: null,
    type: p.type ?? null,
    status: null,
    total_settlement_amount: null,
    net_sales: null,
    subtotal_before_discounts: null,
    customer_payment: null,
    customer_refund: null,
    refund_subtotal: null,
    seller_discounts: null,
    refund_seller_discounts: null,
    platform_discounts: null,
    platform_discounts_refund: null,
    seller_cofunded_discount: null,
    seller_cofunded_discount_refund: null,
    platform_cofunded_discount: null,
    tiktok_shipping_fee: null,
    customer_shipping_fee: null,
    refunded_shipping: null,
    shipping_incentive: null,
    shipping_incentive_refund: null,
    shipping_subsidy: null,
    shipping_total: null,
    actual_return_shipping_fee: null,
    total_fees: null,
    tiktok_commission_fee: null,
    affiliate_commission: null,
    affiliate_partner_commission: null,
    affiliate_shop_ads_commission: null,
    sfp_service_fee: null,
    fee_per_item: null,
    voucher_xtra_fee: null,
    live_specials_fee: null,
    bonus_cashback_fee: null,
    icms_difal: null,
    icms_penalty: null,
    adjustment_amount: null,
    adjustment_reason: null,
    ...p,
  };
  // Deriva os *_cents de qualquer campo numérico não sobrescrito explicitamente.
  const withCents: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(base)) {
    if (typeof value === 'number' && !(`${key}_cents` in p)) {
      withCents[`${key}_cents`] = Math.round(value * 100);
    }
  }
  return withCents as unknown as TikTokSettlement;
}

function fixedCost(p: Partial<FixedCost> = {}): FixedCost {
  const amount = p.amount ?? 100;
  return {
    id: p.id ?? 'fc1',
    user_id: 'u1',
    category: p.category ?? 'Software',
    name: p.name ?? 'Assinatura',
    amount,
    amount_cents: p.amount_cents ?? Math.round(amount * 100),
    is_recurring: p.is_recurring ?? true,
  };
}

function mlOrder(p: Partial<MlOrder> = {}): MlOrder {
  const total_faturado = p.total_faturado ?? 60;
  const custo_unitario = p.custo_unitario ?? 10;
  const taxa_ml = p.taxa_ml ?? 6;
  const frete_ml = p.frete_ml ?? 4;
  return {
    user_id: 'u1',
    order_id: p.order_id ?? 'ml1',
    sku: null,
    nome_produto: null,
    variacao: null,
    quantidade: p.quantidade ?? 1,
    total_faturado,
    total_faturado_cents: p.total_faturado_cents ?? Math.round(total_faturado * 100),
    desconto_plataforma: 0,
    desconto_plataforma_cents: 0,
    desconto_vendedor: 0,
    desconto_vendedor_cents: 0,
    custo_unitario,
    custo_unitario_cents: p.custo_unitario_cents ?? Math.round(custo_unitario * 100),
    taxa_ml,
    taxa_ml_cents: p.taxa_ml_cents ?? Math.round(taxa_ml * 100),
    frete_ml,
    frete_ml_cents: p.frete_ml_cents ?? Math.round(frete_ml * 100),
    status_pedido: p.status_pedido ?? 'paid',
    data_pedido: p.data_pedido ?? '2026-01-15',
    updated_at: '2026-01-15',
  };
}

function cashFlowEntry(p: Partial<CashFlowEntry> = {}): CashFlowEntry {
  const amount = p.amount ?? 50;
  return {
    id: p.id ?? 'cf1',
    user_id: 'u1',
    description: p.description ?? 'Lançamento',
    amount,
    amount_cents: p.amount_cents ?? Math.round(amount * 100),
    type: p.type ?? 'income',
    status: p.status ?? 'received',
    due_date: p.due_date ?? '2026-01-15',
    category_id: p.category_id ?? null,
    notes: null,
    created_at: '2026-01-15',
  };
}

const closeEnough = (a: number, b: number, tol = 2) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe('calculateDRE — campos *Cents batem (ou ficam próximos) de toCents() dos campos em reais', () => {
  it('cenário completo: Shopee + TikTok + ML + custos fixos + fluxo de caixa', () => {
    const dre = calculateDRE(
      [shopeeOrder({ total_faturado: 337.5, custo_unitario: 45, quantidade: 3 })],
      [tiktokOrder({ total_faturado: 129.9, custo_unitario: 22.3 })],
      [
        settlement({ tiktok_commission_fee: 12.4, affiliate_commission: 3.2, sfp_service_fee: 1.1, order_id: 'ext-t1', statement_date: '2026-01-15' }),
      ],
      [fixedCost({ amount: 300, category: 'Software' }), fixedCost({ amount: 150, category: 'Ferramentas' })],
      shopeeSettings,
      tiktokSettings,
      PERIOD,
      [mlOrder({ total_faturado: 89.9, custo_unitario: 30 })],
      [cashFlowEntry({ type: 'income', status: 'received', amount: 40 }), cashFlowEntry({ type: 'expense', status: 'paid', amount: 25, category_id: 'ads' })],
    );

    // Somas puras — sempre exatas.
    expect(dre.receitaBrutaShopeeCents).toBe(toCents(dre.receitaBrutaShopee));
    expect(dre.receitaBrutaTikTokCents).toBe(toCents(dre.receitaBrutaTikTok));
    expect(dre.receitaBrutaMercadoLivreCents).toBe(toCents(dre.receitaBrutaMercadoLivre));
    expect(dre.receitaBrutaExtraCents).toBe(toCents(dre.receitaBrutaExtra));
    expect(dre.receitaBrutaTotalCents).toBe(toCents(dre.receitaBrutaTotal));
    expect(dre.custoProdutosCents).toBe(toCents(dre.custoProdutos));
    expect(dre.custosFixosTotalCents).toBe(toCents(dre.custosFixosTotal));
    expect(dre.outrasDespesasFluxoCents).toBe(toCents(dre.outrasDespesasFluxo));

    // Campos encadeados (percentual sobre base + várias subtrações) — toleram
    // 1-2 centavos de divergência por arredondamento em cascata (esperado,
    // mesmo motivo do caso TikTok em tiktok-calculations.test.ts).
    closeEnough(dre.impostosSobreVendasTotalCents, toCents(dre.impostosSobreVendasTotal));
    closeEnough(dre.cogsTotalCents, toCents(dre.cogsTotal));
    closeEnough(dre.comissoesMarketplaceCents, toCents(dre.comissoesMarketplace));
    closeEnough(dre.custosVariaveisTotalCents, toCents(dre.custosVariaveisTotal));
    closeEnough(dre.margemContribuicaoCents, toCents(dre.margemContribuicao));
    closeEnough(dre.lucroOperacionalCents, toCents(dre.lucroOperacional));
    closeEnough(dre.lucroLiquidoCents, toCents(dre.lucroLiquido), 3);
  });

  it('devoluções: Math.abs(refund_subtotal || customer_refund) também em centavos', () => {
    const dre = calculateDRE(
      [],
      [],
      [settlement({ type: 'Refund', refund_subtotal: -45.5, statement_date: '2026-01-10' })],
      [],
      shopeeSettings,
      tiktokSettings,
      PERIOD,
    );
    expect(dre.devolucoes).toBe(45.5);
    expect(dre.devolucoesCents).toBe(4550);
  });

  it('custos fixos prorrateados: rateio por proporção do período, em centavos', () => {
    const periodoQuinzenal: DREPeriod = {
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-15T23:59:59Z'),
      label: '15 dias',
    };
    const dre = calculateDRE(
      [],
      [],
      [],
      [fixedCost({ amount: 300, category: 'Software' })],
      shopeeSettings,
      tiktokSettings,
      periodoQuinzenal,
    );
    // 15 dias / 30 = 0.5 → 300 * 0.5 = 150,00 → 15000 centavos
    expect(dre.custosFixosProrrateadosCents).toBe(15000);
    expect(dre.custosFixosProrrateadosCents).toBe(toCents(dre.custosFixosProrrateados));
  });

  it('entrada vazia → tudo zero, sem NaN', () => {
    const dre = calculateDRE([], [], [], [], null, null, PERIOD);
    expect(dre.receitaBrutaTotalCents).toBe(0);
    expect(dre.lucroLiquidoCents).toBe(0);
    expect(Number.isNaN(dre.margemLiquida)).toBe(false);
  });
});

describe('calculateDRE — imposto da empresa (companies.tax_rate / tax_base)', () => {
  const shopee = [shopeeOrder({ total_faturado: 1000, custo_unitario: 0, quantidade: 1 })];
  const tiktok = [tiktokOrder({ total_faturado: 500, custo_unitario: 0, quantidade: 1 })];
  const ml = [mlOrder({ total_faturado: 300, custo_unitario: 0, taxa_ml: 0, frete_ml: 0 })];

  it('sem empresa → nenhum ISS/Simples estimado (só ICMS real, aqui 0)', () => {
    const dre = calculateDRE(shopee, tiktok, [], [], shopeeSettings, tiktokSettings, PERIOD, ml, [], null);
    expect(dre.issSimples).toBe(0);
    expect(dre.impostosSobreVendasTotal).toBe(0);
    expect(dre.impostosSobreLucro).toBe(0);
    expect(dre.alertas.some(a => a.campo === 'impostosSobreVendasTotal')).toBe(true);
  });

  it('tax_base="revenue" → ISS = alíquota sobre a receita de vendas dos marketplaces', () => {
    const dre = calculateDRE(shopee, tiktok, [], [], shopeeSettings, tiktokSettings, PERIOD, ml, [], { tax_rate: 6, tax_base: 'revenue' });
    // (1000 + 500 + 300) * 6% = 108
    expect(dre.issSimples).toBeCloseTo(108, 6);
    expect(dre.issSimplesCents).toBe(10800);
    expect(dre.impostosSobreVendasTotal).toBeCloseTo(108, 6);
    expect(dre.impostosSobreLucro).toBe(0);
  });

  it('tax_base="profit" → nada na linha de vendas; imposto entra na linha de lucro', () => {
    const dre = calculateDRE(shopee, tiktok, [], [], shopeeSettings, tiktokSettings, PERIOD, ml, [], { tax_rate: 10, tax_base: 'profit' });
    expect(dre.issSimples).toBe(0);
    expect(dre.impostosSobreLucro).toBeGreaterThan(0);
    // imposto = 10% do resultado antes do IRPJ (lucro operacional − outras despesas)
    expect(dre.impostosSobreLucro).toBeCloseTo(Math.max(0, dre.lucroOperacional) * 0.10, 4);
    expect(dre.despesasFinanceirasTotal).toBeCloseTo(dre.impostosSobreLucro, 6);
    expect(dre.lucroLiquido).toBeCloseTo(dre.lucroOperacional - dre.impostosSobreLucro, 4);
  });

  it('tax_base="profit" com prejuízo operacional → imposto sobre lucro = 0 (guard)', () => {
    const dre = calculateDRE(
      shopee, tiktok, [],
      [fixedCost({ amount: 5000, category: 'Aluguel' })],
      shopeeSettings, tiktokSettings, PERIOD, ml, [],
      { tax_rate: 10, tax_base: 'profit' },
    );
    expect(dre.lucroOperacional).toBeLessThan(0);
    expect(dre.impostosSobreLucro).toBe(0);
    expect(dre.impostosSobreLucroCents).toBe(0);
  });

  it('imposto_nf_saida das settings é ignorado — só a empresa manda', () => {
    const withField = { ...shopeeSettings } as ShopeeSettings & { imposto_nf_saida: number };
    withField.imposto_nf_saida = 99;
    const dre = calculateDRE(shopee, [], [], [], withField, null, PERIOD, [], [], null);
    expect(dre.issSimples).toBe(0);
  });
});
