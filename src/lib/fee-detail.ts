// Detalhamento de taxas — item 5 das diretrizes do dashboard.
//
// A tela /taxas concentra "o que a plataforma leva" fora do dashboard principal
// (item 4). Aqui ficam as agregações que ainda não existem em computeShopeeFinance:
// taxa por produto/anúncio e a série de taxa efetiva no tempo. O recorte por tipo
// de cobrança já vem pronto em `ShopeeFinance.feeBreakdown`.
//
// Puro. Shopee-first: é o único marketplace com linha de taxa real hoje
// (tabela `fees` + escrow). ML/TikTok entram quando os syncs capturarem taxa
// por linha.

import { aggregateShopeeSkuFinance } from './shopee-sku-finance';

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

export interface SkuFeeRow {
  key: string;
  nome: string;
  sku: string;
  itensVendidos: number;
  /** Σ receita dos itens que já têm repasse (escrow) */
  faturado: number;
  /** faturado − repasse = tudo que a Shopee reteve (comissão + serviço + frete + descontos) */
  retido: number;
  /** retido / faturado, em % */
  taxaEfetivaPct: number;
}

// Taxa retida por SKU. Reusa a alocação de repasse por item de
// aggregateShopeeSkuFinance (proporcional à receita do item no pedido; só itens
// de pedido COM escrow entram — sem repasse não dá pra saber o que foi retido).
export function aggregateShopeeFeesBySku(
  orders: OrderLike[],
  payments: PaymentLike[],
): SkuFeeRow[] {
  return aggregateShopeeSkuFinance(orders, payments, [])
    .filter(r => r.total_faturado > 0)
    .map(r => {
      const retido = r.total_faturado - r.net;
      return {
        key: r.key,
        nome: r.nome_produto,
        sku: r.sku,
        itensVendidos: r.itens_vendidos,
        faturado: r.total_faturado,
        retido,
        taxaEfetivaPct: r.total_faturado > 0 ? (retido / r.total_faturado) * 100 : 0,
      };
    })
    .sort((a, b) => b.retido - a.retido);
}

export interface FeeRatePoint {
  date: string;
  faturamento: number;
  retido: number;
  /** retido / faturamento no dia, em % */
  taxaEfetivaPct: number;
}

// Série de taxa efetiva por dia, a partir do `porDia` de computeShopeeFinance
// (faturamento e líquido da mesma coorte). Retido = faturamento − líquido.
export function feeRateSeries(
  porDia: { date: string; faturamento: number; liquido: number }[],
): FeeRatePoint[] {
  return porDia
    .map(d => {
      const retido = d.faturamento - d.liquido;
      return {
        date: d.date,
        faturamento: d.faturamento,
        retido,
        taxaEfetivaPct: d.faturamento > 0 ? (retido / d.faturamento) * 100 : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Taxa efetiva do período: retido / faturamento, em %. 0 se sem faturamento. */
export function effectiveFeeRatePct(faturamento: number, valorLiquido: number): number {
  if (faturamento <= 0) return 0;
  return ((faturamento - valorLiquido) / faturamento) * 100;
}
