import { describe, it, expect } from 'vitest';
import { toCents, toReais, applyPercent, rateioCents, formatCents, parseMoneyInput, type Cents } from './money';

describe('toCents / toReais', () => {
  it('converte reais em centavos', () => {
    expect(toCents(88.45)).toBe(8845);
    expect(toCents(0.1 + 0.2)).toBe(30); // o problema que centavos existe pra evitar
  });

  it('arredonda frações de centavo (half-up sobre a representação float de entrada)', () => {
    // 1.005 em IEEE754 já é 1.00499999999999989..., então *100 dá 100.4999...
    // e half-up fecha em 100, não 101 — limite inerente de receber reais como
    // float na fronteira; por isso toCents deve ser chamado o mais cedo
    // possível, antes de qualquer soma/multiplicação em ponto flutuante.
    expect(toCents(1.005)).toBe(100);
  });

  it('volta pra reais sem perda', () => {
    expect(toReais(8845 as Cents)).toBe(88.45);
  });
});

describe('applyPercent', () => {
  it('aplica percentual sobre centavos', () => {
    expect(applyPercent(10000 as Cents, 9)).toBe(900); // 9% de R$100,00
  });

  it('arredonda o resultado', () => {
    expect(applyPercent(100 as Cents, 33)).toBe(33); // 33.00 -> 33
    expect(applyPercent(1 as Cents, 50)).toBe(1); // 0.5 -> half-up -> 1
  });
});

describe('rateioCents', () => {
  it('soma das partes é sempre igual ao total (método do maior resto)', () => {
    const partes = rateioCents(100 as Cents, [1, 1, 1]); // 33.33 cada, não fecha limpo
    expect(partes.reduce((a, b) => a + b, 0)).toBe(100);
    expect(partes).toEqual([34, 33, 33]); // sobra vai pro maior resto (índice 0)
  });

  it('rateio proporcional a pesos diferentes', () => {
    const partes = rateioCents(1000 as Cents, [70, 30]);
    expect(partes).toEqual([700, 300]);
  });

  it('pesos zerados devolvem tudo zero, sem dividir por zero', () => {
    expect(rateioCents(100 as Cents, [0, 0])).toEqual([0, 0]);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(rateioCents(100 as Cents, [])).toEqual([]);
  });
});

describe('formatCents', () => {
  it('formata em BRL', () => {
    expect(formatCents(8845 as Cents)).toBe('R$ 88,45');
  });

  it('formata negativo', () => {
    expect(formatCents(-4494 as Cents)).toBe('-R$ 44,94');
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['88,45', 8845],
    ['88.45', 8845],
    ['R$ 88,45', 8845],
    ['1.234,56', 123456],
    ['1,234.56', 123456], // formato US, separador decimal é o último caractere
    ['-50,00', -5000],
  ])('parseia "%s"', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it('retorna null pra entrada vazia ou inválida', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
  });
});
