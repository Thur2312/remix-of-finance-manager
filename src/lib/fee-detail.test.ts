import { describe, it, expect } from 'vitest';
import {
  aggregateShopeeFeesBySku, feeRateSeries, effectiveFeeRatePct, feeBreakdownSemFrete,
} from './fee-detail';

const order = (id: string, items: { sku: string; name?: string; qty: number; price: number }[]) => ({
  id,
  order_items: items.map((it, i) => ({
    external_item_id: `${id}-${i}`,
    item_name: it.name ?? it.sku,
    sku: it.sku,
    quantity: it.qty,
    total_price: it.price,
  })),
});
const escrow = (orderId: string, net: number) => ({
  order_id: orderId, payment_method: 'escrow', net_amount: net,
});

describe('aggregateShopeeFeesBySku', () => {
  it('retido = faturado − repasse, por SKU, ordenado por retido desc', () => {
    const orders = [
      order('o1', [{ sku: 'A', qty: 1, price: 100 }]),
      order('o2', [{ sku: 'B', qty: 1, price: 50 }]),
    ];
    const payments = [escrow('o1', 82), escrow('o2', 45)];
    const rows = aggregateShopeeFeesBySku(orders, payments);
    expect(rows.map(r => r.key)).toEqual(['A', 'B']); // A reteve 18, B reteve 5
    expect(rows[0]).toMatchObject({ faturado: 100, retido: 18, taxaEfetivaPct: 18 });
    expect(rows[1]).toMatchObject({ faturado: 50, retido: 5, taxaEfetivaPct: 10 });
  });

  it('rateia o repasse entre itens do mesmo pedido pela receita', () => {
    const orders = [order('o1', [
      { sku: 'A', qty: 1, price: 75 },
      { sku: 'B', qty: 1, price: 25 },
    ])];
    const payments = [escrow('o1', 80)]; // reteve 20 no total
    const rows = aggregateShopeeFeesBySku(orders, payments);
    const a = rows.find(r => r.key === 'A')!;
    const b = rows.find(r => r.key === 'B')!;
    expect(a.retido).toBeCloseTo(15, 5); // 75% de 20
    expect(b.retido).toBeCloseTo(5, 5);
  });

  it('ignora item de pedido sem repasse (não dá pra saber o retido)', () => {
    const orders = [order('o1', [{ sku: 'A', qty: 1, price: 100 }])];
    expect(aggregateShopeeFeesBySku(orders, [])).toEqual([]);
  });
});

describe('feeRateSeries', () => {
  it('deriva taxa efetiva por dia e ordena por data', () => {
    const s = feeRateSeries([
      { date: '2026-09-02', faturamento: 200, liquido: 160 },
      { date: '2026-09-01', faturamento: 100, liquido: 82 },
    ]);
    expect(s.map(p => p.date)).toEqual(['2026-09-01', '2026-09-02']);
    expect(s[0].taxaEfetivaPct).toBeCloseTo(18, 5);
    expect(s[1].taxaEfetivaPct).toBeCloseTo(20, 5);
  });

  it('dia sem faturamento → taxa 0, sem divisão por zero', () => {
    const s = feeRateSeries([{ date: '2026-09-01', faturamento: 0, liquido: 0 }]);
    expect(s[0].taxaEfetivaPct).toBe(0);
  });
});

describe('effectiveFeeRatePct', () => {
  it('retido sobre faturamento', () => {
    expect(effectiveFeeRatePct(1000, 800)).toBeCloseTo(20, 5);
  });
  it('sem faturamento → 0', () => {
    expect(effectiveFeeRatePct(0, 0)).toBe(0);
  });
});

describe('feeBreakdownSemFrete', () => {
  const bd = [
    { type: 'commission', amount: 20 },
    { type: 'shipping_fee', amount: 15 },
    { type: 'service_fee', amount: 5 },
    { type: 'reverse_shipping_fee', amount: 3 },
    { type: 'adjustment', amount: -2 },
  ];

  it('remove frete e frete reverso, mantém o resto na ordem', () => {
    expect(feeBreakdownSemFrete(bd).map(f => f.type)).toEqual(['commission', 'service_fee', 'adjustment']);
  });

  it('lista sem frete passa intacta', () => {
    const semFrete = [{ type: 'commission', amount: 1 }];
    expect(feeBreakdownSemFrete(semFrete)).toEqual(semFrete);
  });
});
