import { getAdapter } from '../adapters/adapter.registry';
import { MarketplaceAuthService } from './auth.service';
import { IntegrationRepository } from '../repositories/integration.repository';
import { OrdersRepository } from '../repositories/orders.repository';
import { PaymentsRepository } from '../repositories/payments.repository';
import {  Integration,  MarketplaceOrder,  MarketplacePayment, CreateOrderDto,  CreatePaymentDto, SyncResult,} from '../types/marketplace.types';
import { daysAgoUnix, nowUnix } from '../shared/utils';

const SYNC_WINDOW_DAYS = 30;
const PAGE_SIZE = 50;

export class MarketplaceSyncService {
  constructor(
    private readonly authService: MarketplaceAuthService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async syncOrders(integrationId: string): Promise<SyncResult> {
    const integration = await this.integrationRepository.findById(integrationId);
    const errors: string[] = [];
    let ordersSynced = 0;
    let paymentsSynced = 0;

    try {
      ordersSynced = await this.syncIntegrationOrders(integration);
    } catch (error) {
      errors.push(`Orders: ${String(error)}`);
    }

    try {
      paymentsSynced = await this.syncIntegrationPayments(integration);
    } catch (error) {
      errors.push(`Payments: ${String(error)}`);
    }

    return {
      integrationId: integration.id,
      marketplace: integration.marketplace,
      shopId: integration.shopId,
      ordersSynced,
      paymentsSynced,
      errors,
      syncedAt: new Date(),
    };
  }

  async syncAllIntegrations(): Promise<SyncResult[]> {
    const integrations = await this.integrationRepository.findAllActive();
    return Promise.all(integrations.map((i) => this.syncOrders(i.id)));
  }

  private async syncIntegrationOrders(integration: Integration): Promise<number> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace);

    const orders = await adapter.getAllOrders(accessToken, integration.shopId, {
      timeFrom: daysAgoUnix(SYNC_WINDOW_DAYS),
      timeTo: nowUnix(),
      pageSize: PAGE_SIZE,
    });

    const dtos = orders.map((order) => this.toOrderDto(order, integration.id));
    await this.ordersRepository.upsertMany(dtos);

    return orders.length;
  }

  private async syncIntegrationPayments(integration: Integration): Promise<number> {
    const accessToken = await this.authService.getValidAccessToken(integration);
    const adapter = getAdapter(integration.marketplace);

    const payments = await adapter.getAllPayments(accessToken, integration.shopId, {
      timeFrom: daysAgoUnix(SYNC_WINDOW_DAYS),
      timeTo: nowUnix(),
      pageSize: PAGE_SIZE,
    });

    const dtos = payments.map((payment) => this.toPaymentDto(payment, integration.id));
    await this.paymentsRepository.upsertMany(dtos);

    return payments.length;
  }

  private toOrderDto(order: MarketplaceOrder, integrationId: string): CreateOrderDto {
    return {
      integrationId,
      externalOrderId: order.externalOrderId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      buyerUsername: order.buyerUsername,
      shippingCarrier: order.shippingCarrier,
      trackingNumber: order.trackingNumber,
      paidAt: order.paidAt,
      orderCreatedAt: order.createdAt,
      orderUpdatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        externalItemId: item.externalItemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    };
  }

  private toPaymentDto(payment: MarketplacePayment, integrationId: string): CreatePaymentDto {
    return {
      integrationId,
      orderId: payment.orderId || null,
      externalTransactionId: payment.externalTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      marketplaceFee: payment.marketplaceFee,
      netAmount: payment.netAmount,
      status: payment.status,
      transactionDate: payment.transactionDate,
      description: payment.description,
    };
  }
}
