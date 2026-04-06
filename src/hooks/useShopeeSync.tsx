import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const COMPLETED_STATUSES = ['COMPLETED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'READY_TO_SHIP'];
const CANCELLED_STATUSES = ['CANCELLED', 'UNPAID', 'TO_RETURN'];

function computeStats(
  orders: SyncedOrder[],
  payments: SyncedPayment[],
  fees: SyncedFee[]
): ShopeeSyncStats {

  const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status));
  const cancelledOrders = orders.filter(o => CANCELLED_STATUSES.includes(o.status));
  const pendingOrders   = orders.filter(
    o => !COMPLETED_STATUSES.includes(o.status) && !CANCELLED_STATUSES.includes(o.status)
  );

  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const totalNetAmount = payments
    .filter(p => p.payment_method === 'escrow')
    .reduce((sum, p) => sum + Number(p.net_amount), 0);

  const feeLabels: Record<string, string> = {
    commission:           'Comissão Shopee',
    service_fee:          'Taxa de serviço',
    shipping_fee:         'Frete',
    reverse_shipping_fee: 'Frete reverso',
    adjustment:           'Ajuste (crédito)',
    seller_discount:      'Desconto do vendedor',
    shopee_discount:      'Desconto Shopee',
  };

  const FEE_TYPES_TAXAS = ['commission', 'service_fee', 'shipping_fee', 'reverse_shipping_fee'];

  // Agrupa TODOS os tipos para o breakdown visual
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

  // Total de taxas = APENAS cobranças reais (sem ajustes e créditos)
  const totalFees = fees
    .filter(f => FEE_TYPES_TAXAS.includes(f.fee_type))
    .reduce((sum, f) => sum + Number(f.amount), 0);

  // Revenue by day
  const revenueMap = new Map<string, { revenue: number; net: number }>();

  completedOrders.forEach(o => {
    const date = o.order_created_at?.substring(0, 10) || '';
    if (!date) return;
    const existing = revenueMap.get(date) || { revenue: 0, net: 0 };
    revenueMap.set(date, { revenue: existing.revenue + Number(o.total_amount), net: existing.net });
  });

  payments
    .filter(p => p.payment_method === 'escrow')
    .forEach(p => {
      const date = p.transaction_date?.substring(0, 10) || '';
      if (!date) return;
      const existing = revenueMap.get(date) || { revenue: 0, net: 0 };
      revenueMap.set(date, { ...existing, net: existing.net + Number(p.net_amount) });
    });

  const revenueByDay = Array.from(revenueMap.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalOrders: orders.length,
    totalRevenue,
    totalFees,
    totalNetAmount,
    paidOrders:      completedOrders.length,
    pendingOrders:   pendingOrders.length,
    cancelledOrders: cancelledOrders.length,
    revenueByDay,
    feeBreakdown,
  };
}

export function useShopeeSync(connectionId: string | null, days: number = 15) {
  return useQuery({
    queryKey: ['shopee-sync', connectionId, days],
    enabled: !!connectionId,
        staleTime: 0,      
    gcTime: 0,           
    queryFn: async () => {
      const now = new Date()
      
      const since = new Date()
      since.setDate(since.getDate() - days)

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
      
      const [paymentsRes, feesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('transaction_date', since.toISOString())
          .order('transaction_date', { ascending: false })
          .limit(5000),
        supabase
          .from('fees')
          .select('*')
          .eq('integration_id', connectionId!)
          .gte('fee_date', since.toISOString())
          .limit(5000),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (feesRes.error) throw feesRes.error

      const orders   = allOrders
      const payments = (paymentsRes.data || []) as unknown as SyncedPayment[]
      const fees     = (feesRes.data     || []) as unknown as SyncedFee[]

      return {
        orders,
        payments,
        fees,
        prevOrders,
        stats: computeStats(orders, payments, fees),
        prevStats: computeStats(prevOrders, [], []),
      }
    },
  })
}