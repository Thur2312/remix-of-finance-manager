import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';
import { formatCurrency } from '@/lib/calculations';

export type Marketplace = 'shopee' | 'tiktok' | 'mercadolivre' | 'todos';

export interface MarketplaceStats {
  totalOrders: number;
  grossRevenue: number;   
  netRevenue: number;   
  fees: number;          
  profit: number;        
  isLoading: boolean;
  hasData: boolean;
  unavailable?: boolean; 
}

export interface DashboardData {
  shopee: MarketplaceStats;
  tiktok: MarketplaceStats;
  mercadolivre: MarketplaceStats;
  combined: MarketplaceStats;
}

const EMPTY_STATS: MarketplaceStats = {
  totalOrders: 0,
  grossRevenue: 0,
  netRevenue: 0,
  fees: 0,
  profit: 0,
  isLoading: false,
  hasData: false,
};

export function useDashboardData(syncPeriod: number = 15) {
  const { user } = useAuth();

  // ── Shopee ───────────────────────────────────────────────────────────────
  const { getConnection, syncNow } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isShopeeConnected = shopeeConnection?.status === 'connected';
  const { data: syncData, isLoading: syncLoading } = useShopeeSync(
    isShopeeConnected ? shopeeConnection!.id : null,
    syncPeriod
  );

  // ── Mercado Livre ────────────────────────────────────────────────────────
  const { stats: mlStats } = useMercadolivreData();

  // ── Stats Shopee ─────────────────────────────────────────────────────────
  const shopeeStats: MarketplaceStats = useMemo(() => {
    if (!isShopeeConnected || !syncData) {
      return { ...EMPTY_STATS, isLoading: syncLoading };
    }

    const gross = syncData.stats.totalRevenue;
    const fees = syncData.stats.totalFees;
    return {
      totalOrders: syncData.stats.totalOrders,
      grossRevenue: gross,
      netRevenue: gross - fees,
      fees,
      profit: gross - fees,
      isLoading: syncLoading,
      hasData: syncData.stats.totalOrders > 0,
    };
  }, [syncData, syncLoading, isShopeeConnected]);

  // ── Stats TikTok (indisponível por enquanto) ──────────────────────────────
  const tiktokStats: MarketplaceStats = useMemo(() => ({
    ...EMPTY_STATS,
    unavailable: true,
  }), []);

  // ── Stats Mercado Livre ───────────────────────────────────────────────────
  const mercadolivreStats: MarketplaceStats = useMemo(() => ({
    totalOrders: mlStats.totalOrders,
    grossRevenue: mlStats.grossRevenue,
    netRevenue: mlStats.netRevenue,
    fees: mlStats.fees,
    profit: mlStats.profit,
    isLoading: mlStats.isLoading,
    hasData: mlStats.hasData,
  }), [mlStats]);

  // ── Combined (Shopee + ML — TikTok excluído enquanto indisponível) ────────
  const combined: MarketplaceStats = useMemo(() => {
    const active = [shopeeStats, mercadolivreStats];
    const isLoading = active.some(s => s.isLoading);
    const hasData = active.some(s => s.hasData);
    return {
      totalOrders: active.reduce((a, s) => a + s.totalOrders, 0),
      grossRevenue: active.reduce((a, s) => a + s.grossRevenue, 0),
      netRevenue: active.reduce((a, s) => a + s.netRevenue, 0),
      fees: active.reduce((a, s) => a + s.fees, 0),
      profit: active.reduce((a, s) => a + s.profit, 0),
      isLoading,
      hasData,
    };
  }, [shopeeStats, mercadolivreStats]);

  return {
    shopee: shopeeStats,
    tiktok: tiktokStats,
    mercadolivre: mercadolivreStats,
    combined,
    shopeeConnection,
    isShopeeConnected,
    syncData,
    syncNow,
    formatCurrency,
  };
}