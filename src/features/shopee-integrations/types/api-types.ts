export interface ShopeeAuthResponse {
  access_token: string;
  expire_in: number;
  refresh_token: string;
  merchant_id?: number;
  shop_id?: number;
  request_id: string;
  error: string;
  message: string;
}

export interface ShopeeOrderSearchRequest {
  page_size: number;
  cursor?: string;
  order_status?: string;
  time_from?: number;
  time_to?: number;
  time_range_field?: string;
}

export interface ShopeeOrder {
  order_sn: string;
  order_status: string;
  region: string;
  currency: string;
  total_amount: number;
  create_time: number;
  update_time: number;
  buyer_user_id: number;
  item_list: ShopeeOrderItem[];
}

export interface ShopeeOrderItem {
  item_id: number;
  item_name: string;
  item_sku: string;
  model_id: number;
  model_name: string;
  model_sku: string;
  model_quantity_purchased: number;
  model_original_price: number;
  model_discounted_price: number;
}

export interface ShopeeOrderSearchResponse {
  order_list: ShopeeOrder[];
  next_cursor: string;
  more: boolean;
}

export interface ShopeeTransactionSearchRequest {
  page_size: number;
  cursor?: string;
  create_time_from?: number;
  create_time_to?: number;
}

export interface ShopeeTransaction {
  transaction_id: string;
  order_sn: string;
  wallet_type: string;
  transaction_type: string;
  amount: number;
  status: string;
  create_time: number;
  description: string;
}

export interface ShopeeTransactionSearchResponse {
  transaction_list: ShopeeTransaction[];
  next_cursor: string;
  more: boolean;
}

export interface ShopeeApiResponse<T> {
  error: string;
  message: string;
  request_id: string;
  response: T;
}
