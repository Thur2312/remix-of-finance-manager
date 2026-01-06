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
  TikTokSettings
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
  
  // Data sources
  const [shopeeOrders, setShopeeOrders] = useState<RawOrder[]>([]);
  const [tiktokOrders, setTiktokOrders] = useState<TikTokOrder[]>([]);
  const [tiktokSettlements, setTiktokSettlements] = useState<TikTokSettlement[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [shopeeSettings, setShopeeSettings] = useState<ShopeeSettings | null>(null);
  const [tiktokSettings, setTiktokSettings] = useState<TikTokSettings | null>(null);
  
  // Period selection
  const periods = useMemo(() => getDefaultPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DREPeriod>(periods[0]);

  // Fetch all data
  const fetchAllData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        shopeeOrdersData,
        tiktokOrdersResult,
        tiktokSettlementsResult,
        fixedCostsResult,
        shopeeSettingsResult,
        tiktokSettingsResult
      ] = await Promise.all([
        // Shopee orders (using the helper for pagination)
        fetchAllOrders(),
        
        // TikTok orders
        fetchAllTikTokOrders(user.id),
        
        // TikTok settlements
        fetchAllTikTokSettlements(user.id),
        
        // Fixed costs
        supabase
          .from('fixed_costs')
          .select('*')
          .eq('user_id', user.id),
        
        // Shopee settings (get default or first)
        supabase
          .from('settings')
          .select('taxa_comissao_shopee, adicional_por_item, percentual_nf_entrada, gasto_shopee_ads, imposto_nf_saida')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle(),
        
        // TikTok settings (get default or first)
        supabase
          .from('tiktok_settings')
          .select('taxa_comissao_tiktok, taxa_afiliado, adicional_por_item, percentual_nf_entrada, gasto_tiktok_ads, imposto_nf_saida')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle()
      ]);

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

    } catch (err) {
      console.error('Error fetching DRE data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do DRE');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to fetch all TikTok orders with pagination
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

      if (error) {
        return { data: null, error };
      }

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

  // Helper to fetch all TikTok settlements with pagination
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

      if (error) {
        return { data: null, error };
      }

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

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Calculate DRE based on selected period
  const dreData = useMemo(() => {
    if (isLoading || !user) return null;

    return calculateDRE(
      shopeeOrders,
      tiktokOrders,
      tiktokSettlements,
      fixedCosts,
      shopeeSettings,
      tiktokSettings,
      selectedPeriod
    );
  }, [
    shopeeOrders,
    tiktokOrders,
    tiktokSettlements,
    fixedCosts,
    shopeeSettings,
    tiktokSettings,
    selectedPeriod,
    isLoading,
    user
  ]);

  return {
    dreData,
    isLoading,
    error,
    periods,
    selectedPeriod,
    setSelectedPeriod,
    refetch: fetchAllData
  };
}
