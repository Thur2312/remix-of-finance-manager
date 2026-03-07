import { ShopeeApiService } from './shopee-api.service';
import { ShopeeIntegrationRepository } from '../repositories/integration.repository';
import { ShopeeIntegration } from '../types/models';

export class ShopeeAuthService {
  constructor(
    private readonly apiService: ShopeeApiService,
    private readonly integrationRepository: ShopeeIntegrationRepository
  ) {}

  getAuthorizationUrl(): string {
    const redirectUrl = `${process.env.BACKEND_URL}/api/shopee/callback`;
    return this.apiService.getAuthUrl(redirectUrl);
  }

  async handleCallback(code: string, shopId: string, userId: string): Promise<ShopeeIntegration> {
    const authData = await this.apiService.exchangeCode(code, Number(shopId));

    const existingIntegration = await this.integrationRepository.findByUserIdAndShopId(
      userId,
      shopId
    );

    const integrationData = {
      user_id: userId,
      shop_id: shopId,
      shop_name: `Shop ${shopId}`,
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      access_token_expires_at: new Date(Date.now() + authData.expire_in * 1000),
      refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      region: 'BR',
    };

    if (existingIntegration) {
      return this.integrationRepository.update(existingIntegration.id, integrationData);
    }

    return this.integrationRepository.create(integrationData);
  }
}
