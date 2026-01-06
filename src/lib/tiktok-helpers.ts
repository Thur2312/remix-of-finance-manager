import { supabase } from '@/integrations/supabase/client';
import { TikTokOrder } from './tiktok-calculations';

// Parse TikTok currency format: "BRL 35,91" -> 35.91
export function parseTikTokCurrency(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove "BRL " prefix and convert Brazilian format to number
  const cleaned = value.replace('BRL ', '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse TikTok date format: "12/15/2025 9:30:33 AM" -> ISO string
export function parseTikTokDate(value: string): string | null {
  if (!value || value.trim() === '' || value.trim() === '"	"') return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

// Column mapping for TikTok CSV
export const tiktokColumnMapping = {
  order_id: 'Order ID',
  sku: 'Seller SKU',
  nome_produto: 'Product Name',
  variacao: 'Variation',
  quantidade: 'Quantity',
  total_faturado: 'SKU Subtotal After Discount',
  desconto_plataforma: 'SKU Platform Discount',
  desconto_vendedor: 'SKU Seller Discount',
  data_pedido: 'Created Time',
  status_pedido: 'Order Status',
};

// Status to exclude from import
export const excludedStatuses = ['Cancelado', 'Não pago'];

export interface ParsedTikTokRow {
  order_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao: string | null;
  quantidade: number;
  total_faturado: number;
  desconto_plataforma: number;
  desconto_vendedor: number;
  data_pedido: string | null;
  status_pedido: string | null;
}

export function parseTikTokCSVRow(row: Record<string, string>): ParsedTikTokRow | null {
  const status = row[tiktokColumnMapping.status_pedido] || '';
  
  // Skip excluded statuses
  if (excludedStatuses.includes(status)) {
    return null;
  }

  const orderId = row[tiktokColumnMapping.order_id];
  if (!orderId || orderId.trim() === '') {
    return null;
  }

  // Validar Order ID: TikTok usa IDs numéricos de 15+ dígitos
  const cleanOrderId = orderId.trim();
  if (!/^\d{15,}$/.test(cleanOrderId)) {
    return null; // Ignora linhas que não têm Order ID válido (endereços, telefones, etc.)
  }

  // Validar nome do produto: linhas sem nome não são produtos válidos
  const nomeProduto = row[tiktokColumnMapping.nome_produto]?.trim();
  if (!nomeProduto) {
    return null;
  }

  return {
    order_id: cleanOrderId,
    sku: row[tiktokColumnMapping.sku]?.trim() || null,
    nome_produto: nomeProduto,
    variacao: row[tiktokColumnMapping.variacao]?.trim() || null,
    quantidade: parseInt(row[tiktokColumnMapping.quantidade]) || 1,
    total_faturado: parseTikTokCurrency(row[tiktokColumnMapping.total_faturado]),
    desconto_plataforma: parseTikTokCurrency(row[tiktokColumnMapping.desconto_plataforma]),
    desconto_vendedor: parseTikTokCurrency(row[tiktokColumnMapping.desconto_vendedor]),
    data_pedido: parseTikTokDate(row[tiktokColumnMapping.data_pedido]),
    status_pedido: status || null,
  };
}

// Fetch all TikTok orders with pagination (to overcome 1000 row limit)
export async function fetchAllTikTokOrders(userId: string): Promise<TikTokOrder[]> {
  const allOrders: TikTokOrder[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('tiktok_orders')
      .select('*')
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('data_pedido', { ascending: false });

    if (error) {
      console.error('Error fetching TikTok orders:', error);
      break;
    }

    if (data && data.length > 0) {
      allOrders.push(...(data as TikTokOrder[]));
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allOrders;
}
