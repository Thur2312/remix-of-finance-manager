// Formatação de números para exibição (pt-BR). Fonte única — antes cada tela
// reimplementava `formatCurrency` inline (13 cópias), com divergências sutis.
//
// Trabalha com `number` em reais (path legado). Para o path em centavos
// (branded `Cents`), usar `formatCents` de `./money`.

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_WHOLE = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * "R$ 1.234,56". Com `{ whole: true }` some os centavos ("R$ 1.235") — usado
 * em eixos de gráfico, onde o centavo é ruído.
 */
export function formatCurrency(value: number, opts?: { whole?: boolean }): string {
  const n = Number.isFinite(value) ? value : 0;
  return (opts?.whole ? BRL_WHOLE : BRL).format(n);
}

/** "R$ 1,2 mil" / "R$ 3,4 mi" — para rótulos curtos (KPI compacto, tooltip). */
export function formatCurrencyCompact(value: number): string {
  return BRL_COMPACT.format(Number.isFinite(value) ? value : 0);
}

/** "12,3%". `digits` controla as casas decimais (padrão 1). */
export function formatPercent(value: number, digits = 1): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toFixed(digits)}%`;
}
