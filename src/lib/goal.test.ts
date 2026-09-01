import { describe, it, expect } from 'vitest';
import { computeGoal, type GoalInputs } from './goal';

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
