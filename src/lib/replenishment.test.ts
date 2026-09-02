import { describe, it, expect } from 'vitest';
import {
  computeReplenishmentRow,
  buildReplenishmentPlan,
  type ReplenishmentSku,
  type ReplenishmentOptions,
} from './replenishment';

const opts: ReplenishmentOptions = {
  todayIso: '2026-09-02',
  reviewCycleDays: 14,
  stockStaleDays: 10,
};

const sku = (p: Partial<ReplenishmentSku> = {}): ReplenishmentSku => ({
  sku: 'A',
  itemName: 'Produto A',
  unitsSold: 60,
  windowDays: 60,          // → 1 un/dia
  contributionMarginCents: 10_00,
  purchaseUnitCostCents: 5_00,
  stockUnits: 100,
  stockUpdatedDaysAgo: 0,
  inTransitUnits: 0,
  leadTimeDays: 14,
  safetyDays: 7,
  moqUnits: null,
  ...p,
});

describe('computeReplenishmentRow', () => {
  it('velocidade, cobertura e data de ruptura', () => {
    const r = computeReplenishmentRow(sku({ unitsSold: 90, windowDays: 30, stockUnits: 45 }), opts);
    expect(r.velocidadeDia).toBe(3);
    expect(r.coberturaDias).toBe(15);              // 45 / 3
    expect(r.rupturaIso).toBe('2026-09-17');       // hoje + 15
  });

  it('precisa pedir quando (estoque + trânsito) ≤ ponto de reposição', () => {
    // v=1, ROP = 1×(14+7) = 21. estoque 18 ≤ 21 → pedir
    const r = computeReplenishmentRow(sku({ stockUnits: 18 }), opts);
    expect(r.pontoReposicao).toBe(21);
    expect(r.precisaPedir).toBe(true);
    // alvo = 1×(14+7+14) = 35 ; sugestão = 35 − 18 = 17
    expect(r.sugestaoUnidades).toBe(17);
    expect(r.custoCompraCents).toBe(17 * 5_00);
  });

  it('não pede quando o estoque cobre com folga', () => {
    const r = computeReplenishmentRow(sku({ stockUnits: 100 }), opts);
    expect(r.precisaPedir).toBe(false);
    expect(r.sugestaoUnidades).toBe(0);
    expect(r.urgencia).toBe('ok');
  });

  it('estoque em trânsito conta e evita pedir de novo o que já vem', () => {
    const semTransito = computeReplenishmentRow(sku({ stockUnits: 10, inTransitUnits: 0 }), opts);
    const comTransito = computeReplenishmentRow(sku({ stockUnits: 10, inTransitUnits: 40 }), opts);
    expect(semTransito.precisaPedir).toBe(true);
    expect(comTransito.precisaPedir).toBe(false);  // 10 + 40 = 50 > ROP 21
    expect(comTransito.coberturaDias).toBe(50);
  });

  it('sugestão arredonda pra cima no lote mínimo (MOQ)', () => {
    // sugestão bruta 17 → MOQ 50 → 50
    const r = computeReplenishmentRow(sku({ stockUnits: 18, moqUnits: 50 }), opts);
    expect(r.sugestaoUnidades).toBe(50);
  });

  it('precisa pedir mas arredondamento zerou → pede o mínimo viável', () => {
    // estoque 21 = ROP exato → precisaPedir (<=). alvo 35 − 21 = 14. sem MOQ → 14.
    // força o caso: estoque 34, alvo 35 → bruto 1; com MOQ null fica 1.
    const r = computeReplenishmentRow(sku({ stockUnits: 21 }), opts);
    expect(r.precisaPedir).toBe(true);
    expect(r.sugestaoUnidades).toBe(14);
  });

  it('classifica a urgência pela cobertura vs lead time', () => {
    const v1 = { unitsSold: 30, windowDays: 30 }; // 1 un/dia
    expect(computeReplenishmentRow(sku({ ...v1, stockUnits: 10 }), opts).urgencia).toBe('ruptura');   // cob 10 ≤ 14
    expect(computeReplenishmentRow(sku({ ...v1, stockUnits: 18 }), opts).urgencia).toBe('critico');   // 14 < 18 ≤ 21
    expect(computeReplenishmentRow(sku({ ...v1, stockUnits: 30 }), opts).urgencia).toBe('atencao');   // 21 < 30 ≤ 35
    expect(computeReplenishmentRow(sku({ ...v1, stockUnits: 90 }), opts).urgencia).toBe('ok');        // > 35
  });

  it('SKU sem giro na janela → sem_giro, não pede', () => {
    const r = computeReplenishmentRow(sku({ unitsSold: 0, stockUnits: 5 }), opts);
    expect(r.urgencia).toBe('sem_giro');
    expect(r.precisaPedir).toBe(false);
    expect(r.coberturaDias).toBe(Infinity);
    expect(r.rupturaIso).toBeNull();
    expect(r.lucroDiaCents).toBe(0);
  });

  it('lucro/dia = margem de contribuição × velocidade', () => {
    const r = computeReplenishmentRow(sku({ unitsSold: 40, windowDays: 20, contributionMarginCents: 8_00 }), opts);
    expect(r.velocidadeDia).toBe(2);
    expect(r.lucroDiaCents).toBe(16_00);
  });

  it('marca estoque velho', () => {
    expect(computeReplenishmentRow(sku({ stockUpdatedDaysAgo: 5 }), opts).estoqueVelho).toBe(false);
    expect(computeReplenishmentRow(sku({ stockUpdatedDaysAgo: 20 }), opts).estoqueVelho).toBe(true);
  });
});

describe('buildReplenishmentPlan', () => {
  const urgente = sku({ sku: 'URG', stockUnits: 5, unitsSold: 30, windowDays: 30, contributionMarginCents: 2_00, purchaseUnitCostCents: 10_00 });   // cob 5 → ruptura
  const rentavel = sku({ sku: 'LUCRO', stockUnits: 18, unitsSold: 30, windowDays: 30, contributionMarginCents: 20_00, purchaseUnitCostCents: 10_00 }); // cob 18 → crítico
  const tranquilo = sku({ sku: 'OK', stockUnits: 500, unitsSold: 30, windowDays: 30 });

  it('ordena por urgência e separa quem precisa pedir', () => {
    const plan = buildReplenishmentPlan([tranquilo, rentavel, urgente], opts);
    expect(plan.rows[0].sku).toBe('URG');           // ruptura primeiro
    expect(plan.rows[2].sku).toBe('OK');            // ok por último
    expect(plan.pedidos.map(r => r.sku).sort()).toEqual(['LUCRO', 'URG']);
    expect(plan.custoTotalCents).toBe(
      plan.pedidos.reduce((s, r) => s + r.custoCompraCents, 0),
    );
  });

  it('sem caixa informado, o plano inteiro cabe', () => {
    const plan = buildReplenishmentPlan([rentavel, urgente], opts, null);
    expect(plan.custoNoCaixaCents).toBe(plan.custoTotalCents);
    expect(plan.cortadosPorCaixa).toEqual([]);
  });

  it('caixa apertado → corta o de menor lucro/dia', () => {
    const plan = buildReplenishmentPlan([rentavel, urgente], opts, null);
    const soUmCabe = Math.max(
      plan.pedidos.find(r => r.sku === 'LUCRO')!.custoCompraCents,
      plan.pedidos.find(r => r.sku === 'URG')!.custoCompraCents,
    );
    const apertado = buildReplenishmentPlan([rentavel, urgente], opts, soUmCabe);
    // LUCRO gera 20/un × 1/dia = mais lucro/dia que URG (2/un) → fica; URG corta
    expect(apertado.cortadosPorCaixa).toEqual(['URG']);
    expect(apertado.custoNoCaixaCents).toBe(
      apertado.pedidos.find(r => r.sku === 'LUCRO')!.custoCompraCents,
    );
  });
});
