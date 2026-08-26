import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { computeShopeeSyncStats } from '@/lib/shopee-sync-status';

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
  currency: string;
  description: string | null;
  fee_date: string;
}

export interface ShopeeSyncStats {
  totalOrders: number;
  totalRevenue: number;
  totalFees: number;
  totalNetAmount: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  revenueByDay: { date: string; revenue: number; net: number }[];
  feeBreakdown: { type: string; label: string; amount: number }[];
}

const feeLabels: Record<string, string> = {
  commission:           'Comissão Shopee',
  service_fee:          'Taxa de serviço',
  shipping_fee:         'Frete',
  reverse_shipping_fee: 'Frete reverso',
  adjustment:           'Ajuste (crédito)',
  seller_discount:      'Desconto do vendedor',
  shopee_discount:      'Desconto Shopee',
};

function computeStats(
  orders: SyncedOrder[],
  payments: SyncedPayment[],
  fees: SyncedFee[]
): ShopeeSyncStats {
  const shared = computeShopeeSyncStats(orders, payments, fees);

  const feeMap = new Map<string, number>();
  fees.forEach(f => {
    feeMap.set(f.fee_type, (feeMap.get(f.fee_type) || 0) + Number(f.amount));
  });

  const feeBreakdown = Array.from(feeMap.entries())
    .map(([type, amount]) => ({
      type,
      label: feeLabels[type] || type,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { ...shared, feeBreakdown };
}

export function useShopeeSync(connectionId: string | null, days: number = 15) {
  return useQuery({
    queryKey: ['shopee-sync', connectionId, days],
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000 )
      since.setUTCHours(0, 0, 0, 0)
      const prevEnd = new Date(since)
      const prevStart = new Date(since)
      prevStart.setDate(prevStart.getDate() - days)

      const allOrders: SyncedOrder[] = []
      let page = 0
      const pageSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('integration_id', connectionId!)
          .gte('order_created_at', since.toISOString())
          .order('order_created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allOrders.push(...(data as unknown as SyncedOrder[]))
        if (data.length < pageSize) break
        page++
      }

      const prevOrders: SyncedOrder[] = []
      let prevPage = 0
      while (true) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, total_amount, order_created_at')
          .eq('integration_id', connectionId!)
          .gte('order_created_at', prevStart.toISOString())
          .lt('order_created_at', prevEnd.toISOString())
          .range(prevPage * pageSize, (prevPage + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        prevOrders.push(...(data as unknown as SyncedOrder[]))
        if (data.length < pageSize) break
        prevPage++
      }

      const allFees: SyncedFee[] = []
      let feePage = 0
      while (true) {
        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('fee_date', since.toISOString())
          .range(feePage * pageSize, (feePage + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allFees.push(...(data as unknown as SyncedFee[]))
        if (data.length < pageSize) break
        feePage++
      }

      const allPrevFees: SyncedFee[] = []
      let prevFeePage = 0
      while (true) {
        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('fee_date', prevStart.toISOString())
          .lt('fee_date', prevEnd.toISOString())
          .range(prevFeePage * pageSize, (prevFeePage + 1) * pageSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allPrevFees.push(...(data as unknown as SyncedFee[]))
        if (data.length < pageSize) break
        prevFeePage++
      }

      const [paymentsRes, prevPaymentsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('transaction_date', since.toISOString())
          .order('transaction_date', { ascending: false })
          .limit(5000),
        supabase
          .from('payments')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('transaction_date', prevStart.toISOString())
          .lt('transaction_date', prevEnd.toISOString())
          .limit(5000),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (prevPaymentsRes.error) throw prevPaymentsRes.error

      const orders       = allOrders
      const payments     = (paymentsRes.data     || []) as unknown as SyncedPayment[]
      const fees         = allFees
      const prevPayments = (prevPaymentsRes.data || []) as unknown as SyncedPayment[]
      const prevFees     = allPrevFees

      return {
        orders,
        payments,
        fees,
        prevOrders,
        stats:     computeStats(orders,     payments,     fees),
        prevStats: computeStats(prevOrders, prevPayments, prevFees),
      }
    },
  })
}