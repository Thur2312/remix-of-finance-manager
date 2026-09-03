import { useCallback, useEffect, useState } from 'react';
import { useCompanies, type Company } from './useCompanies';

// Filtro de empresa COMPARTILHADO entre as telas (Precificação, Custos Fixos,
// futuramente DRE/Dashboard). Não é um React context — é um valor em
// localStorage que cada tela lê, no mesmo espírito do DRE_COMPANY_STORAGE_KEY
// que a DRE já usa. `null` = "Todas" (consolidado), estado válido e default.
//
// Bloco D, escopo v1: sem trocador global no topbar.

const STORAGE_KEY = 'scope:companyId';

function read(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function useSelectedCompany() {
  const { companies, loading } = useCompanies();
  const [companyId, setCompanyIdState] = useState<string | null>(read);

  // se a empresa salva sumiu (removida), volta pra "Todas"
  useEffect(() => {
    if (loading || companyId === null) return;
    if (!companies.some(c => c.id === companyId)) setCompanyIdState(null);
  }, [companies, loading, companyId]);

  const setCompanyId = useCallback((id: string | null) => {
    setCompanyIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* quota / private mode */ }
  }, []);

  const company: Company | null = companyId
    ? companies.find(c => c.id === companyId) ?? null
    : null;

  return { companyId, setCompanyId, company, companies, loading };
}
