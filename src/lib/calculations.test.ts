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
    imposto_nf_saida: 0.06,
    percentual_nf_entrada: 0,
    desconto_nf_saida: 0,
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
      expect(g.imposto_cents).toBe(toCents(g.imposto));
      expect(g.lucro_reais_cents).toBe(toCents(g.lucro_reais));
    }
    expect(r.totals.total_faturado_cents).toBe(toCents(r.totals.total_faturado));
    expect(r.totals.lucro_reais_cents).toBe(toCents(r.totals.lucro_reais));
  });

  it('com desconto de NF de saída (ramo condicional do imposto)', () => {
    const orders = [order({ total_faturado: 337.5, custo_unitario: 40, quantidade: 3 })];
    const r = calculateResults(orders, settings({ desconto_nf_saida: 0.1, imposto_nf_saida: 0.09 }));

    expect(r.groups[0].imposto_cents).toBe(toCents(r.groups[0].imposto));
    expect(r.totals.imposto_cents).toBe(toCents(r.totals.imposto));
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
    expect(r.totals.lucro_antes_imposto_cents).toBe(0);
    expect(Number.isNaN(r.totals.lucro_percentual_medio)).toBe(false);
  });

  it('lucro_antes_imposto = lucro_reais + imposto (evita dupla tributação no TaxSummaryRow)', () => {
    const orders = [order({ total_faturado: 400, custo_unitario: 50, quantidade: 2 })];
    const r = calculateResults(orders, settings({ imposto_nf_saida: 0.06, gasto_shopee_ads: 10 }));

    expect(r.totals.imposto).toBeGreaterThan(0);
    expect(r.totals.lucro_antes_imposto).toBeCloseTo(r.totals.lucro_reais + r.totals.imposto, 6);
    expect(r.totals.lucro_antes_imposto_cents).toBe(r.totals.lucro_reais_cents + r.totals.imposto_cents);
  });
});
