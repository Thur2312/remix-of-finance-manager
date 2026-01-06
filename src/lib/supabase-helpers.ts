import { supabase } from '@/integrations/supabase/client';
import { RawOrder } from '@/lib/calculations';

/**
 * Fetches ALL orders from the database using pagination.
 * Supabase limits queries to 1000 rows by default, so this function
 * iteratively fetches all records in batches.
 * Note: RLS policies already filter by user_id, but we add an explicit
 * filter for clarity and defense-in-depth.
 */
export async function fetchAllOrders(userId?: string): Promise<RawOrder[]> {
  const PAGE_SIZE = 1000;
  let allOrders: RawOrder[] = [];
  let page = 0;
  let hasMore = true;

  // Get the current user if not provided
  let userIdToFilter = userId;
  if (!userIdToFilter) {
    const { data: { user } } = await supabase.auth.getUser();
    userIdToFilter = user?.id;
  }

  if (!userIdToFilter) {
    console.error('Usuário não autenticado');
    return [];
  }

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('raw_orders')
      .select('*')
      .eq('user_id', userIdToFilter)
      .range(from, to)
      .order('data_pedido', { ascending: false });

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
