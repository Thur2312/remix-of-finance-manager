import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { applyTax, type TaxBase } from '../lib/tax';
import { formatCurrency } from '../lib/format';

interface TaxInfo {
  companyId: string | null;
  companyName: string | null;
  taxRate: number;
  loading: boolean;
}

interface IntegrationWithCompany {
  company_id: string | null;
  companies: {
    id: string;
    name: string;
    tax_rate: number;
  } | null;
}

export function useIntegrationTax(
  platform: 'tiktok' | 'shopee',
  integrationId: string | null | undefined
): TaxInfo {
  const [info, setInfo] = useState<TaxInfo>({
    companyId: null,
    companyName: null,
    taxRate: 0,
    loading: false,
  });

  useEffect(() => {
    if (!integrationId) return;

    const table = platform === 'tiktok' ? 'tiktok_integrations' : 'shopee_integrations';

    setInfo(p => ({ ...p, loading: true }));

    void supabase  // ← era `db`, corrigido para `supabase`
      .from(table)
      .select('company_id, companies(id, name, tax_rate)')
      .eq('id', integrationId)
      .single()
      .then((result) => {
        if (result.error || !result.data) {
          setInfo({ companyId: null, companyName: null, taxRate: 0, loading: false });
          return;
        }
        const raw = result.data as unknown as IntegrationWithCompany;
        const company = raw.companies;
        setInfo({
          companyId: company?.id ?? null,
          companyName: company?.name ?? null,
          taxRate: company?.tax_rate ?? 0,
          loading: false,
        });
      });
  }, [platform, integrationId]);

  return info;
}

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