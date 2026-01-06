import { supabase } from '@/integrations/supabase/client';

// Parse TikTok settlement currency format
// Handles both formats: "BRL 35.91" (US decimal) and "BRL 35,91" (BR decimal)
export function parseSettlementCurrency(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (!value || value.toString().trim() === '') return 0;
  
  const strValue = value.toString().trim();
  
  // Remove currency prefix (BRL, R$)
  let cleaned = strValue.replace(/^(BRL|R\$)\s*/i, '').trim();
  
  // Detect decimal format:
  // - If has comma and no dot after comma: Brazilian format (1.234,56)
  // - If has dot as last separator: US format (1,234.56 or 35.91)
  const lastCommaIndex = cleaned.lastIndexOf(',');
  const lastDotIndex = cleaned.lastIndexOf('.');
  
  if (lastCommaIndex > lastDotIndex) {
    // Brazilian format: 1.234,56 → comma is decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDotIndex > lastCommaIndex) {
    // US format: 1,234.56 or 35.91 → dot is decimal separator
    cleaned = cleaned.replace(/,/g, '');
  }
  // If neither, it's a simple integer
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse date from various formats
export function parseSettlementDate(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Column mapping for TikTok Settlement XLSX - with aliases for flexible matching
export const settlementColumnMapping: Record<string, string[]> = {
  // Basic info
  statement_date: ['Statement date', 'Data do extrato'],
  statement_id: ['Statement ID', 'ID do extrato'],
  payment_id: ['Payment ID', 'ID do pagamento'],
  status: ['Status'],
  type: ['Type', 'Tipo'],
  currency: ['Currency', 'Moeda'],
  
  // Order info
  order_id: ['Order/adjustment ID', 'Order ID', 'ID do pedido', 'ID do pedido/ajuste'],
  related_order_id: ['Related order ID', 'ID do pedido relacionado'],
  sku_id: ['SKU ID', 'ID do SKU'],
  quantidade: ['Quantity', 'Quantidade', 'Qty'],
  nome_produto: ['Product name', 'Nome do produto'],
  variacao: ['SKU name', 'Nome do SKU', 'Variation', 'Variação'],
  
  // Dates
  data_criacao_pedido: ['Order created date', 'Data de criação do pedido', 'Created date'],
  data_entrega: ['Order delivery date', 'Data de entrega', 'Delivery date'],
  
  // Delivery info
  delivery_option: ['Delivery option', 'Opção de entrega'],
  collection_method: ['Collection methods', 'Collection method', 'Método de coleta'],
  chargeable_weight: ['Chargeable package weight', 'Peso tarifável'],
  
  // Main amounts
  total_settlement_amount: ['Total settlement amount', 'Valor total de liquidação', 'Settlement amount'],
  customer_payment: ['Customer payment', 'Pagamento do cliente'],
  customer_refund: ['Customer refund', 'Reembolso do cliente'],
  net_sales: ['Net sales', 'Vendas líquidas'],
  subtotal_before_discounts: ['Subtotal before discounts', 'Subtotal antes dos descontos'],
  refund_subtotal: ['Refund subtotal before seller discounts', 'Subtotal de reembolso'],
  
  // Seller discounts
  seller_discounts: ['Seller discounts', 'Descontos do vendedor'],
  seller_cofunded_discount: ['Seller co-funded voucher discount', 'Desconto de voucher co-financiado pelo vendedor'],
  seller_cofunded_discount_refund: ['Seller co-funded voucher discount refund', 'Reembolso de desconto co-financiado'],
  refund_seller_discounts: ['Refund of seller discounts', 'Reembolso de descontos do vendedor'],
  
  // Platform discounts
  platform_discounts: ['Platform discounts', 'Descontos da plataforma'],
  platform_cofunded_discount: ['Platform co-funded voucher discounts', 'Descontos co-financiados pela plataforma'],
  platform_discounts_refund: ['Platform discounts refund', 'Reembolso de descontos da plataforma'],
  
  // Shipping
  shipping_total: ['Shipping', 'Frete'],
  tiktok_shipping_fee: ['TikTok Shop shipping fee', 'Taxa de frete TikTok Shop'],
  customer_shipping_fee: ['Customer shipping fee', 'Frete do cliente'],
  refunded_shipping: ['Refunded customer shipping fee', 'Frete reembolsado'],
  shipping_incentive: ['TikTok Shop shipping incentive', 'Incentivo de frete TikTok Shop'],
  shipping_incentive_refund: ['TikTok Shop shipping incentive refund', 'Reembolso de incentivo de frete'],
  shipping_subsidy: ['Shipping subsidy', 'Subsídio de frete'],
  actual_return_shipping_fee: ['Actual return shipping fee', 'Taxa real de devolução de frete'],
  
  // Fees
  total_fees: ['Fees', 'Taxas'],
  tiktok_commission_fee: ['TikTok Shop commission fee', 'Taxa de comissão TikTok Shop', 'Commission fee'],
  affiliate_commission: ['Affiliate commission', 'Comissão de afiliado'],
  affiliate_partner_commission: ['Affiliate partner commission', 'Comissão de parceiro afiliado'],
  affiliate_shop_ads_commission: ['Affiliate Shop Ads commission', 'Comissão de anúncios de afiliados'],
  sfp_service_fee: ['SFP service fee', 'Taxa de serviço SFP'],
  fee_per_item: ['Fee per item sold', 'Taxa por item vendido', 'Fee per item'],
  live_specials_fee: ['LIVE Specials service fee', 'Taxa de serviço LIVE Specials'],
  voucher_xtra_fee: ['Voucher Xtra service fee', 'Taxa de serviço Voucher Xtra'],
  bonus_cashback_fee: ['Bonus cashback service fee', 'Taxa de serviço de cashback'],
  
  // Taxes
  icms_difal: ['ICMS DIFAL'],
  icms_penalty: ['ICMS penalty', 'Penalidade ICMS'],
  
  // Adjustments
  adjustment_amount: ['Adjustment amount', 'Valor de ajuste'],
  adjustment_reason: ['Adjustment reasons', 'Adjustment reason', 'Motivo do ajuste'],
};

// Normalize string for comparison: lowercase, remove extra spaces, remove special chars
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

// Find matching column in row based on aliases (case-insensitive, flexible)
function findColumnValue(row: Record<string, any>, aliases: string[]): any {
  // First try exact match
  for (const alias of aliases) {
    if (row[alias] !== undefined) {
      return row[alias];
    }
  }
  
  // Then try normalized match (case-insensitive, ignore special chars)
  const normalizedAliases = aliases.map(normalizeColumnName);
  const rowKeys = Object.keys(row);
  
  for (const key of rowKeys) {
    const normalizedKey = normalizeColumnName(key);
    if (normalizedAliases.includes(normalizedKey)) {
      return row[key];
    }
  }
  
  // Try partial match (column contains alias or vice versa)
  for (const key of rowKeys) {
    const normalizedKey = normalizeColumnName(key);
    for (const normalizedAlias of normalizedAliases) {
      if (normalizedKey.includes(normalizedAlias) || normalizedAlias.includes(normalizedKey)) {
        // Only match if significant portion matches (avoid false positives)
        if (normalizedKey.length > 3 && normalizedAlias.length > 3) {
          return row[key];
        }
      }
    }
  }
  
  return undefined;
}

export interface ParsedSettlementRow {
  // Basic info
  statement_date: string | null;
  statement_id: string | null;
  payment_id: string | null;
  status: string | null;
  type: string | null;
  currency: string | null;
  
  // Order info
  order_id: string;
  related_order_id: string | null;
  sku_id: string | null;
  quantidade: number;
  nome_produto: string | null;
  variacao: string | null;
  
  // Dates
  data_criacao_pedido: string | null;
  data_entrega: string | null;
  
  // Delivery info
  delivery_option: string | null;
  collection_method: string | null;
  chargeable_weight: number;
  
  // Main amounts
  total_settlement_amount: number;
  customer_payment: number;
  customer_refund: number;
  net_sales: number;
  subtotal_before_discounts: number;
  refund_subtotal: number;
  
  // Seller discounts
  seller_discounts: number;
  seller_cofunded_discount: number;
  seller_cofunded_discount_refund: number;
  refund_seller_discounts: number;
  
  // Platform discounts
  platform_discounts: number;
  platform_cofunded_discount: number;
  platform_discounts_refund: number;
  
  // Shipping
  shipping_total: number;
  tiktok_shipping_fee: number;
  customer_shipping_fee: number;
  refunded_shipping: number;
  shipping_incentive: number;
  shipping_incentive_refund: number;
  shipping_subsidy: number;
  actual_return_shipping_fee: number;
  
  // Fees
  total_fees: number;
  tiktok_commission_fee: number;
  affiliate_commission: number;
  affiliate_partner_commission: number;
  affiliate_shop_ads_commission: number;
  sfp_service_fee: number;
  fee_per_item: number;
  live_specials_fee: number;
  voucher_xtra_fee: number;
  bonus_cashback_fee: number;
  
  // Taxes
  icms_difal: number;
  icms_penalty: number;
  
  // Adjustments
  adjustment_amount: number;
  adjustment_reason: string | null;
}

export interface ParseResult {
  success: boolean;
  data: ParsedSettlementRow | null;
  rejectionReason?: string;
}

export interface ImportSummary {
  totalRows: number;
  validRecords: number;
  rejectedRecords: number;
  rejectionReasons: Record<string, number>;
  foundColumns: string[];
  missingColumns: string[];
}

// Analyze file columns and return diagnostic info
export function analyzeFileColumns(row: Record<string, any>): { 
  foundColumns: string[]; 
  missingColumns: string[]; 
  fileColumns: string[];
} {
  const fileColumns = Object.keys(row);
  const foundColumns: string[] = [];
  const missingColumns: string[] = [];
  
  for (const [field, aliases] of Object.entries(settlementColumnMapping)) {
    const value = findColumnValue(row, aliases);
    if (value !== undefined) {
      foundColumns.push(field);
    } else {
      missingColumns.push(field);
    }
  }
  
  return { foundColumns, missingColumns, fileColumns };
}

export function parseSettlementRowWithDiagnostics(row: Record<string, any>): ParseResult {
  // === VALIDAÇÃO CONFORME ESPECIFICAÇÃO ===
  // Considerar válido toda linha onde Type === 'Order' E Order/adjustment ID existe
  
  // 1. Verificar Type = 'Order'
  const type = findColumnValue(row, settlementColumnMapping.type);
  const typeStr = (type || '').toString().trim().toLowerCase();
  
  if (typeStr !== 'order') {
    return { 
      success: false, 
      data: null, 
      rejectionReason: `Tipo inválido: ${type || 'vazio'} (esperado: Order)` 
    };
  }
  
  // 2. Verificar Order/adjustment ID existe
  const orderId = findColumnValue(row, settlementColumnMapping.order_id);
  
  if (!orderId || orderId.toString().trim() === '') {
    return { 
      success: false, 
      data: null, 
      rejectionReason: 'ID do pedido vazio ou ausente' 
    };
  }

  const cleanOrderId = orderId.toString().trim();
  
  // Skip header rows
  const orderIdLower = cleanOrderId.toLowerCase();
  if (orderIdLower === 'order/adjustment id' || 
      orderIdLower === 'order id' || 
      orderIdLower === 'id do pedido' ||
      (orderIdLower.includes('order') && orderIdLower.includes('id'))) {
    return { 
      success: false, 
      data: null, 
      rejectionReason: 'Linha de cabeçalho ignorada' 
    };
  }
  
  // === NÃO FILTRAR POR VALOR ===
  // Não descartar linhas com 0, valores negativos ou nulos em outras colunas

  return {
    success: true,
    data: {
      // Basic info
      statement_date: parseSettlementDate(findColumnValue(row, settlementColumnMapping.statement_date)),
      statement_id: findColumnValue(row, settlementColumnMapping.statement_id)?.toString().trim() || null,
      payment_id: findColumnValue(row, settlementColumnMapping.payment_id)?.toString().trim() || null,
      status: findColumnValue(row, settlementColumnMapping.status)?.toString().trim() || null,
      type: findColumnValue(row, settlementColumnMapping.type)?.toString().trim() || null,
      currency: findColumnValue(row, settlementColumnMapping.currency)?.toString().trim() || 'BRL',
      
      // Order info
      order_id: cleanOrderId,
      related_order_id: findColumnValue(row, settlementColumnMapping.related_order_id)?.toString().trim() || null,
      sku_id: findColumnValue(row, settlementColumnMapping.sku_id)?.toString().trim() || null,
      quantidade: parseInt(findColumnValue(row, settlementColumnMapping.quantidade)) || 1,
      nome_produto: findColumnValue(row, settlementColumnMapping.nome_produto)?.toString().trim() || null,
      variacao: findColumnValue(row, settlementColumnMapping.variacao)?.toString().trim() || null,
      
      // Dates
      data_criacao_pedido: parseSettlementDate(findColumnValue(row, settlementColumnMapping.data_criacao_pedido)),
      data_entrega: parseSettlementDate(findColumnValue(row, settlementColumnMapping.data_entrega)),
      
      // Delivery info
      delivery_option: findColumnValue(row, settlementColumnMapping.delivery_option)?.toString().trim() || null,
      collection_method: findColumnValue(row, settlementColumnMapping.collection_method)?.toString().trim() || null,
      chargeable_weight: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.chargeable_weight)),
      
      // Main amounts
      total_settlement_amount: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.total_settlement_amount)),
      customer_payment: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.customer_payment)),
      customer_refund: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.customer_refund)),
      net_sales: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.net_sales)),
      subtotal_before_discounts: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.subtotal_before_discounts)),
      refund_subtotal: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.refund_subtotal)),
      
      // Seller discounts
      seller_discounts: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.seller_discounts)),
      seller_cofunded_discount: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.seller_cofunded_discount)),
      seller_cofunded_discount_refund: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.seller_cofunded_discount_refund)),
      refund_seller_discounts: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.refund_seller_discounts)),
      
      // Platform discounts
      platform_discounts: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.platform_discounts)),
      platform_cofunded_discount: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.platform_cofunded_discount)),
      platform_discounts_refund: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.platform_discounts_refund)),
      
      // Shipping
      shipping_total: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.shipping_total)),
      tiktok_shipping_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.tiktok_shipping_fee)),
      customer_shipping_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.customer_shipping_fee)),
      refunded_shipping: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.refunded_shipping)),
      shipping_incentive: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.shipping_incentive)),
      shipping_incentive_refund: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.shipping_incentive_refund)),
      shipping_subsidy: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.shipping_subsidy)),
      actual_return_shipping_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.actual_return_shipping_fee)),
      
      // Fees
      total_fees: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.total_fees)),
      tiktok_commission_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.tiktok_commission_fee)),
      affiliate_commission: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.affiliate_commission)),
      affiliate_partner_commission: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.affiliate_partner_commission)),
      affiliate_shop_ads_commission: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.affiliate_shop_ads_commission)),
      sfp_service_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.sfp_service_fee)),
      fee_per_item: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.fee_per_item)),
      live_specials_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.live_specials_fee)),
      voucher_xtra_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.voucher_xtra_fee)),
      bonus_cashback_fee: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.bonus_cashback_fee)),
      
      // Taxes
      icms_difal: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.icms_difal)),
      icms_penalty: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.icms_penalty)),
      
      // Adjustments
      adjustment_amount: parseSettlementCurrency(findColumnValue(row, settlementColumnMapping.adjustment_amount)),
      adjustment_reason: findColumnValue(row, settlementColumnMapping.adjustment_reason)?.toString().trim() || null,
    }
  };
}

// Legacy function for backward compatibility
export function parseSettlementRow(row: Record<string, any>): ParsedSettlementRow | null {
  const result = parseSettlementRowWithDiagnostics(row);
  return result.success ? result.data : null;
}

// Parse all rows with detailed summary
export function parseAllSettlements(rows: Record<string, any>[]): {
  settlements: ParsedSettlementRow[];
  summary: ImportSummary;
} {
  const settlements: ParsedSettlementRow[] = [];
  const rejectionReasons: Record<string, number> = {};
  let foundColumns: string[] = [];
  let missingColumns: string[] = [];
  
  // Analyze columns from first data row
  if (rows.length > 0) {
    const analysis = analyzeFileColumns(rows[0]);
    foundColumns = analysis.foundColumns;
    missingColumns = analysis.missingColumns;
    
    console.log('📊 Análise de colunas do arquivo:');
    console.log('Colunas no arquivo:', analysis.fileColumns);
    console.log('Colunas mapeadas:', foundColumns);
    console.log('Colunas não encontradas:', missingColumns);
  }
  
  for (const row of rows) {
    const result = parseSettlementRowWithDiagnostics(row);
    
    if (result.success && result.data) {
      settlements.push(result.data);
    } else if (result.rejectionReason) {
      rejectionReasons[result.rejectionReason] = (rejectionReasons[result.rejectionReason] || 0) + 1;
    }
  }
  
  const summary: ImportSummary = {
    totalRows: rows.length,
    validRecords: settlements.length,
    rejectedRecords: rows.length - settlements.length,
    rejectionReasons,
    foundColumns,
    missingColumns,
  };
  
  // === LOGS DE VALIDAÇÃO DETALHADOS (conforme especificação) ===
  console.log('📋 Validação genérica (parseAllSettlements):', {
    linhas_order_details_brutas: rows.length,
    linhas_orders_validas: settlements.length,
    rejeitadas: rows.length - settlements.length,
    motivos_rejeicao: rejectionReasons,
  });
  console.log('📋 Resumo da importação:', summary);
  
  return { settlements, summary };
}

// Column mapping for Statements sheet (aggregated daily data)
export const statementsColumnMapping: Record<string, string[]> = {
  statement_id: ['Statement ID', 'ID do extrato'],
  statement_date: ['Statement date', 'Data do extrato'],
  payment_id: ['Payment ID', 'ID do pagamento'],
  status: ['Status'],
  currency: ['Currency', 'Moeda'],
  total_settlement_amount: ['Total settlement amount', 'Valor total de liquidação', 'Settlement amount'],
  net_sales: ['Net sales', 'Vendas líquidas'],
  total_fees: ['Fees', 'Taxas', 'Total fees'],
  customer_payment: ['Customer payment', 'Pagamento do cliente'],
  seller_discounts: ['Seller discounts', 'Descontos do vendedor'],
  platform_discounts: ['Platform discounts', 'Descontos da plataforma'],
  shipping_total: ['Shipping', 'Frete'],
  refund_subtotal: ['Refund', 'Reembolso', 'Refund subtotal'],
  adjustment_amount: ['Adjustment', 'Ajuste', 'Adjustment amount'],
};

export interface ParsedStatementRow {
  statement_id: string;
  statement_date: string | null;
  payment_id: string | null;
  status: string | null;
  currency: string | null;
  total_settlement_amount: number;
  net_sales: number;
  total_fees: number;
  customer_payment: number;
  seller_discounts: number;
  platform_discounts: number;
  shipping_total: number;
  refund_subtotal: number;
  adjustment_amount: number;
}

export interface StatementsImportSummary {
  totalRows: number;
  validRecords: number;
  totalSettlementAmount: number;
  dateRange: { start: string | null; end: string | null };
}

// Parse Statements sheet (aggregated view)
export function parseStatementsSheet(rows: Record<string, any>[]): {
  statements: ParsedStatementRow[];
  summary: StatementsImportSummary;
} {
  const statements: ParsedStatementRow[] = [];
  let totalSettlement = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const row of rows) {
    const statementId = findColumnValue(row, statementsColumnMapping.statement_id);
    
    // Skip rows without statement ID or header rows
    if (!statementId || statementId.toString().trim() === '' || 
        statementId.toString().toLowerCase().includes('statement')) {
      continue;
    }

    const statementDate = parseSettlementDate(findColumnValue(row, statementsColumnMapping.statement_date));
    const settlementAmount = parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.total_settlement_amount));

    statements.push({
      statement_id: statementId.toString().trim(),
      statement_date: statementDate,
      payment_id: findColumnValue(row, statementsColumnMapping.payment_id)?.toString().trim() || null,
      status: findColumnValue(row, statementsColumnMapping.status)?.toString().trim() || null,
      currency: findColumnValue(row, statementsColumnMapping.currency)?.toString().trim() || 'BRL',
      total_settlement_amount: settlementAmount,
      net_sales: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.net_sales)),
      total_fees: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.total_fees)),
      customer_payment: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.customer_payment)),
      seller_discounts: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.seller_discounts)),
      platform_discounts: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.platform_discounts)),
      shipping_total: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.shipping_total)),
      refund_subtotal: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.refund_subtotal)),
      adjustment_amount: parseSettlementCurrency(findColumnValue(row, statementsColumnMapping.adjustment_amount)),
    });

    totalSettlement += settlementAmount;

    // Track date range
    if (statementDate) {
      if (!minDate || statementDate < minDate) minDate = statementDate;
      if (!maxDate || statementDate > maxDate) maxDate = statementDate;
    }
  }

  return {
    statements,
    summary: {
      totalRows: rows.length,
      validRecords: statements.length,
      totalSettlementAmount: totalSettlement,
      dateRange: { start: minDate, end: maxDate },
    },
  };
}


// Fetch all TikTok statements (aggregated payment summaries)
export async function fetchAllTikTokStatements(userId: string) {
  const allStatements: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tiktok_statements')
      .select('*')
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('statement_date', { ascending: false });

    if (error) {
      console.error('Error fetching TikTok statements:', error);
      break;
    }

    if (data && data.length > 0) {
      allStatements.push(...data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allStatements;
}

// Fetch all TikTok settlements (order details) with pagination
export async function fetchAllTikTokSettlements(userId: string) {
  const allSettlements: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tiktok_settlements')
      .select('*')
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('statement_date', { ascending: false });

    if (error) {
      console.error('Error fetching TikTok settlements:', error);
      break;
    }

    if (data && data.length > 0) {
      allSettlements.push(...data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allSettlements;
}

// Fetch TikTok orders to get unit costs
export async function fetchTikTokOrdersCosts(userId: string): Promise<Map<string, number>> {
  const costMap = new Map<string, number>();
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tiktok_orders')
      .select('order_id, custo_unitario')
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching TikTok orders costs:', error);
      break;
    }

    if (data && data.length > 0) {
      data.forEach(order => {
        if (order.order_id && order.custo_unitario) {
          costMap.set(order.order_id, order.custo_unitario);
        }
      });
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return costMap;
}
