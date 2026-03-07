import { ShopeeOrderModel, CreateShopeeOrderDTO } from '../types/models';

export class ShopeeOrderRepository {
  async upsert(data: CreateShopeeOrderDTO): Promise<ShopeeOrderModel> {
    return {} as ShopeeOrderModel;
  }

  async findByExternalId(integrationId: string, externalOrderId: string): Promise<ShopeeOrderModel | null> {
    return null;
  }

  async findByIntegrationId(integrationId: string): Promise<ShopeeOrderModel[]> {
    return [];
  }
}
