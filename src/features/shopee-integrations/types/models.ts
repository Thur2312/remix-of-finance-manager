export interface ShopeeIntegration {
  id: string;
  user_id: string;
  shop_id: string;
  shop_name: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: Date;
  refresh_token_expires_at: Date;
  region: string;
  created_at: Date;
  updated_at: Date;
}

export interface ShopeeOrderModel {
  id: string;
  integration_id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  currency: string;
  order_created_at: Date;
  order_updated_at: Date;
  raw_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ShopeeFinancialTransactionModel {
  id: string;
  integration_id: string;
  external_transaction_id: string;
  order_id?: string;
  type: string;
  amount: number;
  currency: string;
  transaction_created_at: Date;
  status: string;
  description?: string;
  raw_data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}




export type CreateShopeeIntegrationDTO = Omit<ShopeeIntegration, 'id' | 'created_at' | 'updated_at'>;
export type UpdateShopeeIntegrationDTO = Partial<Omit<ShopeeIntegration, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type CreateShopeeOrderDTO = Omit<ShopeeOrderModel, 'id' | 'created_at' | 'updated_at'>;
export type CreateShopeeFinancialTransactionDTO = Omit<ShopeeFinancialTransactionModel, 'id' | 'created_at' | 'updated_at'>;
