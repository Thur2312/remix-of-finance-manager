import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      integrations: { Row: IntegrationRow; Insert: IntegrationInsert; Update: IntegrationUpdate };
      orders: { Row: OrderRow; Insert: OrderInsert; Update: OrderUpdate };
      order_items: { Row: OrderItemRow; Insert: OrderItemInsert; Update: Partial<OrderItemRow> };
      payments: { Row: PaymentRow; Insert: PaymentInsert; Update: PaymentUpdate };
      fees: { Row: FeeRow; Insert: FeeInsert; Update: Partial<FeeRow> };
      payouts: { Row: PayoutRow; Insert: PayoutInsert; Update: PayoutUpdate };
    };
  };
}

export interface IntegrationRow {
  id: string;
  user_id: string;
  marketplace: string;
  shop_id: string;
  shop_name: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type IntegrationInsert = Omit<IntegrationRow, 'id' | 'created_at' | 'updated_at'>;
export type IntegrationUpdate = Partial<
  Omit<IntegrationRow, 'id' | 'user_id' | 'marketplace' | 'created_at'>
>;

export interface OrderRow {
  id: string;
  integration_id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  currency: string;
  buyer_username: string;
  shipping_carrier: string;
  tracking_number: string;
  paid_at: string | null;
  order_created_at: string;
  order_updated_at: string;
  synced_at: string;
  created_at: string;
}

export type OrderInsert = Omit<OrderRow, 'id' | 'created_at'>;
export type OrderUpdate = Partial<Omit<OrderRow, 'id' | 'integration_id' | 'created_at'>>;

export interface OrderItemRow {
  id: string;
  order_id: string;
  external_item_id: string;
  item_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export type OrderItemInsert = Omit<OrderItemRow, 'id' | 'created_at'>;

export interface PaymentRow {
  id: string;
  integration_id: string;
  order_id: string | null;
  external_transaction_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  marketplace_fee: number;
  net_amount: number;
  status: string;
  transaction_date: string;
  description: string;
  synced_at: string;
  created_at: string;
}

export type PaymentInsert = Omit<PaymentRow, 'id' | 'created_at'>;
export type PaymentUpdate = Partial<Omit<PaymentRow, 'id' | 'integration_id' | 'created_at'>>;

export interface FeeRow {
  id: string;
  integration_id: string;
  order_id: string | null;
  external_fee_id: string;
  fee_type: string;
  amount: number;
  currency: string;
  description: string;
  fee_date: string;
  synced_at: string;
  created_at: string;
}

export type FeeInsert = Omit<FeeRow, 'id' | 'created_at'>;

export interface PayoutRow {
  id: string;
  integration_id: string;
  external_payout_id: string;
  amount: number;
  currency: string;
  status: string;
  bank_account: string;
  scheduled_at: string;
  completed_at: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export type PayoutInsert = Omit<PayoutRow, 'id' | 'created_at'>;
export type PayoutUpdate = Partial<Omit<PayoutRow, 'id' | 'integration_id' | 'created_at'>>;

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return client;
}
