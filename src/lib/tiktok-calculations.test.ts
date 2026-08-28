import { describe, it, expect } from 'vitest';
import { calculateTikTokResults, type TikTokOrder, type TikTokSettingsData } from './tiktok-calculations';
import { toCents } from './money';

function settings(p: Partial<TikTokSettingsData> = {}): TikTokSettingsData {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Padrão',
    taxa_comissao_tiktok: 0.06,
    taxa_afiliado: 0.02,
    adicional_por_item: 0.5,
    percentual_valor_antecipado: 0,
    taxa_antecipacao: 0,
    imposto_nf_saida: 0.06,
    percentual_nf_entrada: 0,
    desconto_nf_saida: 0,
    gasto_tiktok_ads: 0,
    is_default: true,
    ...p,
  };
}

let seq = 0;
function order(p: Partial<TikTokOrder> = {}): TikTokOrder {
  seq++;
  const total_faturado = p.total_faturado ?? 100;
  const desconto_plataforma = p.desconto_plataforma ?? 0;
  const desconto_vendedor = p.desconto_vendedor ?? 0;
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
    desconto_plataforma,
    desconto_plataforma_cents: p.desconto_plataforma_cents ?? Math.round(desconto_plataforma * 100),
    desconto_vendedor,
    desconto_vendedor_cents: p.desconto_vendedor_cents ?? Math.round(desconto_vendedor * 100),
    custo_unitario,
    custo_unitario_cents: p.custo_unitario_cents ?? Math.round(custo_unitario * 100),
    data_pedido: p.data_pedido ?? '2026-01-20',
    status_pedido: p.status_pedido ?? 'concluido',
  };
}

describe('calculateTikTokResults — campos *Cents batem com toCents() dos campos em reais', () => {
  it('caso básico com comissão + afiliado', () => {
    // total_faturado_cents é soma pura → sempre exato. Os campos encadeados
    // (total_a_receber, lucro_reais) subtraem VÁRIOS termos já arredondados
    // em centavos, cada um — diferente do float, que só arredonda no fim.
    // É esperado (e mais correto contabilmente) que fiquem a até 1-2 centavos
    // do que toCents() daria sobre o float; nunca mais que isso.
    const orders = [
      order({ sku: 'A', total_faturado: 120, custo_unitario: 30, quantidade: 2 }),
      order({ sku: 'B', total_faturado: 65.9, custo_unitario: 12.3, quantidade: 1 }),
    ];
    const r = calculateTikTokResults(orders, settings());

    const closeEnough = (a: number, b: number, tol = 2) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

    for (const g of r.groups) {
      expect(g.total_faturado_cents).toBe(toCents(g.total_faturado));
      closeEnough(g.taxa_tiktok_reais_cents!, toCents(g.taxa_tiktok_reais), 1);
      closeEnough(g.taxa_afiliado_reais_cents!, toCents(g.taxa_afiliado_reais), 1);
      closeEnough(g.total_a_receber_cents!, toCents(g.total_a_receber));
      closeEnough(g.lucro_reais_cents!, toCents(g.lucro_reais));
    }
    expect(r.totals.total_faturado_cents).toBe(toCents(r.totals.total_faturado));
    closeEnough(r.totals.lucro_reais_cents, toCents(r.totals.lucro_reais));
  });

  it('com desconto de NF de saída e descontos de plataforma/vendedor', () => {
    const orders = [
      order({ total_faturado: 250, desconto_plataforma: 10, desconto_vendedor: 5, custo_unitario: 40, quantidade: 2 }),
    ];
    const r = calculateTikTokResults(orders, settings({ desconto_nf_saida: 0.15, imposto_nf_saida: 0.09 }));

    expect(r.groups[0].imposto_cents).toBe(toCents(r.groups[0].imposto));
    expect(r.groups[0].desconto_plataforma_cents).toBe(1000);
    expect(r.groups[0].desconto_vendedor_cents).toBe(500);
    expect(r.totals.imposto_cents).toBe(toCents(r.totals.imposto));
  });

  it('com gasto de ads', () => {
    const orders = [order({ total_faturado: 500, custo_unitario: 50, quantidade: 5 })];
    const r = calculateTikTokResults(orders, settings({ gasto_tiktok_ads: 12.5 }));

    expect(r.totals.gasto_ads_cents).toBe(1250);
    expect(r.totals.lucro_reais_cents).toBe(toCents(r.totals.lucro_reais));
  });

  it('entrada vazia → tudo zero', () => {
    const r = calculateTikTokResults([], settings());
    expect(r.totals.total_faturado_cents).toBe(0);
    expect(r.totals.lucro_reais_cents).toBe(0);
  });
});
