import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Hook para obter company_id de forma segura
 * Garante que todas as queries usem o company_id correto
 */
export function useCompanyId() {
  const { currentCompany } = useCompany();
  
  return {
    companyId: currentCompany?.id ?? null,
    isReady: !!currentCompany?.id,
  };
}

/**
 * Hook para construir queries com company_id automaticamente
 * Uso: const { query } = useCompanyQuery();
 */
export function useCompanyQuery() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  
  const query = useMemo(() => {
    if (!user?.id || !currentCompany?.id) {
      return null;
    }
    
    return supabase
      .from('companies')
      .select();
  }, [user?.id, currentCompany?.id]);
  
  return {
    supabase,
    userId: user?.id ?? null,
    companyId: currentCompany?.id ?? null,
    isReady: !!user?.id && !!currentCompany?.id,
  };
}

/**
 * Helper para adicionar company_id a qualquer query
 * Uso em qualquer lugar onde você precise fazer queries company-aware
 */
export function buildCompanyQuery<T>(
  table: string,
  companyId: string,
  userId: string,
) {
  if (!companyId || !userId) {
    return null;
  }
  
  return supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId);
}

/**
 * Hook para verificar se o usuário tem empresa ativa
 */
export function useRequireCompany() {
  const { currentCompany, loading, hasCompany } = useCompany();
  
  return {
    currentCompany,
    loading,
    hasCompany,
    companyId: currentCompany?.id ?? null,
    isReady: !loading && hasCompany,
  };
}
