import { toCents, type Cents } from './money';
import type { Database } from '@/integrations/supabase/types';

export interface SettingsData {
  id: string;
  user_id: string;
  name: string;
  taxa_comissao_shopee: number;
  adicional_por_item: number;
  percentual_valor_antecipado: number;
  taxa_antecipacao: number;
  percentual_nf_entrada: number;
  gasto_shopee_ads: number;
  is_default: boolean;
}

// As colunas numéricas de `settings` são nullable no banco (config parcial).
// O cálculo trabalha com número — normaliza null→0 na fronteira de leitura,
// um lugar só, em vez de `Number(x)` espalhado (que também dava NaN pra
// undefined). Ver docs/DIAGNOSTICO seção 7 (fronteira de captação).
export function normalizeShopeeSettings(
  row: Database['public']['Tables']['settings']['Row'],
): SettingsData {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    taxa_comissao_shopee: row.taxa_comissao_shopee ?? 0,
    adicional_por_item: row.adicional_por_item ?? 0,
    percentual_valor_antecipado: row.percentual_valor_antecipado ?? 0,
    taxa_antecipacao: row.taxa_antecipacao ?? 0,
    percentual_nf_entrada: row.percentual_nf_entrada ?? 0,
    gasto_shopee_ads: row.gasto_shopee_ads ?? 0,
    is_default: row.is_default ?? false,
  };
}

export interface RawOrder {
  id: string;
  user_id: string;
  order_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao: string | null;
  quantidade: number;
  total_faturado: number;
  total_faturado_cents?: number | null;
  rebate_shopee: number;
  rebate_shopee_cents?: number | null;
  custo_unitario: number;
  custo_unitario_cents?: number | null;
  data_pedido: string | null;
  status_pedido: string | null;
}

export interface GroupedResult {
  key: string;
  nome_produto: string;
  sku: string;
  variacao?: string;
  itens_vendidos: number;
  total_faturado: number;
  rebates_shopee: number;
  custo_unitario_medio: number;
  taxa_shopee_reais: number;
  taxa_adicional_itens: number;
  total_a_receber: number;
  total_gasto_produtos: number;
  nf_entrada: number;
  lucro_reais: number;
  lucro_percentual: number;

  // Equivalentes em centavos (Fase 4, aditivo — ver docs/DIAGNOSTICO-FINANCEIRO.md
  // seção 6). Settings (adicional_por_item, gasto_shopee_ads) não têm coluna
  // _cents no banco ainda — convertidos com toCents() uma vez, na fronteira
  // desta função, não em cada linha.
  total_faturado_cents?: Cents;
  rebates_shopee_cents?: Cents;
  custo_unitario_medio_cents?: Cents;
  taxa_shopee_reais_cents?: Cents;
  taxa_adicional_itens_cents?: Cents;
  total_a_receber_cents?: Cents;
  total_gasto_produtos_cents?: Cents;
  nf_entrada_cents?: Cents;
  lucro_reais_cents?: Cents;
}

export interface CalculationResult {
  groups: GroupedResult[];
  totals: {
    itens_vendidos: number;
    total_faturado: number;
    rebates_shopee: number;
    taxa_shopee_reais: number;
    taxa_adicional_itens: number;
    total_a_receber: number;
    total_gasto_produtos: number;
    nf_entrada: number;
    gasto_ads: number;
    lucro_bruto: number;
    // Lucro operacional (após taxas, custos, NF entrada e ads) — pré-imposto.
    // O imposto (Simples/IRPJ) é por empresa, aplicado no TaxSummaryRow / DRE
    // via applyTax (companies.tax_rate/tax_base), nunca aqui.
    lucro_reais: number;
    lucro_percentual_medio: number;

    total_faturado_cents: Cents;
    rebates_shopee_cents: Cents;
    taxa_shopee_reais_cents: Cents;
    taxa_adicional_itens_cents: Cents;
    total_a_receber_cents: Cents;
    total_gasto_produtos_cents: Cents;
    nf_entrada_cents: Cents;
    gasto_ads_cents: Cents;
    lucro_bruto_cents: Cents;
    lucro_reais_cents: Cents;
  };
}

export function calculateResults(
  orders: RawOrder[],
  settings: SettingsData,
  groupBy: 'produto' | 'variacao' = 'produto'
): CalculationResult {
  // Settings não têm coluna _cents no banco — converte uma vez aqui, na
  // fronteira da função, não a cada pedido.
  const adicionalPorItemCents = toCents(Number(settings.adicional_por_item) || 0);
  const gastoAdsCents = toCents(Number(settings.gasto_shopee_ads) || 0);

  // Group orders
  const groups = new Map<string, RawOrder[]>();

  orders.forEach(order => {
    let key: string;
    if (groupBy === 'variacao') {
      key = `${order.sku || order.nome_produto || 'Sem nome'}_${order.variacao || 'Sem variação'}`;
    } else {
      key = order.sku || order.nome_produto || 'Sem nome';
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(order);
  });

  // Calculate results for each group
  const results: GroupedResult[] = [];

  groups.forEach((groupOrders, key) => {
    const itens_vendidos = groupOrders.reduce((sum, o) => sum + (o.quantidade || 0), 0);
    const total_faturado = groupOrders.reduce((sum, o) => sum + Number(o.total_faturado || 0), 0);
    const rebates_shopee = groupOrders.reduce((sum, o) => sum + Number(o.rebate_shopee || 0), 0);
    const total_faturado_cents = groupOrders.reduce((sum, o) => sum + Number(o.total_faturado_cents || 0), 0);
    const rebates_shopee_cents = groupOrders.reduce((sum, o) => sum + Number(o.rebate_shopee_cents || 0), 0);

    // Calculate average unit cost
    const custos = groupOrders.filter(o => o.custo_unitario > 0);
    const custo_unitario_medio = custos.length > 0
      ? custos.reduce((sum, o) => sum + Number(o.custo_unitario), 0) / custos.length
      : 0;
    const custosCents = groupOrders.filter(o => (o.custo_unitario_cents ?? 0) > 0);
    const custo_unitario_medio_cents = custosCents.length > 0
      ? Math.round(custosCents.reduce((sum, o) => sum + Number(o.custo_unitario_cents || 0), 0) / custosCents.length)
      : 0;

    // Apply formulas using settings
    const taxa_shopee_reais = total_faturado * Number(settings.taxa_comissao_shopee);
    const taxa_adicional_itens = itens_vendidos * Number(settings.adicional_por_item);
    const total_a_receber = total_faturado - taxa_shopee_reais - taxa_adicional_itens;
    const total_gasto_produtos = itens_vendidos * custo_unitario_medio;

    const taxa_shopee_reais_cents = Math.round(total_faturado_cents * Number(settings.taxa_comissao_shopee));
    const taxa_adicional_itens_cents = itens_vendidos * adicionalPorItemCents;
    const total_a_receber_cents = total_faturado_cents - taxa_shopee_reais_cents - taxa_adicional_itens_cents;
    const total_gasto_produtos_cents = itens_vendidos * custo_unitario_medio_cents;

    // Sem imposto de saída aqui — o imposto (Simples/IRPJ) é por empresa,
    // aplicado no TaxSummaryRow / DRE via applyTax (companies.tax_rate/tax_base).
    // Ver docs/DIAGNOSTICO-FINANCEIRO.md (BUG-01, "Aposentar imposto_nf_saida").
    const nf_entrada = total_gasto_produtos * Number(settings.percentual_nf_entrada);
    const lucro_reais = total_a_receber - total_gasto_produtos - nf_entrada;
    const lucro_percentual = total_a_receber > 0 ? (lucro_reais / total_a_receber) * 100 : 0;

    const nf_entrada_cents = Math.round(total_gasto_produtos_cents * Number(settings.percentual_nf_entrada));
    const lucro_reais_cents = total_a_receber_cents - total_gasto_produtos_cents - nf_entrada_cents;

    // Get display info from first order in group
    const firstOrder = groupOrders[0];

    results.push({
      key,
      nome_produto: firstOrder.nome_produto || 'Sem nome',
      sku: firstOrder.sku || '-',
      variacao: groupBy === 'variacao' ? (firstOrder.variacao || 'Sem variação') : undefined,
      itens_vendidos,
      total_faturado,
      rebates_shopee,
      custo_unitario_medio,
      taxa_shopee_reais,
      taxa_adicional_itens,
      total_a_receber,
      total_gasto_produtos,
      nf_entrada,
      lucro_reais,
      lucro_percentual,
      total_faturado_cents: total_faturado_cents as Cents,
      rebates_shopee_cents: rebates_shopee_cents as Cents,
      custo_unitario_medio_cents: custo_unitario_medio_cents as Cents,
      taxa_shopee_reais_cents: taxa_shopee_reais_cents as Cents,
      taxa_adicional_itens_cents: taxa_adicional_itens_cents as Cents,
      total_a_receber_cents: total_a_receber_cents as Cents,
      total_gasto_produtos_cents: total_gasto_produtos_cents as Cents,
      nf_entrada_cents: nf_entrada_cents as Cents,
      lucro_reais_cents: lucro_reais_cents as Cents,
    });
  });

  // Sort by total_faturado descending
  results.sort((a, b) => b.total_faturado - a.total_faturado);

  // Calculate totals
  const gasto_ads = Number(settings.gasto_shopee_ads) || 0;
  const lucro_bruto = results.reduce((sum, r) => sum + r.lucro_reais, 0);
  const lucro_liquido = lucro_bruto - gasto_ads;
  const total_a_receber = results.reduce((sum, r) => sum + r.total_a_receber, 0);

  // `?? 0`: os campos *_cents de GroupedResult são opcionais no tipo (outros
  // lugares constroem o shape sem eles — ver ResultsCharts), mas calculateResults
  // sempre os preenche no push acima. Não é coalesce de dado monetário faltando.
  const lucro_bruto_cents = results.reduce((sum, r) => sum + (r.lucro_reais_cents ?? 0), 0);
  const lucro_liquido_cents = lucro_bruto_cents - gastoAdsCents;
  const total_a_receber_cents = results.reduce((sum, r) => sum + (r.total_a_receber_cents ?? 0), 0);

  const totals = {
    itens_vendidos: results.reduce((sum, r) => sum + r.itens_vendidos, 0),
    total_faturado: results.reduce((sum, r) => sum + r.total_faturado, 0),
    rebates_shopee: results.reduce((sum, r) => sum + r.rebates_shopee, 0),
    taxa_shopee_reais: results.reduce((sum, r) => sum + r.taxa_shopee_reais, 0),
    taxa_adicional_itens: results.reduce((sum, r) => sum + r.taxa_adicional_itens, 0),
    total_a_receber,
    total_gasto_produtos: results.reduce((sum, r) => sum + r.total_gasto_produtos, 0),
    nf_entrada: results.reduce((sum, r) => sum + r.nf_entrada, 0),
    gasto_ads,
    lucro_bruto,
    lucro_reais: lucro_liquido,
    lucro_percentual_medio: total_a_receber > 0
      ? (lucro_liquido / total_a_receber) * 100
      : 0,

    total_faturado_cents: results.reduce((sum, r) => sum + (r.total_faturado_cents ?? 0), 0) as Cents,
    rebates_shopee_cents: results.reduce((sum, r) => sum + (r.rebates_shopee_cents ?? 0), 0) as Cents,
    taxa_shopee_reais_cents: results.reduce((sum, r) => sum + (r.taxa_shopee_reais_cents ?? 0), 0) as Cents,
    taxa_adicional_itens_cents: results.reduce((sum, r) => sum + (r.taxa_adicional_itens_cents ?? 0), 0) as Cents,
    total_a_receber_cents: total_a_receber_cents as Cents,
    total_gasto_produtos_cents: results.reduce((sum, r) => sum + (r.total_gasto_produtos_cents ?? 0), 0) as Cents,
    nf_entrada_cents: results.reduce((sum, r) => sum + (r.nf_entrada_cents ?? 0), 0) as Cents,
    gasto_ads_cents: gastoAdsCents,
    lucro_bruto_cents: lucro_bruto_cents as Cents,
    lucro_reais_cents: lucro_liquido_cents as Cents,
  };

  return { groups: results, totals };
}

// Reexport: fonte única em ./format. Mantido aqui pra não quebrar os imports
// existentes (`from '@/lib/calculations'`).
export { formatCurrency, formatPercent } from './format';
