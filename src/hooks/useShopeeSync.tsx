import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeShopeeFinance, ShopeeFinance } from '@/lib/shopee-sync-status';

export interface SyncedOrderItem {
  id: string;
  order_id: string;
  external_item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SyncedOrder {
  id: string;
  integration_id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  total_amount_cents: number;
  currency: string;
  buyer_username: string;
  shipping_carrier: string;
  tracking_number: string;
  paid_at: string | null;
  order_created_at: string;
  order_updated_at: string;
  synced_at: string;
  order_items: SyncedOrderItem[];
}

export interface SyncedPayment {
  id: string;
  integration_id: string;
  external_transaction_id: string;
  order_id: string | null;
  amount: number;
  marketplace_fee: number;
  net_amount: number;
  net_amount_cents: number;
  currency: string;
  payment_method: string;
  status: string;
  description: string;
  transaction_date: string;
  synced_at: string;
}

export interface SyncedFee {
  id: string;
  integration_id: string;
  external_fee_id: string;
  order_id: string | null;
  fee_type: string;
  amount: number;
  amount_cents: number;
  currency: string;
  description: string | null;
  fee_date: string;
}

// Nome mantido para os imports existentes; a forma é a de `computeShopeeFinance`.
export type ShopeeSyncStats = ShopeeFinance;

// `connection` aceita 1 id (caso comum) ou vários (recorte por empresa no
// UnifiedDashboard — uma empresa tem N lojas Shopee). null/[] = desabilitado.
export function useShopeeSync(connection: string | string[] | null, days: number = 15) {
  const connectionIds = (Array.isArray(connection) ? connection : connection ? [connection] : [])
    .filter(Boolean);
  return useQuery({
    queryKey: ['shopee-sync', [...connectionIds].sort().join(','), days],
    enabled: connectionIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);
      since.setUTCHours(0, 0, 0, 0);
      const prevEnd = new Date(since);
      const prevStart = new Date(since);
      prevStart.setDate(prevStart.getDate() - days);

      const sinceIso = since.toISOString();
      const prevStartIso = prevStart.toISOString();
      const prevEndIso = prevEnd.toISOString();
      const pageSize = 1000;

      // Pedidos da janela atual: concluído na janela (`order_updated_at`) OU
      // criado na janela (para o contexto "em trânsito"). O recorte fino é
      // feito em `computeShopeeFinance`.
      const allOrders: SyncedOrder[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .in('integration_id', connectionIds)
          .or(`order_updated_at.gte.${sinceIso},order_created_at.gte.${sinceIso}`)
          .order('order_created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allOrders.push(...(data as unknown as SyncedOrder[]));
        if (data.length < pageSize) break;
        page++;
      }

      // Coorte do período anterior = pedido concluído na janela [prevStart, prevEnd).
      // (`emTransito`/`cancelados` do período anterior não são exibidos.)
      const prevOrders: SyncedOrder[] = [];
      let prevPage = 0;
      while (true) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, total_amount, total_amount_cents, order_created_at, order_updated_at')
          .in('integration_id', connectionIds)
          .gte('order_updated_at', prevStartIso)
          .lt('order_updated_at', prevEndIso)
          .range(prevPage * pageSize, (prevPage + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        prevOrders.push(...(data as unknown as SyncedOrder[]));
        if (data.length < pageSize) break;
        prevPage++;
      }

      // Busca as fees das duas janelas (30d) de uma vez. `computeShopeeFinance`
      // faz o recorte: coorte por `order_id`, legado por `fee_date`.
      const allFees: SyncedFee[] = [];
      let feePage = 0;
      while (true) {
        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .in('integration_id', connectionIds)
          .gte('fee_date', prevStartIso)
          .range(feePage * pageSize, (feePage + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allFees.push(...(data as unknown as SyncedFee[]));
        if (data.length < pageSize) break;
        feePage++;
      }

      // Escrow é casado por `order_id`, não por data — busca tudo da conexão uma
      // vez e as duas janelas usam o mesmo array (o join decide o recorte).
      const allPayments: SyncedPayment[] = [];
      let payPage = 0;
      while (true) {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .in('integration_id', connectionIds)
          .eq('payment_method', 'escrow')
          .range(payPage * pageSize, (payPage + 1) * pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allPayments.push(...(data as unknown as SyncedPayment[]));
        if (data.length < pageSize) break;
        payPage++;
      }

      return {
        orders: allOrders,
        payments: allPayments,
        fees: allFees.filter(f => f.fee_date >= sinceIso),
        prevOrders,
        stats:     computeShopeeFinance(allOrders, allPayments, allFees, { sinceIso }),
        prevStats: computeShopeeFinance(prevOrders, allPayments, allFees, { sinceIso: prevStartIso, untilIso: prevEndIso }),
      };
    },
  });
}
