export type TaxBase = 'revenue' | 'profit';

export function applyTax({ revenue, profit, taxRate, taxBase }: {
  revenue: number;
  profit: number;
  taxRate: number;
  taxBase: TaxBase;
}) {
  if (profit <= 0) return { taxAmount: 0, netAfterTax: profit };

  const base = taxBase === 'revenue' ? revenue : profit;
  const taxAmount = base * (taxRate / 100);
  const netAfterTax = profit - taxAmount;
  return { taxAmount, netAfterTax };
}
