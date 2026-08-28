import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, formatPercent } from './format';

//   = espaço não-quebrável que o Intl insere depois de "R$".
const nbsp = ' ';

describe('formatCurrency', () => {
  it('formata reais com 2 casas (pt-BR)', () => {
    expect(formatCurrency(1234.56)).toBe(`R$${nbsp}1.234,56`);
    expect(formatCurrency(0)).toBe(`R$${nbsp}0,00`);
    expect(formatCurrency(-44.9)).toBe(`-R$${nbsp}44,90`);
  });
  it('{ whole: true } arredonda e some os centavos', () => {
    expect(formatCurrency(1234.56, { whole: true })).toBe(`R$${nbsp}1.235`);
  });
  it('valor não-finito vira 0 em vez de "R$ NaN"', () => {
    expect(formatCurrency(NaN)).toBe(`R$${nbsp}0,00`);
    expect(formatCurrency(Infinity)).toBe(`R$${nbsp}0,00`);
  });
});

describe('formatCurrencyCompact', () => {
  it('abrevia e é bem mais curto que a forma completa', () => {
    const compact = formatCurrencyCompact(3_400_000);
    expect(compact).toMatch(/^R\$/);
    expect(compact.length).toBeLessThan(formatCurrency(3_400_000).length);
    expect(compact).toContain('3,4');
  });
});

describe('formatPercent', () => {
  it('1 casa decimal por padrão, configurável via digits', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(12.345, 2)).toBe('12.35%');
    expect(formatPercent(NaN)).toBe('0.0%');
  });
});
