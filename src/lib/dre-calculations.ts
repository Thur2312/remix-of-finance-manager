import { RawOrder } from '@/lib/calculations';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, getDaysInMonth } from 'date-fns';

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

export interface DREData {
  periodo: DREPeriod;
  
  // 1. RECEITA BRUTA
  receitaBrutaShopee: number;
  receitaBrutaTikTok: number;
  receitaBrutaTotal: number;
  
  // 2. IMPOSTOS SOBRE VENDAS (NOVA SEÇÃO!)
  icms: number;                    // ICMS DIFAL + penalties
  issSimples: number;              // Simples Nacional / ISS
  impostosSobreVendasTotal: number;
  
  // 3. CANCELAMENTOS E DEVOLUÇÕES
  cancelamentos: number;
  devolucoes: number;
  deducoesTotal: number;
  
  // 4. RECEITA LÍQUIDA
  receitaLiquida: number;
  
  // 5. COGS - CUSTO DO PRODUTO/SERVIÇO
  custoProdutos: number;           // Custo das mercadorias
  custoEmbalagem: number;          // Embalagens (novo!)
  custoFreteEnvio: number;         // Frete pago pelo seller (movido!)
  nfEntrada: number;               // NF de entrada
  cogsTotal: number;               // Antes era cmvTotal
  
  // 6. LUCRO BRUTO
  lucroBruto: number;
  margemBruta: number;
  
  // 7. CUSTOS VARIÁVEIS OPERACIONAIS
  comissoesMarketplace: number;    // Taxas Shopee + TikTok
  comissoesAfiliados: number;      // Comissões afiliados
  adsMarketing: number;            // MOVIDO para cá!
  taxasGateway: number;            // Gateway de pagamento (novo!)
  taxasServicos: number;           // SFP, fee per item, etc
  custosVariaveisTotal: number;
  
  // 8. MARGEM DE CONTRIBUIÇÃO
  margemContribuicao: number;
  percentualMargemContribuicao: number;
  
  // 9. CUSTOS FIXOS
  custosFixosPorCategoria: Record<string, number>;
  custosFixosTotal: number;
  custosFixosProrrateados: number; // Valor após prorrateio
  diasPeriodo: number;             // Para mostrar prorrateio
  
  // 10. LUCRO OPERACIONAL
  lucroOperacional: number;
  margemOperacional: number;
  
  // 11. DESPESAS FINANCEIRAS (opcional)
  jurosMultas: number;
  impostosSobreLucro: number;
  despesasFinanceirasTotal: number;
  
  // 12. LUCRO LÍQUIDO
  lucroLiquido: number;
  margemLiquida: number;
  
  // Alertas de validação
  alertas: DREAlerta[];
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
  
  // Financial fields
  total_settlement_amount: number | null;
  net_sales: number | null;
  subtotal_before_discounts: number | null;
  customer_payment: number | null;
  customer_refund: number | null;
  refund_subtotal: number | null;
  
  // Discounts
  seller_discounts: number | null;
  refund_seller_discounts: number | null;
  platform_discounts: number | null;
  platform_discounts_refund: number | null;
  seller_cofunded_discount: number | null;
  seller_cofunded_discount_refund: number | null;
  platform_cofunded_discount: number | null;
  
  // Shipping
  tiktok_shipping_fee: number | null;
  customer_shipping_fee: number | null;
  refunded_shipping: number | null;
  shipping_incentive: number | null;
  shipping_incentive_refund: number | null;
  shipping_subsidy: number | null;
  shipping_total: number | null;
  actual_return_shipping_fee: number | null;
  
  // Fees
  total_fees: number | null;
  tiktok_commission_fee: number | null;
  affiliate_commission: number | null;
  affiliate_partner_commission: number | null;
  affiliate_shop_ads_commission: number | null;
  sfp_service_fee: number | null;
  fee_per_item: number | null;
  voucher_xtra_fee: number | null;
  live_specials_fee: number | null;
  bonus_cashback_fee: number | null;
  
  // Taxes and adjustments
  icms_difal: number | null;
  icms_penalty: number | null;
  adjustment_amount: number | null;
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
  custo_unitario: number | null;
  data_pedido: string | null;
  status_pedido: string | null;
  desconto_plataforma: number | null;
  desconto_vendedor: number | null;
}

export interface FixedCost {
  id: string;
  user_id: string;
  category: string;
  name: string;
  amount: number;
  is_recurring: boolean;
}

export interface ShopeeSettings {
  taxa_comissao_shopee: number | null;
  adicional_por_item: number | null;
  percentual_nf_entrada: number | null;
  gasto_shopee_ads: number | null;
  imposto_nf_saida?: number | null;  // Simples Nacional % (opcional para compatibilidade)
}

export interface TikTokSettings {
  taxa_comissao_tiktok: number | null;
  taxa_afiliado: number | null;
  adicional_por_item: number | null;
  percentual_nf_entrada: number | null;
  gasto_tiktok_ads: number | null;
  imposto_nf_saida?: number | null;  // Simples Nacional % (opcional para compatibilidade)
}

// ============= HELPER FUNCTIONS =============

export function getDefaultPeriods(): DREPeriod[] {
  const now = new Date();
  return [
    {
      start: startOfMonth(now),
      end: endOfMonth(now),
      label: 'Mês Atual'
    },
    {
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1)),
      label: 'Mês Anterior'
    },
    {
      start: startOfMonth(subMonths(now, 2)),
      end: endOfMonth(now),
      label: 'Últimos 3 Meses'
    },
    {
      start: startOfMonth(subMonths(now, 5)),
      end: endOfMonth(now),
      label: 'Últimos 6 Meses'
    },
    {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: 'Ano Atual'
    }
  ];
}

export function filterByPeriod<T extends { data_pedido?: string | null; statement_date?: string | null; data_criacao_pedido?: string | null }>(
  items: T[],
  period: DREPeriod,
  dateField: 'data_pedido' | 'statement_date' | 'data_criacao_pedido' = 'data_pedido'
): T[] {
  return items.filter(item => {
    const dateValue = item[dateField];
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return date >= period.start && date <= period.end;
  });
}

// ============= FUNÇÃO DE ALERTAS =============

function gerarAlertas(data: Partial<DREData>): DREAlerta[] {
  const alertas: DREAlerta[] = [];
  
  // Alerta: Nenhum imposto sobre vendas configurado
  if ((data.impostosSobreVendasTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({
      tipo: 'warning',
      mensagem: 'Nenhum imposto sobre vendas configurado. Verifique as configurações de Simples Nacional/ISS.',
      campo: 'impostosSobreVendasTotal'
    });
  }
  
  // Alerta: COGS zerado com vendas
  if ((data.cogsTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({
      tipo: 'error',
      mensagem: 'Custo dos produtos (COGS) zerado. Cadastre os custos unitários dos produtos.',
      campo: 'cogsTotal'
    });
  }
  
  // Alerta: Margem de contribuição negativa
  if ((data.margemContribuicao || 0) < 0) {
    alertas.push({
      tipo: 'error',
      mensagem: 'Margem de contribuição negativa! A operação não é sustentável.',
      campo: 'margemContribuicao'
    });
  }
  
  // Alerta: Lucro operacional negativo
  if ((data.lucroOperacional || 0) < 0 && (data.margemContribuicao || 0) > 0) {
    alertas.push({
      tipo: 'warning',
      mensagem: 'Lucro operacional negativo. Custos fixos estão acima da margem de contribuição.',
      campo: 'lucroOperacional'
    });
  }
  
  // Alerta: Custos fixos não configurados
  if ((data.custosFixosTotal || 0) === 0 && (data.receitaBrutaTotal || 0) > 0) {
    alertas.push({
      tipo: 'info',
      mensagem: 'Nenhum custo fixo cadastrado. Cadastre custos fixos para uma DRE completa.',
      campo: 'custosFixosTotal'
    });
  }
  
  return alertas;
}

// ============= CÁLCULO PRINCIPAL =============

export function calculateDRE(
  shopeeOrders: RawOrder[],
  tiktokOrders: TikTokOrder[],
  tiktokSettlements: TikTokSettlement[],
  fixedCosts: FixedCost[],
  shopeeSettings: ShopeeSettings | null,
  tiktokSettings: TikTokSettings | null,
  period: DREPeriod
): DREData {
  // Filtrar dados por período
  const filteredShopeeOrders = filterByPeriod(shopeeOrders, period, 'data_pedido');
  const filteredTikTokOrders = filterByPeriod(tiktokOrders, period, 'data_pedido');
  const filteredSettlements = filterByPeriod(tiktokSettlements, period, 'statement_date');

  // Calcular dias do período para prorrateio
  const diasPeriodo = differenceInDays(period.end, period.start) + 1;
  const diasNoMes = getDaysInMonth(period.start);
  const proporcaoPeriodo = Math.min(diasPeriodo / 30, 1); // Usa 30 dias como base mensal

  // =========== 1. RECEITA BRUTA ===========
  const receitaBrutaShopee = filteredShopeeOrders.reduce((sum, order) => {
    return sum + (order.total_faturado || 0);
  }, 0);

  const receitaBrutaTikTok = filteredTikTokOrders.reduce((sum, order) => {
    return sum + (order.total_faturado || 0);
  }, 0);

  const receitaBrutaTotal = receitaBrutaShopee + receitaBrutaTikTok;

  // =========== 2. IMPOSTOS SOBRE VENDAS ===========
  // ICMS DIFAL e penalties vêm do TikTok settlements
  const icms = filteredSettlements.reduce((sum, s) => {
    return sum + Math.abs(s.icms_difal || 0) + Math.abs(s.icms_penalty || 0);
  }, 0);

  // Simples Nacional / ISS: percentual sobre receita bruta (das settings)
  const issShopee = receitaBrutaShopee * ((shopeeSettings?.imposto_nf_saida || 0) / 100);
  const issTikTok = receitaBrutaTikTok * ((tiktokSettings?.imposto_nf_saida || 0) / 100);
  const issSimples = issShopee + issTikTok;

  const impostosSobreVendasTotal = icms + issSimples;

  // =========== 3. CANCELAMENTOS E DEVOLUÇÕES ===========
  const cancelamentos = 0; // Por enquanto não temos dados de cancelamentos

  const devolucoes = filteredSettlements
    .filter(s => s.type === 'Refund')
    .reduce((sum, s) => sum + Math.abs(s.refund_subtotal || s.customer_refund || 0), 0);

  const deducoesTotal = cancelamentos + devolucoes;

  // =========== 4. RECEITA LÍQUIDA ===========
  const receitaLiquida = receitaBrutaTotal - impostosSobreVendasTotal - deducoesTotal;

  // =========== 5. COGS - CUSTO DO PRODUTO/SERVIÇO ===========
  // Custo dos produtos
  const custoProdutosShopee = filteredShopeeOrders.reduce((sum, order) => {
    return sum + ((order.custo_unitario || 0) * (order.quantidade || 1));
  }, 0);

  const custoProdutosTikTok = filteredTikTokOrders.reduce((sum, order) => {
    return sum + ((order.custo_unitario || 0) * (order.quantidade || 1));
  }, 0);

  const custoProdutos = custoProdutosShopee + custoProdutosTikTok;

  // Embalagens (por enquanto não temos dados específicos)
  const custoEmbalagem = 0;

  // Frete de envio pago pelo seller (MOVIDO para COGS!)
  const custoFreteEnvio = filteredSettlements.reduce((sum, s) => {
    const shippingCost = Math.abs(s.tiktok_shipping_fee || 0);
    const shippingIncome = (s.customer_shipping_fee || 0) + (s.shipping_subsidy || 0) + (s.shipping_incentive || 0);
    return sum + Math.max(0, shippingCost - shippingIncome);
  }, 0);

  // NF Entrada (percentual do custo dos produtos)
  const nfEntradaShopee = custoProdutosShopee * ((shopeeSettings?.percentual_nf_entrada || 0) / 100);
  const nfEntradaTikTok = custoProdutosTikTok * ((tiktokSettings?.percentual_nf_entrada || 0) / 100);
  const nfEntrada = nfEntradaShopee + nfEntradaTikTok;

  const cogsTotal = custoProdutos + custoEmbalagem + custoFreteEnvio + nfEntrada;

  // =========== 6. LUCRO BRUTO ===========
  const lucroBruto = receitaLiquida - cogsTotal;
  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

  // =========== 7. CUSTOS VARIÁVEIS OPERACIONAIS ===========
  // Comissões do Marketplace
  const comissaoShopee = receitaBrutaShopee * ((shopeeSettings?.taxa_comissao_shopee || 0) / 100);
  const comissaoTikTok = filteredSettlements.reduce((sum, s) => {
    return sum + Math.abs(s.tiktok_commission_fee || 0);
  }, 0);
  const comissoesMarketplace = comissaoShopee + comissaoTikTok;

  // Comissões de Afiliados
  const comissoesAfiliados = filteredSettlements.reduce((sum, s) => {
    return sum + Math.abs(s.affiliate_commission || 0) + 
           Math.abs(s.affiliate_partner_commission || 0) + 
           Math.abs(s.affiliate_shop_ads_commission || 0);
  }, 0);

  // Ads/Marketing DENTRO dos custos variáveis!
  const adsMarketing = (shopeeSettings?.gasto_shopee_ads || 0) + (tiktokSettings?.gasto_tiktok_ads || 0);

  // Taxa de gateway (por enquanto não temos dados específicos)
  const taxasGateway = 0;

  // Taxas de serviços (SFP, fee per item, etc)
  const taxasAdicionaisShopee = filteredShopeeOrders.reduce((sum, order) => {
    return sum + ((shopeeSettings?.adicional_por_item || 0) * (order.quantidade || 1));
  }, 0);
  
  const taxasAdicionaisTikTok = filteredSettlements.reduce((sum, s) => {
    return sum + Math.abs(s.sfp_service_fee || 0) + 
           Math.abs(s.fee_per_item || 0) + 
           Math.abs(s.voucher_xtra_fee || 0) + 
           Math.abs(s.live_specials_fee || 0) +
           Math.abs(s.bonus_cashback_fee || 0);
  }, 0);
  
  const taxasServicos = taxasAdicionaisShopee + taxasAdicionaisTikTok;

  const custosVariaveisTotal = comissoesMarketplace + comissoesAfiliados + adsMarketing + taxasGateway + taxasServicos;

  // =========== 8. MARGEM DE CONTRIBUIÇÃO ===========
  const margemContribuicao = lucroBruto - custosVariaveisTotal;
  const percentualMargemContribuicao = receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  // =========== 9. CUSTOS FIXOS (com prorrateio!) ===========
  const custosFixosPorCategoria: Record<string, number> = {};
  let custosFixosTotal = 0;

  fixedCosts.forEach(cost => {
    // Custos recorrentes são considerados mensais
    // Custos não recorrentes entram pelo valor total (sem prorrateio aqui, prorrateio aplicado depois)
    const amount = cost.amount;
    if (!custosFixosPorCategoria[cost.category]) {
      custosFixosPorCategoria[cost.category] = 0;
    }
    custosFixosPorCategoria[cost.category] += amount;
    custosFixosTotal += amount;
  });

  // Prorrateio dos custos fixos pelo período
  const custosFixosProrrateados = custosFixosTotal * proporcaoPeriodo;

  // =========== 10. LUCRO OPERACIONAL ===========
  const lucroOperacional = margemContribuicao - custosFixosProrrateados;
  const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0;

  // =========== 11. DESPESAS FINANCEIRAS ===========
  // Por enquanto não temos dados de juros/multas e impostos sobre lucro
  const jurosMultas = 0;
  const impostosSobreLucro = 0;
  const despesasFinanceirasTotal = jurosMultas + impostosSobreLucro;

  // =========== 12. LUCRO LÍQUIDO ===========
  const lucroLiquido = lucroOperacional - despesasFinanceirasTotal;
  const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;

  // Construir objeto de dados
  const dreDataParcial = {
    receitaBrutaTotal,
    impostosSobreVendasTotal,
    cogsTotal,
    margemContribuicao,
    lucroOperacional,
    custosFixosTotal
  };

  // Gerar alertas de validação
  const alertas = gerarAlertas(dreDataParcial);

  return {
    periodo: period,
    
    // 1. Receita Bruta
    receitaBrutaShopee,
    receitaBrutaTikTok,
    receitaBrutaTotal,
    
    // 2. Impostos sobre Vendas
    icms,
    issSimples,
    impostosSobreVendasTotal,
    
    // 3. Cancelamentos e Devoluções
    cancelamentos,
    devolucoes,
    deducoesTotal,
    
    // 4. Receita Líquida
    receitaLiquida,
    
    // 5. COGS
    custoProdutos,
    custoEmbalagem,
    custoFreteEnvio,
    nfEntrada,
    cogsTotal,
    
    // 6. Lucro Bruto
    lucroBruto,
    margemBruta,
    
    // 7. Custos Variáveis
    comissoesMarketplace,
    comissoesAfiliados,
    adsMarketing,
    taxasGateway,
    taxasServicos,
    custosVariaveisTotal,
    
    // 8. Margem de Contribuição
    margemContribuicao,
    percentualMargemContribuicao,
    
    // 9. Custos Fixos
    custosFixosPorCategoria,
    custosFixosTotal,
    custosFixosProrrateados,
    diasPeriodo,
    
    // 10. Lucro Operacional
    lucroOperacional,
    margemOperacional,
    
    // 11. Despesas Financeiras
    jurosMultas,
    impostosSobreLucro,
    despesasFinanceirasTotal,
    
    // 12. Lucro Líquido
    lucroLiquido,
    margemLiquida,
    
    // Alertas
    alertas
  };
}

// ============= FORMATAÇÃO PARA EXIBIÇÃO =============

export function formatDREForDisplay(dre: DREData): DRESection[] {
  const sections: DRESection[] = [];

  // 1. RECEITA OPERACIONAL BRUTA
  sections.push({
    title: 'RECEITA OPERACIONAL BRUTA',
    items: [
      { label: 'Vendas Shopee', value: dre.receitaBrutaShopee, indent: 1 },
      { label: 'Vendas TikTok Shop', value: dre.receitaBrutaTikTok, indent: 1 },
    ],
    total: { label: 'RECEITA BRUTA TOTAL', value: dre.receitaBrutaTotal, isSubtotal: true }
  });

  // 2. IMPOSTOS SOBRE VENDAS
  if (dre.impostosSobreVendasTotal > 0) {
    sections.push({
      title: 'IMPOSTOS SOBRE VENDAS',
      items: [
        ...(dre.icms > 0 ? [{ label: 'ICMS (DIFAL + Penalties)', value: -dre.icms, indent: 1 }] : []),
        ...(dre.issSimples > 0 ? [{ label: 'Simples Nacional / ISS', value: -dre.issSimples, indent: 1 }] : []),
      ],
      total: { label: 'TOTAL IMPOSTOS', value: -dre.impostosSobreVendasTotal, isSubtotal: true }
    });
  }

  // 3. CANCELAMENTOS E DEVOLUÇÕES
  if (dre.deducoesTotal > 0) {
    sections.push({
      title: 'CANCELAMENTOS E DEVOLUÇÕES',
      items: [
        ...(dre.cancelamentos > 0 ? [{ label: 'Cancelamentos', value: -dre.cancelamentos, indent: 1 }] : []),
        ...(dre.devolucoes > 0 ? [{ label: 'Devoluções', value: -dre.devolucoes, indent: 1 }] : []),
      ],
      total: { label: 'TOTAL DEDUÇÕES', value: -dre.deducoesTotal, isSubtotal: true }
    });
  }

  // 4. RECEITA LÍQUIDA
  sections.push({
    title: 'RECEITA LÍQUIDA',
    items: [],
    total: { 
      label: 'RECEITA LÍQUIDA', 
      value: dre.receitaLiquida, 
      isTotal: true, 
      isHighlight: true 
    }
  });

  // 5. COGS - CUSTO DO PRODUTO/SERVIÇO
  sections.push({
    title: 'CUSTO DO PRODUTO/SERVIÇO (COGS)',
    items: [
      { label: 'Custo das Mercadorias', value: -dre.custoProdutos, indent: 1 },
      ...(dre.custoEmbalagem > 0 ? [{ label: 'Embalagens', value: -dre.custoEmbalagem, indent: 1 }] : []),
      ...(dre.custoFreteEnvio > 0 ? [{ label: 'Frete de Envio (seller)', value: -dre.custoFreteEnvio, indent: 1 }] : []),
      ...(dre.nfEntrada > 0 ? [{ label: 'NF de Entrada', value: -dre.nfEntrada, indent: 1 }] : []),
    ],
    total: { label: 'COGS TOTAL', value: -dre.cogsTotal, isSubtotal: true }
  });

  // 6. LUCRO BRUTO
  sections.push({
    title: 'RESULTADO BRUTO',
    items: [],
    total: { 
      label: 'LUCRO BRUTO', 
      value: dre.lucroBruto, 
      percentage: dre.margemBruta, 
      isTotal: true, 
      isHighlight: true 
    }
  });

  // 7. CUSTOS VARIÁVEIS OPERACIONAIS
  sections.push({
    title: 'CUSTOS VARIÁVEIS OPERACIONAIS',
    items: [
      { label: 'Comissões Marketplace (Shopee + TikTok)', value: -dre.comissoesMarketplace, indent: 1 },
      ...(dre.comissoesAfiliados > 0 ? [{ label: 'Comissões Afiliados', value: -dre.comissoesAfiliados, indent: 1 }] : []),
      ...(dre.adsMarketing > 0 ? [{ label: 'Ads e Marketing', value: -dre.adsMarketing, indent: 1 }] : []),
      ...(dre.taxasGateway > 0 ? [{ label: 'Taxas Gateway/Pagamento', value: -dre.taxasGateway, indent: 1 }] : []),
      ...(dre.taxasServicos > 0 ? [{ label: 'Taxas de Serviços (SFP, etc)', value: -dre.taxasServicos, indent: 1 }] : []),
    ],
    total: { label: 'TOTAL CUSTOS VARIÁVEIS', value: -dre.custosVariaveisTotal, isSubtotal: true }
  });

  // 8. MARGEM DE CONTRIBUIÇÃO
  sections.push({
    title: 'MARGEM DE CONTRIBUIÇÃO',
    items: [],
    total: { 
      label: 'MARGEM DE CONTRIBUIÇÃO', 
      value: dre.margemContribuicao, 
      percentage: dre.percentualMargemContribuicao, 
      isTotal: true, 
      isHighlight: true 
    }
  });

  // 9. CUSTOS FIXOS
  const fixedCostItems: DRELineItem[] = Object.entries(dre.custosFixosPorCategoria).map(([category, amount]) => ({
    label: category,
    value: -(amount * (dre.diasPeriodo / 30)), // Prorrateado
    indent: 1
  }));

  if (fixedCostItems.length > 0 || dre.custosFixosProrrateados > 0) {
    sections.push({
      title: `CUSTOS FIXOS (prorrateado: ${dre.diasPeriodo} dias)`,
      items: fixedCostItems,
      total: { label: 'TOTAL CUSTOS FIXOS', value: -dre.custosFixosProrrateados, isSubtotal: true }
    });
  }

  // 10. LUCRO OPERACIONAL
  sections.push({
    title: 'RESULTADO OPERACIONAL',
    items: [],
    total: { 
      label: 'LUCRO OPERACIONAL', 
      value: dre.lucroOperacional, 
      percentage: dre.margemOperacional, 
      isTotal: true, 
      isHighlight: true 
    }
  });

  // 11. DESPESAS FINANCEIRAS (se houver)
  if (dre.despesasFinanceirasTotal > 0) {
    sections.push({
      title: 'DESPESAS FINANCEIRAS E IMPOSTOS SOBRE LUCRO',
      items: [
        ...(dre.jurosMultas > 0 ? [{ label: 'Juros e Multas', value: -dre.jurosMultas, indent: 1 }] : []),
        ...(dre.impostosSobreLucro > 0 ? [{ label: 'IRPJ / CSLL', value: -dre.impostosSobreLucro, indent: 1 }] : []),
      ],
      total: { label: 'TOTAL DESPESAS FINANCEIRAS', value: -dre.despesasFinanceirasTotal, isSubtotal: true }
    });
  }

  // 12. LUCRO LÍQUIDO
  sections.push({
    title: 'RESULTADO FINAL',
    items: [],
    total: { 
      label: 'LUCRO LÍQUIDO', 
      value: dre.lucroLiquido, 
      percentage: dre.margemLiquida, 
      isTotal: true, 
      isHighlight: true 
    }
  });

  return sections;
}

// ============= FUNÇÕES DE FORMATAÇÃO =============

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
