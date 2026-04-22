import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  cnpj: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyFormData {
  name: string;
  cnpj: string;
  tax_rate: number;
}

// Cast tipado sem usar 'any'
const db = supabase as unknown as SupabaseClient;

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await db
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCompanies((data ?? []) as Company[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const createCompany = async (formData: CompanyFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error: err } = await db
      .from('companies')
      .insert({ ...formData, user_id: user.id })
      .select()
      .single();

    if (err) throw err;
    setCompanies(prev => [data as Company, ...prev]);
    return data as Company;
  };

  const updateCompany = async (id: string, formData: Partial<CompanyFormData>) => {
    const { data, error: err } = await db
      .from('companies')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    setCompanies(prev => prev.map(c => c.id === id ? data as Company : c));
    return data as Company;
  };

  const deleteCompany = async (id: string) => {
    const { error: err } = await db
      .from('companies')
      .delete()
      .eq('id', id);

    if (err) throw err;
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const linkIntegration = async (
    platform: 'tiktok' | 'shopee',
    integrationId: string,
    companyId: string
  ) => {
    const table = platform === 'tiktok' ? 'tiktok_integrations' : 'shopee_integrations';
    const { error: err } = await db
      .from(table)
      .update({ company_id: companyId })
      .eq('id', integrationId);

    if (err) throw err;
  };

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    linkIntegration,
  };
}

export function applyTaxRate(netProfit: number, taxRate: number) {
  const taxAmount = netProfit * (taxRate / 100);
  const netAfterTax = netProfit - taxAmount;
  return { taxAmount, netAfterTax };
}

export function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (d: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(d[len - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };

  return (
    calc(digits, 12) === parseInt(digits[12]) &&
    calc(digits, 13) === parseInt(digits[13])
  );
}