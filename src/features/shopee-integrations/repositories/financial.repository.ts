import { ShopeeFinancialTransactionModel, CreateShopeeFinancialTransactionDTO } from '../types/models';

export class ShopeeFinancialRepository {
  async upsert(data: CreateShopeeFinancialTransactionDTO): Promise<ShopeeFinancialTransactionModel> {
    return {} as ShopeeFinancialTransactionModel;
  }

  async findByExternalId(integrationId: string, externalTransactionId: string): Promise<ShopeeFinancialTransactionModel | null> {
    return null;
  }

  async findByIntegrationId(integrationId: string): Promise<ShopeeFinancialTransactionModel[]> {
    return [];
  }
}
