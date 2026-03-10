import { Request, Response, NextFunction } from 'express';
import { MarketplaceAuthService } from '../services/auth.service';
import { MarketplaceSyncService } from '../services/sync.service';
import { IntegrationRepository } from '../repositories/integration.repository';
import { MarketplaceName } from '../types/marketplace.types';
import { BadRequestError } from '../shared/errors/errors';
import { AuthenticatedResponse } from '../shared/middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  userId: string;
  headers: {
    authorization?: string;
  };
  params: {
    marketplace: string;
    id: string;
  };
  query: {
    code?: string;
    shop_id?: string;
  };
}

function assertMarketplace(value: string): asserts value is MarketplaceName {
  if (value !== 'shopee' && value !== 'tiktok') {
    throw new BadRequestError(`Invalid marketplace: ${value}`);
  }
}

export class IntegrationController {
  constructor(
    private readonly authService: MarketplaceAuthService,
    private readonly syncService: MarketplaceSyncService,
    private readonly integrationRepository: IntegrationRepository,
  ) {}

  getAuthUrl = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { marketplace } = (req as AuthenticatedRequest).params;
      assertMarketplace(marketplace);
      const result = this.authService.getAuthorizationUrl(marketplace);
      (res as AuthenticatedResponse).json(result);
    } catch (error) {
      next(error);
    }
  };

  handleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { marketplace } = (req as AuthenticatedRequest).params;
      assertMarketplace(marketplace);

      const { code, shop_id } = (req as AuthenticatedRequest).query as { code: string; shop_id: string };
      const userId = (req as AuthenticatedRequest).userId;

      if (!code) throw new BadRequestError('Missing authorization code');

      const integration = await this.authService.handleCallback(marketplace, code, shop_id ?? '', userId);

      (res as AuthenticatedResponse).status(201).json({
        message: `${marketplace} store connected successfully`,
        integration: {
          id: integration.id,
          marketplace: integration.marketplace,
          shopName: integration.shopName,
          shopId: integration.shopId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  listIntegrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const integrations = await this.integrationRepository.findByUserId(userId);
      (res as AuthenticatedResponse).json(
        integrations.map((i) => ({
          id: i.id,
          marketplace: i.marketplace,
          shopName: i.shopName,
          shopId: i.shopId,
          isActive: i.isActive,
          createdAt: i.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).params;
      await this.integrationRepository.deactivate(id);
      (res as AuthenticatedResponse).json({ message: 'Integration disconnected' });
    } catch (error) {
      next(error);
    }
  };

  triggerSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).params;
      const result = await this.syncService.syncOrders(id);
      (res as AuthenticatedResponse).json(result);
    } catch (error) {
      next(error);
    }
  };
}
