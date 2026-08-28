import { describe, it, expect } from 'vitest';
import { applyTax } from './tax';

describe('applyTax', () => {
  it('taxa sobre faturamento quando taxBase é revenue (Simples Nacional)', () => {
    const { taxAmount, netAfterTax } = applyTax({
      revenue: 10000,
      profit: 3000,
      taxRate: 6,
      taxBase: 'revenue',
    });
    expect(taxAmount).toBe(600); // 6% de 10000, não de 3000
    expect(netAfterTax).toBe(2400); // sempre reduz o lucro, mesmo taxando o faturamento
  });

  it('taxa sobre lucro quando taxBase é profit', () => {
    const { taxAmount, netAfterTax } = applyTax({
      revenue: 10000,
      profit: 3000,
      taxRate: 6,
      taxBase: 'profit',
    });
    expect(taxAmount).toBe(180); // 6% de 3000
    expect(netAfterTax).toBe(2820);
  });

  it('imposto sobre faturamento pode superar o lucro (prejuízo após imposto)', () => {
    const { taxAmount, netAfterTax } = applyTax({
      revenue: 10000,
      profit: 100,
      taxRate: 6,
      taxBase: 'revenue',
    });
    expect(taxAmount).toBe(600);
    expect(netAfterTax).toBe(-500);
  });

  it('taxRate 0 não altera o lucro', () => {
    const { taxAmount, netAfterTax } = applyTax({
      revenue: 10000,
      profit: 3000,
      taxRate: 0,
      taxBase: 'revenue',
    });
    expect(taxAmount).toBe(0);
    expect(netAfterTax).toBe(3000);
  });
});
