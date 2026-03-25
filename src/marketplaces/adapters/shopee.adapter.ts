import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { MarketplaceAdapter } from './marketplace.adapter';
import { MarketplaceAuthorizationUrl, MarketplaceTokenSet, MarketplaceOrder, MarketplacePayment, MarketplaceOrdersParams,MarketplacePaymentsParams, MarketplacePaginatedResult,MarketplaceName, OrderStatus,PaymentStatus,} from '../types/marketplace.types';
import { ShopeeApiResponse, ShopeeTokenResponse, ShopeeOrderListResponse, ShopeeOrderDetailResponse, ShopeeOrderDetail, ShopeeTransactionListResponse, ShopeeTransaction,} from '../types/shopee-api.types';
import { MarketplaceApiError } from '../shared/errors/errors';
import { secondsFromNow, unixToDate, generateState } from '../shared/utils';

export interface ShopeeConfig {
  partnerId: number;
  partnerKey: string;
  redirectUrl: string;
  baseUrl: string;
}

const AUTH_PATH = '/api/v2/auth/token/get';
const REFRESH_PATH = '/api/v2/auth/access_token/get';
const AUTHORIZE_PATH = '/api/v2/shop/auth_partner';
const ORDER_LIST_PATH = '/api/v2/order/get_order_list';
const ORDER_DETAIL_PATH = '/api/v2/order/get_order_detail';
const TRANSACTION_PATH = '/api/v2/payment/get_wallet_transaction_list';

export class ShopeeAdapter implements MarketplaceAdapter {
  readonly marketplace: MarketplaceName = 'shopee';
  private readonly http: AxiosInstance;

  constructor(private readonly config: ShopeeConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  }

  getAuthorizationUrl(state: string): MarketplaceAuthorizationUrl {
    const timestamp = this.timestamp();
    const sign = this.sign(AUTHORIZE_PATH, timestamp);
    const params = new URLSearchParams({
      partner_id: String(this.config.partnerId),
      timestamp: String(timestamp),
      sign,
      redirect: this.config.redirectUrl,
      state,
    });
    return {
      url: `${this.config.baseUrl}${AUTHORIZE_PATH}?${params.toString()}`,
      state,
    };
  }

 async exchangeCode(code: string, shopId?: string): Promise<MarketplaceTokenSet> {
  const timestamp = this.timestamp();
  const sign = this.sign(AUTH_PATH, timestamp);

  const response = await this.post<ShopeeTokenResponse>(AUTH_PATH, {
    code,
    partner_id: this.config.partnerId,
    redirect_url: this.config.redirectUrl,
    ...(shopId ? { shop_id: Number(shopId) } : {}), // ✅ adiciona shop_id
  }, { partner_id: this.config.partnerId, timestamp, sign });

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    accessTokenExpiresIn: response.expire_in,
    refreshTokenExpiresIn: response.refresh_token_expire_in,
    shopId: String(response.shop_id?.[0] ?? shopId ?? ''),
    shopName: response.shope_name,
    openId: response.open_id,
  };
}

  async refreshTokens(refreshToken: string, shopId: string): Promise<MarketplaceTokenSet> {
    const timestamp = this.timestamp();
    const sign = this.sign(REFRESH_PATH, timestamp);

    const response = await this.post<ShopeeTokenResponse>(REFRESH_PATH, {
      refresh_token: refreshToken,
      partner_id: this.config.partnerId,
      shop_id: Number(shopId),
    }, { partner_id: this.config.partnerId, timestamp, sign });

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresIn: response.expire_in,
      refreshTokenExpiresIn: response.refresh_token_expire_in,
      shopId,
      shopName: response.shope_name,
    };
  }

  async getOrders(
    accessToken: string,
    shopId: string,
    params: MarketplaceOrdersParams,
  ): Promise<MarketplacePaginatedResult<MarketplaceOrder>> {
    const timestamp = this.timestamp();
    const detailTimestamp = this.timestamp();
    const detailSign = this.signWithToken(ORDER_LIST_PATH, detailTimestamp, accessToken, Number(shopId));
    const sign = this.signWithToken(ORDER_LIST_PATH, timestamp, accessToken, Number(shopId));
    
    const listResponse = await this.get<ShopeeOrderListResponse>(ORDER_LIST_PATH, {
      partner_id: this.config.partnerId,
      shop_id: Number(shopId),
      access_token: accessToken,
      timestamp: detailTimestamp,
      sign: detailSign,
      time_range_field: 'create_time',
      time_from: params.timeFrom,
      time_to: params.timeTo,
      page_size: params.pageSize,
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.status ? { order_status: params.status } : {}),
    });

    const orderSns = listResponse.order_list.map((o) => o.order_sn);
    if (orderSns.length === 0) {
      return { items: [], hasMore: false };
    }

    const detailResponse = await this.get<ShopeeOrderDetailResponse>(ORDER_DETAIL_PATH, {
      partner_id: this.config.partnerId,
      shop_id: Number(shopId),
      access_token: accessToken,
      timestamp: detailTimestamp,
      sign: detailSign,
      order_sn_list: orderSns.join(','),
      response_optional_fields: 'item_list,pay_time,buyer_username,tracking_no,shipping_carrier',
    });

    return {
      items: detailResponse.order_list.map(this.normalizeOrder),
      hasMore: listResponse.more,
      nextCursor: listResponse.next_cursor,
    };
  }

  async getAllOrders(
    accessToken: string,
    shopId: string,
    params: Omit<MarketplaceOrdersParams, 'cursor'>,
  ): Promise<MarketplaceOrder[]> {
    const all: MarketplaceOrder[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getOrders(accessToken, shopId, { ...params, cursor });
      all.push(...result.items);
      hasMore = result.hasMore;
      cursor = result.nextCursor;
    }

    return all;
  }

  async getPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePaginatedResult<MarketplacePayment>> {
    const timestamp = this.timestamp();
    const sign = this.signWithToken(TRANSACTION_PATH, timestamp, accessToken, Number(shopId));

    const response = await this.get<ShopeeTransactionListResponse>(TRANSACTION_PATH, {
      partner_id: this.config.partnerId,
      shop_id: Number(shopId),
      access_token: accessToken,
      timestamp,
      sign,
      wallet_type: 1,
      page_no: params.pageNo ?? 1,
      page_size: params.pageSize,
      create_time_from: params.timeFrom,
      create_time_to: params.timeTo,
    });

    return {
      items: response.transactions.map(this.normalizePayment),
      hasMore: response.more,
      nextCursor: response.next_cursor,
    };
  }

  async getAllPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePayment[]> {
    const all: MarketplacePayment[] = [];
    let pageNo = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await this.getPayments(accessToken, shopId, { ...params, pageNo });
      all.push(...result.items);
      hasMore = result.hasMore;
      pageNo += 1;
    }

    return all;
  }

  private normalizeOrder = (raw: ShopeeOrderDetail): MarketplaceOrder => ({
    externalOrderId: raw.order_sn,
    status: raw.order_status as OrderStatus,
    totalAmount: raw.total_amount,
    currency: raw.currency,
    buyerUsername: raw.buyer_username ?? '',
    shippingCarrier: raw.shipping_carrier ?? '',
    trackingNumber: raw.tracking_no ?? '',
    items: (raw.item_list ?? []).map((item) => ({
      externalItemId: item.item_id,
      itemName: item.item_name,
      sku: item.model_sku ?? '',
      quantity: item.model_quantity_purchased,
      unitPrice: item.model_original_price,
      totalPrice: item.model_original_price * item.model_quantity_purchased,
    })),
    createdAt: unixToDate(raw.create_time),
    updatedAt: unixToDate(raw.update_time),
    paidAt: raw.pay_time ? unixToDate(raw.pay_time) : null,
  });

  private normalizePayment = (raw: ShopeeTransaction): MarketplacePayment => ({
    externalTransactionId: raw.transaction_id,
    orderId: raw.order_sn,
    amount: raw.amount,
    currency: raw.currency,
    paymentMethod: raw.withdrawal_type || 'shopee_wallet',
    marketplaceFee: (raw.service_fee ?? 0) + (raw.paid_channel_fee ?? 0),
    netAmount: raw.amount - (raw.service_fee ?? 0) - (raw.paid_channel_fee ?? 0),
    status: raw.status === 'COMPLETED' ? 'COMPLETED' as PaymentStatus : 'PENDING' as PaymentStatus,
    transactionDate: unixToDate(raw.transaction_date),
    description: raw.description ?? raw.transaction_type,
  });

  private async get<T>(
    path: string,
    params: Record<string, string | number | boolean>,
  ): Promise<T> {
    const response = await this.http.get<ShopeeApiResponse<T>>(path, { params });
    if (response.data.error && response.data.error !== '') {
      throw new MarketplaceApiError('shopee', response.data.message, response.data.error);
    }
    return response.data.response;
  }

  private async post<T>(
    path: string,
    body: Record<string, string | number>,
    params: Record<string, string | number>,
  ): Promise<T> {
    const response = await this.http.post<ShopeeApiResponse<T>>(path, body, { params });
    if (response.data.error && response.data.error !== '') {
      throw new MarketplaceApiError('shopee', response.data.message, response.data.error);
    }
    return response.data.response;
  }

  private sign(path: string, timestamp: number): string {
    const base = `${this.config.partnerId}${path}${timestamp}`;
    return crypto.createHmac('sha256', this.config.partnerKey).update(base).digest('hex');
  }

  private signWithToken(
    path: string,
    timestamp: number,
    accessToken: string,
    shopId: number,
  ): string {
    const base = `${this.config.partnerId}${path}${timestamp}${accessToken}${shopId}`;
    return crypto.createHmac('sha256', this.config.partnerKey).update(base).digest('hex');
  }

  private timestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}

export function createShopeeAdapter(): ShopeeAdapter {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  const redirectUrl = process.env.SHOPEE_REDIRECT_URI;
  const baseUrl = process.env.SHOPEE_BASE_URL ?? 'https://partner.shopeemobile.com';

  if (!partnerId || !partnerKey || !redirectUrl) {
    throw new Error('Missing Shopee environment variables');
  }

  return new ShopeeAdapter({ partnerId: Number(partnerId), partnerKey, redirectUrl, baseUrl });
}
