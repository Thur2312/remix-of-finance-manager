import { toCents, type Cents } from './money';

export interface TikTokSettingsData {
  id: string;
  user_id: string;
  name: string;
  taxa_comissao_tiktok: number;
  taxa_afiliado: number;
  adicional_por_item: number;
  percentual_valor_antecipado: number;
  taxa_antecipacao: number;
  imposto_nf_saida: number;
  percentual_nf_entrada: number;
  desconto_nf_saida: number;
  gasto_tiktok_ads: number;
  is_default: boolean;
}

export interface TikTokOrder {
  id: string;
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
  data_pedido: string | null;
  status_pedido: string | null;
}

export interface TikTokGroupedResult {
  key: string;
  nome_produto: string;
  sku: string;
  variacao?: string;
  itens_vendidos: number;
  total_faturado: number;
  desconto_plataforma: number;
  desconto_vendedor: number;
  custo_unitario_medio: number;
  taxa_tiktok_reais: number;
  taxa_afiliado_reais: number;
  taxa_adicional_itens: number;
  total_a_receber: number;
  total_gasto_produtos: number;
  imposto: number;
  nf_entrada: number;
  lucro_reais: number;
  lucro_percentual: number;

  // Equivalentes em centavos (Fase 4, aditivo). Opcionais pelo mesmo motivo de
  // GroupedResult em calculations.ts: outros lugares podem construir esse
  // shape estruturalmente sem os campos _cents.
  total_faturado_cents?: Cents;
  desconto_plataforma_cents?: Cents;
  desconto_vendedor_cents?: Cents;
  custo_unitario_medio_cents?: Cents;
  taxa_tiktok_reais_cents?: Cents;
  taxa_afiliado_reais_cents?: Cents;
  taxa_adicional_itens_cents?: Cents;
  total_a_receber_cents?: Cents;
  total_gasto_produtos_cents?: Cents;
  imposto_cents?: Cents;
  nf_entrada_cents?: Cents;
  lucro_reais_cents?: Cents;
}

export interface TikTokCalculationResult {
  groups: TikTokGroupedResult[];
  totals: {
    itens_vendidos: number;
    total_faturado: number;
    desconto_plataforma: number;
    desconto_vendedor: number;
    taxa_tiktok_reais: number;
    taxa_afiliado_reais: number;
    taxa_adicional_itens: number;
    total_a_receber: number;
    total_gasto_produtos: number;
    imposto: number;
    nf_entrada: number;
    gasto_ads: number;
    lucro_bruto: number;
    lucro_reais: number;
    lucro_percentual_medio: number;

    total_faturado_cents: Cents;
    desconto_plataforma_cents: Cents;
    desconto_vendedor_cents: Cents;
    taxa_tiktok_reais_cents: Cents;
    taxa_afiliado_reais_cents: Cents;
    taxa_adicional_itens_cents: Cents;
    total_a_receber_cents: Cents;
    total_gasto_produtos_cents: Cents;
    imposto_cents: Cents;
    nf_entrada_cents: Cents;
    gasto_ads_cents: Cents;
    lucro_bruto_cents: Cents;
    lucro_reais_cents: Cents;
  };
}

export function calculateTikTokResults(
  orders: TikTokOrder[],
  settings: TikTokSettingsData,
  groupBy: 'produto' | 'variacao' = 'produto'
): TikTokCalculationResult {
  const adicionalPorItemCents = toCents(Number(settings.adicional_por_item) || 0);
  const gastoAdsCents = toCents(Number(settings.gasto_tiktok_ads) || 0);

  // Group orders
  const groups = new Map<string, TikTokOrder[]>();

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
  const results: TikTokGroupedResult[] = [];

  groups.forEach((groupOrders, key) => {
    const itens_vendidos = groupOrders.reduce((sum, o) => sum + (o.quantidade || 0), 0);
    const total_faturado = groupOrders.reduce((sum, o) => sum + Number(o.total_faturado || 0), 0);
    const desconto_plataforma = groupOrders.reduce((sum, o) => sum + Number(o.desconto_plataforma || 0), 0);
    const desconto_vendedor = groupOrders.reduce((sum, o) => sum + Number(o.desconto_vendedor || 0), 0);
    const total_faturado_cents = groupOrders.reduce((sum, o) => sum + Number(o.total_faturado_cents || 0), 0);
    const desconto_plataforma_cents = groupOrders.reduce((sum, o) => sum + Number(o.desconto_plataforma_cents || 0), 0);
    const desconto_vendedor_cents = groupOrders.reduce((sum, o) => sum + Number(o.desconto_vendedor_cents || 0), 0);

    // Calculate average unit cost
    const custos = groupOrders.filter(o => o.custo_unitario > 0);
    const custo_unitario_medio = custos.length > 0
      ? custos.reduce((sum, o) => sum + Number(o.custo_unitario), 0) / custos.length
      : 0;
    const custosCents = groupOrders.filter(o => (o.custo_unitario_cents ?? 0) > 0);
    const custo_unitario_medio_cents = custosCents.length > 0
      ? Math.round(custosCents.reduce((sum, o) => sum + Number(o.custo_unitario_cents || 0), 0) / custosCents.length)
      : 0;

    // Apply TikTok formulas using settings
    const taxa_tiktok_reais = total_faturado * Number(settings.taxa_comissao_tiktok);
    const taxa_afiliado_reais = total_faturado * Number(settings.taxa_afiliado);
    const taxa_adicional_itens = itens_vendidos * Number(settings.adicional_por_item);
    const total_a_receber = total_faturado - taxa_tiktok_reais - taxa_afiliado_reais - taxa_adicional_itens;
    const total_gasto_produtos = itens_vendidos * custo_unitario_medio;

    const taxa_tiktok_reais_cents = Math.round(total_faturado_cents * Number(settings.taxa_comissao_tiktok));
    const taxa_afiliado_reais_cents = Math.round(total_faturado_cents * Number(settings.taxa_afiliado));
    const taxa_adicional_itens_cents = itens_vendidos * adicionalPorItemCents;
    const total_a_receber_cents = total_faturado_cents - taxa_tiktok_reais_cents - taxa_afiliado_reais_cents - taxa_adicional_itens_cents;
    const total_gasto_produtos_cents = itens_vendidos * custo_unitario_medio_cents;

    // Calculate tax with optional discount
    let imposto: number;
    const desconto = Number(settings.desconto_nf_saida);
    if (desconto === 0 || !desconto) {
      imposto = total_faturado * Number(settings.imposto_nf_saida);
    } else {
      imposto = (total_faturado - (total_faturado * desconto)) * Number(settings.imposto_nf_saida);
    }

    let imposto_cents: number;
    if (desconto === 0 || !desconto) {
      imposto_cents = Math.round(total_faturado_cents * Number(settings.imposto_nf_saida));
    } else {
      imposto_cents = Math.round(
        (total_faturado_cents - Math.round(total_faturado_cents * desconto)) * Number(settings.imposto_nf_saida)
      );
    }

    const nf_entrada = total_gasto_produtos * Number(settings.percentual_nf_entrada);
    const lucro_reais = total_a_receber - total_gasto_produtos - imposto - nf_entrada;
    const lucro_percentual = total_a_receber > 0 ? (lucro_reais / total_a_receber) * 100 : 0;

    const nf_entrada_cents = Math.round(total_gasto_produtos_cents * Number(settings.percentual_nf_entrada));
    const lucro_reais_cents = total_a_receber_cents - total_gasto_produtos_cents - imposto_cents - nf_entrada_cents;

    // Get display info from first order in group
    const firstOrder = groupOrders[0];

    results.push({
      key,
      nome_produto: firstOrder.nome_produto || 'Sem nome',
      sku: firstOrder.sku || '-',
      variacao: groupBy === 'variacao' ? (firstOrder.variacao || 'Sem variação') : undefined,
      itens_vendidos,
      total_faturado,
      desconto_plataforma,
      desconto_vendedor,
      custo_unitario_medio,
      taxa_tiktok_reais,
      taxa_afiliado_reais,
      taxa_adicional_itens,
      total_a_receber,
      total_gasto_produtos,
      imposto,
      nf_entrada,
      lucro_reais,
      lucro_percentual,
      total_faturado_cents: total_faturado_cents as Cents,
      desconto_plataforma_cents: desconto_plataforma_cents as Cents,
      desconto_vendedor_cents: desconto_vendedor_cents as Cents,
      custo_unitario_medio_cents: custo_unitario_medio_cents as Cents,
      taxa_tiktok_reais_cents: taxa_tiktok_reais_cents as Cents,
      taxa_afiliado_reais_cents: taxa_afiliado_reais_cents as Cents,
      taxa_adicional_itens_cents: taxa_adicional_itens_cents as Cents,
      total_a_receber_cents: total_a_receber_cents as Cents,
      total_gasto_produtos_cents: total_gasto_produtos_cents as Cents,
      imposto_cents: imposto_cents as Cents,
      nf_entrada_cents: nf_entrada_cents as Cents,
      lucro_reais_cents: lucro_reais_cents as Cents,
    });
  });

  // Sort by total_faturado descending
  results.sort((a, b) => b.total_faturado - a.total_faturado);

  // Calculate totals
  const gasto_ads = Number(settings.gasto_tiktok_ads) || 0;
  const lucro_bruto = results.reduce((sum, r) => sum + r.lucro_reais, 0);
  const lucro_liquido = lucro_bruto - gasto_ads;
  const total_a_receber = results.reduce((sum, r) => sum + r.total_a_receber, 0);

  const lucro_bruto_cents = results.reduce((sum, r) => sum + (r.lucro_reais_cents ?? 0), 0);
  const lucro_liquido_cents = lucro_bruto_cents - gastoAdsCents;
  const total_a_receber_cents = results.reduce((sum, r) => sum + (r.total_a_receber_cents ?? 0), 0);

  const totals = {
    itens_vendidos: results.reduce((sum, r) => sum + r.itens_vendidos, 0),
    total_faturado: results.reduce((sum, r) => sum + r.total_faturado, 0),
    desconto_plataforma: results.reduce((sum, r) => sum + r.desconto_plataforma, 0),
    desconto_vendedor: results.reduce((sum, r) => sum + r.desconto_vendedor, 0),
    taxa_tiktok_reais: results.reduce((sum, r) => sum + r.taxa_tiktok_reais, 0),
    taxa_afiliado_reais: results.reduce((sum, r) => sum + r.taxa_afiliado_reais, 0),
    taxa_adicional_itens: results.reduce((sum, r) => sum + r.taxa_adicional_itens, 0),
    total_a_receber,
    total_gasto_produtos: results.reduce((sum, r) => sum + r.total_gasto_produtos, 0),
    imposto: results.reduce((sum, r) => sum + r.imposto, 0),
    nf_entrada: results.reduce((sum, r) => sum + r.nf_entrada, 0),
    gasto_ads,
    lucro_bruto,
    lucro_reais: lucro_liquido,
    lucro_percentual_medio: total_a_receber > 0
      ? (lucro_liquido / total_a_receber) * 100
      : 0,

    total_faturado_cents: results.reduce((sum, r) => sum + (r.total_faturado_cents ?? 0), 0) as Cents,
    desconto_plataforma_cents: results.reduce((sum, r) => sum + (r.desconto_plataforma_cents ?? 0), 0) as Cents,
    desconto_vendedor_cents: results.reduce((sum, r) => sum + (r.desconto_vendedor_cents ?? 0), 0) as Cents,
    taxa_tiktok_reais_cents: results.reduce((sum, r) => sum + (r.taxa_tiktok_reais_cents ?? 0), 0) as Cents,
    taxa_afiliado_reais_cents: results.reduce((sum, r) => sum + (r.taxa_afiliado_reais_cents ?? 0), 0) as Cents,
    taxa_adicional_itens_cents: results.reduce((sum, r) => sum + (r.taxa_adicional_itens_cents ?? 0), 0) as Cents,
    total_a_receber_cents: total_a_receber_cents as Cents,
    total_gasto_produtos_cents: results.reduce((sum, r) => sum + (r.total_gasto_produtos_cents ?? 0), 0) as Cents,
    imposto_cents: results.reduce((sum, r) => sum + (r.imposto_cents ?? 0), 0) as Cents,
    nf_entrada_cents: results.reduce((sum, r) => sum + (r.nf_entrada_cents ?? 0), 0) as Cents,
    gasto_ads_cents: gastoAdsCents,
    lucro_bruto_cents: lucro_bruto_cents as Cents,
    lucro_reais_cents: lucro_liquido_cents as Cents,
  };

  return { groups: results, totals };
}

// Reexport: fonte única em ./format (mantido pra não quebrar imports existentes).
export { formatCurrency, formatPercent } from './format';
