// =============================================
// Company Types for Multi-Tenant System
// =============================================

export interface Company {
  id: string;
  user_id: string;
  name: string;
  cnpj: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyInsert {
  name: string;
  cnpj?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface CompanyUpdate {
  name?: string;
  cnpj?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

// =============================================
// Extended types with company context
// =============================================

export interface CompanyWithStats extends Company {
  total_transactions: number;
  total_revenue: number;
  last_activity: string | null;
}

// =============================================
// Form types for creating/editing companies
// =============================================

export interface CompanyFormData {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// =============================================
// Storage keys for localStorage persistence
// =============================================

export const STORAGE_KEYS = {
  CURRENT_COMPANY_ID: 'current_company_id',
} as const;

// =============================================
// Default company creation helpers
// =============================================

export const createDefaultCompanyData = (userId: string): CompanyInsert => ({
  name: 'Minha Empresa',
});
