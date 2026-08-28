import { differenceInDays } from 'date-fns';
import { toCents, type Cents } from './money';

// ============= INTERFACES =============

export interface DREPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface DRELineItem {
  label: string;
  value: number;
  percentage?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isHighlight?: boolean;
  indent?: number;
}

export interface DRESection {
  title: string;
  items: DRELineItem[];
  total?: DRELineItem;
}

export interface DREAlerta {
  tipo: 'warning' | 'error' | 'info';
  mensagem: string;
  campo: string;
}

// Pedido Shopee normalizado para o DRE (vem de orders + fees)
export interface ShopeeOrderDRE {
  id: string;
  total_faturado: number;
  total_faturado_cents: number;
  custo_unitario: number;
  custo_unitario_cents: number;
  quantidade: number;
  data_pedido: string | null;
}

// Pedido Mercado Livre
export interface MlOrder {
  user_id: string;
  order_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao: string | null;
  quantidade: number;
  total_faturado: number;
  total_faturado_cents?: number | null;
  desconto_plataforma: number;
  desconto_plataforma_cents?: number | null;
  desconto_vendedor: number;
  desconto_vendedor_cents?: number | null;
  custo_unitario: number;
  custo_unitario_cents?: number | null;
  taxa_ml: number;
  taxa_ml_cents?: number | null;
  frete_ml: number;
  frete_ml_cents?: number | null;
  status_pedido: string;
  data_pedido: string;
  updated_at: string;
}

// Lançamento do fluxo de caixa
export interface CashFlowEntry {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  amount_cents?: number | null;
  type: 'income' | 'expense';
  status: 'pending' | 'received' | 'paid' | 'overdue';
  due_date: string;
  category_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface DREData {
  periodo: DREPeriod;

  receitaBrutaShopee: number;
  receitaBrutaTikTok: number;
  receitaBrutaMercadoLivre: number;
  receitaBrutaExtra: number;
  receitaBrutaTotal: number;

  icms: number;
  issSimples: number;
  impostosSobreVendasTotal: number;

  cancelamentos: number;
  devolucoes: number;
  deducoesTotal: number;

  receitaLiquida: number;

  custoProdutos: number;
  custoEmbalagem: number;
  custoFreteEnvio: number;
  nfEntrada: number;
  cogsTotal: number;

  lucroBruto: number;
  margemBruta: number;

  comissoesMarketplace: number;
  comissoesAfiliados: number;
  adsMarketing: number;
  taxasGateway: number;
  taxasServicos: number;
  custosVariaveisTotal: number;

  margemContribuicao: number;
  percentualMargemContribuicao: number;

  custosFixosPorCategoria: Record<string, number>;
  custosFixosTotal: number;
  custosFixosProrrateados: number;
  diasPeriodo: number;

  lucroOperacional: number;
  margemOperacional: number;

  jurosMultas: number;
  impostosSobreLucro: number;
  despesasFinanceirasTotal: number;

  outrasReceitasFluxo: number;
  outrasDespesasFluxo: number;
  outrasDespesasFluxoPorCategoria: Record<string, number>;

  lucroLiquido: number;
  margemLiquida: number;

  alertas: DREAlerta[];

  // Equivalentes em centavos (Fase 4, aditivo — ver
  // docs/DIAGNOSTICO-FINANCEIRO.md seção 6). Percentuais (margens) não têm
  // versão em centavos — são razões, não dinheiro.
  receitaBrutaShopeeCents: Cents;
  receitaBrutaTikTokCents: Cents;
  receitaBrutaMercadoLivreCents: Cents;
  receitaBrutaExtraCents: Cents;
  receitaBrutaTotalCents: Cents;

  icmsCents: Cents;
  issSimplesCents: Cents;
  impostosSobreVendasTotalCents: Cents;

  cancelamentosCents: Cents;
  devolucoesCents: Cents;
  deducoesTotalCents: Cents;

  receitaLiquidaCents: Cents;

  custoProdutosCents: Cents;
  custoEmbalagemCents: Cents;
  custoFreteEnvioCents: Cents;
  nfEntradaCents: Cents;
  cogsTotalCents: Cents;

  lucroBrutoCents: Cents;

  comissoesMarketplaceCents: Cents;
  comissoesAfiliadosCents: Cents;
  adsMarketingCents: Cents;
  taxasGatewayCents: Cents;
  taxasServicosCents: Cents;
  custosVariaveisTotalCents: Cents;

  margemContribuicaoCents: Cents;

  custosFixosPorCategoriaCents: Record<string, Cents>;
  custosFixosTotalCents: Cents;
  custosFixosProrrateadosCents: Cents;

  lucroOperacionalCents: Cents;

  jurosMultasCents: Cents;
  impostosSobreLucroCents: Cents;
  despesasFinanceirasTotalCents: Cents;

  outrasReceitasFluxoCents: Cents;
  outrasDespesasFluxoCents: Cents;
  outrasDespesasFluxoPorCategoriaCents: Record<string, Cents>;

  lucroLiquidoCents: Cents;
}

export interface TikTokSettlement {
  id: string;
  user_id: string;
  order_id: string | null;
  statement_date: string | null;
  data_criacao_pedido: string | null;
  data_entrega: string | null;
  nome_produto: string | null;
  variacao: string | null;
  sku_id: string | null;
  quantidade: number | null;
  type: string | null;
  status: string | null;
  total_settlement_amount: number | null;
  total_settlement_amount_cents?: number | null;
  net_sales: number | null;
  net_sales_cents?: number | null;
  subtotal_before_discounts: number | null;
  subtotal_before_discounts_cents?: number | null;
  customer_payment: number | null;
  customer_payment_cents?: number | null;
  customer_refund: number | null;
  customer_refund_cents?: number | null;
  refund_subtotal: number | null;
  refund_subtotal_cents?: number | null;
  seller_discounts: number | null;
  seller_discounts_cents?: number | null;
  refund_seller_discounts: number | null;
  refund_seller_discounts_cents?: number | null;
  platform_discounts: number | null;
  platform_discounts_cents?: number | null;
  platform_discounts_refund: number | null;
  platform_discounts_refund_cents?: number | null;
  seller_cofunded_discount: number | null;
  seller_cofunded_discount_cents?: number | null;
  seller_cofunded_discount_refund: number | null;
  seller_cofunded_discount_refund_cents?: number | null;
  platform_cofunded_discount: number | null;
  platform_cofunded_discount_cents?: number | null;
  tiktok_shipping_fee: number | null;
  tiktok_shipping_fee_cents?: number | null;
  customer_shipping_fee: number | null;
  customer_shipping_fee_cents?: number | null;
  refunded_shipping: number | null;
  refunded_shipping_cents?: number | null;
  shipping_incentive: number | null;
  shipping_incentive_cents?: number | null;
  shipping_incentive_refund: number | null;
  shipping_incentive_refund_cents?: number | null;
  shipping_subsidy: number | null;
  shipping_subsidy_cents?: number | null;
  shipping_total: number | null;
  shipping_total_cents?: number | null;
  actual_return_shipping_fee: number | null;
  actual_return_shipping_fee_cents?: number | null;
  total_fees: number | null;
  total_fees_cents?: number | null;
  tiktok_commission_fee: number | null;
  tiktok_commission_fee_cents?: number | null;
  affiliate_commission: number | null;
  affiliate_commission_cents?: number | null;
  affiliate_partner_commission: number | null;
  affiliate_partner_commission_cents?: number | null;
  affiliate_shop_ads_commission: number | null;
  affiliate_shop_ads_commission_cents?: number | null;
  sfp_service_fee: number | null;
  sfp_service_fee_cents?: number | null;
  fee_per_item: number | null;
  fee_per_item_cents?: number | null;
  voucher_xtra_fee: number | null;
  voucher_xtra_fee_cents?: number | null;
  live_specials_fee: number | null;
  live_specials_fee_cents?: number | null;
  bonus_cashback_fee: number | null;
  bonus_cashback_fee_cents?: number | null;
  icms_difal: number | null;
  icms_difal_cents?: number | null;
  icms_penalty: number | null;
  icms_penalty_cents?: number | null;
  adjustment_amount: number | null;
  adjustment_amount_cents?: number | null;
  adjustment_reason: string | null;
}

export interface TikTokOrder {
  id: string;
  user_id: string;
  order_id: string;
  nome_produto: string | null;
  variacao: string | null;
  sku: string | null;
  quantidade: number | null;
  total_faturado: number | null;
  total_faturado_cents?: number | null;
  custo_unitario: number | null;
  custo_unitario_cents?: number | null;
  data_pedido: string | null;
  status_pedido: string | null;
  desconto_plataforma: number | null;
  desconto_plataforma_cents?: number | null;
  desconto_vendedor: number | null;
  desconto_vendedor_cents?: number | null;
}

export interface FixedCost {
  id: string;
  user_id: string;
  category: string;
  name: string;
  amount: number;
  amount_cents?: number | null;
  is_recurring: boolean;
}

export interface ShopeeSettings {
  taxa_comissao_shopee: number | null;
  adicional_por_item: number | null;
  percentual_nf_entrada: number | null;
  gasto_shopee_ads: number | null;
  imposto_nf_saida?: number | null;
}

export interface TikTokSettings {
  taxa_comissao_tiktok: number | null;
  taxa_afiliado: number | null;
  adicional_por_item: number | null;
  percentual_nf_entrada: number | null;
  gasto_tiktok_ads: number | null;
  imposto_nf_saida?: number | null;
}

// ============= HELPERS =============

// América/São Paulo é UTC-3 o ano inteiro desde o fim do horário de verão em
// 2019 — sem essa âncora fixa, getDefaultPeriods usava new Date() do
// NAVEGADOR de quem está olhando o relatório pra decidir onde "o mês atual"
// começa e termina, enquanto os pedidos das integrações são gravados em UTC
// (ver safeShopeeDate/toISOString). Um pedido das 23h de 31/jan em Brasília
// vira 2026-02-01T02:00:00Z no banco; o corte de período agora é calculado
// como instantes UTC fixos correspondentes à meia-noite em São Paulo, então
// o relatório não muda dependendo do fuso do dispositivo de quem está vendo.
const BUSINESS_TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

function businessDateParts(date: Date): { year: number; month: number } {
  const shifted = new Date(date.getTime() + BUSINESS_TZ_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

function businessMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1) - BUSINESS_TZ_OFFSET_MS);
}

function businessMonthEnd(year: number, month: number): Date {
  return new Date(businessMonthStart(year, month + 1).getTime() - 1);
}

export function getDefaultPeriods(): DREPeriod[] {
  const { year, month } = businessDateParts(new Date());
  return [
    { start: businessMonthStart(year, month), end: businessMonthEnd(year, month), label: 'Mês Atual' },
    { start: businessMonthStart(year, month - 1), end: businessMonthEnd(year, month - 1), label: 'Mês Anterior' },
    { start: businessMonthStart(year, month - 2), end: businessMonthEnd(year, month), label: 'Últimos 3 Meses' },
    { start: businessMonthStart(year, month - 5), end: businessMonthEnd(year, month), label: 'Últimos 6 Meses' },
    { start: businessMonthStart(year, 0), end: businessMonthEnd(year, 11), label: 'Ano Atual' },
  ];
}

export function filterByPeriod<T extends {
  data_pedido?: string | null;
  statement_date?: string | null;
  data_criacao_pedido?: string | null;
  due_date?: string | null;
}>(
  items: T[],
  period: DREPeriod,
  dateField: 'data_pedido' | 'statement_date' | 'data_criacao_pedido' | 'due_date' = 'data_pedido'
): T[] {
  return items.filter(item => {
    const dateValue = item[dateField];
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return date >= period.start && date <= period.end;
  });
}

// ============= ALERTAS =============

function gerarAlertas(data: Partial<DREData>): DREAlerta[] {
  const alertas: DREAlerta[] = [];

  if ((data.impostosSobreVendasTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({ tipo: 'warning', mensagem: 'Nenhum imposto sobre vendas configurado. Verifique as configurações de Simples Nacional/ISS.', campo: 'impostosSobreVendasTotal' });
  }
  if ((data.cogsTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({ tipo: 'error', mensagem: 'Custo dos produtos (COGS) zerado. Cadastre os custos unitários dos produtos.', campo: 'cogsTotal' });
  }
  if ((data.margemContribuicao || 0) < 0) {
    alertas.push({ tipo: 'error', mensagem: 'Margem de contribuição negativa! A operação não é sustentável.', campo: 'margemContribuicao' });
  }
  if ((data.lucroOperacional || 0) < 0 && (data.margemContribuicao || 0) > 0) {
    alertas.push({ tipo: 'warning', mensagem: 'Lucro operacional negativo. Custos fixos estão acima da margem de contribuição.', campo: 'lucroOperacional' });
  }
  if ((data.custosFixosTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({ tipo: 'info', mensagem: 'Nenhum custo fixo cadastrado. Cadastre custos fixos para uma DRE completa.', campo: 'custosFixosTotal' });
  }

  // Nada impede que uma venda já contabilizada pela integração (Shopee/TikTok/ML)
  // seja lançada de novo manualmente no Fluxo de Caixa (ex: ao conciliar o
  // repasse bancário) — não existe chave de referência entre CashFlowEntry e
  // o pedido de origem pra detectar/evitar isso automaticamente. Só alertamos.
  const receitaMarketplace = (data.receitaBrutaTotal || 0) - (data.receitaBrutaExtra || 0);
  if ((data.receitaBrutaExtra || 0) > 0 && receitaMarketplace > 0) {
    alertas.push({
      tipo: 'warning',
      mensagem: 'Há receita lançada manualmente no Fluxo de Caixa neste período, além das vendas dos marketplaces. Confira se algum desses lançamentos não é o mesmo repasse que a integração já contabilizou — senão a receita conta em dobro.',
      campo: 'receitaBrutaExtra',
    });
  }

  return alertas;
}

// ============= CÁLCULO PRINCIPAL =============

export function calculateDRE(
  shopeeOrders: ShopeeOrderDRE[],
  tiktokOrders: TikTokOrder[],
  tiktokSettlements: TikTokSettlement[],
  fixedCosts: FixedCost[],
  shopeeSettings: ShopeeSettings | null,
  tiktokSettings: TikTokSettings | null,
  period: DREPeriod,
  mlOrders: MlOrder[] = [],
  cashFlowEntries: CashFlowEntry[] = []
): DREData {

  const filteredShopeeOrders  = filterByPeriod(shopeeOrders,    period, 'data_pedido');
  const filteredTikTokOrders  = filterByPeriod(tiktokOrders,    period, 'data_pedido');
  const filteredSettlements   = filterByPeriod(tiktokSettlements, period, 'statement_date');
  const filteredCashFlow      = filterByPeriod(cashFlowEntries, period, 'due_date');
  const filteredMlOrders      = filterByPeriod(mlOrders, period, 'data_pedido')
    .filter(o => ['paid', 'delivered', 'payment_done'].includes(o.status_pedido));

  const diasPeriodo       = differenceInDays(period.end, period.start) + 1;
  const proporcaoPeriodo  = Math.min(diasPeriodo / 30, 1);

  // Settings não têm coluna _cents no banco — converte uma vez aqui.
  const gastoShopeeAdsCents = toCents(Number(shopeeSettings?.gasto_shopee_ads) || 0);
  const gastoTiktokAdsCents = toCents(Number(tiktokSettings?.gasto_tiktok_ads) || 0);
  const adicionalPorItemShopeeCents = toCents(Number(shopeeSettings?.adicional_por_item) || 0);

  // 1. RECEITA BRUTA
  const receitaBrutaShopee = filteredShopeeOrders.reduce((s, o) => s + (o.total_faturado || 0), 0);
  const receitaBrutaTikTok = filteredTikTokOrders.reduce((s, o) => s + (o.total_faturado || 0), 0);
  const receitaBrutaMercadoLivre = filteredMlOrders.reduce((s, o) => s + (o.total_faturado ?? 0), 0);
  const receitaBrutaExtra = filteredCashFlow
    .filter(e => e.type === 'income' && e.status === 'received')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const receitaBrutaTotal = receitaBrutaShopee + receitaBrutaTikTok + receitaBrutaMercadoLivre + receitaBrutaExtra;

  const receitaBrutaShopeeCents = filteredShopeeOrders.reduce((s, o) => s + Number(o.total_faturado_cents || 0), 0);
  const receitaBrutaTikTokCents = filteredTikTokOrders.reduce((s, o) => s + Number(o.total_faturado_cents || 0), 0);
  const receitaBrutaMercadoLivreCents = filteredMlOrders.reduce((s, o) => s + Number(o.total_faturado_cents ?? 0), 0);
  const receitaBrutaExtraCents = filteredCashFlow
    .filter(e => e.type === 'income' && e.status === 'received')
    .reduce((s, e) => s + Number(e.amount_cents || 0), 0);
  const receitaBrutaTotalCents = receitaBrutaShopeeCents + receitaBrutaTikTokCents + receitaBrutaMercadoLivreCents + receitaBrutaExtraCents;

  // 2. IMPOSTOS
  const icms = filteredSettlements.reduce((s, x) => s + Math.abs(x.icms_difal || 0) + Math.abs(x.icms_penalty || 0), 0);
  const issShopee  = receitaBrutaShopee * ((shopeeSettings?.imposto_nf_saida || 0) / 100);
  const issTikTok  = receitaBrutaTikTok * ((tiktokSettings?.imposto_nf_saida || 0) / 100);
  const issSimples = issShopee + issTikTok;
  const impostosSobreVendasTotal = icms + issSimples;

  const icmsCents = filteredSettlements.reduce((s, x) =>
    s + Math.abs(Number(x.icms_difal_cents || 0)) + Math.abs(Number(x.icms_penalty_cents || 0)), 0);
  const issShopeeCents = Math.round(receitaBrutaShopeeCents * ((shopeeSettings?.imposto_nf_saida || 0) / 100));
  const issTikTokCents = Math.round(receitaBrutaTikTokCents * ((tiktokSettings?.imposto_nf_saida || 0) / 100));
  const issSimplesCents = issShopeeCents + issTikTokCents;
  const impostosSobreVendasTotalCents = icmsCents + issSimplesCents;

  // 3. DEDUÇÕES
  const cancelamentos = 0;
  const devolucoes = filteredSettlements
    .filter(s => s.type === 'Refund')
    .reduce((s, x) => s + Math.abs(x.refund_subtotal || x.customer_refund || 0), 0);
  const deducoesTotal = cancelamentos + devolucoes;

  const cancelamentosCents = 0 as Cents;
  const devolucoesCents = filteredSettlements
    .filter(s => s.type === 'Refund')
    .reduce((s, x) => s + Math.abs(Number(x.refund_subtotal_cents || x.customer_refund_cents || 0)), 0);
  const deducoesTotalCents = cancelamentosCents + devolucoesCents;

  // 4. RECEITA LÍQUIDA
  const receitaLiquida = receitaBrutaTotal - impostosSobreVendasTotal - deducoesTotal;
  const receitaLiquidaCents = receitaBrutaTotalCents - impostosSobreVendasTotalCents - deducoesTotalCents;

  // 5. COGS
  const custoProdutosShopee = filteredShopeeOrders.reduce((s, o) => s + ((o.custo_unitario || 0) * (o.quantidade || 1)), 0);
  const custoProdutosTikTok = filteredTikTokOrders.reduce((s, o) => s + ((o.custo_unitario || 0) * (o.quantidade || 1)), 0);
  const custoProdutosMl     = filteredMlOrders.reduce((s, o) => s + ((o.custo_unitario ?? 0) * (o.quantidade ?? 1)), 0);
  const custoProdutos = custoProdutosShopee + custoProdutosTikTok + custoProdutosMl;
  const custoEmbalagem = 0;
  const custoFreteTikTok = filteredSettlements.reduce((s, x) => {
    const cost   = Math.abs(x.tiktok_shipping_fee || 0);
    const income = (x.customer_shipping_fee || 0) + (x.shipping_subsidy || 0) + (x.shipping_incentive || 0);
    return s + Math.max(0, cost - income);
  }, 0);
  const custoFreteMl = filteredMlOrders.reduce((s, o) => s + (o.frete_ml ?? 0), 0);
  const custoFreteEnvio = custoFreteTikTok + custoFreteMl;
  const nfEntrada = custoProdutosShopee * ((shopeeSettings?.percentual_nf_entrada || 0) / 100)
                  + custoProdutosTikTok * ((tiktokSettings?.percentual_nf_entrada || 0) / 100);
  const cogsTotal = custoProdutos + custoEmbalagem + custoFreteEnvio + nfEntrada;

  const custoProdutosShopeeCents = filteredShopeeOrders.reduce((s, o) => s + (Number(o.custo_unitario_cents || 0) * (o.quantidade || 1)), 0);
  const custoProdutosTikTokCents = filteredTikTokOrders.reduce((s, o) => s + (Number(o.custo_unitario_cents || 0) * (o.quantidade || 1)), 0);
  const custoProdutosMlCents     = filteredMlOrders.reduce((s, o) => s + (Number(o.custo_unitario_cents ?? 0) * (o.quantidade ?? 1)), 0);
  const custoProdutosCents = custoProdutosShopeeCents + custoProdutosTikTokCents + custoProdutosMlCents;
  const custoEmbalagemCents = 0 as Cents;
  const custoFreteTikTokCents = filteredSettlements.reduce((s, x) => {
    const cost   = Math.abs(Number(x.tiktok_shipping_fee_cents || 0));
    const income = Number(x.customer_shipping_fee_cents || 0) + Number(x.shipping_subsidy_cents || 0) + Number(x.shipping_incentive_cents || 0);
    return s + Math.max(0, cost - income);
  }, 0);
  const custoFreteMlCents = filteredMlOrders.reduce((s, o) => s + Number(o.frete_ml_cents ?? 0), 0);
  const custoFreteEnvioCents = custoFreteTikTokCents + custoFreteMlCents;
  const nfEntradaCents = Math.round(custoProdutosShopeeCents * ((shopeeSettings?.percentual_nf_entrada || 0) / 100))
                        + Math.round(custoProdutosTikTokCents * ((tiktokSettings?.percentual_nf_entrada || 0) / 100));
  const cogsTotalCents = custoProdutosCents + custoEmbalagemCents + custoFreteEnvioCents + nfEntradaCents;

  // 6. LUCRO BRUTO
  const lucroBruto  = receitaLiquida - cogsTotal;
  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
  const lucroBrutoCents = receitaLiquidaCents - cogsTotalCents;

  // 7. CUSTOS VARIÁVEIS
  const comissaoShopee   = receitaBrutaShopee * ((shopeeSettings?.taxa_comissao_shopee || 0) / 100);
  const comissaoTikTok   = filteredSettlements.reduce((s, x) => s + Math.abs(x.tiktok_commission_fee || 0), 0);
  const comissaoMl       = filteredMlOrders.reduce((s, o) => s + (o.taxa_ml ?? 0), 0);
  const comissoesMarketplace = comissaoShopee + comissaoTikTok + comissaoMl;

  const comissaoShopeeCents = Math.round(receitaBrutaShopeeCents * ((shopeeSettings?.taxa_comissao_shopee || 0) / 100));
  const comissaoTikTokCents = filteredSettlements.reduce((s, x) => s + Math.abs(Number(x.tiktok_commission_fee_cents || 0)), 0);
  const comissaoMlCents     = filteredMlOrders.reduce((s, o) => s + Number(o.taxa_ml_cents ?? 0), 0);
  const comissoesMarketplaceCents = comissaoShopeeCents + comissaoTikTokCents + comissaoMlCents;

  const comissoesAfiliados = filteredSettlements.reduce((s, x) =>
    s + Math.abs(x.affiliate_commission || 0)
      + Math.abs(x.affiliate_partner_commission || 0)
      + Math.abs(x.affiliate_shop_ads_commission || 0), 0);

  const comissoesAfiliadosCents = filteredSettlements.reduce((s, x) =>
    s + Math.abs(Number(x.affiliate_commission_cents || 0))
      + Math.abs(Number(x.affiliate_partner_commission_cents || 0))
      + Math.abs(Number(x.affiliate_shop_ads_commission_cents || 0)), 0);

  const adsMarketing  = (shopeeSettings?.gasto_shopee_ads || 0) + (tiktokSettings?.gasto_tiktok_ads || 0);
  const taxasGateway  = 0;
  const taxasAdicionaisShopee = filteredShopeeOrders.reduce((s, o) =>
    s + ((shopeeSettings?.adicional_por_item || 0) * (o.quantidade || 1)), 0);
  const taxasAdicionaisTikTok = filteredSettlements.reduce((s, x) =>
    s + Math.abs(x.sfp_service_fee || 0)
      + Math.abs(x.fee_per_item || 0)
      + Math.abs(x.voucher_xtra_fee || 0)
      + Math.abs(x.live_specials_fee || 0)
      + Math.abs(x.bonus_cashback_fee || 0), 0);
  const taxasServicos = taxasAdicionaisShopee + taxasAdicionaisTikTok;
  const custosVariaveisTotal = comissoesMarketplace + comissoesAfiliados + adsMarketing + taxasGateway + taxasServicos;

  const adsMarketingCents = gastoShopeeAdsCents + gastoTiktokAdsCents;
  const taxasGatewayCents = 0 as Cents;
  const taxasAdicionaisShopeeCents = filteredShopeeOrders.reduce((s, o) =>
    s + (adicionalPorItemShopeeCents * (o.quantidade || 1)), 0);
  const taxasAdicionaisTikTokCents = filteredSettlements.reduce((s, x) =>
    s + Math.abs(Number(x.sfp_service_fee_cents || 0))
      + Math.abs(Number(x.fee_per_item_cents || 0))
      + Math.abs(Number(x.voucher_xtra_fee_cents || 0))
      + Math.abs(Number(x.live_specials_fee_cents || 0))
      + Math.abs(Number(x.bonus_cashback_fee_cents || 0)), 0);
  const taxasServicosCents = taxasAdicionaisShopeeCents + taxasAdicionaisTikTokCents;
  const custosVariaveisTotalCents = comissoesMarketplaceCents + comissoesAfiliadosCents + adsMarketingCents + taxasGatewayCents + taxasServicosCents;

  // 8. MARGEM DE CONTRIBUIÇÃO
  const margemContribuicao = lucroBruto - custosVariaveisTotal;
  const percentualMargemContribuicao = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;
  const margemContribuicaoCents = lucroBrutoCents - custosVariaveisTotalCents;

  // 9. CUSTOS FIXOS
  const custosFixosPorCategoria: Record<string, number> = {};
  const custosFixosPorCategoriaCents: Record<string, Cents> = {};
  let custosFixosTotal = 0;
  let custosFixosTotalCents = 0;
  fixedCosts.forEach(c => {
    custosFixosPorCategoria[c.category] = (custosFixosPorCategoria[c.category] || 0) + c.amount;
    custosFixosTotal += c.amount;
    const amountCents = Number(c.amount_cents ?? 0);
    custosFixosPorCategoriaCents[c.category] = ((custosFixosPorCategoriaCents[c.category] ?? 0) + amountCents) as Cents;
    custosFixosTotalCents += amountCents;
  });
  const custosFixosProrrateados = custosFixosTotal * proporcaoPeriodo;
  const custosFixosProrrateadosCents = Math.round(custosFixosTotalCents * proporcaoPeriodo);

  // 10. LUCRO OPERACIONAL
  const lucroOperacional  = margemContribuicao - custosFixosProrrateados;
  const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0;
  const lucroOperacionalCents = margemContribuicaoCents - custosFixosProrrateadosCents;

  // 11. DESPESAS FINANCEIRAS
  const jurosMultas = 0;
  const impostosSobreLucro = 0;
  const despesasFinanceirasTotal = jurosMultas + impostosSobreLucro;
  const jurosMultasCents = 0 as Cents;
  const impostosSobreLucroCents = 0 as Cents;
  const despesasFinanceirasTotalCents = jurosMultasCents + impostosSobreLucroCents;

  // Outras despesas do fluxo de caixa (type=expense, status=paid)
  const outrasReceitasFluxo = receitaBrutaExtra;
  const outrasReceitasFluxoCents = receitaBrutaExtraCents;
  const outrasDespesasFluxoPorCategoria: Record<string, number> = {};
  const outrasDespesasFluxoPorCategoriaCents: Record<string, Cents> = {};
  let outrasDespesasFluxo = 0;
  let outrasDespesasFluxoCents = 0;
  filteredCashFlow
    .filter(e => e.type === 'expense' && e.status === 'paid')
    .forEach(e => {
      const cat = e.category_id || 'Sem categoria';
      outrasDespesasFluxoPorCategoria[cat] = (outrasDespesasFluxoPorCategoria[cat] || 0) + e.amount;
      outrasDespesasFluxo += e.amount;
      const amountCents = Number(e.amount_cents ?? 0);
      outrasDespesasFluxoPorCategoriaCents[cat] = ((outrasDespesasFluxoPorCategoriaCents[cat] ?? 0) + amountCents) as Cents;
      outrasDespesasFluxoCents += amountCents;
    });

  // 12. LUCRO LÍQUIDO
  const lucroLiquido  = lucroOperacional - despesasFinanceirasTotal - outrasDespesasFluxo;
  const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;
  const lucroLiquidoCents = lucroOperacionalCents - despesasFinanceirasTotalCents - outrasDespesasFluxoCents;

  const alertas = gerarAlertas({ receitaBrutaTotal, receitaBrutaExtra, impostosSobreVendasTotal, cogsTotal, margemContribuicao, lucroOperacional, custosFixosTotal });

  return {
    periodo: period,
    receitaBrutaShopee, receitaBrutaTikTok, receitaBrutaMercadoLivre, receitaBrutaExtra, receitaBrutaTotal,
    icms, issSimples, impostosSobreVendasTotal,
    cancelamentos, devolucoes, deducoesTotal,
    receitaLiquida,
    custoProdutos, custoEmbalagem, custoFreteEnvio, nfEntrada, cogsTotal,
    lucroBruto, margemBruta,
    comissoesMarketplace, comissoesAfiliados, adsMarketing, taxasGateway, taxasServicos, custosVariaveisTotal,
    margemContribuicao, percentualMargemContribuicao,
    custosFixosPorCategoria, custosFixosTotal, custosFixosProrrateados, diasPeriodo,
    lucroOperacional, margemOperacional,
    jurosMultas, impostosSobreLucro, despesasFinanceirasTotal,
    outrasReceitasFluxo, outrasDespesasFluxo, outrasDespesasFluxoPorCategoria,
    lucroLiquido, margemLiquida,
    alertas,

    receitaBrutaShopeeCents: receitaBrutaShopeeCents as Cents,
    receitaBrutaTikTokCents: receitaBrutaTikTokCents as Cents,
    receitaBrutaMercadoLivreCents: receitaBrutaMercadoLivreCents as Cents,
    receitaBrutaExtraCents: receitaBrutaExtraCents as Cents,
    receitaBrutaTotalCents: receitaBrutaTotalCents as Cents,
    icmsCents: icmsCents as Cents,
    issSimplesCents: issSimplesCents as Cents,
    impostosSobreVendasTotalCents: impostosSobreVendasTotalCents as Cents,
    cancelamentosCents,
    devolucoesCents: devolucoesCents as Cents,
    deducoesTotalCents: deducoesTotalCents as Cents,
    receitaLiquidaCents: receitaLiquidaCents as Cents,
    custoProdutosCents: custoProdutosCents as Cents,
    custoEmbalagemCents,
    custoFreteEnvioCents: custoFreteEnvioCents as Cents,
    nfEntradaCents: nfEntradaCents as Cents,
    cogsTotalCents: cogsTotalCents as Cents,
    lucroBrutoCents: lucroBrutoCents as Cents,
    comissoesMarketplaceCents: comissoesMarketplaceCents as Cents,
    comissoesAfiliadosCents: comissoesAfiliadosCents as Cents,
    adsMarketingCents: adsMarketingCents as Cents,
    taxasGatewayCents,
    taxasServicosCents: taxasServicosCents as Cents,
    custosVariaveisTotalCents: custosVariaveisTotalCents as Cents,
    margemContribuicaoCents: margemContribuicaoCents as Cents,
    custosFixosPorCategoriaCents,
    custosFixosTotalCents: custosFixosTotalCents as Cents,
    custosFixosProrrateadosCents: custosFixosProrrateadosCents as Cents,
    lucroOperacionalCents: lucroOperacionalCents as Cents,
    jurosMultasCents,
    impostosSobreLucroCents,
    despesasFinanceirasTotalCents: despesasFinanceirasTotalCents as Cents,
    outrasReceitasFluxoCents: outrasReceitasFluxoCents as Cents,
    outrasDespesasFluxoCents: outrasDespesasFluxoCents as Cents,
    outrasDespesasFluxoPorCategoriaCents,
    lucroLiquidoCents: lucroLiquidoCents as Cents,
  };
}

// ============= FORMATAÇÃO =============

export function formatDREForDisplay(dre: DREData): DRESection[] {
  const sections: DRESection[] = [];

  sections.push({
    title: 'RECEITA OPERACIONAL BRUTA',
    items: [
      { label: 'Vendas Shopee',       value: dre.receitaBrutaShopee,        indent: 1 },
      { label: 'Vendas TikTok Shop',  value: dre.receitaBrutaTikTok,        indent: 1 },
      ...(dre.receitaBrutaMercadoLivre > 0 ? [{ label: 'Vendas Mercado Livre',               value: dre.receitaBrutaMercadoLivre, indent: 1 }] : []),
      ...(dre.receitaBrutaExtra       > 0 ? [{ label: 'Outras Receitas (Fluxo de Caixa)',    value: dre.receitaBrutaExtra,        indent: 1 }] : []),
    ],
    total: { label: 'RECEITA BRUTA TOTAL', value: dre.receitaBrutaTotal, isSubtotal: true },
  });

  if (dre.impostosSobreVendasTotal > 0) {
    sections.push({
      title: 'IMPOSTOS SOBRE VENDAS',
      items: [
        ...(dre.icms      > 0 ? [{ label: 'ICMS (DIFAL + Penalties)', value: -dre.icms,      indent: 1 }] : []),
        ...(dre.issSimples > 0 ? [{ label: 'Simples Nacional / ISS',  value: -dre.issSimples, indent: 1 }] : []),
      ],
      total: { label: 'TOTAL IMPOSTOS', value: -dre.impostosSobreVendasTotal, isSubtotal: true },
    });
  }

  if (dre.deducoesTotal > 0) {
    sections.push({
      title: 'CANCELAMENTOS E DEVOLUÇÕES',
      items: [
        ...(dre.cancelamentos > 0 ? [{ label: 'Cancelamentos', value: -dre.cancelamentos, indent: 1 }] : []),
        ...(dre.devolucoes    > 0 ? [{ label: 'Devoluções',    value: -dre.devolucoes,    indent: 1 }] : []),
      ],
      total: { label: 'TOTAL DEDUÇÕES', value: -dre.deducoesTotal, isSubtotal: true },
    });
  }

  sections.push({ title: 'RECEITA LÍQUIDA', items: [], total: { label: 'RECEITA LÍQUIDA', value: dre.receitaLiquida, isTotal: true, isHighlight: true } });

  sections.push({
    title: 'CUSTO DO PRODUTO/SERVIÇO (COGS)',
    items: [
      { label: 'Custo das Mercadorias',      value: -dre.custoProdutos,   indent: 1 },
      ...(dre.custoEmbalagem  > 0 ? [{ label: 'Embalagens',               value: -dre.custoEmbalagem,  indent: 1 }] : []),
      ...(dre.custoFreteEnvio > 0 ? [{ label: 'Frete de Envio (seller)', value: -dre.custoFreteEnvio, indent: 1 }] : []),
      ...(dre.nfEntrada       > 0 ? [{ label: 'NF de Entrada',            value: -dre.nfEntrada,       indent: 1 }] : []),
    ],
    total: { label: 'COGS TOTAL', value: -dre.cogsTotal, isSubtotal: true },
  });

  sections.push({ title: 'RESULTADO BRUTO', items: [], total: { label: 'LUCRO BRUTO', value: dre.lucroBruto, percentage: dre.margemBruta, isTotal: true, isHighlight: true } });

  sections.push({
    title: 'CUSTOS VARIÁVEIS OPERACIONAIS',
    items: [
      { label: 'Comissões Marketplace (Shopee + TikTok + ML)', value: -dre.comissoesMarketplace, indent: 1 },
      ...(dre.comissoesAfiliados > 0 ? [{ label: 'Comissões Afiliados',        value: -dre.comissoesAfiliados, indent: 1 }] : []),
      ...(dre.adsMarketing       > 0 ? [{ label: 'Ads e Marketing',            value: -dre.adsMarketing,       indent: 1 }] : []),
      ...(dre.taxasGateway       > 0 ? [{ label: 'Taxas Gateway/Pagamento',    value: -dre.taxasGateway,       indent: 1 }] : []),
      ...(dre.taxasServicos      > 0 ? [{ label: 'Taxas de Serviços (SFP, etc)', value: -dre.taxasServicos,    indent: 1 }] : []),
    ],
    total: { label: 'TOTAL CUSTOS VARIÁVEIS', value: -dre.custosVariaveisTotal, isSubtotal: true },
  });

  sections.push({ title: 'MARGEM DE CONTRIBUIÇÃO', items: [], total: { label: 'MARGEM DE CONTRIBUIÇÃO', value: dre.margemContribuicao, percentage: dre.percentualMargemContribuicao, isTotal: true, isHighlight: true } });

  const fixedCostItems: DRELineItem[] = Object.entries(dre.custosFixosPorCategoria).map(([cat, amt]) => ({
    label: cat, value: -(amt * (dre.diasPeriodo / 30)), indent: 1,
  }));
  if (fixedCostItems.length > 0 || dre.custosFixosProrrateados > 0) {
    sections.push({
      title: `CUSTOS FIXOS (prorrateado: ${dre.diasPeriodo} dias)`,
      items: fixedCostItems,
      total: { label: 'TOTAL CUSTOS FIXOS', value: -dre.custosFixosProrrateados, isSubtotal: true },
    });
  }

  sections.push({ title: 'RESULTADO OPERACIONAL', items: [], total: { label: 'LUCRO OPERACIONAL', value: dre.lucroOperacional, percentage: dre.margemOperacional, isTotal: true, isHighlight: true } });

  if (dre.outrasDespesasFluxo > 0) {
    sections.push({
      title: 'OUTRAS DESPESAS OPERACIONAIS (Fluxo de Caixa)',
      items: Object.entries(dre.outrasDespesasFluxoPorCategoria).map(([cat, amt]) => ({ label: cat, value: -amt, indent: 1 })),
      total: { label: 'TOTAL OUTRAS DESPESAS', value: -dre.outrasDespesasFluxo, isSubtotal: true },
    });
  }

  if (dre.despesasFinanceirasTotal > 0) {
    sections.push({
      title: 'DESPESAS FINANCEIRAS E IMPOSTOS SOBRE LUCRO',
      items: [
        ...(dre.jurosMultas       > 0 ? [{ label: 'Juros e Multas', value: -dre.jurosMultas,       indent: 1 }] : []),
        ...(dre.impostosSobreLucro > 0 ? [{ label: 'IRPJ / CSLL',   value: -dre.impostosSobreLucro, indent: 1 }] : []),
      ],
      total: { label: 'TOTAL DESPESAS FINANCEIRAS', value: -dre.despesasFinanceirasTotal, isSubtotal: true },
    });
  }

  sections.push({ title: 'RESULTADO FINAL', items: [], total: { label: 'LUCRO LÍQUIDO', value: dre.lucroLiquido, percentage: dre.margemLiquida, isTotal: true, isHighlight: true } });

  return sections;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}