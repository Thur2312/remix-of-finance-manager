// Padronização em centavos (docs/DIAGNOSTICO-FINANCEIRO.md, seção 6). Fase 1:
// primitivas puras, ainda não plugadas em nenhum path existente.

export type Cents = number & { readonly __brand: unique symbol };

export const toCents = (reais: number): Cents => Math.round(reais * 100) as Cents;
export const toReais = (c: Cents): number => c / 100;

// Arredondamento half-up via Math.round (JS arredonda .5 em direção a +Infinity).
// Consistente em toCents/applyPercent para que soma de partes nunca diverja por
// causa de política de arredondamento diferente entre as duas funções.
export const applyPercent = (base: Cents, percent: number): Cents =>
  Math.round((base * percent) / 100) as Cents;

// Método do maior resto: divide `total` entre `pesos` proporcionalmente,
// garantindo que a soma das partes seja exatamente igual ao total (nunca usar
// Math.round item a item, que pode sobrar ou faltar centavos na soma).
export function rateioCents(total: Cents, pesos: number[]): Cents[] {
  if (pesos.length === 0) return [];

  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (somaPesos <= 0) return pesos.map(() => 0 as Cents);

  const brutos = pesos.map((p) => (total * p) / somaPesos);
  const base = brutos.map((v) => Math.floor(v));
  const restante = total - base.reduce((a, b) => a + b, 0);

  const ordemPorResto = brutos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto);

  const resultado = [...base];
  for (let k = 0; k < restante; k++) {
    resultado[ordemPorResto[k].i] += 1;
  }
  return resultado as Cents[];
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatCents = (c: Cents): string => currencyFormatter.format(toReais(c));

// Aceita "88,45", "88.45", "R$ 88,45", "1.234,56" (e o inverso "1,234.56").
// Quando há vírgula e ponto juntos, o separador que aparece por último é o
// decimal; o outro é descartado como separador de milhar. Retorna null se não
// der pra interpretar como número.
export function parseMoneyInput(input: string): Cents | null {
  if (!input) return null;

  let s = input.trim().replace(/^R\$\s*/i, '').trim();
  if (s === '') return null;

  const isNegative = s.startsWith('-');
  if (isNegative) s = s.slice(1);

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    s = lastComma > lastDot
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  return toCents(isNegative ? -n : n);
}
