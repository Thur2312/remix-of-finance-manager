import { getAdapter } from '../adapters/adapter.registry';
import { IntegrationRepository } from '../repositories/integration.repository';
import {
  Integration,
  CreateIntegrationDto,
  UpdateTokensDto,
  MarketplaceName,
  MarketplaceAuthorizationUrl,
} from '../types/marketplace.types';
import { TokenExpiredError } from '../shared/errors/errors';
import { secondsFromNow, isTokenNearExpiry, generateState } from '../shared/utils/index';

export class MarketplaceAuthService {
  constructor(private readonly integrationRepository: IntegrationRepository) {}

  getAuthorizationUrl(marketplace: MarketplaceName): MarketplaceAuthorizationUrl {
    const adapter = getAdapter(marketplace);
    const state = generateState();
    return adapter.getAuthorizationUrl(state);
  }

  async handleCallback(
    marketplace: MarketplaceName,
    code: string,
    shopId: string,
    userId: string,
  ): Promise<Integration> {
    const adapter = getAdapter(marketplace);
    const tokens = await adapter.exchangeCode(code, shopId);

    const dto: CreateIntegrationDto = {
      userId,
      marketplace,
      shopId: tokens.shopId || shopId,
      shopName: tokens.shopName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: secondsFromNow(tokens.accessTokenExpiresIn),
      refreshTokenExpiresAt: secondsFromNow(tokens.refreshTokenExpiresIn),
    };

    return this.integrationRepository.upsert(dto);
  }

  async getValidAccessToken(integration: Integration): Promise<string> {
    if (!isTokenNearExpiry(integration.accessTokenExpiresAt)) {
      return integration.accessToken;
    }

    if (isTokenNearExpiry(integration.refreshTokenExpiresAt)) {
      throw new TokenExpiredError(integration.marketplace);
    }

    return this.refreshAndPersist(integration);
  }

  private async refreshAndPersist(integration: Integration): Promise<string> {
    const adapter = getAdapter(integration.marketplace);
    const tokens = await adapter.refreshTokens(integration.refreshToken, integration.shopId);

    const dto: UpdateTokensDto = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: secondsFromNow(tokens.accessTokenExpiresIn),
      refreshTokenExpiresAt: secondsFromNow(tokens.refreshTokenExpiresIn),
    };

    await this.integrationRepository.updateTokens(integration.id, dto);
    return tokens.accessToken;
  }
}
