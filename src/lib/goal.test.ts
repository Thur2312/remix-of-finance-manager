import { describe, it, expect } from 'vitest';
import { computeGoal, computeRevenueGoal, type GoalInputs, type RevenueGoalInputs } from './goal';

const g = (p: Partial<GoalInputs> = {}): GoalInputs => ({
  custosFixosMes: 3000,
  margemContribuicaoPct: 40,
  faturamentoAteAgora: 6000,
  diaDoMes: 15,
  diasNoMes: 30,
  ...p,
});

describe('computeGoal', () => {
  it('break-even = custos fixos ÷ margem de contribuição', () => {
    const r = computeGoal(g(), 0);
    expect(r.faturamentoBreakEven).toBe(7500); // 3000 / 0.40
  });

  it('meta com margem alvo > break-even', () => {
    const r = computeGoal(g(), 10); // mc 40% - alvo 10% = 30% no denominador
    expect(r.faturamentoMeta).toBe(10000); // 3000 / 0.30
    expect(r.faturamentoMeta!).toBeGreaterThan(r.faturamentoBreakEven);
  });

  it('alvo de margem ≥ margem de contribuição → meta impossível (null)', () => {
    const r = computeGoal(g({ margemContribuicaoPct: 40 }), 40);
    expect(r.faturamentoMeta).toBeNull();
    expect(r.ritmoDiarioNecessarioMeta).toBeNull();
  });

  it('projeção linear pelo ritmo até agora', () => {
    const r = computeGoal(g({ faturamentoAteAgora: 6000, diaDoMes: 15, diasNoMes: 30 }), 0);
    expect(r.ritmoDiarioAtual).toBe(400);       // 6000 / 15
    expect(r.projecaoFimDoMes).toBe(12000);     // 400 * 30
  });

  it('projeção acima da meta → veredito "meta"', () => {
    const r = computeGoal(g({ faturamentoAteAgora: 6000, diaDoMes: 15 }), 5);
    // meta = 3000 / 0.35 ≈ 8571; projeção 12000 > meta
    expect(r.veredito).toBe('meta');
  });

  it('projeção abaixo do break-even → veredito "vermelho"', () => {
    const r = computeGoal(g({ faturamentoAteAgora: 2000, diaDoMes: 15 }), 0);
    // projeção 4000 < break-even 7500
    expect(r.veredito).toBe('vermelho');
    expect(r.lucroProjetado).toBeLessThan(0);
  });

  it('ritmo necessário pra bater a meta usa os dias que faltam', () => {
    const r = computeGoal(g({ faturamentoAteAgora: 4000, diaDoMes: 20, diasNoMes: 30 }), 10);
    // meta 10000, falta 6000, faltam 10 dias → 600/dia
    expect(r.ritmoDiarioNecessarioMeta).toBe(600);
    expect(r.diasRestantes).toBe(10);
  });

  it('margem de contribuição ≤ 0 → break-even infinito, sempre vermelho', () => {
    const r = computeGoal(g({ margemContribuicaoPct: -5 }), 0);
    expect(r.faturamentoBreakEven).toBe(Infinity);
    expect(r.veredito).toBe('vermelho');
  });
});

const rg = (p: Partial<RevenueGoalInputs> = {}): RevenueGoalInputs => ({
  metaFaturamentoMes: 100000,
  faturamentoAteAgora: 50000,
  diaDoMes: 15,
  diasNoMes: 30,
  custosFixosMes: 10000,
  margemContribuicaoPct: 40,
  ...p,
});

describe('computeRevenueGoal', () => {
  it('exemplo da diretriz: meta 100k, faturado 50k → 50% feito, 50% restante', () => {
    const r = computeRevenueGoal(rg());
    expect(r.pctRealizado).toBe(50);
    expect(r.pctRestante).toBe(50);
    expect(r.faltaMeta).toBe(50000);
  });

  it('projeção linear pelo ritmo e veredito "no_ritmo" quando projeção alcança a meta', () => {
    const r = computeRevenueGoal(rg({ faturamentoAteAgora: 50000, diaDoMes: 15, diasNoMes: 30 }));
    expect(r.ritmoDiarioAtual).toBeCloseTo(50000 / 15, 2);
    expect(r.projecaoFimDoMes).toBeCloseTo(100000, 0);
    expect(r.veredito).toBe('no_ritmo');
  });

  it('ritmo necessário usa só os dias que faltam', () => {
    const r = computeRevenueGoal(rg({ faturamentoAteAgora: 40000, diaDoMes: 20, diasNoMes: 30 }));
    expect(r.diasRestantes).toBe(10);
    expect(r.ritmoDiarioNecessario).toBe(6000); // (100000 - 40000) / 10
  });

  it('meta já batida → veredito "batida" e sem ritmo necessário', () => {
    const r = computeRevenueGoal(rg({ faturamentoAteAgora: 120000 }));
    expect(r.veredito).toBe('batida');
    expect(r.ritmoDiarioNecessario).toBeNull();
    expect(r.pctRestante).toBe(0);
  });

  it('ritmo fraco → veredito "longe"', () => {
    const r = computeRevenueGoal(rg({ faturamentoAteAgora: 20000, diaDoMes: 15 }));
    // projeção 40000 < 90% de 100000
    expect(r.veredito).toBe('longe');
  });

  it('meta zerada não quebra (sem divisão por zero)', () => {
    const r = computeRevenueGoal(rg({ metaFaturamentoMes: 0 }));
    expect(Number.isNaN(r.pctRealizado)).toBe(false);
    expect(r.veredito).toBe('longe');
  });
});
