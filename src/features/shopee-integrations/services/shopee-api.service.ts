import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { ShopeeApiResponse, ShopeeAuthResponse } from '../types/api-types';
import { ShopeeIntegration } from '../types/models';
import { ShopeeIntegrationRepository } from '../repositories/integration.repository';

export class ShopeeApiService {
  private readonly baseUrl = 'https://partner.shopeemobile.com';
  private readonly partnerId: number;
  private readonly partnerKey: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private readonly integrationRepository: ShopeeIntegrationRepository
  ) {
    this.partnerId = Number(process.env.SHOPEE_PARTNER_ID) || 0;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY || '';
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
    });
  }

  private generateSignature(path: string, timestamp: number, accessToken?: string, shopId?: number): string {
    let baseString = `${this.partnerId}${path}${timestamp}`;
    if (accessToken) baseString += accessToken;
    if (shopId) baseString += shopId;
    
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }

  async request<T>(
    path: string,
    integration: ShopeeIntegration,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000);
    const shopId = Number(integration.shop_id);
    const sign = this.generateSignature(path, timestamp, integration.access_token, shopId);
    
    const response = await this.axiosInstance.request<ShopeeApiResponse<T>>({
      ...config,
      url: path,
      params: {
        ...config.params,
        partner_id: this.partnerId,
        timestamp,
        access_token: integration.access_token,
        shop_id: shopId,
        sign,
      },
    });

    if (response.data.error) {
      if (response.data.error === 'error_auth' || response.data.error === 'error_param') {
        const refreshedIntegration = await this.refreshToken(integration);
        return this.request<T>(path, refreshedIntegration, config);
      }
      throw new Error(`Shopee API Error: ${response.data.message} (Error: ${response.data.error})`);
    }

    return response.data.response;
  }

  async refreshToken(integration: ShopeeIntegration): Promise<ShopeeIntegration> {
    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp);

    const response = await this.axiosInstance.post<ShopeeAuthResponse>(path, {
      refresh_token: integration.refresh_token,
      partner_id: this.partnerId,
      shop_id: Number(integration.shop_id),
    }, {
      params: { partner_id: this.partnerId, timestamp, sign }
    });

    if (response.data.error) {
      throw new Error(`Failed to refresh Shopee token: ${response.data.message}`);
    }

    return this.integrationRepository.update(integration.id, {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      access_token_expires_at: new Date(Date.now() + response.data.expire_in * 1000),
    });
  }

  getAuthUrl(redirectUrl: string): string {
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp);
    return `${this.baseUrl}${path}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${redirectUrl}`;
  }

  async exchangeCode(code: string, shopId: number): Promise<ShopeeAuthResponse> {
    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp);

    const response = await this.axiosInstance.post<ShopeeAuthResponse>(path, {
      code,
      partner_id: this.partnerId,
      shop_id: shopId,
    }, {
      params: { partner_id: this.partnerId, timestamp, sign }
    });

    if (response.data.error) {
      throw new Error(`Failed to exchange Shopee code: ${response.data.message}`);
    }

    return response.data;
  }
}
