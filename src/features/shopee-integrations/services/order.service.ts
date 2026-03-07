import { ShopeeApiService } from './shopee-api.service';
import { ShopeeOrderRepository } from '../repositories/order.repository';
import { ShopeeIntegration } from '../types/models';
import { ShopeeOrderSearchResponse, ShopeeOrderSearchRequest } from '../types/api-types';

export class ShopeeOrderService {
  constructor(
    private readonly apiService: ShopeeApiService,
    private readonly orderRepository: ShopeeOrderRepository
  ) {}

  async syncOrders(integration: ShopeeIntegration): Promise<void> {
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params: ShopeeOrderSearchRequest = {
        page_size: 50,
        cursor,
        time_range_field: 'create_time',
        time_from: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
        time_to: Math.floor(Date.now() / 1000),
      };

      const response = await this.apiService.request<ShopeeOrderSearchResponse>(
        '/api/v2/order/get_order_list',
        integration,
        { params }
      );

      for (const order of response.order_list) {
        await this.orderRepository.upsert({
          integration_id: integration.id,
          external_order_id: order.order_sn,
          status: order.order_status,
          total_amount: order.total_amount,
          currency: order.currency,
          order_created_at: new Date(order.create_time * 1000),
          order_updated_at: new Date(order.update_time * 1000),
          raw_data: order as unknown as Record<string, unknown>,
        });
      }

      cursor = response.next_cursor;
      hasMore = response.more;
    }
  }
}
