

export interface ShopeeApiResponse<T> {
  error: string;
  message: string;
  response: T;
  request_id: string;
}

export interface ShopeeTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  refresh_token_expire_in: number;
  open_id: string;
  shope_name: string; 
  shop_id: number[];
}

export interface ShopeeShopTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  refresh_token_expire_in: number;
  shop_id: number;
  seller_name: string;
}

export interface ShopeeOrderSummary {
  order_sn: string;
  order_status: string;
}

export interface ShopeeOrderListResponse {
  order_list: ShopeeOrderSummary[];
  more: boolean;
  next_cursor: string;
}

export interface ShopeeOrderItem {
  item_id: string;
  item_name: string;
  model_sku: string;
  model_quantity_purchased: number;
  model_original_price: number;
  model_discounted_price: number;
}

export interface ShopeeOrderDetail {
  order_sn: string;
  order_status: string;
  total_amount: number;
  currency: string;
  buyer_username: string;
  shipping_carrier: string;
  tracking_no: string;
  create_time: number;
  update_time: number;
  pay_time: number;
  item_list: ShopeeOrderItem[];
}

export interface ShopeeOrderDetailResponse {
  order_list: ShopeeOrderDetail[];
}

export interface ShopeeTransaction {
  transaction_id: string;
  transaction_type: string;
  transaction_date: number;
  wallet_type: string;
  amount: number;
  currency: string;
  status: string;
  order_sn: string;
  description: string;
  shop_id: number;
  withdrawal_type: string;
  bank_account_info: string;
  reason: string;
  paid_channel_fee: number;
  service_fee: number;
}

export interface ShopeeTransactionListResponse {
  transactions: ShopeeTransaction[];
  more: boolean;
  next_cursor: string;
}
