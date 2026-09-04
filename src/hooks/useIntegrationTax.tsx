import { applyTax, type TaxBase } from '../lib/tax';
import { formatCurrency } from '../lib/format';

// Nota: o hook `useIntegrationTax` foi removido (Bloco D Fase 2) — apontava pras
// tabelas legadas shopee_integrations/tiktok_integrations e ninguém o chamava.
// O imposto por empresa hoje vem do company-scope-store → companies.tax_rate.
// Este arquivo mantém só o <TaxSummaryRow> (importado pelos dashboards).

export function TaxSummaryRow({
  netProfit,
  revenue,
  taxRate,
  taxBase,
  companyName,
}: {
  netProfit: number;
  revenue: number;
  taxRate: number;
  taxBase: TaxBase;
  companyName: string | null;
}) {
  if (taxRate === 0) return null;

  const { taxAmount, netAfterTax } = applyTax({ revenue, profit: netProfit, taxRate, taxBase });
  const fmt = formatCurrency;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
      {companyName && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Empresa:{' '}
          <span className="font-medium text-gray-600 dark:text-gray-400">{companyName}</span>
          {' · '}{taxRate}% de imposto
        </p>
      )}
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Lucro bruto</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">{fmt(netProfit)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-red-500">
          Imposto ({taxRate}% sobre {taxBase === 'revenue' ? 'faturamento' : 'lucro'})
        </span>
        <span className="text-red-500 font-medium">− {fmt(taxAmount)}</span>
      </div>
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-gray-700 dark:text-gray-300">Lucro líquido após imposto</span>
        <span className="text-indigo-600 dark:text-indigo-400">{fmt(netAfterTax)}</span>
      </div>
    </div>
  );
} 