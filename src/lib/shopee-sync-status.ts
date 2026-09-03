// Única fonte de verdade pra finança Shopee sincronizada via OAuth (tabelas
// orders/payments/fees, preenchidas pelo integration-sync).
//
// Antes desta unificação, `useShopeeSync`, `useDREData`, `IntegrationManage` e
// `IntegrationDashboard` (órfão) cada um reimplementava a agregação à mão, com
// coortes de pedido diferentes — o Dashboard chegava a mostrar Valor Líquido
// negativo (`receita de N pedidos − taxas de M pedidos`, N ≠ M).
//
import type { Cents } from './money';

// Regra (ver docs/DIAGNOSTICO-FINANCEIRO.md, seção 7.1):
//   - Coorte do card = pedido CONCLUÍDO na janela (`order_updated_at`), não
//     "criado na janela" (que ignora pedidos em trânsito) nem "repasse na
//     janela" (que faz a margem subir sem vender).
//   - Faturamento e Valor Líquido saem da MESMA coorte.
//   - Valor Líquido = Σ `escrow_amount` (o que a Shopee repassa), casado por
//     `order_id`. Pedido concluído sem repasse ainda → estimado pela margem dos
//     liberados, contado em `pedidosSemRepasse`. Ausência nunca vira zero.

export const SHOPEE_COMPLETED_STATUSES = ["COMPLETED"];
export const SHOPEE_SHIPPED_STATUSES = ["SHIPPED", "TO_CONFIRM_RECEIVE", "PROCESSED"];
export const SHOPEE_CANCELLED_STATUSES = ["CANCELLED", "UNPAID", "TO_RETURN"];
// Devolução/reembolso — subconjunto de CANCELLED_STATUSES, contado à parte pra
// o dashboard poder separar "cancelou antes de pagar" de "pagou e devolveu".
export const SHOPEE_RETURN_STATUSES = ["TO_RETURN"];
export const SHOPEE_IGNORED_STATUSES = ["TEST"];
export const SHOPEE_FEE_TYPES_TAXAS = ["commission", "service_fee", "shipping_fee", "reverse_shipping_fee"];

export const SHOPEE_FEE_LABELS: Record<string, string> = {
  commission:           "Comissão Shopee",
  service_fee:          "Taxa de serviço",
  shipping_fee:         "Frete",
  reverse_shipping_fee: "Frete reverso",
  adjustment:           "Ajuste (crédito)",
  seller_discount:      "Desconto do vendedor",
  shopee_discount:      "Desconto Shopee",
};

// Só COMPLETED conta como receita reconhecida — igual ao painel oficial da
// Shopee, que só reconhece a venda quando o pedido é concluído.
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

export function isShopeeReturnStatus(status: string): boolean {
  return SHOPEE_RETURN_STATUSES.includes(status);
}

// ─── Entradas ────────────────────────────────────────────────────────────────
// Os campos `_cents` (Fase 2 da padronização em centavos, ver
// docs/DIAGNOSTICO-FINANCEIRO.md seção 6) chegam via trigger no banco a partir
// da coluna float — mesma fonte, sem risco de divergir do valor em reais.
export interface ShopeeFinanceOrderLike {
  id: string;
  status: string;
  total_amount: number;
  total_amount_cents: number;
  order_created_at: string;
  order_updated_at: string;
}

export interface ShopeeFinancePaymentLike {
  order_id: string | null;
  payment_method: string;
  net_amount: number;
  net_amount_cents: number;
}

export interface ShopeeFinanceFeeLike {
  order_id: string | null;
  fee_type: string;
  amount: number;
  amount_cents: number;
  fee_date: string;
  description: string | null;
}

// BUG-03b: a captação grava o rebate de frete da Shopee como fee_type
// "adjustment" (junto com desconto do vendedor e voucher, que devem
// continuar fora do total de taxas) e description exata
// "Rebate frete Shopee" (integration-sync/index.ts). Nunca era subtraído do
// "shipping_fee" em lugar nenhum do consumo, então o frete exibido ficava
// ~4x o valor real, e o lucro por produto podia ficar falso-negativo quando
// caía no fallback "faturamento − taxas" (sem escrow ainda registrado).
export const SHOPEE_SHIPPING_REBATE_DESCRIPTION = "Rebate frete Shopee";

// O rebate é o único `adjustment` que abate frete — desconto do vendedor,
// desconto Shopee e vouchers continuam fora do total de taxas. Todo consumidor
// que soma frete/taxas Shopee deve subtrair o que este helper identifica.
export function isShopeeShippingRebate(
  fee: { fee_type: string; description: string | null },
): boolean {
  return fee.fee_type === "adjustment" &&
    fee.description === SHOPEE_SHIPPING_REBATE_DESCRIPTION;
}

// ─── Saída ───────────────────────────────────────────────────────────────────
export interface ShopeeFinance {
  // Coorte de competência: COMPLETED + `order_updated_at` na janela.
  pedidos: number;
  faturamento: number;          // Σ total_amount da coorte
  valorLiquido: number;         // Σ escrow_amount (liberado) + estimado (aLiberar)
  margemPct: number;            // valorLiquido / faturamento
  liberado: number;             // Σ escrow_amount dos que já têm repasse
  aLiberar: number;             // estimativa dos concluídos sem repasse
  pedidosSemRepasse: number;

  // Contexto (não entra no líquido)
  emTransito: number;           // SHIPPED-like, criados na janela — receita a caminho
  cancelados: number;           // CANCELLED-like na janela (inclui devoluções)
  devolucoes: number;           // TO_RETURN na janela — subconjunto de `cancelados`

  // Decomposição visual (não entra no líquido — ver BUG-03b)
  feeBreakdown: { type: string; label: string; amount: number; amountCents: Cents }[];
  porDia: { date: string; faturamento: number; liquido: number; faturamentoCents: Cents; liquidoCents: Cents }[];

  // Equivalentes em centavos dos campos acima (Fase 4, aditivo — ainda não
  // usados por nenhuma tela). Somam os inteiros `_cents` diretamente, sem
  // passar por ponto flutuante em nenhum momento.
  faturamentoCents: Cents;
  valorLiquidoCents: Cents;
  liberadoCents: Cents;
  aLiberarCents: Cents;
}

export function computeShopeeFinance(
  orders: ShopeeFinanceOrderLike[],
  payments: ShopeeFinancePaymentLike[],
  fees: ShopeeFinanceFeeLike[],
  opts: { sinceIso: string; untilIso?: string },
): ShopeeFinance {
  const sinceMs = Date.parse(opts.sinceIso);
  const untilMs = opts.untilIso ? Date.parse(opts.untilIso) : Infinity;
  // Comparação por timestamp (não string) — Supabase pode devolver `+00:00` e
  // `Date.now()` gera `Z`; lexicograficamente isso quebra no limite da janela.
  const inWindow = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return !Number.isNaN(t) && t >= sinceMs && t < untilMs;
  };

  // Repasse (escrow_amount) por pedido — casado por order_id.
  const netByOrder = new Map<string, number>();
  const netByOrderCents = new Map<string, number>();
  for (const p of payments) {
    if (p.payment_method !== "escrow" || !p.order_id) continue;
    netByOrder.set(p.order_id, (netByOrder.get(p.order_id) ?? 0) + Number(p.net_amount || 0));
    netByOrderCents.set(p.order_id, (netByOrderCents.get(p.order_id) ?? 0) + Number(p.net_amount_cents || 0));
  }

  // ── Coorte de competência ──────────────────────────────────────────────────
  const cohort = orders.filter(
    o => isShopeeCompletedStatus(o.status) && inWindow(o.order_updated_at),
  );
  const cohortIds = new Set(cohort.map(o => o.id));

  let faturamento = 0;
  let liberado = 0;
  let faturamentoLiberado = 0;
  let faturamentoSemRepasse = 0;
  let pedidosSemRepasse = 0;
  let faturamentoCents = 0;
  let liberadoCents = 0;
  let faturamentoLiberadoCents = 0;
  let faturamentoSemRepasseCents = 0;
  for (const o of cohort) {
    const amt = Number(o.total_amount || 0);
    const amtCents = Number(o.total_amount_cents || 0);
    faturamento += amt;
    faturamentoCents += amtCents;
    const net = netByOrder.get(o.id);
    const netCents = netByOrderCents.get(o.id);
    if (net === undefined) {
      pedidosSemRepasse++;
      faturamentoSemRepasse += amt;
      faturamentoSemRepasseCents += amtCents;
    } else {
      liberado += net;
      liberadoCents += netCents ?? 0;
      faturamentoLiberado += amt;
      faturamentoLiberadoCents += amtCents;
    }
  }
  // Estimativa do que ainda não liberou: aplica a margem observada nos liberados.
  const margemLiberados = faturamentoLiberado > 0 ? liberado / faturamentoLiberado : 0;
  const aLiberar = faturamentoSemRepasse * margemLiberados;
  const valorLiquido = liberado + aLiberar;
  const margemPct = faturamento > 0 ? (valorLiquido / faturamento) * 100 : 0;

  const margemLiberadosCents = faturamentoLiberadoCents > 0 ? liberadoCents / faturamentoLiberadoCents : 0;
  const aLiberarCents = Math.round(faturamentoSemRepasseCents * margemLiberadosCents);
  const valorLiquidoCents = liberadoCents + aLiberarCents;

  const emTransito = orders.filter(
    o => isShopeeShippedStatus(o.status) && inWindow(o.order_created_at),
  ).length;
  const canceladosOrders = orders.filter(
    o => isShopeeCancelledStatus(o.status) &&
      (inWindow(o.order_created_at) || inWindow(o.order_updated_at)),
  );
  const cancelados = canceladosOrders.length;
  const devolucoes = canceladosOrders.filter(o => isShopeeReturnStatus(o.status)).length;

  // ── Decomposição de taxas (visual) — só da coorte ──────────────────────────
  // BUG-03b: rebate de frete entra no bucket "shipping_fee" (subtraindo),
  // não fica separado como "adjustment" — ver SHOPEE_SHIPPING_REBATE_DESCRIPTION.
  const feeMap = new Map<string, number>();
  const feeMapCents = new Map<string, number>();
  for (const f of fees) {
    if (!f.order_id || !cohortIds.has(f.order_id)) continue;
    const isShippingRebate = isShopeeShippingRebate(f);
    const bucket = isShippingRebate ? "shipping_fee" : f.fee_type;
    const sign = isShippingRebate ? -1 : 1;
    feeMap.set(bucket, (feeMap.get(bucket) ?? 0) + sign * Number(f.amount || 0));
    feeMapCents.set(bucket, (feeMapCents.get(bucket) ?? 0) + sign * Number(f.amount_cents || 0));
  }
  const feeBreakdown = [...feeMap.entries()]
    .map(([type, amount]) => ({
      type,
      label: SHOPEE_FEE_LABELS[type] ?? type,
      amount,
      amountCents: (feeMapCents.get(type) ?? 0) as Cents,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Série por dia (competência: por order_updated_at) ──────────────────────
  const dayMap = new Map<string, { faturamento: number; liquido: number; faturamentoCents: number; liquidoCents: number }>();
  for (const o of cohort) {
    const d = (o.order_updated_at ?? "").substring(0, 10);
    if (!d) continue;
    const e = dayMap.get(d) ?? { faturamento: 0, liquido: 0, faturamentoCents: 0, liquidoCents: 0 };
    e.faturamento += Number(o.total_amount || 0);
    e.faturamentoCents += Number(o.total_amount_cents || 0);
    e.liquido += netByOrder.get(o.id) ?? 0;
    e.liquidoCents += netByOrderCents.get(o.id) ?? 0;
    dayMap.set(d, e);
  }
  const porDia = [...dayMap.entries()]
    .map(([date, v]) => ({
      date,
      faturamento: v.faturamento,
      liquido: v.liquido,
      faturamentoCents: v.faturamentoCents as Cents,
      liquidoCents: v.liquidoCents as Cents,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    pedidos: cohort.length,
    faturamento,
    valorLiquido,
    margemPct,
    liberado,
    aLiberar,
    pedidosSemRepasse,
    emTransito,
    cancelados,
    devolucoes,
    feeBreakdown,
    porDia,
    faturamentoCents: faturamentoCents as Cents,
    valorLiquidoCents: valorLiquidoCents as Cents,
    liberadoCents: liberadoCents as Cents,
    aLiberarCents: aLiberarCents as Cents,
  };
}
