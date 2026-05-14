import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  DREData, 
  DREPeriod, 
  calculateDRE, 
  getDefaultPeriods,
  TikTokSettlement,
  TikTokOrder,
  FixedCost,
  ShopeeSettings,
  TikTokSettings,
  MlOrder,
  CashFlowEntry
} from '@/lib/dre-calculations';
import { RawOrder } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';

interface UseDREDataResult {
  dreData: DREData | null;
  isLoading: boolean;
  error: string | null;
  periods: DREPeriod[];
  selectedPeriod: DREPeriod;
  setSelectedPeriod: (period: DREPeriod) => void;
  refetch: () => Promise<void>;
}

export function useDREData(): UseDREDataResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [shopeeOrders, setShopeeOrders] = useState<RawOrder[]>([]);
  const [tiktokOrders, setTiktokOrders] = useState<TikTokOrder[]>([]);
  const [tiktokSettlements, setTiktokSettlements] = useState<TikTokSettlement[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [shopeeSettings, setShopeeSettings] = useState<ShopeeSettings | null>(null);
  const [tiktokSettings, setTiktokSettings] = useState<TikTokSettings | null>(null);
  const [mlOrders, setMlOrders] = useState<MlOrder[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  
  const periods = useMemo(() => getDefaultPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DREPeriod>(periods[0]);

  async function fetchAllTikTokOrders(userId: string) {
    const PAGE_SIZE = 1000;
    let allOrders: TikTokOrder[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('tiktok_orders')
        .select('*')
        .eq('user_id', userId)
        .range(from, to)
        .order('data_pedido', { ascending: false });
      if (error) return { data: null, error };
      if (data && data.length > 0) {
        allOrders = [...allOrders, ...data];
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }
    return { data: allOrders, error: null };
  }

  async function fetchAllTikTokSettlements(userId: string) {
    const PAGE_SIZE = 1000;
    let allSettlements: TikTokSettlement[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('tiktok_settlements')
        .select('*')
        .eq('user_id', userId)
        .range(from, to)
        .order('statement_date', { ascending: false });
      if (error) return { data: null, error };
      if (data && data.length > 0) {
        allSettlements = [...allSettlements, ...data];
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }
    return { data: allSettlements, error: null };
  }

  async function fetchAllMlOrders(userId: string) {
    const PAGE_SIZE = 1000;
    let allOrders: MlOrder[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('ml_orders')
        .select('*')
        .eq('user_id', userId)
        .range(from, to)
        .order('data_pedido', { ascending: false });
      if (error) return { data: null, error };
      if (data && data.length > 0) {
        allOrders = [...allOrders, ...(data as MlOrder[])];
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }
    return { data: allOrders, error: null };
  }

  async function fetchAllCashFlowEntries(userId: string) {
    const PAGE_SIZE = 1000;
    let allEntries: CashFlowEntry[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('*')
        .eq('user_id', userId)
        .range(from, to)
        .order('due_date', { ascending: false });
      if (error) return { data: null, error };
      if (data && data.length > 0) {
        allEntries = [...allEntries, ...(data as CashFlowEntry[])];
        hasMore = data.length === PAGE_SIZE;
        page++;
      } else {
        hasMore = false;
      }
    }
    return { data: allEntries, error: null };
  }

  // ── Função central de fetch (usada no useEffect e no refetch) ──
  async function loadAllData(userId: string) {
    const [
      shopeeOrdersData,
      tiktokOrdersResult,
      tiktokSettlementsResult,
      fixedCostsResult,
      shopeeSettingsResult,
      tiktokSettingsResult,
      mlOrdersResult,
      cashFlowResult
    ] = await Promise.all([
      fetchAllOrders(),
      fetchAllTikTokOrders(userId),
      fetchAllTikTokSettlements(userId),
      supabase.from('fixed_costs').select('*').eq('user_id', userId),
      supabase
        .from('settings')
        .select('taxa_comissao_shopee, adicional_por_item, percentual_nf_entrada, gasto_shopee_ads, imposto_nf_saida')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle(),
      supabase
        .from('tiktok_settings')
        .select('taxa_comissao_tiktok, taxa_afiliado, adicional_por_item, percentual_nf_entrada, gasto_tiktok_ads, imposto_nf_saida')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle(),
      fetchAllMlOrders(userId),
      fetchAllCashFlowEntries(userId)
    ]);

    // ── Logs de diagnóstico ──
    console.log('[DRE] Shopee orders:', shopeeOrdersData.length);
    console.log('[DRE] TikTok orders:', tiktokOrdersResult.data?.length ?? 'null', '| error:', tiktokOrdersResult.error);
    console.log('[DRE] TikTok settlements:', tiktokSettlementsResult.data?.length ?? 'null', '| error:', tiktokSettlementsResult.error);
    console.log('[DRE] ML orders:', mlOrdersResult.data?.length ?? 'null', '| error:', mlOrdersResult.error);
    console.log('[DRE] Cash flow:', cashFlowResult.data?.length ?? 'null', '| error:', cashFlowResult.error);
    console.log('[DRE] Fixed costs:', fixedCostsResult.data?.length ?? 'null', '| error:', fixedCostsResult.error);
    console.log('[DRE] Shopee settings:', shopeeSettingsResult.data, '| error:', shopeeSettingsResult.error);
    console.log('[DRE] TikTok settings:', tiktokSettingsResult.data, '| error:', tiktokSettingsResult.error);

    setShopeeOrders(shopeeOrdersData);

    if (tiktokOrdersResult.error) throw tiktokOrdersResult.error;
    setTiktokOrders(tiktokOrdersResult.data || []);

    if (tiktokSettlementsResult.error) throw tiktokSettlementsResult.error;
    setTiktokSettlements(tiktokSettlementsResult.data || []);

    if (fixedCostsResult.error) throw fixedCostsResult.error;
    setFixedCosts(fixedCostsResult.data || []);

    if (shopeeSettingsResult.error && shopeeSettingsResult.error.code !== 'PGRST116') {
      throw shopeeSettingsResult.error;
    }
    setShopeeSettings(shopeeSettingsResult.data);

    if (tiktokSettingsResult.error && tiktokSettingsResult.error.code !== 'PGRST116') {
      throw tiktokSettingsResult.error;
    }
    setTiktokSettings(tiktokSettingsResult.data);

    if (mlOrdersResult.error) throw mlOrdersResult.error;
    setMlOrders(mlOrdersResult.data || []);

    if (cashFlowResult.error) throw cashFlowResult.error;
    setCashFlowEntries(cashFlowResult.data || []);
  }

  // Carga inicial
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await loadAllData(user.id);
      } catch (err) {
        console.error('[DRE] Error fetching DRE data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do DRE');
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [user]);

  // Cálculo da DRE por período
  const dreData = useMemo(() => {
    if (isLoading || !user) return null;
    return calculateDRE(
      shopeeOrders,
      tiktokOrders,
      tiktokSettlements,
      fixedCosts,
      shopeeSettings,
      tiktokSettings,
      selectedPeriod,
      mlOrders,
      cashFlowEntries
    );
  }, [
    shopeeOrders,
    tiktokOrders,
    tiktokSettlements,
    fixedCosts,
    shopeeSettings,
    tiktokSettings,
    selectedPeriod,
    mlOrders,
    cashFlowEntries,
    isLoading,
    user
  ]);

  const refetch = async () => {
    if (!user) return;
    console.log('[DRE] refetch iniciado, user:', user.id);
    setIsLoading(true);
    setError(null);
    try {
      await loadAllData(user.id);
    } catch (err) {
      console.error('[DRE] Error fetching DRE data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do DRE');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    dreData,
    isLoading,
    error,
    periods,
    selectedPeriod,
    setSelectedPeriod,
    refetch
  };
}