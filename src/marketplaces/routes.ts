import { Router } from 'express';
import { getSupabaseClient } from './infra/database/supabase';
import { IntegrationRepository } from './repositories/integration.repository';
import { OrdersRepository } from './repositories/orders.repository';
import { PaymentsRepository } from './repositories/payments.repository';
import { MarketplaceAuthService } from './services/auth.service';
import { MarketplaceSyncService } from './services/sync.service';
import { IntegrationController } from './controllers/integration.controller';
import { OrdersController } from './controllers/orders.controller';
import { authMiddleware } from './shared/middleware/auth.middleware';
export function createMarketplaceRouter(): Router {
  const router = Router();
  const db = getSupabaseClient();

  const integrationRepo = new IntegrationRepository(db);
  const ordersRepo = new OrdersRepository(db);
  const paymentsRepo = new PaymentsRepository(db);

  const authService = new MarketplaceAuthService(integrationRepo);
  const syncService = new MarketplaceSyncService(authService, integrationRepo, ordersRepo, paymentsRepo);

  const integrationController = new IntegrationController(authService, syncService, integrationRepo);
  const ordersController = new OrdersController(ordersRepo, paymentsRepo, integrationRepo);

  router.get('/integrations/:marketplace/auth-url', integrationController.getAuthUrl);
  router.get('/integrations/:marketplace/callback', authMiddleware, integrationController.handleCallback);
  router.get('/integrations', authMiddleware, integrationController.listIntegrations);
  router.delete('/integrations/:id', authMiddleware, integrationController.disconnect);
  router.post('/integrations/:id/sync', authMiddleware, integrationController.triggerSync);

  router.get('/orders', authMiddleware, ordersController.listOrders);
  router.get('/orders/:integrationId', authMiddleware, ordersController.listOrdersByIntegration);
  router.get('/finance/summary', authMiddleware, ordersController.getFinanceSummary);

  return router;
}