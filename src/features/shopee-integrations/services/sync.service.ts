import { ShopeeIntegrationRepository } from '../repositories/integration.repository';
import { ShopeeOrderService } from './order.service';
import { ShopeeFinancialService } from './shopee-financial.service';

export class ShopeeSyncService {
  constructor(
    private readonly integrationRepository: ShopeeIntegrationRepository,
    private readonly orderService: ShopeeOrderService,
    private readonly financialService: ShopeeFinancialService
  ) {}

  async syncAllIntegrations(): Promise<void> {
    const integrations = await this.integrationRepository.findAllActive();

    for (const integration of integrations) {
      try {
        await Promise.all([
          this.orderService.syncOrders(integration),
          this.financialService.syncTransactions(integration),
        ]);
      } catch (error) {
        console.error(`Failed to sync integration ${integration.id}:`, error);
      }
    }
  }

  async syncSingleIntegration(integrationId: string): Promise<void> {
    const integration = await this.integrationRepository.findById(integrationId);
    
    if (!integration) {
      throw new Error('Integration not found');
    }

    await Promise.all([
      this.orderService.syncOrders(integration),
      this.financialService.syncTransactions(integration),
    ]);
  }
}
