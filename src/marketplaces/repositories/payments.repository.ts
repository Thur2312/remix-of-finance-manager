import { SupabaseClient } from '@supabase/supabase-js';
import { PaymentInsert } from '../infra/database/supabase';
import { Payment, CreatePaymentDto, FinanceSummary } from '../types/marketplace.types';
import { Database } from "../../../database.types";

export class PaymentsRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByIntegrationId(integrationId: string): Promise<Payment[]> {
    const { data, error } = await this.db
      .from('payments')
      .select('*')
      .eq('integration_id', integrationId)
      .order('transaction_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findByIntegrationIds(integrationIds: string[]): Promise<Payment[]> {
    if (integrationIds.length === 0) return [];

    const { data, error } = await this.db
      .from('payments')
      .select('*')
      .in('integration_id', integrationIds)
      .order('transaction_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async upsert(dto: CreatePaymentDto): Promise<Payment> {
    const row: PaymentInsert = {
      integration_id: dto.integrationId,
      order_id: dto.orderId,
      external_transaction_id: dto.externalTransactionId,
      amount: dto.amount,
      currency: dto.currency,
      payment_method: dto.paymentMethod,
      marketplace_fee: dto.marketplaceFee,
      net_amount: dto.netAmount,
      status: dto.status,
      transaction_date: dto.transactionDate.toISOString(),
      description: dto.description,
      synced_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from('payments')
      .upsert(row, { onConflict: 'integration_id,external_transaction_id' })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to upsert payment');
    return this.toEntity(data);
  }

  async upsertMany(dtos: CreatePaymentDto[]): Promise<void> {
    for (const dto of dtos) {
      await this.upsert(dto);
    }
  }

  async getFinanceSummary(
    integrationIds: string[],
    from: Date,
    to: Date,
  ): Promise<FinanceSummary> {
    if (integrationIds.length === 0) {
      return this.emptyFinanceSummary(from, to);
    }

    const { data, error } = await this.db
      .from('payments')
      .select('amount, marketplace_fee, net_amount, status, currency')
      .in('integration_id', integrationIds)
      .gte('transaction_date', from.toISOString())
      .lte('transaction_date', to.toISOString())
      .eq('status', 'COMPLETED');

    if (error) throw new Error(error.message);

    const payments = (data ?? []) as Array<{ amount: number; marketplace_fee: number; net_amount: number; status: string; currency: string }>;
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = payments.reduce((sum, p) => sum + p.marketplace_fee, 0);
    const totalNetAmount = payments.reduce((sum, p) => sum + p.net_amount, 0);
    const currency = payments[0]?.currency?? 'BRL';

    return {
      totalRevenue,
      totalFees,
      totalNetAmount,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      currency,
      period: { from, to },
    };
  }

  private emptyFinanceSummary(from: Date, to: Date): FinanceSummary {
    return {
      totalRevenue: 0,
      totalFees: 0,
      totalNetAmount: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      currency: 'BRL',
      period: { from, to },
    };
  }

  private toEntity = (row: Database['public']['Tables']['payments']['Row']): Payment => ({
    id: row.id,
    integrationId: row.integration_id,
    orderId: row.order_id,
    externalTransactionId: row.external_transaction_id,
    amount: row.amount,
    currency: row.currency,
    paymentMethod: row.payment_method,
    marketplaceFee: row.marketplace_fee,
    netAmount: row.net_amount,
    status: row.status as Payment['status'],
    transactionDate: new Date(row.transaction_date),
    description: row.description,
    syncedAt: new Date(row.synced_at),
    createdAt: new Date(row.created_at),
  });
}
