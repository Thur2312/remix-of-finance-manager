import { describe, it, expect } from 'vitest';
import { calculateResults, type RawOrder, type SettingsData } from './calculations';
import { toCents } from './money';

function settings(p: Partial<SettingsData> = {}): SettingsData {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Padrão',
    taxa_comissao_shopee: 0.14,
    adicional_por_item: 0.5,
    percentual_valor_antecipado: 0,
    taxa_antecipacao: 0,
    percentual_nf_entrada: 0,
    gasto_shopee_ads: 0,
    is_default: true,
    ...p,
  };
}

let seq = 0;
function order(p: Partial<RawOrder> = {}): RawOrder {
  seq++;
  const total_faturado = p.total_faturado ?? 100;
  const rebate_shopee = p.rebate_shopee ?? 0;
  const custo_unitario = p.custo_unitario ?? 20;
  return {
    id: p.id ?? `o${seq}`,
    user_id: 'u1',
    order_id: p.order_id ?? `ext${seq}`,
    sku: p.sku ?? 'SKU1',
    nome_produto: p.nome_produto ?? 'Produto 1',
    variacao: p.variacao ?? null,
    quantidade: p.quantidade ?? 1,
    total_faturado,
    total_faturado_cents: p.total_faturado_cents ?? Math.round(total_faturado * 100),
    rebate_shopee,
    rebate_shopee_cents: p.rebate_shopee_cents ?? Math.round(rebate_shopee * 100),
    custo_unitario,
    custo_unitario_cents: p.custo_unitario_cents ?? Math.round(custo_unitario * 100),
    data_pedido: p.data_pedido ?? '2026-01-20',
    status_pedido: p.status_pedido ?? 'concluido',
  };
}

describe('calculateResults — campos *Cents batem com toCents() dos campos em reais', () => {
  it('caso básico, sem desconto de NF', () => {
    const orders = [
      order({ sku: 'A', total_faturado: 100, custo_unitario: 20, quantidade: 1 }),
      order({ sku: 'A', total_faturado: 150, custo_unitario: 25, quantidade: 1 }),
      order({ sku: 'B', total_faturado: 80, custo_unitario: 10, quantidade: 2 }),
    ];
    const r = calculateResults(orders, settings());

    for (const g of r.groups) {
      expect(g.total_faturado_cents).toBe(toCents(g.total_faturado));
      expect(g.taxa_shopee_reais_cents).toBe(toCents(g.taxa_shopee_reais));
      expect(g.total_a_receber_cents).toBe(toCents(g.total_a_receber));
      expect(g.lucro_reais_cents).toBe(toCents(g.lucro_reais));
    }
    expect(r.totals.total_faturado_cents).toBe(toCents(r.totals.total_faturado));
    expect(r.totals.lucro_reais_cents).toBe(toCents(r.totals.lucro_reais));
  });

  it('lucro_reais é pré-imposto — não desconta imposto de saída (imposto por empresa)', () => {
    const orders = [order({ total_faturado: 300, custo_unitario: 40, quantidade: 2, sku: 'X' })];
    const r = calculateResults(orders, settings({ percentual_nf_entrada: 0 }));
    const g = r.groups[0];
    // lucro = a receber − custo produtos − NF entrada (sem imposto)
    expect(g.lucro_reais).toBeCloseTo(g.total_a_receber - g.total_gasto_produtos - g.nf_entrada, 6);
  });

  it('com gasto de ads (reduz o lucro líquido do total, não dos grupos)', () => {
    const orders = [order({ total_faturado: 500, custo_unitario: 50, quantidade: 5 })];
    const r = calculateResults(orders, settings({ gasto_shopee_ads: 37.42 }));

    expect(r.totals.gasto_ads_cents).toBe(3742);
    expect(r.totals.lucro_reais_cents).toBe(toCents(r.totals.lucro_reais));
  });

  it('lucro negativo (prejuízo) também bate em centavos', () => {
    const orders = [order({ total_faturado: 50, custo_unitario: 80, quantidade: 1 })];
    const r = calculateResults(orders, settings({ gasto_shopee_ads: 20 }));

    expect(r.totals.lucro_reais).toBeLessThan(0);
    expect(r.totals.lucro_reais_cents).toBe(toCents(r.totals.lucro_reais));
  });

  it('pedido sem custo_unitario não entra na média (mesmo comportamento do float)', () => {
    const orders = [
      order({ sku: 'C', custo_unitario: 0, total_faturado: 100 }),
      order({ sku: 'C', custo_unitario: 30, total_faturado: 100 }),
    ];
    const r = calculateResults(orders, settings());
    const g = r.groups.find(g => g.sku === 'C')!;

    expect(g.custo_unitario_medio).toBe(30);
    expect(g.custo_unitario_medio_cents).toBe(3000);
  });

  it('entrada vazia → tudo zero, sem NaN', () => {
    const r = calculateResults([], settings());
    expect(r.totals.total_faturado_cents).toBe(0);
    expect(r.totals.lucro_reais_cents).toBe(0);
    expect(Number.isNaN(r.totals.lucro_percentual_medio)).toBe(false);
  });
});
