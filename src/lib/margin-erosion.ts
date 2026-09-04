// Radar de erosão de margem — "esse produto está ficando pior, e por quê?"
//
// Ferramentas de gestão mostram a margem ATUAL. Nenhuma rastreia a DERIVADA
// (a margem está caindo?) nem tenta apontar a causa. Aqui comparamos dois
// períodos adjacentes por SKU — o mesmo bloco que já monta o catálogo/insights
// (aggregateShopeeSkuFinance) — e sinalizamos quem cruzou pra prejuízo ou caiu
// mais que o normal, com a causa mais provável entre 3 candidatas:
//   - custo do produto subiu (product_costs)
//   - a plataforma reteve mais (taxa efetiva)
//   - o preço de venda médio caiu (desconto, guerra de preço)
// A causa é escolhida pelo maior IMPACTO EM R$ entre as três — não é uma
// decomposição contábil exata (os três fatores interagem), é um indício.
//
// Puro. Shopee-first — mesma limitação de fee-detail.ts/repasse-audit.ts: só
// a Shopee tem repasse (escrow) por pedido pra derivar lucro real por SKU.

import { aggregateShopeeSkuFinance, type ShopeeSkuRow } from './shopee-sku-finance';
import { isShopeeCompletedStatus } from './shopee-sync-status';

interface OrderItemLike {
  external_item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  total_price: number;
}
interface OrderLike {
  id: string;
  status: string;
  order_updated_at: string;
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

export interface MarginPoint {
  key: string;
  sku: string;
  nome: string;
  unidades: number;
  faturamento: number;
  custoUnit: number;
  precoMedio: number;
  /** (faturamento − net) / faturamento, em % — o que a plataforma reteve */
  taxaEfetivaPct: number;
  /** null quando não há custo cadastrado pra esse SKU no período — não dá pra apurar margem real */
  margemPct: number | null;
}

function toMarginPoint(r: ShopeeSkuRow): MarginPoint {
  const retido = r.total_faturado - r.net;
  const temCusto = r.custo_unitario_medio > 0;
  return {
    key: r.key,
    sku: r.sku,
    nome: r.nome_produto,
    unidades: r.itens_vendidos,
    faturamento: r.total_faturado,
    custoUnit: r.custo_unitario_medio,
    precoMedio: r.itens_vendidos > 0 ? r.total_faturado / r.itens_vendidos : 0,
    taxaEfetivaPct: r.total_faturado > 0 ? (retido / r.total_faturado) * 100 : 0,
    margemPct: temCusto && r.total_faturado > 0 ? (r.lucro_reais / r.total_faturado) * 100 : null,
  };
}

// Um snapshot por SKU do período [sinceIso, untilIso). Chamar 2× (janela atual
// e anterior) sobre a MESMA lista de pedidos já buscada — sem query nova.
export function buildMarginPoints(
  orders: OrderLike[],
  payments: PaymentLike[],
  costs: CostLike[],
  opts: { sinceIso: string; untilIso?: string },
): MarginPoint[] {
  const sinceMs = Date.parse(opts.sinceIso);
  const untilMs = opts.untilIso ? Date.parse(opts.untilIso) : Infinity;
  const cohort = orders.filter(o => {
    if (!isShopeeCompletedStatus(o.status)) return false;
    const t = Date.parse(o.order_updated_at);
    return !Number.isNaN(t) && t >= sinceMs && t < untilMs;
  });
  return aggregateShopeeSkuFinance(cohort, payments, costs).map(toMarginPoint);
}

export type CausaErosao = 'custo_subiu' | 'taxa_subiu' | 'preco_caiu' | 'indeterminado';

export interface MarginErosion {
  key: string;
  sku: string;
  nome: string;
  atual: MarginPoint;
  anterior: MarginPoint;
  /** atual.margemPct − anterior.margemPct, em pontos percentuais (negativo = piorou) */
  deltaMargemPct: number;
  /** estava positiva/zero e foi pro vermelho */
  cruzouZero: boolean;
  causaProvavel: CausaErosao;
  /** magnitude aproximada da queda em R$, no faturamento do período atual */
  impactoReais: number;
}

export interface MarginErosionOpts {
  /** queda mínima em pontos percentuais pra virar alerta (default 8) — ignorado se cruzou o zero */
  quedaMinimaPP?: number;
  /** unidades mínimas vendidas em CADA período pra considerar o SKU (evita ruído de 1 venda) */
  unidadesMinimas?: number;
}

export function detectMarginErosion(
  atual: MarginPoint[],
  anterior: MarginPoint[],
  opts: MarginErosionOpts = {},
): MarginErosion[] {
  const quedaMinimaPP = opts.quedaMinimaPP ?? 8;
  const unidadesMinimas = opts.unidadesMinimas ?? 2;
  const anteriorByKey = new Map(anterior.map(p => [p.key, p]));

  const out: MarginErosion[] = [];
  for (const a of atual) {
    if (a.margemPct == null || a.unidades < unidadesMinimas) continue;
    const p = anteriorByKey.get(a.key);
    if (!p || p.margemPct == null || p.unidades < unidadesMinimas) continue;

    const deltaMargemPct = a.margemPct - p.margemPct;
    const cruzouZero = p.margemPct >= 0 && a.margemPct < 0;
    if (!cruzouZero && deltaMargemPct > -quedaMinimaPP) continue;

    // impacto em R$ de cada fator candidato — o maior vira a causa apontada.
    const impactoCusto = (a.custoUnit - p.custoUnit) * a.unidades;
    const impactoTaxa = ((a.taxaEfetivaPct - p.taxaEfetivaPct) / 100) * a.faturamento;
    const impactoPreco = (p.precoMedio - a.precoMedio) * a.unidades;
    const candidatos: { tipo: CausaErosao; impacto: number }[] = [
      { tipo: 'custo_subiu', impacto: impactoCusto },
      { tipo: 'taxa_subiu', impacto: impactoTaxa },
      { tipo: 'preco_caiu', impacto: impactoPreco },
    ];
    const maior = candidatos.reduce((m, c) => (c.impacto > m.impacto ? c : m));
    const causaProvavel: CausaErosao = maior.impacto > 0 ? maior.tipo : 'indeterminado';

    out.push({
      key: a.key, sku: a.sku, nome: a.nome, atual: a, anterior: p,
      deltaMargemPct, cruzouZero, causaProvavel,
      impactoReais: Math.abs((deltaMargemPct / 100) * a.faturamento),
    });
  }

  out.sort((x, y) => x.deltaMargemPct - y.deltaMargemPct); // pior primeiro
  return out;
}
