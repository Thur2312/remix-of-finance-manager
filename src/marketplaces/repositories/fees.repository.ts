import { SupabaseClient } from '@supabase/supabase-js';
import { FeeInsert } from '../infra/database/supabase';
import { Fee, CreateFeeDto, FeeType } from '../types/marketplace.types';
import { Database } from "../../../database.types";

export class FeesRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByIntegrationId(integrationId: string): Promise<Fee[]> {
    const { data, error } = await this.db
      .from('fees')
      .select('*')
      .eq('integration_id', integrationId)
      .order('fee_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findByOrderId(orderId: string): Promise<Fee[]> {
    const { data, error } = await this.db
      .from('fees')
      .select('*')
      .eq('order_id', orderId);

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async upsert(dto: CreateFeeDto): Promise<Fee> {
    const row: FeeInsert = {
      integration_id: dto.integrationId,
      external_fee_id: dto.externalFeeId,
      order_id: dto.orderId,
      amount: dto.amount,
      currency: dto.currency,
      fee_type: dto.feeType,
      description: dto.description,
      fee_date: dto.feeDate.toISOString(),
      synced_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from('fees')
      .upsert([row], { onConflict: 'integration_id,external_fee_id' })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to upsert fee');
    return this.toEntity(data);
  }

  async upsertMany(dtos: CreateFeeDto[]): Promise<void> {
    for (const dto of dtos) {
      await this.upsert(dto);
    }
  }

  async sumByIntegrationAndPeriod(
    integrationIds: string[],
    from: Date,
    to: Date,
  ): Promise<number> {
    if (integrationIds.length === 0) return 0;

    const { data, error } = await this.db
      .from('fees')
      .select('amount')
      .in('integration_id', integrationIds)
      .gte('fee_date', from.toISOString())
      .lte('fee_date', to.toISOString());

    if (error) throw new Error(error.message);
    return (data as Array<{ amount: number }> ?? []).reduce((sum, row) => sum + row.amount, 0);
  }

  private toEntity = (row: Database['public']['Tables']['fees']['Row']): Fee => ({
    id: row.id,
    integrationId: row.integration_id,
    orderId: row.order_id,
    externalFeeId: row.external_fee_id,
    feeType: row.fee_type as FeeType,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    feeDate: new Date(row.fee_date),
    syncedAt: new Date(row.synced_at),
    createdAt: new Date(row.created_at),
  });
}
