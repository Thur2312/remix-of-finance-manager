import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Company, CompanyInsert, CompanyUpdate } from '@/types/company.types';
import { STORAGE_KEYS } from '@/types/company.types';

// =============================================
// Types
// =============================================

interface CompanyContextType {
  // State
  currentCompany: Company | null;
  companies: Company[];
  loading: boolean;
  isInitialized: boolean;
  
  // Actions
  setCurrentCompany: (company: Company | null) => Promise<void>;
  setCurrentCompanyById: (companyId: string) => Promise<void>;
  createCompany: (data: CompanyInsert) => Promise<Company | null>;
  updateCompany: (companyId: string, data: CompanyUpdate) => Promise<boolean>;
  deleteCompany: (companyId: string) => Promise<boolean>;
  fetchCompanies: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  
  // Helpers
  hasCompany: boolean;
  isCurrentCompany: (companyId: string) => boolean;
}

interface CompanyProviderProps {
  children: ReactNode;
}

// =============================================
// Context
// =============================================

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

// =============================================
// Provider
// =============================================

export function CompanyProvider({ children }: CompanyProviderProps) {
  const { user, loading: authLoading } = useAuth();
  
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // =============================================
  // Load companies from Supabase
  // =============================================
  
  const fetchCompanies = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        return;
      }

      setCompanies((data as Company[]) || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // =============================================
  // Initialize - load from localStorage + fetch
  // =============================================

  useEffect(() => {
    const initializeCompany = async () => {
      if (!user?.id || authLoading) return;

      setLoading(true);
      
      try {
        // 1. Fetch all user's companies
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
          setLoading(false);
          return;
        }

        setCompanies((companiesData as Company[]) || []);

        // 2. Get current company from localStorage
        const storedCompanyId = localStorage.getItem(STORAGE_KEYS.CURRENT_COMPANY_ID);

        // 3. If no companies exist, create a default one
        if (!companiesData || companiesData.length === 0) {
          const { data: newCompany, error: createError } = await supabase
            .from('companies')
            .insert({ name: 'Minha Empresa', user_id: user.id })
            .select()
            .single();

          if (createError) {
            console.error('Error creating default company:', createError);
            setLoading(false);
            return;
          }

          if (newCompany) {
            setCompanies([newCompany as Company]);
            localStorage.setItem(STORAGE_KEYS.CURRENT_COMPANY_ID, (newCompany as Company).id);
            setCurrentCompanyState(newCompany as Company);
          }
        } else {
          // 4. If stored company exists in list, use it
          if (storedCompanyId) {
            const found = companiesData.find(c => c.id === storedCompanyId) as Company | undefined;
            if (found) {
              setCurrentCompanyState(found);
            } else {
              // Stored company not found, use first one
              const firstCompany = companiesData[0] as Company;
              localStorage.setItem(STORAGE_KEYS.CURRENT_COMPANY_ID, firstCompany.id);
              setCurrentCompanyState(firstCompany);
            }
          } else {
            // No stored company, use first one
            const firstCompany = companiesData[0] as Company;
            localStorage.setItem(STORAGE_KEYS.CURRENT_COMPANY_ID, firstCompany.id);
            setCurrentCompanyState(firstCompany);
          }
        }
      } catch (err) {
        console.error('Error initializing company:', err);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeCompany();
  }, [user?.id, authLoading]);

  // =============================================
  // Actions
  // =============================================

  const setCurrentCompany = useCallback(async (company: Company | null) => {
    if (!company) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_COMPANY_ID);
      setCurrentCompanyState(null);
      return;
    }

    localStorage.setItem(STORAGE_KEYS.CURRENT_COMPANY_ID, company.id);
    setCurrentCompanyState(company);
  }, []);

  const setCurrentCompanyById = useCallback(async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      await setCurrentCompany(company);
    }
  }, [companies, setCurrentCompany]);

  const createCompany = useCallback(async (data: CompanyInsert): Promise<Company | null> => {
    if (!user?.id) return null;

    try {
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating company:', error);
        return null;
      }

      if (newCompany) {
        const companyWithType = newCompany as Company;
        setCompanies(prev => [companyWithType, ...prev]);
        
        // Automatically switch to the new company
        await setCurrentCompany(companyWithType);
        
        return companyWithType;
      }

      return null;
    } catch (err) {
      console.error('Error creating company:', err);
      return null;
    }
  }, [user?.id, setCurrentCompany]);

  const updateCompany = useCallback(async (companyId: string, data: CompanyUpdate): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', companyId);

      if (error) {
        console.error('Error updating company:', error);
        return false;
      }

      // Update local state
      setCompanies(prev => prev.map(c => 
        c.id === companyId ? { ...c, ...data, updated_at: new Date().toISOString() } : c
      ));

      // Update current company if it's the one being updated
      if (currentCompany?.id === companyId) {
        setCurrentCompanyState(prev => prev ? { ...prev, ...data } : null);
      }

      return true;
    } catch (err) {
      console.error('Error updating company:', err);
      return false;
    }
  }, [currentCompany?.id]);

  const deleteCompany = useCallback(async (companyId: string): Promise<boolean> => {
    if (!user?.id) return false;

    // Can't delete if it's the only company
    if (companies.length <= 1) {
      console.error('Cannot delete the only company');
      return false;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) {
        console.error('Error deleting company:', error);
        return false;
      }

      // Remove from local state
      setCompanies(prev => prev.filter(c => c.id !== companyId));

      // If deleting current company, switch to another
      if (currentCompany?.id === companyId) {
        const remaining = companies.find(c => c.id !== companyId);
        if (remaining) {
          await setCurrentCompany(remaining);
        } else {
          setCurrentCompanyState(null);
          localStorage.removeItem(STORAGE_KEYS.CURRENT_COMPANY_ID);
        }
      }

      return true;
    } catch (err) {
      console.error('Error deleting company:', err);
      return false;
    }
  }, [companies, currentCompany?.id, setCurrentCompany, user?.id]);

  const refreshCompanies = useCallback(async () => {
    await fetchCompanies();
  }, [fetchCompanies]);

  // =============================================
  // Helpers
  // =============================================

  const hasCompany = companies.length > 0;

  const isCurrentCompany = useCallback((companyId: string): boolean => {
    return currentCompany?.id === companyId;
  }, [currentCompany?.id]);

  // =============================================
  // Value
  // =============================================

  const value: CompanyContextType = {
    currentCompany,
    companies,
    loading,
    isInitialized,
    setCurrentCompany,
    setCurrentCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
    fetchCompanies,
    refreshCompanies,
    hasCompany,
    isCurrentCompany,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

// =============================================
// Hook
// =============================================

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

// =============================================
// Re-export types
// =============================================

export type { CompanyContextType, CompanyProviderProps };
