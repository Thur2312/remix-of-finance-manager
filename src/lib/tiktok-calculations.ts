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
  desconto_plataforma: number;
  desconto_vendedor: number;
  custo_unitario: number;
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
  };
}

export function calculateTikTokResults(
  orders: TikTokOrder[],
  settings: TikTokSettingsData,
  groupBy: 'produto' | 'variacao' = 'produto'
): TikTokCalculationResult {
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
    
    // Calculate average unit cost
    const custos = groupOrders.filter(o => o.custo_unitario > 0);
    const custo_unitario_medio = custos.length > 0
      ? custos.reduce((sum, o) => sum + Number(o.custo_unitario), 0) / custos.length
      : 0;

    // Apply TikTok formulas using settings
    const taxa_tiktok_reais = total_faturado * Number(settings.taxa_comissao_tiktok);
    const taxa_afiliado_reais = total_faturado * Number(settings.taxa_afiliado);
    const taxa_adicional_itens = itens_vendidos * Number(settings.adicional_por_item);
    const total_a_receber = total_faturado - taxa_tiktok_reais - taxa_afiliado_reais - taxa_adicional_itens;
    const total_gasto_produtos = itens_vendidos * custo_unitario_medio;

    // Calculate tax with optional discount
    let imposto: number;
    const desconto = Number(settings.desconto_nf_saida);
    if (desconto === 0 || !desconto) {
      imposto = total_faturado * Number(settings.imposto_nf_saida);
    } else {
      imposto = (total_faturado - (total_faturado * desconto)) * Number(settings.imposto_nf_saida);
    }

    const nf_entrada = total_gasto_produtos * Number(settings.percentual_nf_entrada);
    const lucro_reais = total_a_receber - total_gasto_produtos - imposto - nf_entrada;
    const lucro_percentual = total_a_receber > 0 ? (lucro_reais / total_a_receber) * 100 : 0;

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
    });
  });

  // Sort by total_faturado descending
  results.sort((a, b) => b.total_faturado - a.total_faturado);

  // Calculate totals
  const gasto_ads = Number(settings.gasto_tiktok_ads) || 0;
  const lucro_bruto = results.reduce((sum, r) => sum + r.lucro_reais, 0);
  const lucro_liquido = lucro_bruto - gasto_ads;
  const total_a_receber = results.reduce((sum, r) => sum + r.total_a_receber, 0);

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
  };

  return { groups: results, totals };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
