import { describe, it, expect } from 'vitest';
import {
  computeShopeeFinance,
  isShopeeShippingRebate,
  SHOPEE_SHIPPING_REBATE_DESCRIPTION,
  type ShopeeFinanceOrderLike,
  type ShopeeFinancePaymentLike,
  type ShopeeFinanceFeeLike,
} from './shopee-sync-status';
import { toCents } from './money';

// ── Builders ─────────────────────────────────────────────────────────────────
// Janela padrão dos testes: 15/01 00:00 → agora (sem `untilIso`, salvo indicado).
const SINCE = '2026-01-15T00:00:00.000Z';

let seq = 0;
function order(p: Partial<ShopeeFinanceOrderLike> = {}): ShopeeFinanceOrderLike {
  seq++;
  const created = p.order_created_at ?? '2026-01-20T10:00:00.000Z';
  const total_amount = p.total_amount ?? 100;
  return {
    id: p.id ?? `o${seq}`,
    status: p.status ?? 'COMPLETED',
    total_amount,
    total_amount_cents: p.total_amount_cents ?? Math.round(total_amount * 100),
    order_created_at: created,
    order_updated_at: p.order_updated_at ?? created,
  };
}
function payment(order_id: string, net_amount: number, method = 'escrow'): ShopeeFinancePaymentLike {
  return { order_id, payment_method: method, net_amount, net_amount_cents: Math.round(net_amount * 100) };
}
function fee(order_id: string | null, fee_type: string, amount: number, fee_date = '2026-01-20T10:00:00.000Z', description: string | null = null): ShopeeFinanceFeeLike {
  return { order_id, fee_type, amount, amount_cents: Math.round(amount * 100), fee_date, description };
}

const run = (
  orders: ShopeeFinanceOrderLike[],
  payments: ShopeeFinancePaymentLike[] = [],
  fees: ShopeeFinanceFeeLike[] = [],
  opts: { sinceIso: string; untilIso?: string } = { sinceIso: SINCE },
) => computeShopeeFinance(orders, payments, fees, opts);

// ─────────────────────────────────────────────────────────────────────────────
describe('computeShopeeFinance', () => {
  it('entrada vazia → tudo zero, sem NaN', () => {
    const r = run([]);
    expect(r).toMatchObject({
      pedidos: 0, faturamento: 0, valorLiquido: 0, margemPct: 0,
      liberado: 0, aLiberar: 0, pedidosSemRepasse: 0, emTransito: 0, cancelados: 0,
    });
    expect(r.feeBreakdown).toEqual([]);
    expect(r.porDia).toEqual([]);
    expect(Number.isNaN(r.margemPct)).toBe(false);
  });

  it('coorte básica: pedidos concluídos na janela com repasse', () => {
    const o1 = order({ id: 'a', total_amount: 100, order_updated_at: '2026-01-20T10:00:00Z' });
    const o2 = order({ id: 'b', total_amount: 200, order_updated_at: '2026-01-21T10:00:00Z' });
    const r = run([o1, o2], [payment('a', 62), payment('b', 138)]);

    expect(r.pedidos).toBe(2);
    expect(r.faturamento).toBe(300);
    expect(r.liberado).toBe(200);
    expect(r.aLiberar).toBe(0);
    expect(r.valorLiquido).toBe(200);
    expect(r.pedidosSemRepasse).toBe(0);
    expect(r.margemPct).toBeCloseTo((200 / 300) * 100, 6);
  });

  it('Valor Líquido vem do escrow_amount, NÃO de "faturamento − taxas" (regressão do −R$44)', () => {
    // Cenário do bug: taxas gravadas (de várias coortes) somam MAIS que a receita
    // da coorte. O líquido tem que continuar sendo o escrow real, positivo.
    const o = order({ id: 'x', total_amount: 100, order_updated_at: '2026-01-20T10:00:00Z' });
    const fees = [
      fee('x', 'commission', 15),
      fee('x', 'service_fee', 10),
      fee('x', 'shipping_fee', 90), // frete estimado inflado
    ];
    const r = run([o], [payment('x', 70)], fees);

    expect(r.valorLiquido).toBe(70);          // escrow real, não 100 − 115 = −15
    expect(r.margemPct).toBeCloseTo(70, 6);
    // feeBreakdown ainda mostra a decomposição (visual), ordenada desc
    expect(r.feeBreakdown.map(f => f.type)).toEqual(['shipping_fee', 'commission', 'service_fee']);
  });

  it('coorte é por order_updated_at (conclusão), não por order_created_at', () => {
    // Criado ANTES da janela, concluído (updated) DENTRO dela → entra.
    const o = order({
      id: 'old',
      total_amount: 500,
      order_created_at: '2025-12-01T00:00:00Z',
      order_updated_at: '2026-01-20T00:00:00Z',
    });
    const r = run([o], [payment('old', 300)]);
    expect(r.pedidos).toBe(1);
    expect(r.faturamento).toBe(500);
    expect(r.valorLiquido).toBe(300);
  });

  it('limites da janela: exclui antes de `since` e a partir de `until`', () => {
    const antes = order({ id: 'antes', order_updated_at: '2026-01-14T23:59:59Z' });
    const dentro = order({ id: 'dentro', order_updated_at: '2026-01-15T00:00:01Z' });
    const depois = order({ id: 'depois', order_updated_at: '2026-02-01T00:00:01Z' });
    const r = run(
      [antes, dentro, depois],
      [payment('antes', 1), payment('dentro', 1), payment('depois', 1)],
      [],
      { sinceIso: SINCE, untilIso: '2026-02-01T00:00:00.000Z' },
    );
    expect(r.pedidos).toBe(1);
    expect(r.faturamento).toBe(100); // só 'dentro'
  });

  it('aLiberar: concluído sem repasse é estimado pela margem dos liberados', () => {
    // Liberado: R$ 200 de faturamento → R$ 120 de escrow (margem 60%).
    // Sem repasse: R$ 100 de faturamento → estimado 60% = R$ 60.
    const liberado = order({ id: 'lib', total_amount: 200, order_updated_at: '2026-01-20T00:00:00Z' });
    const semRepasse = order({ id: 'pend', total_amount: 100, order_updated_at: '2026-01-21T00:00:00Z' });
    const r = run([liberado, semRepasse], [payment('lib', 120)]);

    expect(r.pedidos).toBe(2);
    expect(r.faturamento).toBe(300);
    expect(r.liberado).toBe(120);
    expect(r.pedidosSemRepasse).toBe(1);
    expect(r.aLiberar).toBeCloseTo(60, 6);
    expect(r.valorLiquido).toBeCloseTo(180, 6);
  });

  it('sem NENHUM repasse na coorte → aLiberar = 0 (sem divisão por zero)', () => {
    const o1 = order({ id: 'p1', total_amount: 100, order_updated_at: '2026-01-20T00:00:00Z' });
    const o2 = order({ id: 'p2', total_amount: 100, order_updated_at: '2026-01-20T00:00:00Z' });
    const r = run([o1, o2]); // nenhum payment

    expect(r.pedidosSemRepasse).toBe(2);
    expect(r.liberado).toBe(0);
    expect(r.aLiberar).toBe(0);
    expect(r.valorLiquido).toBe(0);
    expect(Number.isNaN(r.margemPct)).toBe(false);
  });

  it('emTransito: SHIPPED-like criado na janela, fora da coorte de líquido', () => {
    const concluido = order({ id: 'c', order_updated_at: '2026-01-20T00:00:00Z' });
    const transito1 = order({ id: 't1', status: 'SHIPPED', order_created_at: '2026-01-25T00:00:00Z' });
    const transito2 = order({ id: 't2', status: 'TO_CONFIRM_RECEIVE', order_created_at: '2026-01-26T00:00:00Z' });
    const transitoAntigo = order({ id: 't3', status: 'SHIPPED', order_created_at: '2025-12-01T00:00:00Z' });
    const r = run([concluido, transito1, transito2, transitoAntigo], [payment('c', 50)]);

    expect(r.pedidos).toBe(1);
    expect(r.emTransito).toBe(2); // t1, t2 — t3 foi criado fora da janela
    expect(r.faturamento).toBe(100);
  });

  it('cancelados: CANCELLED-like com criação OU atualização na janela', () => {
    const cancNaJanela = order({ id: 'k1', status: 'CANCELLED', order_created_at: '2026-01-20T00:00:00Z' });
    const cancAtualizado = order({
      id: 'k2', status: 'TO_RETURN',
      order_created_at: '2025-11-01T00:00:00Z',
      order_updated_at: '2026-01-22T00:00:00Z',
    });
    const cancForaTudo = order({
      id: 'k3', status: 'CANCELLED',
      order_created_at: '2025-11-01T00:00:00Z',
      order_updated_at: '2025-11-05T00:00:00Z',
    });
    const r = run([cancNaJanela, cancAtualizado, cancForaTudo]);
    expect(r.cancelados).toBe(2);
    expect(r.pedidos).toBe(0);
  });

  it('feeBreakdown ignora fee órfã e fee de pedido fora da coorte', () => {
    const naCoorte = order({ id: 'in', order_updated_at: '2026-01-20T00:00:00Z' });
    const foraCoorte = order({ id: 'out', status: 'SHIPPED', order_created_at: '2026-01-20T00:00:00Z' });
    const fees = [
      fee('in', 'commission', 20),
      fee('in', 'service_fee', 5),
      fee('out', 'commission', 999),   // pedido não está na coorte
      fee(null, 'commission', 999),    // órfã
    ];
    const r = run([naCoorte, foraCoorte], [payment('in', 70)], fees);
    expect(r.feeBreakdown).toEqual([
      { type: 'commission', label: 'Comissão Shopee', amount: 20, amountCents: 2000 },
      { type: 'service_fee', label: 'Taxa de serviço', amount: 5, amountCents: 500 },
    ]);
  });

  it('BUG-03b: rebate de frete (adjustment) é subtraído do bucket shipping_fee, não fica escondido', () => {
    const o = order({ id: 'x', total_amount: 320.52, order_updated_at: '2026-01-20T10:00:00Z' });
    const fees = [
      fee('x', 'shipping_fee', 320.52, undefined, 'Frete estimado'),
      fee('x', 'adjustment', 241.08, undefined, SHOPEE_SHIPPING_REBATE_DESCRIPTION),
      fee('x', 'adjustment', 15, undefined, 'Desconto do vendedor'), // fica de fora, tipo diferente
    ];
    const r = run([o], [payment('x', 79.44)], fees);

    const frete = r.feeBreakdown.find(f => f.type === 'shipping_fee');
    expect(frete?.amount).toBeCloseTo(79.44, 6); // 320,52 − 241,08, não 320,52 bruto
    expect(frete?.amountCents).toBe(7944);
    // O rebate some do bucket "adjustment" (foi absorvido no shipping_fee);
    // outros adjustments (desconto do vendedor) continuam separados, como antes.
    const adjustment = r.feeBreakdown.find(f => f.type === 'adjustment');
    expect(adjustment?.amount).toBe(15);
  });

  it('porDia agrupa pela data de conclusão (order_updated_at)', () => {
    const d20a = order({ id: 'a', total_amount: 100, order_updated_at: '2026-01-20T09:00:00Z' });
    const d20b = order({ id: 'b', total_amount: 50, order_updated_at: '2026-01-20T18:00:00Z' });
    const d22 = order({ id: 'c', total_amount: 200, order_updated_at: '2026-01-22T12:00:00Z' });
    const r = run([d20a, d20b, d22], [payment('a', 60), payment('b', 30), payment('c', 120)]);

    expect(r.porDia).toEqual([
      { date: '2026-01-20', faturamento: 150, liquido: 90, faturamentoCents: 15000, liquidoCents: 9000 },
      { date: '2026-01-22', faturamento: 200, liquido: 120, faturamentoCents: 20000, liquidoCents: 12000 },
    ]);
  });

  it('múltiplos repasses do mesmo pedido somam (liberação parcial)', () => {
    const o = order({ id: 'z', total_amount: 300, order_updated_at: '2026-01-20T00:00:00Z' });
    const r = run([o], [payment('z', 100), payment('z', 80)]);
    expect(r.liberado).toBe(180);
    expect(r.pedidosSemRepasse).toBe(0);
  });

  it('payment_method != escrow é ignorado', () => {
    const o = order({ id: 'w', total_amount: 100, order_updated_at: '2026-01-20T00:00:00Z' });
    const r = run([o], [payment('w', 999, 'wallet')]);
    expect(r.liberado).toBe(0);
    expect(r.pedidosSemRepasse).toBe(1);
  });

  it('pedido não-COMPLETED nunca entra na coorte, mesmo com repasse', () => {
    const shipped = order({ id: 's', status: 'SHIPPED', order_updated_at: '2026-01-20T00:00:00Z' });
    const r = run([shipped], [payment('s', 50)]);
    expect(r.pedidos).toBe(0);
    expect(r.valorLiquido).toBe(0);
  });

  // ── Equivalência Fase 4 (aditivo): os campos *Cents somam os inteiros
  // _cents direto, sem nunca passar por ponto flutuante. Precisam bater com
  // toCents() dos campos em reais — provando que a versão em centavos não
  // diverge da versão já validada em produção, antes de qualquer tela migrar.
  describe('campos *Cents batem com toCents() dos campos em reais', () => {
    it('coorte básica com repasse total', () => {
      const o1 = order({ id: 'a', total_amount: 100, order_updated_at: '2026-01-20T10:00:00Z' });
      const o2 = order({ id: 'b', total_amount: 200, order_updated_at: '2026-01-21T10:00:00Z' });
      const r = run([o1, o2], [payment('a', 62), payment('b', 138)]);

      expect(r.faturamentoCents).toBe(toCents(r.faturamento));
      expect(r.liberadoCents).toBe(toCents(r.liberado));
      expect(r.valorLiquidoCents).toBe(toCents(r.valorLiquido));
      expect(r.aLiberarCents).toBe(0);
    });

    it('regressão do −R$44: líquido em centavos também vem do escrow, não de faturamento − taxas', () => {
      const o = order({ id: 'x', total_amount: 100, order_updated_at: '2026-01-20T10:00:00Z' });
      const fees = [fee('x', 'commission', 15), fee('x', 'service_fee', 10), fee('x', 'shipping_fee', 90)];
      const r = run([o], [payment('x', 70)], fees);

      expect(r.valorLiquidoCents).toBe(7000); // não 100 − 115 = −15
      expect(r.feeBreakdown.find(f => f.type === 'shipping_fee')?.amountCents).toBe(9000);
    });

    it('aLiberar estimado: arredondamento em centavos fecha com a versão em reais', () => {
      // Liberado: R$ 200 → R$ 120 de escrow (margem 60%). Sem repasse: R$ 100,
      // estimado 60% = R$ 60,00 exato — mas o teste importa porque a divisão
      // 120/200 é feita duas vezes (uma em reais, outra em centavos) e as duas
      // precisam convergir pro mesmo centavo final.
      const liberado = order({ id: 'lib', total_amount: 200, order_updated_at: '2026-01-20T00:00:00Z' });
      const semRepasse = order({ id: 'pend', total_amount: 100, order_updated_at: '2026-01-21T00:00:00Z' });
      const r = run([liberado, semRepasse], [payment('lib', 120)]);

      expect(r.aLiberarCents).toBe(6000);
      expect(r.valorLiquidoCents).toBe(toCents(r.valorLiquido));
    });

    it('entrada vazia → tudo zero em centavos também', () => {
      const r = run([]);
      expect(r.faturamentoCents).toBe(0);
      expect(r.valorLiquidoCents).toBe(0);
      expect(r.liberadoCents).toBe(0);
      expect(r.aLiberarCents).toBe(0);
    });
  });
});

describe('isShopeeShippingRebate', () => {
  it('reconhece só o adjustment de rebate de frete', () => {
    expect(isShopeeShippingRebate({ fee_type: 'adjustment', description: SHOPEE_SHIPPING_REBATE_DESCRIPTION })).toBe(true);
  });
  it('ignora outros adjustments (desconto, voucher) e outros fee_types', () => {
    expect(isShopeeShippingRebate({ fee_type: 'adjustment', description: 'Desconto do vendedor' })).toBe(false);
    expect(isShopeeShippingRebate({ fee_type: 'adjustment', description: null })).toBe(false);
    expect(isShopeeShippingRebate({ fee_type: 'shipping_fee', description: SHOPEE_SHIPPING_REBATE_DESCRIPTION })).toBe(false);
  });
});
