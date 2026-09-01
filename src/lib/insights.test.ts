import { describe, it, expect } from 'vitest';
import { dreInsights, shopeeFinanceInsights, buildInsights } from './insights';
import { calculateDRE, type ShopeeOrderDRE, type FixedCost, type DREPeriod } from './dre-calculations';
import type { ShopeeFinance } from './shopee-sync-status';
import type { Cents } from './money';

const PERIOD: DREPeriod = {
  start: new Date('2026-01-01T00:00:00Z'),
  end: new Date('2026-01-31T23:59:59Z'),
  label: 'Janeiro',
};

function shopeeOrder(p: Partial<ShopeeOrderDRE> = {}): ShopeeOrderDRE {
  const total_faturado = p.total_faturado ?? 100;
  const custo_unitario = p.custo_unitario ?? 0;
  return {
    id: p.id ?? `s${Math.random()}`,
    total_faturado,
    total_faturado_cents: Math.round(total_faturado * 100),
    custo_unitario,
    custo_unitario_cents: Math.round(custo_unitario * 100),
    quantidade: p.quantidade ?? 1,
    data_pedido: p.data_pedido ?? '2026-01-15',
  };
}

function fixedCost(amount: number, category = 'Aluguel'): FixedCost {
  return { id: `fc${Math.random()}`, user_id: 'u1', category, name: 'x', amount, amount_cents: Math.round(amount * 100), is_recurring: true };
}

// DRE real via calculateDRE — evita montar 60 campos na mão.
function dre(opts: {
  shopee?: ShopeeOrderDRE[];
  tiktokFaturado?: number;
  fixed?: FixedCost[];
} = {}) {
  const tiktok = opts.tiktokFaturado
    ? [{ id: 't1', user_id: 'u1', order_id: 'x', nome_produto: null, variacao: null, sku: null, quantidade: 1, total_faturado: opts.tiktokFaturado, total_faturado_cents: Math.round(opts.tiktokFaturado * 100), custo_unitario: 0, custo_unitario_cents: 0, data_pedido: '2026-01-15', status_pedido: 'concluido', desconto_plataforma: 0, desconto_vendedor: 0 }]
    : [];
  return calculateDRE(opts.shopee ?? [], tiktok, [], opts.fixed ?? [], null, null, PERIOD, [], [], null);
}

function fin(p: Partial<ShopeeFinance> = {}): ShopeeFinance {
  return {
    pedidos: 100, faturamento: 10000, valorLiquido: 6500, margemPct: 65,
    liberado: 6000, aLiberar: 500, pedidosSemRepasse: 8,
    emTransito: 0, cancelados: 0,
    feeBreakdown: [
      { type: 'commission', label: 'Comissão', amount: 2000, amountCents: 200000 as Cents },
      { type: 'service_fee', label: 'Taxa de serviço', amount: 1000, amountCents: 100000 as Cents },
      { type: 'shipping_fee', label: 'Frete', amount: 500, amountCents: 50000 as Cents },
    ],
    porDia: [],
    faturamentoCents: 1000000 as Cents,
    valorLiquidoCents: 650000 as Cents,
    liberadoCents: 600000 as Cents,
    aLiberarCents: 50000 as Cents,
    ...p,
  };
}

const ids = (arr: { id: string }[]) => arr.map(i => i.id);

describe('dreInsights', () => {
  it('receita zero → nenhum insight', () => {
    expect(dreInsights(dre())).toEqual([]);
  });

  it('custo fixo maior que a margem → prejuízo (critical) + custos fixos altos (warning)', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 1000 })], fixed: [fixedCost(5000)] });
    const got = dreInsights(d);
    expect(ids(got)).toContain('dre-prejuizo');
    expect(ids(got)).toContain('dre-custos-fixos-altos');
    expect(got.find(i => i.id === 'dre-prejuizo')!.severity).toBe('critical');
  });

  it('COGS gigante → margem de contribuição negativa (critical)', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 100, custo_unitario: 300, quantidade: 1 })] });
    const got = dreInsights(d);
    expect(ids(got)).toContain('dre-mc-negativa');
    // MC negativa e custos-fixos-altos são mutuamente exclusivos
    expect(ids(got)).not.toContain('dre-custos-fixos-altos');
  });

  it('sem custo de produto cadastrado → aviso de COGS zero', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 500, custo_unitario: 0 })] });
    const got = dreInsights(d);
    expect(ids(got)).toContain('dre-cogs-zero');
  });

  it('um canal com >75% da receita → insight de concentração', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 900 })], tiktokFaturado: 100 });
    const got = dreInsights(d);
    const conc = got.find(i => i.id === 'dre-concentracao-canal');
    expect(conc).toBeDefined();
    expect(conc!.metric).toBe('90%');
  });

  it('receita bem dividida entre canais → sem concentração', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 550 })], tiktokFaturado: 450 });
    expect(ids(dreInsights(d))).not.toContain('dre-concentracao-canal');
  });
});

describe('shopeeFinanceInsights', () => {
  it('faturamento zero → nada', () => {
    expect(shopeeFinanceInsights(fin({ faturamento: 0 }))).toEqual([]);
  });

  it('taxa efetiva sempre sai, decomposta, e vira warning acima de 35%', () => {
    const got = shopeeFinanceInsights(fin()); // retido 3500/10000 = 35%
    const taxa = got.find(i => i.id === 'shopee-taxa-efetiva')!;
    expect(taxa.metric).toBe('35%');
    expect(taxa.severity).toBe('warning');
    expect(taxa.detail).toContain('Comissão');
  });

  it('taxa efetiva baixa → info', () => {
    const got = shopeeFinanceInsights(fin({ valorLiquido: 8500 })); // retido 15%
    expect(got.find(i => i.id === 'shopee-taxa-efetiva')!.severity).toBe('info');
  });

  it('pedidos concluídos sem repasse → insight de dinheiro a liberar', () => {
    expect(ids(shopeeFinanceInsights(fin()))).toContain('shopee-a-liberar');
    expect(ids(shopeeFinanceInsights(fin({ pedidosSemRepasse: 0, aLiberar: 0 })))).not.toContain('shopee-a-liberar');
  });

  it('cancelamento acima de 15% → warning', () => {
    const got = shopeeFinanceInsights(fin({ pedidos: 70, cancelados: 30 }));
    const c = got.find(i => i.id === 'shopee-cancelamentos')!;
    expect(c.severity).toBe('warning');
    expect(c.metric).toBe('30%');
  });
});

describe('buildInsights', () => {
  it('ordena por severidade (critical primeiro) e dedup por id', () => {
    const d = dre({ shopee: [shopeeOrder({ total_faturado: 1000 })], fixed: [fixedCost(5000)] });
    const got = buildInsights({ dre: d, shopeeFinance: fin({ valorLiquido: 9000 }) });
    expect(got[0].severity).toBe('critical');
    expect(new Set(got.map(i => i.id)).size).toBe(got.length);
  });

  it('sem dados → lista vazia', () => {
    expect(buildInsights({})).toEqual([]);
    expect(buildInsights({ dre: null, shopeeFinance: null })).toEqual([]);
  });
});
