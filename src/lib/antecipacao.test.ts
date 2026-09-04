import { describe, it, expect } from 'vitest';
import { planejarAntecipacao, diasParaRecuperar, type AntecipacaoCandidato } from './antecipacao';
import type { ForecastDay } from './cashflow-forecast';

const HOJE = '2026-09-10';
const cand = (dateIso: string, amountCents: number, source = 'ml'): AntecipacaoCandidato => ({ dateIso, amountCents, source });
const RATE_015 = { taxaDiariaPct: 0.15 };

describe('planejarAntecipacao', () => {
  it('gap ≤ 0 → não é necessário, plano vazio', () => {
    const p = planejarAntecipacao(0, HOJE, [cand('2026-09-15', 100_000)], RATE_015);
    expect(p.necessario).toBe(false);
    expect(p.itens).toEqual([]);
  });

  it('cobre o gap inteiro com um único recebível, com o custo certo', () => {
    // recebível de R$1000 daqui a 5 dias, taxa 0,15%/dia → 0,75% de custo
    const p = planejarAntecipacao(50_000, HOJE, [cand('2026-09-15', 100_000)], RATE_015);
    expect(p.cobre).toBe(true);
    expect(p.itens).toHaveLength(1);
    const item = p.itens[0];
    expect(item.diasAntecipados).toBe(5);
    // gap de R$500 é bem menor que o líquido disponível (~R$992,50) → parcial
    expect(item.fracaoUsada).toBeLessThan(1);
    expect(item.valorLiquidoCents).toBeCloseTo(50_000, -1); // arredonda perto do gap
  });

  it('usa o recebível inteiro quando o gap é maior que ele, e busca o próximo', () => {
    const candidatos = [cand('2026-09-12', 30_000, 'ml'), cand('2026-09-20', 100_000, 'ml')];
    const p = planejarAntecipacao(80_000, HOJE, candidatos, RATE_015);
    expect(p.itens).toHaveLength(2);
    expect(p.itens[0].fracaoUsada).toBeCloseTo(1, 5); // o mais perto (mais barato) inteiro
    expect(p.itens[1].fracaoUsada).toBeLessThan(1);   // completa o resto no segundo
    expect(p.cobre).toBe(true);
  });

  it('prioriza o recebível mais perto (mais barato), não o maior', () => {
    const candidatos = [cand('2026-09-25', 500_000, 'ml'), cand('2026-09-11', 10_000, 'ml')];
    const p = planejarAntecipacao(5_000, HOJE, candidatos, RATE_015);
    expect(p.itens[0].dateIso).toBe('2026-09-11');
  });

  it('não cobre quando os candidatos não são suficientes', () => {
    const p = planejarAntecipacao(1_000_000, HOJE, [cand('2026-09-15', 10_000)], RATE_015);
    expect(p.cobre).toBe(false);
    expect(p.itens).toHaveLength(1);
    expect(p.totalLiquidoCents).toBeLessThan(1_000_000);
  });

  it('ignora candidato na data de hoje ou no passado (não é antecipação)', () => {
    const p = planejarAntecipacao(1_000, HOJE, [cand(HOJE, 100_000), cand('2026-09-01', 100_000)], RATE_015);
    expect(p.itens).toEqual([]);
    expect(p.cobre).toBe(false);
  });

  it('taxa que consome o recebível inteiro (100%+) descarta o candidato', () => {
    const p = planejarAntecipacao(1_000, HOJE, [cand('2026-09-11', 100_000)], { taxaDiariaPct: 100 });
    expect(p.itens).toEqual([]);
  });

  it('taxa zero → custo zero, líquido = bruto', () => {
    const p = planejarAntecipacao(50_000, HOJE, [cand('2026-09-20', 100_000)], { taxaDiariaPct: 0 });
    expect(p.itens[0].custoCents).toBe(0);
    expect(p.totalCustoCents).toBe(0);
    expect(p.taxaMediaEfetivaPct).toBe(0);
  });

  it('taxaMediaEfetivaPct = custo total / bruto total', () => {
    const p = planejarAntecipacao(50_000, HOJE, [cand('2026-09-20', 100_000)], RATE_015); // 10 dias → 1,5%
    expect(p.taxaMediaEfetivaPct).toBeCloseTo(1.5, 1);
  });
});

describe('diasParaRecuperar', () => {
  const dia = (offset: number, saldoCents: number): ForecastDay => ({
    dateIso: `2026-09-${10 + offset}`, offset, entradaCents: 0, entradaProvavelCents: 0,
    saidaCents: 0, saldoCents, saldoComProvavelCents: saldoCents, saldoComTendenciaCents: saldoCents,
  });

  it('acha o primeiro dia depois do offset em que o saldo volta a ficar ≥ 0', () => {
    const dias = [dia(0, 100), dia(1, -50), dia(2, -30), dia(3, 20), dia(4, 40)];
    expect(diasParaRecuperar(dias, 1)).toBe(2); // dia 3, offset relativo = 3-1
  });

  it('nunca recupera dentro da janela → null', () => {
    const dias = [dia(0, 100), dia(1, -50), dia(2, -80)];
    expect(diasParaRecuperar(dias, 1)).toBeNull();
  });
});
