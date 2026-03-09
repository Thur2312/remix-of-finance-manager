import { Router } from 'express';
import { AuthenticatedRequest, ShopeeController } from '../controller/controller';
import { ShopeeAuthService } from '../services/shopeeAuth.service';
import { ShopeeApiService } from '../services/shopee-api.service';
import { ShopeeIntegrationRepository } from '../repositories/integration.repository';
import { ShopeeOrderRepository } from '../repositories/order.repository';
import { ShopeeFinancialRepository } from '../repositories/financial.repository';
import { ShopeeOrderService } from '../services/order.service';
import { ShopeeFinancialService } from '../services/shopee-financial.service';
import { ShopeeSyncService } from '../services/sync.service';

const router = Router();

const integrationRepository = new ShopeeIntegrationRepository();
const orderRepository = new ShopeeOrderRepository();
const financialRepository = new ShopeeFinancialRepository();

const apiService = new ShopeeApiService(integrationRepository);
const authService = new ShopeeAuthService(apiService, integrationRepository);
const orderService = new ShopeeOrderService(apiService, orderRepository);
const financialService = new ShopeeFinancialService(apiService, financialRepository);
const syncService = new ShopeeSyncService(integrationRepository, orderService, financialService);

const controller = new ShopeeController(authService, syncService);

router.get('/auth-url', (req, res) => controller.getAuthUrl(req, res));
router.get('/callback', (req, res) => controller.callback(req, res));
router.post('/sync/:integrationId', (req, res) => controller.sync(req, res));

export default router;
