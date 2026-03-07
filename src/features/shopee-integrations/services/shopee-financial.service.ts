import { ShopeeApiService } from './shopee-api.service';
import { ShopeeFinancialRepository } from '../repositories/financial.repository';
import { ShopeeIntegration } from '../types/models';
import { ShopeeTransactionSearchResponse, ShopeeTransactionSearchRequest } from '../types/api-types';

export class ShopeeFinancialService {
  constructor(
    private readonly apiService: ShopeeApiService,
    private readonly financialRepository: ShopeeFinancialRepository
  ) {}

  async syncTransactions(integration: ShopeeIntegration): Promise<void> {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params: ShopeeTransactionSearchRequest = {
        page_size: 50,
        cursor,
        create_time_from: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
        create_time_to: Math.floor(Date.now() / 1000),
      };

      const response = await this.apiService.request<ShopeeTransactionSearchResponse>(
        '/api/v2/finance/get_wallet_transaction_list',
        integration,
        { params }
      );

      for (const transaction of response.transaction_list) {
        await this.financialRepository.upsert({
          integration_id: integration.id,
          external_transaction_id: transaction.transaction_id,
          order_id: transaction.order_sn,
          type: transaction.transaction_type,
          amount: transaction.amount,
          currency: 'BRL',
          transaction_created_at: new Date(transaction.create_time * 1000),
          status: transaction.status,
          description: transaction.description,
          raw_data: transaction as unknown as Record<string, unknown>,
        });
      }

      cursor = response.next_cursor;
      hasMore = response.more;
    }
  }
}
