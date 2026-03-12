import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from "../../../database.types";
import { Payout, CreatePayoutDto, PayoutStatus } from '../types/marketplace.types';
import { PayoutUpdate } from '../infra/database/supabase';
import { PayoutInsert } from '../infra/database/supabase';

export class PayoutsRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByIntegrationId(integrationId: string): Promise<Payout[]> {
    const { data, error } = await this.db
      .from('payouts')
      .select('*')
      .eq('integration_id', integrationId)
      .order('scheduled_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findByIntegrationIds(integrationIds: string[]): Promise<Payout[]> {
    if (integrationIds.length === 0) return [];

    const { data, error } = await this.db
      .from('payouts')
      .select('*')
      .in('integration_id', integrationIds)
      .order('scheduled_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findPendingByIntegrationId(integrationId: string): Promise<Payout[]> {
    const { data, error } = await this.db
      .from('payouts')
      .select('*')
      .eq('integration_id', integrationId)
      .in('status', ['PENDING', 'PROCESSING']);

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async upsert(dto: CreatePayoutDto): Promise<Payout> {
    const row: PayoutInsert = {
      integration_id: dto.integrationId,
      external_payout_id: dto.externalPayoutId,
      amount: dto.amount,
      currency: dto.currency,
      status: dto.status,
      bank_account: dto.bankAccount,
      scheduled_at: dto.scheduledAt.toISOString(),
      completed_at: dto.completedAt?.toISOString() ?? null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.db
      .from('payouts')
      .upsert([row], { onConflict: 'integration_id,external_payout_id' })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to upsert payout');
    return this.toEntity(data);
  }

  async upsertMany(dtos: CreatePayoutDto[]): Promise<void> {
    for (const dto of dtos) {
      await this.upsert(dto);
    }
  }

  async updateStatus(id: string, status: PayoutStatus, completedAt?: Date): Promise<void> {
    const update: PayoutUpdate = {
      status,
      ...(completedAt ? { completed_at: completedAt.toISOString() } : {}),
      synced_at: new Date().toISOString(),
    };

    const { error } = await this.db
      .from('payouts')
      .update(update)
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async sumCompletedByIntegrationAndPeriod(
    integrationIds: string[],
    from: Date,
    to: Date,
  ): Promise<number> {
    if (integrationIds.length === 0) return 0;

    const { data, error } = await this.db
      .from('payouts')
      .select('amount')
      .in('integration_id', integrationIds)
      .eq('status', 'COMPLETED')
      .gte('completed_at', from.toISOString())
      .lte('completed_at', to.toISOString());

    if (error) throw new Error(error.message);
    return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
  }

  private toEntity = (row: Database['public']['Tables']['payouts']['Row']): Payout => ({
    id: row.id,
    integrationId: row.integration_id,
    externalPayoutId: row.external_payout_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as PayoutStatus,
    bankAccount: row.bank_account,
    scheduledAt: new Date(row.scheduled_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    syncedAt: new Date(row.synced_at),
    createdAt: new Date(row.created_at),
  });
}
