import { describe, it, expect } from 'vitest';
import { aggregateShopeeSkuFinance } from './shopee-sku-finance';

const item = (p: Partial<{ external_item_id: string; item_name: string; sku: string; quantity: number; total_price: number }> = {}) => ({
  external_item_id: p.external_item_id ?? 'ext1',
  item_name: p.item_name ?? 'Produto',
  sku: p.sku ?? 'SKU1',
  quantity: p.quantity ?? 1,
  total_price: p.total_price ?? 100,
});
const order = (id: string, items: ReturnType<typeof item>[]) => ({ id, order_items: items });
const pay = (order_id: string, net_amount: number) => ({ order_id, payment_method: 'escrow', net_amount });
const cost = (p: Partial<{ external_item_id: string | null; sku: string | null; cost: number; packaging_cost: number; other_costs: number }>) => ({
  external_item_id: p.external_item_id ?? null,
  sku: p.sku ?? null,
  cost: p.cost ?? 0,
  packaging_cost: p.packaging_cost ?? 0,
  other_costs: p.other_costs ?? 0,
});

describe('aggregateShopeeSkuFinance', () => {
  it('entrada vazia → []', () => {
    expect(aggregateShopeeSkuFinance([], [], [])).toEqual([]);
  });

  it('pedido sem repasse (escrow) é ignorado por inteiro', () => {
    const rows = aggregateShopeeSkuFinance([order('o1', [item()])], [], []);
    expect(rows).toEqual([]);
  });

  it('rateia o repasse entre os itens proporcional à receita', () => {
    const rows = aggregateShopeeSkuFinance(
      [order('o1', [item({ sku: 'A', total_price: 75 }), item({ sku: 'B', total_price: 25 })])],
      [pay('o1', 80)],
      [],
    );
    const a = rows.find(r => r.sku === 'A')!;
    const b = rows.find(r => r.sku === 'B')!;
    expect(a.net).toBeCloseTo(60, 6); // 80 * 75/100
    expect(b.net).toBeCloseTo(20, 6); // 80 * 25/100
    expect(a.total_faturado).toBe(75);
  });

  it('junta custo por external_item_id e por sku (fallback)', () => {
    const rows = aggregateShopeeSkuFinance(
      [order('o1', [item({ external_item_id: 'X', sku: 'A', quantity: 2, total_price: 200 })])],
      [pay('o1', 150)],
      [cost({ external_item_id: 'X', cost: 30, packaging_cost: 2 })],
    );
    const r = rows[0];
    expect(r.custo_unitario_medio).toBe(32);
    expect(r.lucro_reais).toBeCloseTo(150 - 32 * 2, 6); // 86
  });

  it('sem custo cadastrado → custo 0 e lucro = repasse (não desconta nada)', () => {
    const rows = aggregateShopeeSkuFinance([order('o1', [item({ sku: 'A', total_price: 100 })])], [pay('o1', 70)], []);
    expect(rows[0].custo_unitario_medio).toBe(0);
    expect(rows[0].lucro_reais).toBeCloseTo(70, 6);
  });

  it('mesmo SKU em vários pedidos → soma', () => {
    const rows = aggregateShopeeSkuFinance(
      [order('o1', [item({ sku: 'A', quantity: 1, total_price: 100 })]), order('o2', [item({ sku: 'A', quantity: 3, total_price: 300 })])],
      [pay('o1', 80), pay('o2', 240)],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].itens_vendidos).toBe(4);
    expect(rows[0].total_faturado).toBe(400);
    expect(rows[0].net).toBeCloseTo(320, 6);
  });
});
