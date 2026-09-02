import { describe, it, expect } from 'vitest';
import { computeForecast, type ForecastInputs } from './cashflow-forecast';

const base = (p: Partial<ForecastInputs> = {}): ForecastInputs => ({
  openingBalanceCents: 100_00,
  todayIso: '2026-09-02',
  horizonDays: 30,
  receivables: [],
  payables: [],
  ritmoLiquidoDiaCents: 0,
  tendenciaComecaEmDias: 8,
  ...p,
});

describe('computeForecast', () => {
  it('sem eventos, saldo é a âncora em todos os dias', () => {
    const r = computeForecast(base());
    expect(r.dias).toHaveLength(31); // dia 0..30
    expect(r.dias.every(d => d.saldoCents === 100_00)).toBe(true);
    expect(r.saldoFinalCents).toBe(100_00);
    expect(r.primeiroNegativo).toBeNull();
  });

  it('recebível e conta caem no dia certo (offset pela data)', () => {
    const r = computeForecast(base({
      receivables: [{ dateIso: '2026-09-05', amountCents: 500_00, source: 'ml' }],
      payables: [{ dateIso: '2026-09-10', amountCents: 200_00, label: 'Fornecedor' }],
    }));
    expect(r.dias[2].saldoCents).toBe(100_00);           // dia 04 — nada ainda
    expect(r.dias[3].saldoCents).toBe(600_00);           // dia 05 — +500
    expect(r.dias[8].saldoCents).toBe(400_00);           // dia 10 — −200
    expect(r.totalEntradasCents).toBe(500_00);
    expect(r.totalSaidasCents).toBe(200_00);
    expect(r.saldoFinalCents).toBe(400_00);
  });

  it('detecta o primeiro dia negativo na linha conservadora', () => {
    const r = computeForecast(base({
      openingBalanceCents: 50_00,
      payables: [
        { dateIso: '2026-09-04', amountCents: 30_00, label: 'Ads' },
        { dateIso: '2026-09-06', amountCents: 40_00, label: 'DAS' },
      ],
    }));
    // dia 04: 50 − 30 = 20 ; dia 06: 20 − 40 = −20
    expect(r.primeiroNegativo).not.toBeNull();
    expect(r.primeiroNegativo!.dateIso).toBe('2026-09-06');
    expect(r.primeiroNegativo!.saldoCents).toBe(-20_00);
    expect(r.primeiroNegativo!.offset).toBe(4);
  });

  it('tendência não entra no saldo conservador nem no primeiro-negativo', () => {
    const r = computeForecast(base({
      openingBalanceCents: 0,
      ritmoLiquidoDiaCents: 10_00,
      tendenciaComecaEmDias: 8,
      payables: [{ dateIso: '2026-09-20', amountCents: 5_00, label: 'x' }],
    }));
    const dia20 = r.dias.find(d => d.dateIso === '2026-09-20')!;
    expect(dia20.saldoCents).toBe(-5_00);               // só a conta
    expect(dia20.saldoComTendenciaCents).toBeGreaterThan(0); // + ritmo dos dias 8..18
    expect(r.primeiroNegativo!.dateIso).toBe('2026-09-20'); // pela linha conservadora
  });

  it('tendência só acumula a partir de tendenciaComecaEmDias', () => {
    const r = computeForecast(base({
      openingBalanceCents: 0,
      ritmoLiquidoDiaCents: 10_00,
      tendenciaComecaEmDias: 10,
    }));
    expect(r.dias[9].saldoComTendenciaCents).toBe(0);    // ainda não começou
    expect(r.dias[10].saldoComTendenciaCents).toBe(10_00); // 1º dia de tendência
    expect(r.dias[12].saldoComTendenciaCents).toBe(30_00);
  });

  it('evento além do horizonte é ignorado; vencido cai no dia 0', () => {
    const r = computeForecast(base({
      horizonDays: 10,
      receivables: [{ dateIso: '2026-10-30', amountCents: 999_00, source: 'ml' }], // fora
      payables: [{ dateIso: '2026-08-20', amountCents: 40_00, label: 'atrasada' }], // vencida
    }));
    expect(r.totalEntradasCents).toBe(0);
    expect(r.dias[0].saidaCents).toBe(40_00);
    expect(r.dias[0].saldoCents).toBe(60_00);
  });

  it('saldo mínimo aponta o pior dia da janela', () => {
    const r = computeForecast(base({
      openingBalanceCents: 100_00,
      payables: [{ dateIso: '2026-09-05', amountCents: 80_00, label: 'x' }],
      receivables: [{ dateIso: '2026-09-15', amountCents: 200_00, source: 'ml' }],
    }));
    // fundo do poço entre dia 05 (20) e o recebível do dia 15
    expect(r.saldoMinimo.saldoCents).toBe(20_00);
    expect(r.saldoMinimo.dateIso).toBe('2026-09-05');
  });
});
