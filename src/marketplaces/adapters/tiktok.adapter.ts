import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { MarketplaceAdapter } from './marketplace.adapter';
import {
  MarketplaceAuthorizationUrl,
  MarketplaceTokenSet,
  MarketplaceOrder,
  MarketplacePayment,
  MarketplaceOrdersParams,
  MarketplacePaymentsParams,
  MarketplacePaginatedResult,
  MarketplaceName,
  OrderStatus,
} from '../types/marketplace.types';
import {
  TikTokApiResponse,
  TikTokTokenResponse,
  TikTokOrder,
  TikTokOrderListData,
  TikTokTransaction,
  TikTokTransactionListData,
} from '../types/tiktok-api.types';
import { MarketplaceApiError } from '../shared/errors/errors';
import { secondsFromNow, unixToDate, parseFloatSafe } from '../shared/utils';

export interface TikTokConfig {
  appKey: string;
  appSecret: string;
  redirectUrl: string;
  baseUrl: string;
}

const AUTHORIZE_BASE = 'https://auth.tiktok-shops.com/oauth/authorize';
const TOKEN_PATH = '/api/v2/token/get';
const REFRESH_PATH = '/api/v2/token/refresh';
const ORDERS_PATH = '/api/orders/search';
const TRANSACTIONS_PATH = '/api/finance/transaction/list';

export class TikTokAdapter implements MarketplaceAdapter {
  readonly marketplace: MarketplaceName = 'tiktok';
  private readonly http: AxiosInstance;

  constructor(private readonly config: TikTokConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });
  }

  getAuthorizationUrl(state: string): MarketplaceAuthorizationUrl {
    const params = new URLSearchParams({
      app_key: this.config.appKey,
      redirect_uri: this.config.redirectUrl,
      state,
      response_type: 'code',
    });
    return {
      url: `${AUTHORIZE_BASE}?${params.toString()}`,
      state,
    };
  }

  async exchangeCode(code: string, shopId?: string): Promise<MarketplaceTokenSet> {
    const timestamp = this.timestamp();
    const params = this.buildSignedParams(TOKEN_PATH, timestamp, {
      app_key: this.config.appKey,
      auth_code: code,
      grant_type: 'authorized_code',
    });

    const response = await this.post<TikTokTokenResponse>(TOKEN_PATH, {}, params);

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresIn: response.access_token_expire_in,
      refreshTokenExpiresIn: response.refresh_token_expire_in,
      shopId: shopId ?? response.shop_id,
      shopName: response.seller_name,
      openId: response.open_id,
    };
  }

  async refreshTokens(refreshToken: string, shopId: string): Promise<MarketplaceTokenSet> {
    const timestamp = this.timestamp();
    const params = this.buildSignedParams(REFRESH_PATH, timestamp, {
      app_key: this.config.appKey,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await this.post<TikTokTokenResponse>(REFRESH_PATH, {}, params);

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresIn: response.access_token_expire_in,
      refreshTokenExpiresIn: response.refresh_token_expire_in,
      shopId,
      shopName: response.seller_name,
    };
  }

  async getOrders(
    accessToken: string,
    shopId: string,
    params: MarketplaceOrdersParams,
  ): Promise<MarketplacePaginatedResult<MarketplaceOrder>> {
    const timestamp = this.timestamp();
    const signedParams = this.buildSignedParams(ORDERS_PATH, timestamp, {
      app_key: this.config.appKey,
      access_token: accessToken,
      shop_id: shopId,
    });

    const body = {
      create_time_ge: params.timeFrom,
      create_time_lt: params.timeTo,
      page_size: params.pageSize,
      ...(params.cursor ? { page_token: params.cursor } : {}),
      ...(params.status ? { order_status: this.mapOrderStatus(params.status) } : {}),
    };

    const response = await this.post<TikTokOrderListData>(ORDERS_PATH, body, signedParams);

    return {
      items: response.order_list.map(this.normalizeOrder),
      hasMore: !!response.next_page_token,
      nextCursor: response.next_page_token || undefined,
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
    const signedParams = this.buildSignedParams(TRANSACTIONS_PATH, timestamp, {
      app_key: this.config.appKey,
      access_token: accessToken,
      shop_id: shopId,
      create_time_ge: String(params.timeFrom),
      create_time_lt: String(params.timeTo),
      page_size: String(params.pageSize),
      ...(params.pageNo ? { page_no: String(params.pageNo) } : {}),
    });

    const response = await this.get<TikTokTransactionListData>(TRANSACTIONS_PATH, signedParams);

    return {
      items: response.transaction_list.map(this.normalizePayment),
      hasMore: !!response.next_page_token,
      nextCursor: response.next_page_token || undefined,
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

  private normalizeOrder = (raw: TikTokOrder): MarketplaceOrder => ({
    externalOrderId: raw.id,
    status: raw.status as OrderStatus,
    totalAmount: parseFloatSafe(raw.total_amount),
    currency: raw.currency,
    buyerUsername: raw.buyer_uid,
    shippingCarrier: raw.shipping_provider_name ?? '',
    trackingNumber: raw.tracking_number ?? '',
    items: (raw.line_items ?? []).map((item) => ({
      externalItemId: item.product_id,
      itemName: item.product_name,
      sku: item.sku_name ?? item.sku_id,
      quantity: item.quantity,
      unitPrice: parseFloatSafe(item.original_price),
      totalPrice: parseFloatSafe(item.sale_price) * item.quantity,
    })),
    createdAt: unixToDate(raw.create_time),
    updatedAt: unixToDate(raw.update_time),
    paidAt: raw.paid_time ? unixToDate(raw.paid_time) : null,
  });

  private normalizePayment = (raw: TikTokTransaction): MarketplacePayment => {
    const amount = parseFloatSafe(raw.amount);
    const fee = parseFloatSafe(raw.platform_fee ?? '0');
    return {
      externalTransactionId: raw.transaction_id,
      orderId: raw.order_id ?? '',
      amount,
      currency: raw.currency,
      paymentMethod: raw.fee_type ?? 'tiktok_pay',
      marketplaceFee: fee,
      netAmount: parseFloatSafe(raw.seller_amount ?? String(amount - fee)),
      status: 'COMPLETED',
      transactionDate: unixToDate(raw.transaction_time),
      description: `${raw.transaction_type} - ${raw.statement_type}`,
    };
  };

  private buildSignedParams(
    path: string,
    timestamp: number,
    extra: Record<string, string | number>,
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      app_key: this.config.appKey,
      timestamp,
      ...extra,
    };
    params['sign'] = this.generateSign(path, params);
    return params;
  }

  private generateSign(path: string, params: Record<string, string | number>): string {
    const excludedKeys = new Set(['sign', 'access_token']);
    const sortedKeys = Object.keys(params)
      .filter((k) => !excludedKeys.has(k))
      .sort();

    const paramStr = sortedKeys.map((k) => `${k}${params[k]}`).join('');
    const toSign = `${this.config.appSecret}${path}${paramStr}${this.config.appSecret}`;
    return crypto.createHmac('sha256', this.config.appSecret).update(toSign).digest('hex');
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    const response = await this.http.get<TikTokApiResponse<T>>(path, { params });
    if (response.data.code !== 0) {
      throw new MarketplaceApiError('tiktok', response.data.message, String(response.data.code));
    }
    return response.data.data;
  }

  private async post<T>(
    path: string,
    body: Record<string, string | number | boolean>,
    params: Record<string, string | number>,
  ): Promise<T> {
    const response = await this.http.post<TikTokApiResponse<T>>(path, body, { params });
    if (response.data.code !== 0) {
      throw new MarketplaceApiError('tiktok', response.data.message, String(response.data.code));
    }
    return response.data.data;
  }

  private mapOrderStatus(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      UNPAID: 'AWAITING_PAYMENT',
      READY_TO_SHIP: 'AWAITING_SHIPMENT',
      SHIPPED: 'SHIPPED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
      RETURN_REFUND: 'IN_CANCEL',
    };
    return map[status] ?? status;
  }

  private timestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}

export function createTikTokAdapter(): TikTokAdapter {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  const redirectUrl = process.env.TIKTOK_REDIRECT_URL;
  const baseUrl = process.env.TIKTOK_BASE_URL ?? 'https://open-api.tiktokglobalshop.com';

  if (!appKey || !appSecret || !redirectUrl) {
    throw new Error('Missing TikTok Shop environment variables');
  }

  return new TikTokAdapter({ appKey, appSecret, redirectUrl, baseUrl });
}
