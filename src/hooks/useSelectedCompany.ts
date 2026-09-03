import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useCompanies, type Company } from './useCompanies';
import {
  getCompanyId,
  setCompanyId as storeSetCompanyId,
  subscribeCompanyId,
} from '@/lib/company-scope-store';

// Filtro de empresa GLOBAL — compartilhado entre todas as telas (Precificação,
// Custos Fixos, DRE, dashboards). O valor mora no company-scope-store; aqui só
// ligamos ele ao React via useSyncExternalStore e resolvemos o objeto `Company`.
//
// `null` = "Todas" (consolidado), estado válido e default.

export function useSelectedCompany() {
  const { companies, loading } = useCompanies();
  const companyId = useSyncExternalStore(subscribeCompanyId, getCompanyId, getCompanyId);

  useEffect(() => {
    if (loading) return;
    // 1 empresa só: ela é sempre a selecionada (não há o que "consolidar" e o
    // switcher do topbar fica escondido — sem ela o usuário perderia a
    // estimativa de imposto sem ter onde reativá-la).
    if (companies.length === 1) {
      if (companyId !== companies[0].id) storeSetCompanyId(companies[0].id);
      return;
    }
    // 2+: se a empresa salva sumiu (removida), volta pra "Todas".
    if (companyId !== null && !companies.some((c) => c.id === companyId)) {
      storeSetCompanyId(null);
    }
  }, [companies, loading, companyId]);

  const setCompanyId = useCallback((id: string | null) => storeSetCompanyId(id), []);

  const company: Company | null = companyId
    ? companies.find((c) => c.id === companyId) ?? null
    : null;

  return { companyId, setCompanyId, company, companies, loading };
}
