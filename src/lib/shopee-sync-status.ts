// Única fonte de verdade pra classificar status de pedido Shopee sincronizado
// via OAuth (tabelas orders/payments/fees, preenchidas pelo integration-sync).
// Antes, useDREData.ts, useShopeeSync.tsx e IntegrationDashboard.tsx cada um
// reimplementava essa classificação à mão — duas copiavam a mesma lista
// (COMPLETED_STATUSES/SHIPPED_STATUSES) em arquivos diferentes, e a terceira
// (IntegrationDashboard) não filtrava status nenhum, somando até pedido
// cancelado como receita. Resultado real: DRE, Dashboard principal e o
// painel de integrações podiam mostrar receita Shopee diferente entre si
// pro mesmo período, antes até de comparar com o painel oficial da Shopee.
export const SHOPEE_COMPLETED_STATUSES = ["COMPLETED"];
export const SHOPEE_SHIPPED_STATUSES = ["SHIPPED", "TO_CONFIRM_RECEIVE", "PROCESSED"];
export const SHOPEE_CANCELLED_STATUSES = ["CANCELLED", "UNPAID", "TO_RETURN"];
export const SHOPEE_IGNORED_STATUSES = ["TEST"];
export const SHOPEE_FEE_TYPES_TAXAS = ["commission", "service_fee", "shipping_fee", "reverse_shipping_fee"];

// Só COMPLETED conta como receita reconhecida — igual ao painel oficial da
// Shopee, que só reconhece a venda quando o pedido é concluído. Antes isso
// também incluía SHIPPED/TO_CONFIRM_RECEIVE/PROCESSED (pedido ainda em
// trânsito, que pode ser cancelado/devolvido antes de concluir), inflando a
// receita mostrada nas 3 telas que usam essa classificação.
export function isShopeeRevenueStatus(status: string): boolean {
  return SHOPEE_COMPLETED_STATUSES.includes(status);
}

export function isShopeeCompletedStatus(status: string): boolean {
  return SHOPEE_COMPLETED_STATUSES.includes(status);
}

export function isShopeeShippedStatus(status: string): boolean {
  return SHOPEE_SHIPPED_STATUSES.includes(status);
}

export function isShopeeCancelledStatus(status: string): boolean {
  return SHOPEE_CANCELLED_STATUSES.includes(status);
}

export interface ShopeeSyncOrderLike {
  status: string;
  total_amount: number;
  order_created_at: string;
}

export interface ShopeeSyncPaymentLike {
  payment_method: string;
  net_amount: number;
  transaction_date: string;
}

export interface ShopeeSyncFeeLike {
  fee_type: string;
  amount: number;
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
}

// Cálculo central de estatísticas a partir de orders/payments/fees
// sincronizados via OAuth — usado por useShopeeSync (Dashboard principal) e
// useDREData (DRE), que antes tinham cada um sua própria cópia.
export function computeShopeeSyncStats(
  orders: ShopeeSyncOrderLike[],
  payments: ShopeeSyncPaymentLike[],
  fees: ShopeeSyncFeeLike[],
): ShopeeSyncStats {
  const completedOrders = orders.filter(o => isShopeeCompletedStatus(o.status));
  const shippedOrders = orders.filter(o => isShopeeShippedStatus(o.status));
  const cancelledOrders = orders.filter(o => isShopeeCancelledStatus(o.status));

  // Só pedido concluído conta como receita — shippedOrders (em trânsito)
  // continua rastreado em pendingOrders, mas fora de totalRevenue/totalOrders.
  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const totalNetAmount = payments
    .filter(p => p.payment_method === "escrow")
    .reduce((sum, p) => sum + Number(p.net_amount), 0);

  const totalFees = fees
    .filter(f => SHOPEE_FEE_TYPES_TAXAS.includes(f.fee_type))
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const revenueMap = new Map<string, { revenue: number; net: number }>();

  completedOrders.forEach(o => {
    const date = o.order_created_at?.substring(0, 10) || "";
    if (!date) return;
    const existing = revenueMap.get(date) || { revenue: 0, net: 0 };
    revenueMap.set(date, { revenue: existing.revenue + Number(o.total_amount), net: existing.net });
  });

  payments
    .filter(p => p.payment_method === "escrow")
    .forEach(p => {
      const date = p.transaction_date?.substring(0, 10) || "";
      if (!date) return;
      const existing = revenueMap.get(date) || { revenue: 0, net: 0 };
      revenueMap.set(date, { ...existing, net: existing.net + Number(p.net_amount) });
    });

  const revenueByDay = Array.from(revenueMap.entries())
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalOrders: completedOrders.length,
    totalRevenue,
    totalFees,
    totalNetAmount,
    paidOrders: completedOrders.length,
    pendingOrders: shippedOrders.length,
    cancelledOrders: cancelledOrders.length,
    revenueByDay,
  };
}
