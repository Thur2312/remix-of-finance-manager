import { describe, it, expect } from 'vitest';
import { buildMarginPoints, detectMarginErosion, type MarginPoint } from './margin-erosion';

// ── buildMarginPoints ────────────────────────────────────────────────────────

const item = (p: Partial<{ external_item_id: string; item_name: string; sku: string; quantity: number; total_price: number }> = {}) => ({
  external_item_id: p.external_item_id ?? 'ext1',
  item_name: p.item_name ?? 'Produto',
  sku: p.sku ?? 'SKU1',
  quantity: p.quantity ?? 1,
  total_price: p.total_price ?? 100,
});
const order = (p: {
  id: string; status?: string; order_updated_at?: string; items: ReturnType<typeof item>[];
}) => ({
  id: p.id,
  status: p.status ?? 'COMPLETED',
  order_updated_at: p.order_updated_at ?? '2026-09-05T00:00:00Z',
  order_items: p.items,
});
const pay = (order_id: string, net_amount: number) => ({ order_id, payment_method: 'escrow', net_amount });
const cost = (p: Partial<{ external_item_id: string | null; sku: string | null; cost: number; packaging_cost: number; other_costs: number }>) => ({
  external_item_id: p.external_item_id ?? null,
  sku: p.sku ?? null,
  cost: p.cost ?? 0,
  packaging_cost: p.packaging_cost ?? 0,
  other_costs: p.other_costs ?? 0,
});

describe('buildMarginPoints', () => {
  it('recorta pela janela (order_updated_at) e ignora pedido não concluído', () => {
    const orders = [
      order({ id: 'dentro', items: [item({ sku: 'X', total_price: 100 })] }),
      order({ id: 'cancelado', status: 'CANCELLED', items: [item({ sku: 'X', total_price: 100 })] }),
      order({ id: 'fora', order_updated_at: '2026-08-01T00:00:00Z', items: [item({ sku: 'X', total_price: 100 })] }),
    ];
    const points = buildMarginPoints(
      orders, [pay('dentro', 80), pay('cancelado', 80), pay('fora', 80)], [],
      { sinceIso: '2026-09-01T00:00:00Z', untilIso: '2026-09-10T00:00:00Z' },
    );
    expect(points).toHaveLength(1);
    expect(points[0].faturamento).toBe(100);
  });

  it('sem custo cadastrado → margemPct null (não dá pra apurar)', () => {
    const orders = [order({ id: 'a', items: [item({ sku: 'X', total_price: 100 })] })];
    const points = buildMarginPoints(orders, [pay('a', 70)], [], { sinceIso: '2020-01-01T00:00:00Z' });
    expect(points[0].margemPct).toBeNull();
  });

  it('com custo cadastrado → margemPct = lucro/faturamento', () => {
    const orders = [order({ id: 'a', items: [item({ sku: 'X', total_price: 100, quantity: 1 })] })];
    const points = buildMarginPoints(orders, [pay('a', 70)], [cost({ sku: 'X', cost: 20 })], { sinceIso: '2020-01-01T00:00:00Z' });
    expect(points[0].margemPct).toBeCloseTo(50, 5); // (70 - 20) / 100 * 100
    expect(points[0].precoMedio).toBe(100);
    expect(points[0].taxaEfetivaPct).toBeCloseTo(30, 5); // (100-70)/100
  });
});

// ── detectMarginErosion ──────────────────────────────────────────────────────

const point = (p: Partial<MarginPoint> & { key: string }): MarginPoint => ({
  sku: p.key,
  nome: p.key,
  unidades: 10,
  faturamento: 1000,
  custoUnit: 50,
  precoMedio: 100,
  taxaEfetivaPct: 20,
  margemPct: 30,
  ...p,
});

describe('detectMarginErosion', () => {
  it('queda pequena, sem cruzar zero → não alerta', () => {
    const r = detectMarginErosion([point({ key: 'a', margemPct: 28 })], [point({ key: 'a', margemPct: 30 })]);
    expect(r).toEqual([]);
  });

  it('queda acima do limiar → alerta com o delta certo', () => {
    const r = detectMarginErosion([point({ key: 'a', margemPct: 10 })], [point({ key: 'a', margemPct: 30 })], { quedaMinimaPP: 8 });
    expect(r).toHaveLength(1);
    expect(r[0].deltaMargemPct).toBeCloseTo(-20, 5);
    expect(r[0].cruzouZero).toBe(false);
  });

  it('cruzou de positivo pra negativo → alerta mesmo com queda pequena', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: -1 })],
      [point({ key: 'a', margemPct: 2 })],
      { quedaMinimaPP: 8 },
    );
    expect(r).toHaveLength(1);
    expect(r[0].cruzouZero).toBe(true);
  });

  it('margemPct null em qualquer lado → ignora (sem custo, não dá pra apurar)', () => {
    expect(detectMarginErosion([point({ key: 'a', margemPct: null })], [point({ key: 'a', margemPct: 30 })])).toEqual([]);
    expect(detectMarginErosion([point({ key: 'a', margemPct: 5 })], [point({ key: 'a', margemPct: null })])).toEqual([]);
  });

  it('sem unidades suficientes em qualquer período → ignora', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: 5, unidades: 1 })],
      [point({ key: 'a', margemPct: 30 })],
      { unidadesMinimas: 2 },
    );
    expect(r).toEqual([]);
  });

  it('sem correspondente no período anterior → ignora (sem base de comparação)', () => {
    const r = detectMarginErosion([point({ key: 'novo', margemPct: -5 })], [point({ key: 'outro', margemPct: 30 })]);
    expect(r).toEqual([]);
  });

  it('aponta custo_subiu quando é o maior impacto em R$', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: 10, custoUnit: 70 })],
      [point({ key: 'a', margemPct: 30, custoUnit: 50 })],
    );
    expect(r[0].causaProvavel).toBe('custo_subiu');
  });

  it('aponta taxa_subiu quando é o maior impacto em R$', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: 10, taxaEfetivaPct: 40 })],
      [point({ key: 'a', margemPct: 30, taxaEfetivaPct: 20 })],
    );
    expect(r[0].causaProvavel).toBe('taxa_subiu');
  });

  it('aponta preco_caiu quando é o maior impacto em R$', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: 10, precoMedio: 80 })],
      [point({ key: 'a', margemPct: 30, precoMedio: 100 })],
    );
    expect(r[0].causaProvavel).toBe('preco_caiu');
  });

  it('impactoReais é a magnitude em R$ da queda de margem sobre o faturamento atual', () => {
    const r = detectMarginErosion(
      [point({ key: 'a', margemPct: 10, faturamento: 1000 })],
      [point({ key: 'a', margemPct: 30 })],
    );
    expect(r[0].impactoReais).toBeCloseTo(200, 5); // 20pp de 1000
  });

  it('ordena do pior delta pro melhor', () => {
    const r = detectMarginErosion(
      [point({ key: 'leve', margemPct: 15 }), point({ key: 'grave', margemPct: -5 })],
      [point({ key: 'leve', margemPct: 30 }), point({ key: 'grave', margemPct: 30 })],
    );
    expect(r.map(i => i.key)).toEqual(['grave', 'leve']);
  });
});
