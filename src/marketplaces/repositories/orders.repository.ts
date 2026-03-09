import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderInsert, OrderItemInsert } from '../infra/database/supabase';
import { Order, OrderItem, CreateOrderDto } from '../types/marketplace.types';

export class OrdersRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByIntegrationId(integrationId: string): Promise<Order[]> {
    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .eq('integration_id', integrationId)
      .order('order_created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findByExternalId(
    integrationId: string,
    externalOrderId: string,
  ): Promise<Order | null> {
    const { data } = await this.db
      .from('orders')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('external_order_id', externalOrderId)
      .single();

    return data ? this.toEntity(data) : null;
  }

  async findByUserId(userId: string, integrationIds: string[]): Promise<Order[]> {
    if (integrationIds.length === 0) return [];

    const { data, error } = await this.db
      .from('orders')
      .select('*')
      .in('integration_id', integrationIds)
      .order('order_created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async upsert(dto: CreateOrderDto): Promise<Order> {
    const row: OrderInsert = {
      integration_id: dto.integrationId,
      external_order_id: dto.externalOrderId,
      status: dto.status,
      total_amount: dto.totalAmount,
      currency: dto.currency,
      buyer_username: dto.buyerUsername,
      shipping_carrier: dto.shippingCarrier,
      tracking_number: dto.trackingNumber,
      paid_at: dto.paidAt?.toISOString() ?? null,
      order_created_at: dto.orderCreatedAt.toISOString(),
      order_updated_at: dto.orderUpdatedAt.toISOString(),
      synced_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from('orders')
      .upsert(row, { onConflict: 'integration_id,external_order_id' })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to upsert order');

    const order = this.toEntity(data);
    await this.upsertItems(order.id, dto);
    return order;
  }

  async upsertMany(dtos: CreateOrderDto[]): Promise<void> {
    for (const dto of dtos) {
      await this.upsert(dto);
    }
  }

  async getItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await this.db
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toItemEntity);
  }

  private async upsertItems(orderId: string, dto: CreateOrderDto): Promise<void> {
    if (dto.items.length === 0) return;

    const rows: OrderItemInsert[] = dto.items.map((item) => ({
      order_id: orderId,
      external_item_id: item.externalItemId,
      item_name: item.itemName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));

    const { error } = await this.db
      .from('order_items')
      .upsert(rows, { onConflict: 'order_id,external_item_id' });

    if (error) throw new Error(error.message);
  }

  private toEntity = (row: Database['public']['Tables']['orders']['Row']): Order => ({
    id: row.id,
    integrationId: row.integration_id,
    externalOrderId: row.external_order_id,
    status: row.status as Order['status'],
    totalAmount: row.total_amount,
    currency: row.currency,
    buyerUsername: row.buyer_username,
    shippingCarrier: row.shipping_carrier,
    trackingNumber: row.tracking_number,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    orderCreatedAt: new Date(row.order_created_at),
    orderUpdatedAt: new Date(row.order_updated_at),
    syncedAt: new Date(row.synced_at),
    createdAt: new Date(row.created_at),
  });

  private toItemEntity = (row: Database['public']['Tables']['order_items']['Row']): OrderItem => ({
    id: row.id,
    orderId: row.order_id,
    externalItemId: row.external_item_id,
    itemName: row.item_name,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    createdAt: new Date(row.created_at),
  });
}
