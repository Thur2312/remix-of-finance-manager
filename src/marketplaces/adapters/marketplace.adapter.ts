import { MarketplaceAuthorizationUrl, MarketplaceTokenSet, MarketplaceOrder, MarketplacePayment, MarketplaceOrdersParams, MarketplacePaymentsParams, MarketplacePaginatedResult, MarketplaceName,} from '../types/marketplace.types';

export interface MarketplaceAdapter {
  readonly marketplace: MarketplaceName;

  getAuthorizationUrl(state: string): MarketplaceAuthorizationUrl;

  exchangeCode(
    code: string,
    shopId?: string,
  ): Promise<MarketplaceTokenSet>;

  refreshTokens(
    refreshToken: string,
    shopId: string,
  ): Promise<MarketplaceTokenSet>;

  getOrders(
    accessToken: string,
    shopId: string,
    params: MarketplaceOrdersParams,
  ): Promise<MarketplacePaginatedResult<MarketplaceOrder>>;

  getAllOrders(
    accessToken: string,
    shopId: string,
    params: Omit<MarketplaceOrdersParams, 'cursor'>,
  ): Promise<MarketplaceOrder[]>;

  getPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePaginatedResult<MarketplacePayment>>;

  getAllPayments(
    accessToken: string,
    shopId: string,
    params: MarketplacePaymentsParams,
  ): Promise<MarketplacePayment[]>;
}
