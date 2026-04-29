import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { TikTokOrder, calculateTikTokResults, TikTokSettingsData } from '@/lib/tiktok-calculations';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';

export type Marketplace = 'shopee' | 'tiktok' | 'mercadolivre' | 'todos';

export interface MarketplaceStats {
  totalOrders: number;
  grossRevenue: number;   // faturamento bruto
  netRevenue: number;     // faturamento líquido (após taxas marketplace)
  fees: number;           // total de taxas
  profit: number;         // lucro estimado
  isLoading: boolean;
  hasData: boolean;
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
  const [shopeeOrders, setShopeeOrders] = useState<RawOrder[]>([]);
  const [shopeeSettings, setShopeeSettings] = useState<SettingsData | null>(null);
  const [shopeeLoading, setShopeeLoading] = useState(true);

  // ── TikTok ───────────────────────────────────────────────────────────────
  const [tiktokOrders, setTiktokOrders] = useState<TikTokOrder[]>([]);
  const [tiktokSettings, setTiktokSettings] = useState<TikTokSettingsData | null>(null);
  const [tiktokLoading, setTiktokLoading] = useState(true);

  // ── Shopee sync (integração ativa) ───────────────────────────────────────
  const { getConnection, syncNow } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isShopeeConnected = shopeeConnection?.status === 'connected';
  const { data: syncData, isLoading: syncLoading } = useShopeeSync(
    isShopeeConnected ? shopeeConnection!.id : null,
    syncPeriod
  );

  // ── Fetch Shopee ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setShopeeLoading(true);
      try {
        const { data } = await supabase
          .from('settings')
          .select('*')
          .order('is_default', { ascending: false })
          .limit(1);
        if (data && data.length > 0) setShopeeSettings(data[0] as SettingsData);
        const orders = await fetchAllOrders();
        setShopeeOrders(orders);
      } finally {
        setShopeeLoading(false);
      }
    };
    fetch();
  }, [user]);

  // ── Fetch TikTok ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setTiktokLoading(true);
      try {
        const { data } = await supabase
          .from('tiktok_settings')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();
        if (data) setTiktokSettings(data);
        const orders = await fetchAllTikTokOrders(user.id);
        setTiktokOrders(orders);
      } finally {
        setTiktokLoading(false);
      }
    };
    fetch();
  }, [user]);

  // ── Calcular stats Shopee ────────────────────────────────────────────────
  const shopeeStats: MarketplaceStats = useMemo(() => {
    const usingSyncData = isShopeeConnected && syncData && syncData.stats.totalOrders > 0;

    if (usingSyncData) {
      const gross = syncData.stats.totalRevenue;
      const fees = syncData.stats.totalFees;
      return {
        totalOrders: syncData.stats.totalOrders,
        grossRevenue: gross,
        netRevenue: gross - fees,
        fees,
        profit: gross - fees,
        isLoading: syncLoading,
        hasData: true,
      };
    }

    if (!shopeeSettings || shopeeOrders.length === 0) {
      return { ...EMPTY_STATS, isLoading: shopeeLoading };
    }

    const results = calculateResults(shopeeOrders, shopeeSettings, 'produto');
    const gross = results.totals.total_faturado;
    const fees = results.totals.taxa_shopee_reais;
    return {
      totalOrders: shopeeOrders.length,
      grossRevenue: gross,
      netRevenue: gross - fees,
      fees,
      profit: results.totals.lucro_reais,
      isLoading: shopeeLoading,
      hasData: shopeeOrders.length > 0,
    };
  }, [shopeeOrders, shopeeSettings, shopeeLoading, syncData, syncLoading, isShopeeConnected]);

  // ── Calcular stats TikTok ────────────────────────────────────────────────
  const tiktokStats: MarketplaceStats = useMemo(() => {
    if (!tiktokSettings || tiktokOrders.length === 0) {
      return { ...EMPTY_STATS, isLoading: tiktokLoading };
    }
    const results = calculateTikTokResults(tiktokOrders, tiktokSettings, 'produto');
    const gross = results.totals.total_faturado;
    const fees = results.totals.taxa_tiktok_reais ?? 0;
    return {
      totalOrders: tiktokOrders.length,
      grossRevenue: gross,
      netRevenue: gross - fees,
      fees,
      profit: results.totals.lucro_reais,
      isLoading: tiktokLoading,
      hasData: tiktokOrders.length > 0,
    };
  }, [tiktokOrders, tiktokSettings, tiktokLoading]);

  // ── Mercado Livre (placeholder — sem API ainda) ──────────────────────────
  const mercadolivreStats: MarketplaceStats = useMemo(() => ({ ...EMPTY_STATS }), []);

  // ── Combined ─────────────────────────────────────────────────────────────
  const combined: MarketplaceStats = useMemo(() => {
    const all = [shopeeStats, tiktokStats, mercadolivreStats];
    const isLoading = all.some(s => s.isLoading);
    const hasData = all.some(s => s.hasData);
    return {
      totalOrders: all.reduce((a, s) => a + s.totalOrders, 0),
      grossRevenue: all.reduce((a, s) => a + s.grossRevenue, 0),
      netRevenue: all.reduce((a, s) => a + s.netRevenue, 0),
      fees: all.reduce((a, s) => a + s.fees, 0),
      profit: all.reduce((a, s) => a + s.profit, 0),
      isLoading,
      hasData,
    };
  }, [shopeeStats, tiktokStats, mercadolivreStats]);

  return {
    shopee: shopeeStats,
    tiktok: tiktokStats,
    mercadolivre: mercadolivreStats,
    combined,
    // Dados extras úteis para o dashboard de Shopee
    shopeeConnection,
    isShopeeConnected,
    syncData,
    syncNow,
    formatCurrency,
  };
}