import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';
import { formatCurrency } from '@/lib/calculations';
import type { Cents } from '@/lib/money';

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

  // Equivalentes em centavos (Fase 4, aditivo). TikTok fica sem eles enquanto
  // `unavailable` — não tem hook de sync alimentando Unificado ainda.
  grossRevenueCents?: Cents;
  netRevenueCents?: Cents;
  feesCents?: Cents;
  profitCents?: Cents;
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

// `scope` (opcional, Bloco D Fase 2 Stage 4b): recorta o dashboard pelas lojas
// de uma empresa. `null`/omitido = consolidado (loja Shopee ativa + todo o ML).
export function useDashboardData(
  syncPeriod: number = 15,
  scope?: { shopeeConnectionIds: string[]; mlConnectionIds: string[] } | null,
) {
  const { user } = useAuth();

  // ── Shopee ───────────────────────────────────────────────────────────────
  const { syncNow } = useIntegrations();
  const { activeConnection: shopeeConnection } = useActiveShopeeConnection();
  const isShopeeConnected = scope
    ? scope.shopeeConnectionIds.length > 0
    : shopeeConnection?.status === 'connected';
  const shopeeArg = scope
    ? scope.shopeeConnectionIds
    : (shopeeConnection?.status === 'connected' ? shopeeConnection.id : null);
  const { data: syncData, isLoading: syncLoading } = useShopeeSync(shopeeArg, syncPeriod);

  // ── Mercado Livre ────────────────────────────────────────────────────────
  const { stats: mlStats } = useMercadolivreData(scope?.mlConnectionIds ?? null);

  // ── Stats Shopee ─────────────────────────────────────────────────────────
  const shopeeStats: MarketplaceStats = useMemo(() => {
    if (!isShopeeConnected || !syncData) {
      return { ...EMPTY_STATS, isLoading: syncLoading };
    }

    // Competência: faturamento e líquido da mesma coorte de pedidos concluídos.
    const gross = syncData.stats.faturamento;
    const net = syncData.stats.valorLiquido;
    const grossCents = syncData.stats.faturamentoCents;
    const netCents = syncData.stats.valorLiquidoCents;
    return {
      totalOrders: syncData.stats.pedidos,
      grossRevenue: gross,
      netRevenue: net,
      fees: gross - net,          // retido pela Shopee
      profit: net,
      isLoading: syncLoading,
      hasData: syncData.stats.pedidos > 0 || syncData.stats.emTransito > 0,
      grossRevenueCents: grossCents,
      netRevenueCents: netCents,
      feesCents: (grossCents - netCents) as Cents,
      profitCents: netCents,
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
    grossRevenueCents: mlStats.grossRevenueCents,
    netRevenueCents: mlStats.netRevenueCents,
    feesCents: mlStats.feesCents,
    profitCents: mlStats.profitCents,
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
      grossRevenueCents: active.reduce((a, s) => a + (s.grossRevenueCents ?? 0), 0) as Cents,
      netRevenueCents: active.reduce((a, s) => a + (s.netRevenueCents ?? 0), 0) as Cents,
      feesCents: active.reduce((a, s) => a + (s.feesCents ?? 0), 0) as Cents,
      profitCents: active.reduce((a, s) => a + (s.profitCents ?? 0), 0) as Cents,
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