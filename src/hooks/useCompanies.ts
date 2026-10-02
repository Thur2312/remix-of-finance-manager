import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { TaxBase } from '../lib/tax';

export type RegimeTributario = 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real';

export const REGIME_TRIBUTARIO_LABELS: Record<RegimeTributario, string> = {
  mei: 'MEI',
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

export interface Company {
  id: string;
  user_id: string;
  name: string;
  cnpj: string;
  tax_rate: number;
  tax_base: TaxBase;
  /** Meta de faturamento bruto do mês desta empresa, em centavos. null = sem meta. */
  monthly_revenue_goal_cents: number | null;
  // Dados fiscais do emitente, pro assistente de nota fiscal -- null até o
  // vendedor preencher (não é obrigatório na criação da empresa).
  ie: string | null;
  regime_tributario: RegimeTributario | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  endereco_cep: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFormData {
  name: string;
  cnpj: string;
  tax_rate: number;
  tax_base: TaxBase;
  ie?: string | null;
  regime_tributario?: RegimeTributario | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  endereco_cep?: string | null;
}

// Dados fiscais mínimos pra montar uma nota -- usado pelo assistente de NF
// pra avisar o vendedor que falta completar o cadastro antes de gerar a
// primeira nota.
export function hasFiscalDataComplete(c: Company): boolean {
  return !!(
    c.ie && c.regime_tributario &&
    c.endereco_logradouro && c.endereco_numero && c.endereco_bairro &&
    c.endereco_cidade && c.endereco_uf && c.endereco_cep
  );
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
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

  const createCompany = async (formData: CompanyFormData): Promise<Company> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error: err } = await supabase
      .from('companies')
      .insert({ ...formData, user_id: user.id })
      .select()
      .single();

    if (err) throw err;
    setCompanies(prev => [data as Company, ...prev]);
    return data as Company;
  };

  const updateCompany = async (id: string, formData: Partial<CompanyFormData>): Promise<Company> => {
    const { data, error: err } = await supabase
      .from('companies')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    setCompanies(prev => prev.map(c => c.id === id ? data as Company : c));
    return data as Company;
  };

  const deleteCompany = async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (err) throw err;
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  };
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