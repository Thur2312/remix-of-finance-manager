import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { applyTaxRate } from './useCompanies';

const db = supabase as unknown as SupabaseClient;

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

    void db
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

export function calcFinancials(netProfit: number, taxRate: number) {
  const { taxAmount, netAfterTax } = applyTaxRate(netProfit, taxRate);
  return {
    grossProfit: netProfit,
    taxRate,
    taxAmount,
    netAfterTax,
    hasTax: taxRate > 0,
  };
}

export function TaxSummaryRow({
  netProfit,
  taxRate,
  companyName,
}: {
  netProfit: number;
  taxRate: number;
  companyName: string | null;
}) {
  if (taxRate === 0) return null;

  const { taxAmount, netAfterTax } = applyTaxRate(netProfit, taxRate);
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
        <span className="text-red-500">Imposto ({taxRate}%)</span>
        <span className="text-red-500 font-medium">− {fmt(taxAmount)}</span>
      </div>
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-gray-700 dark:text-gray-300">Lucro líquido após imposto</span>
        <span className="text-indigo-600 dark:text-indigo-400">{fmt(netAfterTax)}</span>
      </div>
    </div>
  );
}