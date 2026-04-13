import { supabase } from '@/integrations/supabase/client';
import { RawOrder } from '@/lib/calculations';

/**
 * Fetches ALL orders from the database using pagination.
 * Supabase limits queries to 1000 rows by default, so this function
 * iteratively fetches all records in batches.
 * 
 * IMPORTANT: This function now filters by company_id for multi-tenant support.
 * If companyId is provided, orders are filtered by company.
 * 
 * @param companyId - The company ID to filter orders by (required for multi-tenant)
 */
export async function fetchAllOrders(companyId?: string): Promise<RawOrder[]> {
  const PAGE_SIZE = 1000;
  let allOrders: RawOrder[] = [];
  let page = 0;
  let hasMore = true;

  // Get company from localStorage if not provided
  let companyIdToFilter = companyId;
  
  if (!companyIdToFilter) {
    companyIdToFilter = localStorage.getItem('current_company_id') || undefined;
  }

  if (!companyIdToFilter) {
    console.error('Empresa não selecionada');
    return [];
  }

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const query = supabase
      .from('raw_orders')
      .select('*')
      .eq('company_id', companyIdToFilter)
      .range(from, to)
      .order('data_pedido', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      break;
    }

    if (data && data.length > 0) {
      allOrders = [...allOrders, ...data as RawOrder[]];
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allOrders;
}

/**
 * Helper to fetch data with company_id filter
 * Use this for all company-scoped queries
 */
export async function fetchWithCompany<T>(
  table: string,
  companyId: string,
  options?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    filters?: Record<string, string | number | boolean>;
    limit?: number;
  }
): Promise<T[]> {
  if (!companyId) {
    console.error('Company ID é obrigatório');
    return [];
  }

  let query = supabase
    .from(table)
    .select(options?.select || '*')
    .eq('company_id', companyId);

  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  if (options?.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Erro ao buscar ${table}:`, error);
    return [];
  }

  return data as T[];
}
