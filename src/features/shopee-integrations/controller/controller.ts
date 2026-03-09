import { Request, Response } from 'express';
import { ShopeeAuthService } from '../services/shopeeAuth.service';
import { ShopeeSyncService } from '../services/sync.service';

interface ShopeeCallbackQuery {
  code?: string;
  shop_id?: string;
}

interface Syncparams {
  integrationId: string;
}

export interface AuthenticatedResponse extends Response{
    redirect: (url: string) => void;
    status: (code: number) => AuthenticatedResponse;
    json 
}


 export interface AuthenticatedRequest extends Request {
   user
    id: string;
  query: ShopeeCallbackQuery;
  params: Syncparams;
  req: Request;
}


export class ShopeeController {
  constructor(
    private readonly authService: ShopeeAuthService,
    private readonly syncService: ShopeeSyncService
  ) {}

  async getAuthUrl(req: Request, res: AuthenticatedResponse): Promise<void> {
    try {
      const url = this.authService.getAuthorizationUrl();
      res.json({ url });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async callback(req: AuthenticatedRequest, res: AuthenticatedResponse): Promise<void> {
    try {
      const { code, shop_id } = req.query as unknown as ShopeeCallbackQuery;
      const userId = req.user?.id;

      if (!code || !shop_id || !userId) {
        res.status(400).json({ message: 'Missing required parameters' });
        return;
      }

      const integration = await this.authService.handleCallback(
        code,
        shop_id,
        userId
      );

      await this.syncService.syncSingleIntegration(integration.id);

      res.redirect(`${process.env.FRONTEND_URL}/integrations/shopee/success`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL  }/integrations/shopee/error`);
    }
  }

  async sync(req: AuthenticatedRequest, res: AuthenticatedResponse): Promise<void> {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        res.status(400).json({ message: 'Integration ID is required' });
        return;
      }

      await this.syncService.syncSingleIntegration(integrationId);
      res.json({ message: 'Sync started successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to start sync' });
    }
  }
}
