import { SupabaseClient } from '@supabase/supabase-js';
import { Database, IntegrationInsert, IntegrationUpdate } from '../infra/database/supabase';
import { Integration, CreateIntegrationDto, UpdateTokensDto, MarketplaceName } from '../types/marketplace.types';
import { IntegrationNotFoundError } from '../shared/errors/errors';

export class IntegrationRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Integration> {
    const { data, error } = await this.db
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new IntegrationNotFoundError(id);
    return this.toEntity(data);
  }

  async findByUserId(userId: string): Promise<Integration[]> {
    const { data, error } = await this.db
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async findByUserAndMarketplace(
    userId: string,
    marketplace: MarketplaceName,
    shopId: string,
  ): Promise<Integration | null> {
    const { data } = await this.db
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('marketplace', marketplace)
      .eq('shop_id', shopId)
      .single();

    return data ? this.toEntity(data) : null;
  }

  async findAllActive(): Promise<Integration[]> {
    const { data, error } = await this.db
      .from('integrations')
      .select('*')
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return (data ?? []).map(this.toEntity);
  }

  async upsert(dto: CreateIntegrationDto): Promise<Integration> {
    const row: IntegrationInsert = {
      user_id: dto.userId,
      marketplace: dto.marketplace,
      shop_id: dto.shopId,
      shop_name: dto.shopName,
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
      access_token_expires_at: dto.accessTokenExpiresAt.toISOString(),
      refresh_token_expires_at: dto.refreshTokenExpiresAt.toISOString(),
      is_active: true,
    };

    const { data, error } = await this.db
      .from('integrations')
      .upsert(row, { onConflict: 'user_id,marketplace,shop_id' })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to upsert integration');
    return this.toEntity(data);
  }

  async updateTokens(id: string, dto: UpdateTokensDto): Promise<void> {
    const update: IntegrationUpdate = {
      access_token: dto.accessToken,
      refresh_token: dto.refreshToken,
      access_token_expires_at: dto.accessTokenExpiresAt.toISOString(),
      refresh_token_expires_at: dto.refreshTokenExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.db
      .from('integrations')
      .update(update)
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async deactivate(id: string): Promise<void> {
    const update: IntegrationUpdate = {
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.db
      .from('integrations')
      .update(update)
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  private toEntity = (row: Database['public']['Tables']['integrations']['Row']): Integration => ({
    id: row.id,
    userId: row.user_id,
    marketplace: row.marketplace as MarketplaceName,
    shopId: row.shop_id,
    shopName: row.shop_name,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    accessTokenExpiresAt: new Date(row.access_token_expires_at),
    refreshTokenExpiresAt: new Date(row.refresh_token_expires_at),
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
