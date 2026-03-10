export interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

export interface TikTokTokenResponse {
  access_token: string;
  access_token_expire_in: number;
  refresh_token: string;
  refresh_token_expire_in: number;
  open_id: string;
  seller_name: string;
  seller_base_region: string;
  shop_id: string;
  shop_cipher: string;
}

export interface TikTokOrderLine {
  id: string;
  product_id: string;
  product_name: string;
  sku_id: string;
  sku_name: string;
  quantity: number;
  sale_price: string;
  original_price: string;
}

export interface TikTokOrder {
  id: string;
  status: string;
  sub_status: string;
  buyer_uid: string;
  currency: string;
  payment_method_name: string;
  total_amount: string;
  sub_total: string;
  shipping_fee: string;
  platform_discount: string;
  seller_discount: string;
  create_time: number;
  update_time: number;
  paid_time: number;
  tracking_number: string;
  shipping_provider_name: string;
  line_items: TikTokOrderLine[];
}

export interface TikTokOrderListData {
  order_list: TikTokOrder[];
  total_count: number;
  next_page_token: string;
  page_size: number;
}

export interface TikTokTransaction {
  order_id: string;
  transaction_id: string;
  transaction_type: string;
  amount: string;
  currency: string;
  transaction_time: number;
  statement_type: string;
  fee_type: string;
  seller_amount: string;
  platform_fee: string;
}

export interface TikTokTransactionListData {
  transaction_list: TikTokTransaction[];
  total_count: number;
  next_page_token: string;
}
