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
  CashFlowEntry,
  ShopeeOrderDRE,
} from '@/lib/dre-calculations';

// ── Tipos internos para Shopee (orders/fees/payments) ──────────────────────

interface ShopeeOrder {
  id: string;
  integration_id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  order_created_at: string;
}

interface ShopeeFee {
  id: string;
  integration_id: string;
  fee_type: string;
  amount: number;
  fee_date: string;
}

// Statuses que contam como receita (espelha useShopeeSync)
const COMPLETED_STATUSES = ['COMPLETED'];
const SHIPPED_STATUSES   = ['SHIPPED', 'TO_CONFIRM_RECEIVE', 'PROCESSED'];
const FEE_TYPES_TAXAS    = ['commission', 'service_fee', 'shipping_fee', 'reverse_shipping_fee'];

// ── Interface de resultado ──────────────────────────────────────────────────

interface UseDREDataResult {
  dreData: DREData | null;
  isLoading: boolean;
  error: string | null;
  periods: DREPeriod[];
  selectedPeriod: DREPeriod;
  setSelectedPeriod: (period: DREPeriod) => void;
  refetch: () => Promise<void>;
}

// ── Hook principal ──────────────────────────────────────────────────────────

export function useDREData(): UseDREDataResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Estados de dados
  const [shopeeOrders,      setShopeeOrders]      = useState<ShopeeOrder[]>([]);
  const [shopeeFees,        setShopeeFees]        = useState<ShopeeFee[]>([]);
  const [tiktokOrders,      setTiktokOrders]      = useState<TikTokOrder[]>([]);
  const [tiktokSettlements, setTiktokSettlements] = useState<TikTokSettlement[]>([]);
  const [fixedCosts,        setFixedCosts]        = useState<FixedCost[]>([]);
  const [shopeeSettings,    setShopeeSettings]    = useState<ShopeeSettings | null>(null);
  const [tiktokSettings,    setTiktokSettings]    = useState<TikTokSettings | null>(null);
  const [mlOrders,          setMlOrders]          = useState<MlOrder[]>([]);
  const [cashFlowEntries,   setCashFlowEntries]   = useState<CashFlowEntry[]>([]);

  const periods = useMemo(() => getDefaultPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DREPeriod>(periods[0]);

  // ── Helpers de fetch com paginação ────────────────────────────────────────

  async function fetchShopeeOrders(integrationId: string): Promise<ShopeeOrder[]> {
    const PAGE_SIZE = 1000;
    let all: ShopeeOrder[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, integration_id, external_order_id, status, total_amount, order_created_at')
        .eq('integration_id', integrationId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('order_created_at', { ascending: false });
      if (error) { console.warn('[DRE] Shopee orders error:', error); break; }
      if (!data || data.length === 0) break;
      all = [...all, ...(data as ShopeeOrder[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  }

  async function fetchShopeeFees(integrationId: string): Promise<ShopeeFee[]> {
    const PAGE_SIZE = 1000;
    let all: ShopeeFee[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('fees')
        .select('id, integration_id, fee_type, amount, fee_date')
        .eq('integration_id', integrationId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) { console.warn('[DRE] Shopee fees error:', error); break; }
      if (!data || data.length === 0) break;
      all = [...all, ...(data as ShopeeFee[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  }

  async function fetchTikTokOrders(userId: string): Promise<{ data: TikTokOrder[] | null; error: unknown }> {
    const PAGE_SIZE = 1000;
    let all: TikTokOrder[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('tiktok_orders')
        .select('*')
        .eq('user_id', userId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('data_pedido', { ascending: false });
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return { data: all, error: null };
  }

  async function fetchTikTokSettlements(userId: string): Promise<{ data: TikTokSettlement[] | null; error: unknown }> {
    const PAGE_SIZE = 1000;
    let all: TikTokSettlement[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('tiktok_settlements')
        .select('*')
        .eq('user_id', userId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('statement_date', { ascending: false });
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      all = [...all, ...data];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return { data: all, error: null };
  }

  async function fetchMlOrders(userId: string): Promise<{ data: MlOrder[] | null; error: unknown }> {
    const PAGE_SIZE = 1000;
    let all: MlOrder[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('ml_orders')
        .select('*')
        .eq('user_id', userId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('data_pedido', { ascending: false });
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      all = [...all, ...(data as MlOrder[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return { data: all, error: null };
  }

  async function fetchCashFlow(userId: string): Promise<{ data: CashFlowEntry[] | null; error: unknown }> {
    const PAGE_SIZE = 1000;
    let all: CashFlowEntry[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('*')
        .eq('user_id', userId)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('due_date', { ascending: false });
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      all = [...all, ...(data as CashFlowEntry[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return { data: all, error: null };
  }

  // ── Função central de carregamento ────────────────────────────────────────

  async function loadAllData(userId: string) {
    // 1. Buscar integration_id da Shopee conectada
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('id, provider, status')
      .eq('user_id', userId)
      .eq('provider', 'shopee')
      .eq('status', 'connected')
      .limit(1);

    const shopeeIntegrationId = connections?.[0]?.id ?? null;
    console.log('[DRE] Shopee integration_id:', shopeeIntegrationId);

    // 2. Buscar tudo em paralelo
    const [
      shopeeOrdersData,
      shopeeFeesData,
      tiktokOrdersResult,
      tiktokSettlementsResult,
      fixedCostsResult,
      shopeeSettingsResult,
      tiktokSettingsResult,
      mlOrdersResult,
      cashFlowResult,
    ] = await Promise.all([
      shopeeIntegrationId ? fetchShopeeOrders(shopeeIntegrationId) : Promise.resolve([]),
      shopeeIntegrationId ? fetchShopeeFees(shopeeIntegrationId)   : Promise.resolve([]),
      fetchTikTokOrders(userId),
      fetchTikTokSettlements(userId),
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
      fetchMlOrders(userId),
      fetchCashFlow(userId),
    ]);

    console.log('[DRE] Shopee orders:', shopeeOrdersData.length, '| fees:', shopeeFeesData.length);
    console.log('[DRE] TikTok orders:', tiktokOrdersResult.data?.length ?? 'null', '| error:', tiktokOrdersResult.error);
    console.log('[DRE] TikTok settlements:', tiktokSettlementsResult.data?.length ?? 'null', '| error:', tiktokSettlementsResult.error);
    console.log('[DRE] ML orders:', mlOrdersResult.data?.length ?? 'null', '| error:', mlOrdersResult.error);
    console.log('[DRE] Cash flow:', cashFlowResult.data?.length ?? 'null', '| error:', cashFlowResult.error);
    console.log('[DRE] Fixed costs:', fixedCostsResult.data?.length ?? 'null', '| error:', fixedCostsResult.error);

    setShopeeOrders(shopeeOrdersData);
    setShopeeFees(shopeeFeesData);

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
        console.error('[DRE] Error:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados do DRE');
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Cálculo da DRE ────────────────────────────────────────────────────────

  const dreData = useMemo((): DREData | null => {
    if (isLoading || !user) return null;

    // Converter ShopeeOrder[] → ShopeeOrderDRE[] (tipo explícito, sem 'as any')
    const shopeeOrdersMapped: ShopeeOrderDRE[] = shopeeOrders
      .filter(o => COMPLETED_STATUSES.includes(o.status) || SHIPPED_STATUSES.includes(o.status))
      .map(
        (o): ShopeeOrderDRE => ({
          id:             o.id,
          total_faturado: Number(o.total_amount),
          custo_unitario: 0,
          quantidade:     1,
          data_pedido:    o.order_created_at,
        }),
      );

    // Taxa de comissão efetiva calculada pelas fees reais
    const totalReceita   = shopeeOrdersMapped.reduce((s, o) => s + o.total_faturado, 0);
    const totalFeesTaxas = shopeeFees
      .filter(f => FEE_TYPES_TAXAS.includes(f.fee_type))
      .reduce((s, f) => s + Number(f.amount), 0);
    const taxaEfetiva = totalReceita > 0 ? (totalFeesTaxas / totalReceita) * 100 : 0;

    const shopeeSettingsAjustado: ShopeeSettings = {
      ...(shopeeSettings ?? {
        taxa_comissao_shopee:   null,
        adicional_por_item:     null,
        percentual_nf_entrada:  null,
        gasto_shopee_ads:       null,
      }),
      taxa_comissao_shopee:
        totalFeesTaxas > 0 ? taxaEfetiva : (shopeeSettings?.taxa_comissao_shopee ?? 0),
    };

    return calculateDRE(
      shopeeOrdersMapped,
      tiktokOrders,
      tiktokSettlements,
      fixedCosts,
      shopeeSettingsAjustado,
      tiktokSettings,
      selectedPeriod,
      mlOrders,
      cashFlowEntries,
    );
  }, [
    shopeeOrders,
    shopeeFees,
    tiktokOrders,
    tiktokSettlements,
    fixedCosts,
    shopeeSettings,
    tiktokSettings,
    selectedPeriod,
    mlOrders,
    cashFlowEntries,
    isLoading,
    user,
  ]);

  const refetch = async () => {
    if (!user) return;
    console.log('[DRE] refetch iniciado');
    setIsLoading(true);
    setError(null);
    try {
      await loadAllData(user.id);
    } catch (err) {
      console.error('[DRE] Error:', err);
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
    refetch,
  };
}