import { ShopeeIntegration, CreateShopeeIntegrationDTO, UpdateShopeeIntegrationDTO } from '../types/models';

export class ShopeeIntegrationRepository {
  async create(data: CreateShopeeIntegrationDTO): Promise<ShopeeIntegration> {
    return {} as ShopeeIntegration;
  }

  async update(id: string, data: UpdateShopeeIntegrationDTO): Promise<ShopeeIntegration> {
    return {} as ShopeeIntegration;
  }

  async findByUserIdAndShopId(userId: string, shopId: string): Promise<ShopeeIntegration | null> {
    return null;
  }

  async findById(id: string): Promise<ShopeeIntegration | null> {
    return null;
  }

  async findAllActive(): Promise<ShopeeIntegration[]> {
    return [];
  }
}
