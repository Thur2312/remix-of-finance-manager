import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SaleEventProvider = 'shopee' | 'mercadolivre';

export interface SaleEvent {
  id: string;
  provider: SaleEventProvider;
  external_order_id: string;
  status: string;
  total_amount: number;
  currency: string;
  buyer_username: string | null;
  product_name: string | null;
  order_created_at: string;
  seen_at: string | null;
}

const SALE_EVENT_COLUMNS = 'id, provider, external_order_id, status, total_amount, currency, buyer_username, product_name, order_created_at, seen_at';

interface UseSaleEventsParams {
  provider?: SaleEventProvider;
  days?: number;
  page?: number;
  pageSize?: number;
}

// Página completa "/vendas" — filtro por marketplace/período + paginação.
export function useSaleEvents({ provider, days = 15, page = 0, pageSize = 20 }: UseSaleEventsParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sale-events', user?.id, provider, days, page, pageSize],
    enabled: !!user,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      let query = supabase
        .from('sale_events')
        .select(SALE_EVENT_COLUMNS, { count: 'exact' })
        .gte('order_created_at', since.toISOString())
        .order('order_created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (provider) query = query.eq('provider', provider);

      const { data, error, count } = await query;
      if (error) throw error;
      return { events: (data ?? []) as SaleEvent[], total: count ?? 0 };
    },
  });
}

// Widget do Dashboard — últimos N eventos, sem filtro. Polling em vez de
// Realtime (zero uso de postgres_changes no projeto hoje, e o teto de
// latência real é o cron de 15 min do Shopee de qualquer forma).
export function useRecentSaleEvents(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sale-events-recent', user?.id, limit],
    enabled: !!user,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_events')
        .select(SALE_EVENT_COLUMNS)
        .order('order_created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SaleEvent[];
    },
  });
}

export function useSaleEventsUnseenCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sale-events-unseen-count', user?.id],
    enabled: !!user,
    refetchInterval: 45_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sale_events')
        .select('id', { count: 'exact', head: true })
        .is('seen_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// Marca como visto só os ids passados (ex: os que estão no filtro/página
// atualmente carregados) — nunca a tabela inteira, pra não marcar um
// marketplace que o usuário nem estava olhando.
export function useMarkSaleEventsSeen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('sale_events')
        .update({ seen_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-events', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sale-events-unseen-count', user?.id] });
    },
  });
}
