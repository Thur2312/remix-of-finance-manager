// Agregação de resultado por SKU pro path de sincronização da Shopee — junta
// os itens dos pedidos (order_items) com o repasse real (escrow_amount, casado
// por order_id) e o custo de product_costs. Puro; alimenta productInsights no
// Dashboard. O path de upload manual já tem isso via calculateResults.
//
// Regra: só entra item de pedido COM repasse. Sem escrow, "lucro" seria só o
// custo negativo — é dinheiro a liberar, não prejuízo. O rateio do repasse por
// item é proporcional à receita do item dentro do pedido (aproximação — a
// Shopee não repassa por item).

interface OrderItemLike {
  external_item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  total_price: number;
}
interface OrderLike {
  id: string;
  order_items: OrderItemLike[];
}
interface PaymentLike {
  order_id: string | null;
  payment_method: string;
  net_amount: number;
}
interface CostLike {
  external_item_id: string | null;
  sku: string | null;
  cost: number;
  packaging_cost: number;
  other_costs: number;
}

export interface ShopeeSkuRow {
  key: string;
  nome_produto: string;
  sku: string;
  itens_vendidos: number;
  total_faturado: number;
  /** repasse (escrow) alocado ao SKU */
  net: number;
  custo_unitario_medio: number;
  lucro_reais: number;
}

export function aggregateShopeeSkuFinance(
  orders: OrderLike[],
  payments: PaymentLike[],
  costs: CostLike[],
): ShopeeSkuRow[] {
  const netByOrder = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_method === 'escrow' && p.order_id) {
      netByOrder.set(p.order_id, (netByOrder.get(p.order_id) ?? 0) + Number(p.net_amount || 0));
    }
  }

  const costByItemId = new Map<string, number>();
  const costBySku = new Map<string, number>();
  for (const c of costs) {
    const unit = Number(c.cost || 0) + Number(c.packaging_cost || 0) + Number(c.other_costs || 0);
    if (unit <= 0) continue;
    if (c.external_item_id) costByItemId.set(c.external_item_id, unit);
    if (c.sku) costBySku.set(c.sku, unit);
  }
  const unitCost = (it: OrderItemLike): number =>
    costByItemId.get(it.external_item_id) ?? costBySku.get(it.sku) ?? 0;

  interface Acc { nome: string; sku: string; qty: number; rev: number; net: number; custo: number; temCusto: boolean }
  const agg = new Map<string, Acc>();

  for (const o of orders) {
    const orderNet = netByOrder.get(o.id);
    if (orderNet === undefined) continue; // sem repasse → fora
    const orderRev = o.order_items.reduce((s, it) => s + Number(it.total_price || 0), 0);
    if (orderRev <= 0) continue;

    for (const it of o.order_items) {
      const key = it.sku || it.external_item_id || it.item_name || 'sem-sku';
      const e = agg.get(key) ?? { nome: it.item_name || 'Sem nome', sku: it.sku || '-', qty: 0, rev: 0, net: 0, custo: 0, temCusto: false };
      const itRev = Number(it.total_price || 0);
      e.qty += Number(it.quantity || 0);
      e.rev += itRev;
      e.net += orderNet * (itRev / orderRev);
      const uc = unitCost(it);
      if (uc > 0) { e.custo = uc; e.temCusto = true; }
      agg.set(key, e);
    }
  }

  return [...agg.entries()].map(([key, e]) => ({
    key,
    nome_produto: e.nome,
    sku: e.sku,
    itens_vendidos: e.qty,
    total_faturado: e.rev,
    net: e.net,
    custo_unitario_medio: e.temCusto ? e.custo : 0,
    lucro_reais: e.net - (e.temCusto ? e.custo : 0) * e.qty,
  }));
}
