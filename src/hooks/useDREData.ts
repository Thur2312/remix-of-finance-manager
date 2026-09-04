import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedCompany } from '@/hooks/useSelectedCompany';
import { useRevenueByCompany } from '@/hooks/useRevenueByCompany';
import { type Company } from '@/hooks/useCompanies';
import { allocateFixedCosts, type FixedCostScoped } from '@/lib/cost-allocation';
import { type ScopedConnection } from '@/lib/company-scope';
import {
  DREData,
  DREPeriod,
  calculateDRE,
  getDefaultPeriods,
  getMonthlyPeriods,
  TikTokSettlement,
  TikTokOrder,
  FixedCost,
  ShopeeSettings,
  TikTokSettings,
  MlOrder,
  CashFlowEntry,
  ShopeeOrderDRE,
} from '@/lib/dre-calculations';
import { isShopeeRevenueStatus, isShopeeShippingRebate, SHOPEE_FEE_TYPES_TAXAS } from '@/lib/shopee-sync-status';
import { logger } from '@/lib/logger';

// ── Tipos internos para Shopee (orders/fees/payments) ──────────────────────

interface ShopeeOrder {
  id: string;
  integration_id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  total_amount_cents: number;
  order_created_at: string;
}

interface ShopeeFee {
  id: string;
  integration_id: string;
  fee_type: string;
  amount: number;
  amount_cents: number;
  fee_date: string;
  description: string | null;
}

interface ShopeePayment {
  id: string;
  integration_id: string;
  order_id: string | null;
  payment_method: string;
  net_amount: number;
  net_amount_cents: number;
}

interface ConnRow {
  id: string;
  provider: string;
  company_id: string | null;
  shop_name: string | null;
  external_shop_id: string | null;
}

// Classificação de status compartilhada com useShopeeSync/IntegrationDashboard
// (src/lib/shopee-sync-status.ts) — antes cada um tinha sua própria cópia
// dessas listas, e podiam divergir sem ninguém notar.

// ── Interface de resultado ──────────────────────────────────────────────────

export interface DRETrendPoint {
  label: string;
  faturamento: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemOperacional: number;
}

interface UseDREDataResult {
  dreData: DREData | null;
  /** DRE do período anterior de mesma duração — null se a janela não é ~mensal */
  dreDataPrev: DREData | null;
  /** Série dos últimos 6 meses fechados (mais recente por último) */
  dreTrend: DRETrendPoint[];
  isLoading: boolean;
  error: string | null;
  periods: DREPeriod[];
  selectedPeriod: DREPeriod;
  setSelectedPeriod: (period: DREPeriod) => void;
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  /** Recorte por empresa ativo + se há loja órfã cujo faturamento fica de fora. */
  scope: { byCompany: boolean; hasUnassignedConnection: boolean };
  refetch: () => Promise<void>;
}

// ── Hook principal ──────────────────────────────────────────────────────────

// `scopeByCompany` (default true): recorta os dados pela empresa selecionada.
// O UnifiedDashboard passa `false` — lá o filtro financeiro por empresa entra
// só no Stage 4b (ver plano); o `selectedCompany` continua definindo o imposto.
export function useDREData(opts?: { scopeByCompany?: boolean }): UseDREDataResult {
  const scopeByCompany = opts?.scopeByCompany ?? true;
  const { user } = useAuth();
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Empresa selecionada — vem do store global (company-scope-store), o mesmo
  // valor do switcher do topbar e das demais telas. Decide (a) o perfil de
  // imposto (companies.tax_rate/tax_base) e (b) o RECORTE: com empresa escolhida
  // a DRE mostra só as lojas dela + o rateio dos custos fixos. `null` = "Todas":
  // consolidado, sem estimativa de Simples/IRPJ.
  const { companyId: storeCompanyId, company: selectedCompany, setCompanyId: setSelectedCompanyId } = useSelectedCompany();
  // Recorte: null desliga o filtro (mantém "Todas"); o imposto segue selectedCompany.
  const companyId = scopeByCompany ? storeCompanyId : null;
  const revenueByCompany = useRevenueByCompany(90);

  const setSelectedCompany = useCallback(
    (company: Company | null) => setSelectedCompanyId(company?.id ?? null),
    [setSelectedCompanyId],
  );

  // Estados de dados
  const [shopeeOrders,      setShopeeOrders]      = useState<ShopeeOrder[]>([]);
  const [shopeeFees,        setShopeeFees]        = useState<ShopeeFee[]>([]);
  const [shopeePayments,    setShopeePayments]    = useState<ShopeePayment[]>([]);
  const [tiktokOrders,      setTiktokOrders]      = useState<TikTokOrder[]>([]);
  const [tiktokSettlements, setTiktokSettlements] = useState<TikTokSettlement[]>([]);
  const [fixedCosts,        setFixedCosts]        = useState<FixedCost[]>([]);
  const [shopeeSettings,    setShopeeSettings]    = useState<ShopeeSettings | null>(null);
  const [tiktokSettings,    setTiktokSettings]    = useState<TikTokSettings | null>(null);
  const [mlOrders,          setMlOrders]          = useState<MlOrder[]>([]);
  const [cashFlowEntries,   setCashFlowEntries]   = useState<CashFlowEntry[]>([]);
  const [connections,       setConnections]       = useState<ConnRow[]>([]);

  const periods = useMemo(() => getDefaultPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DREPeriod>(periods[0]);

  // ── Helpers de fetch com paginação ────────────────────────────────────────

  async function fetchShopeeOrders(integrationIds: string[]): Promise<ShopeeOrder[]> {
    if (integrationIds.length === 0) return [];
    const PAGE_SIZE = 1000;
    let all: ShopeeOrder[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, integration_id, external_order_id, status, total_amount, total_amount_cents, order_created_at')
        .in('integration_id', integrationIds)
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

  async function fetchShopeeFees(integrationIds: string[]): Promise<ShopeeFee[]> {
    if (integrationIds.length === 0) return [];
    const PAGE_SIZE = 1000;
    let all: ShopeeFee[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('fees')
        .select('id, integration_id, fee_type, amount, amount_cents, fee_date, description')
        .in('integration_id', integrationIds)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) { console.warn('[DRE] Shopee fees error:', error); break; }
      if (!data || data.length === 0) break;
      all = [...all, ...(data as ShopeeFee[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  }

  async function fetchShopeePayments(integrationIds: string[]): Promise<ShopeePayment[]> {
    if (integrationIds.length === 0) return [];
    const PAGE_SIZE = 1000;
    let all: ShopeePayment[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from('payments')
        .select('id, integration_id, order_id, payment_method, net_amount, net_amount_cents')
        .in('integration_id', integrationIds)
        .eq('payment_method', 'escrow')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) { console.warn('[DRE] Shopee payments error:', error); break; }
      if (!data || data.length === 0) break;
      all = [...all, ...(data as ShopeePayment[])];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    return all;
  }

  async function fetchTikTokOrders(userId: string, integrationIds: string[] | null): Promise<{ data: TikTokOrder[] | null; error: unknown }> {
    if (integrationIds && integrationIds.length === 0) return { data: [], error: null };
    const PAGE_SIZE = 1000;
    let all: TikTokOrder[] = [];
    let page = 0;
    while (true) {
      let q = supabase
        .from('tiktok_orders')
        .select('*')
        .eq('user_id', userId);
      if (integrationIds) q = q.in('integration_id', integrationIds);
      const { data, error } = await q
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

  async function fetchMlOrders(userId: string, integrationIds: string[] | null): Promise<{ data: MlOrder[] | null; error: unknown }> {
    if (integrationIds && integrationIds.length === 0) return { data: [], error: null };
    const PAGE_SIZE = 1000;
    let all: MlOrder[] = [];
    let page = 0;
    while (true) {
      let q = supabase
        .from('ml_orders')
        .select('*')
        .eq('user_id', userId);
      if (integrationIds) q = q.in('integration_id', integrationIds);
      const { data, error } = await q
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
    // 1. Conexões (lojas) do usuário. Definem o RECORTE por empresa (Bloco D
    // Fase 2): com empresa escolhida, só as lojas dela entram; sem empresa
    // ("Todas"), tudo — de todas as lojas Shopee, não só a "ativa".
    const { data: connRows } = await supabase
      .from('integration_connections')
      .select('id, provider, company_id, shop_name, external_shop_id, status')
      .eq('user_id', userId);
    const conns: ConnRow[] = (connRows ?? []).map((c) => ({
      id: c.id, provider: c.provider, company_id: c.company_id,
      shop_name: c.shop_name, external_shop_id: c.external_shop_id,
    }));
    setConnections(conns);

    // Recorte: ids das conexões em jogo. companyId setado → só as da empresa;
    // null → todas (scopedIds = null desliga o filtro em ML/TikTok).
    const inScope = (c: ConnRow) => !companyId || c.company_id === companyId;
    let scopedConns = conns.filter(inScope);

    // Reconexão: se a empresa tem uma loja e existe OUTRA conexão da mesma loja
    // (mesmo external_shop_id) ainda sem empresa — provavelmente a conexão antiga
    // que ninguém reatribuiu. Puxa os pedidos históricos dela também. Só quando
    // company_id é null (nunca rouba loja explicitamente de outra empresa).
    if (companyId) {
      const shopKeys = new Set(scopedConns.map((c) => c.external_shop_id).filter(Boolean));
      const strays = conns.filter(
        (c) => !c.company_id && c.external_shop_id && shopKeys.has(c.external_shop_id),
      );
      if (strays.length) scopedConns = [...scopedConns, ...strays];
    }

    const shopeeIds = scopedConns.filter((c) => c.provider === 'shopee').map((c) => c.id);
    const scopedIds = companyId ? scopedConns.map((c) => c.id) : null;
    logger.debug('[DRE] recorte:', { companyId, shopeeIds, scopedIds });

    // 2. Buscar tudo em paralelo
    const [
      shopeeOrdersData,
      shopeeFeesData,
      shopeePaymentsData,
      tiktokOrdersResult,
      tiktokSettlementsResult,
      fixedCostsResult,
      shopeeSettingsResult,
      tiktokSettingsResult,
      mlOrdersResult,
      cashFlowResult,
    ] = await Promise.all([
      fetchShopeeOrders(shopeeIds),
      fetchShopeeFees(shopeeIds),
      fetchShopeePayments(shopeeIds),
      fetchTikTokOrders(userId, scopedIds),
      fetchTikTokSettlements(userId),
      supabase.from('fixed_costs').select('*').eq('user_id', userId),
      supabase
        .from('settings')
        .select('taxa_comissao_shopee, adicional_por_item, percentual_nf_entrada, gasto_shopee_ads')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle(),
      supabase
        .from('tiktok_settings')
        .select('taxa_comissao_tiktok, taxa_afiliado, adicional_por_item, percentual_nf_entrada, gasto_tiktok_ads')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle(),
      fetchMlOrders(userId, scopedIds),
      fetchCashFlow(userId),
    ]);

    logger.debug('[DRE] Shopee orders:', shopeeOrdersData.length, '| fees:', shopeeFeesData.length);
    logger.debug('[DRE] TikTok orders:', tiktokOrdersResult.data?.length ?? 'null', '| error:', tiktokOrdersResult.error);
    logger.debug('[DRE] TikTok settlements:', tiktokSettlementsResult.data?.length ?? 'null', '| error:', tiktokSettlementsResult.error);
    logger.debug('[DRE] ML orders:', mlOrdersResult.data?.length ?? 'null', '| error:', mlOrdersResult.error);
    logger.debug('[DRE] Cash flow:', cashFlowResult.data?.length ?? 'null', '| error:', cashFlowResult.error);
    logger.debug('[DRE] Fixed costs:', fixedCostsResult.data?.length ?? 'null', '| error:', fixedCostsResult.error);

    setShopeeOrders(shopeeOrdersData);
    setShopeeFees(shopeeFeesData);
    setShopeePayments(shopeePaymentsData);

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
    // companyId entra aqui: mudar de empresa muda o recorte do fetch, não só o
    // imposto. eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId]);

  // ── Cálculo da DRE ────────────────────────────────────────────────────────

  // Builder: toda a preparação (mapeamento, escrow, taxa efetiva) independe do
  // período — o `calculateDRE` é quem filtra. Retorna uma função pra rodar o
  // mesmo cálculo em janelas diferentes (período atual + anterior, pra MoM).
  const buildDRE = useMemo((): ((period: DREPeriod) => DREData) | null => {
    if (isLoading || !user) return null;

    // Custo fixo da empresa selecionada — o rateio do Bloco D (exclusivo + loja
    // + plataforma + parte do geral). Sem empresa ("Todas"), soma tudo como
    // antes (override = undefined). Ver [[company_scope_bloco_d]].
    let fixedCostsOverrideCents: number | undefined;
    if (companyId) {
      const scopedConns: ScopedConnection[] = connections.map((c) => ({
        id: c.id,
        companyId: c.company_id,
        marketplace: c.provider,
        label: c.shop_name || c.external_shop_id || c.provider,
      }));
      const scoped: FixedCostScoped[] = (fixedCosts as unknown as Array<
        FixedCost & { scope?: string; company_id?: string | null; integration_id?: string | null;
          marketplace?: string | null; allocation_pct?: Record<string, number> | null; amount_cents?: number | null }
      >)
        .filter((c) => c.is_recurring)
        .map((c) => ({
          id: c.id,
          name: c.name,
          amountCents: Math.round(Number(c.amount_cents ?? Number(c.amount) * 100)),
          scope: (c.scope as FixedCostScoped['scope']) ?? 'geral',
          companyId: c.company_id ?? null,
          integrationId: c.integration_id ?? null,
          marketplace: c.marketplace ?? null,
          allocationPct: c.allocation_pct ?? null,
        }));
      const companyIds = Array.from(new Set(connections.map((c) => c.company_id).filter(Boolean) as string[]));
      if (!companyIds.includes(companyId)) companyIds.push(companyId);
      const alloc = allocateFixedCosts(scoped, {
        companyIds,
        connections: scopedConns,
        revenueByCompanyCents: revenueByCompany.byCompanyCents,
      });
      fixedCostsOverrideCents = alloc.byCompany[companyId]?.totalCents ?? 0;
    }

    // Converter ShopeeOrder[] → ShopeeOrderDRE[] (tipo explícito, sem 'as any')
    const shopeeOrdersMapped: ShopeeOrderDRE[] = shopeeOrders
      .filter(o => isShopeeRevenueStatus(o.status))
      .map(
        (o): ShopeeOrderDRE => ({
          id:                   o.id,
          total_faturado:       Number(o.total_amount),
          total_faturado_cents: Number(o.total_amount_cents),
          custo_unitario:       0,
          custo_unitario_cents: 0,
          quantidade:           1,
          data_pedido:          o.order_created_at,
        }),
      );

    // Dedução efetiva da Shopee. Preferência: `escrow_amount` real (o que a
    // Shopee repassa), casado por order_id — já com comissão, serviço e o frete
    // REAL descontados. Cai no cálculo por fees só se não houver repasse.
    const totalReceita = shopeeOrdersMapped.reduce((s, o) => s + o.total_faturado, 0);

    const escrowByOrder = new Map<string, number>();
    for (const p of shopeePayments) {
      if (p.payment_method === 'escrow' && p.order_id) {
        escrowByOrder.set(p.order_id, (escrowByOrder.get(p.order_id) ?? 0) + Number(p.net_amount || 0));
      }
    }
    const comEscrow        = shopeeOrdersMapped.filter(o => escrowByOrder.has(o.id));
    const receitaComEscrow = comEscrow.reduce((s, o) => s + o.total_faturado, 0);
    const escrowTotal      = comEscrow.reduce((s, o) => s + (escrowByOrder.get(o.id) ?? 0), 0);

    // BUG-03b: o rebate de frete vem como `adjustment` (fora de
    // SHOPEE_FEE_TYPES_TAXAS) e precisa abater o `shipping_fee` inflado — senão
    // este fallback superestima a taxa efetiva e o DRE subestima o lucro.
    const totalFeesTaxas = shopeeFees.reduce((s, f) => {
      if (SHOPEE_FEE_TYPES_TAXAS.includes(f.fee_type)) return s + Number(f.amount);
      if (isShopeeShippingRebate(f)) return s - Number(f.amount);
      return s;
    }, 0);

    const taxaEfetiva =
      receitaComEscrow > 0
        ? ((receitaComEscrow - escrowTotal) / receitaComEscrow) * 100
        : totalReceita > 0
          ? (totalFeesTaxas / totalReceita) * 100
          : 0;

    const shopeeSettingsAjustado: ShopeeSettings = {
      ...(shopeeSettings ?? {
        taxa_comissao_shopee:   null,
        adicional_por_item:     null,
        percentual_nf_entrada:  null,
        gasto_shopee_ads:       null,
      }),
      taxa_comissao_shopee:
        (receitaComEscrow > 0 || totalFeesTaxas > 0)
          ? taxaEfetiva
          : (shopeeSettings?.taxa_comissao_shopee ?? 0),
    };

    return (period: DREPeriod) => calculateDRE(
      shopeeOrdersMapped,
      tiktokOrders,
      tiktokSettlements,
      fixedCosts,
      shopeeSettingsAjustado,
      tiktokSettings,
      period,
      mlOrders,
      cashFlowEntries,
      selectedCompany,
      fixedCostsOverrideCents,
    );
  }, [
    shopeeOrders,
    shopeeFees,
    shopeePayments,
    tiktokOrders,
    tiktokSettlements,
    fixedCosts,
    shopeeSettings,
    tiktokSettings,
    mlOrders,
    cashFlowEntries,
    selectedCompany,
    companyId,
    connections,
    revenueByCompany.byCompanyCents,
    isLoading,
    user,
  ]);

  const dreData = useMemo(
    () => buildDRE?.(selectedPeriod) ?? null,
    [buildDRE, selectedPeriod],
  );

  // DRE do período imediatamente anterior, mesma duração — só quando a janela
  // é ~mensal (comparar "Ano Atual" com o ano passado inteiro não é útil aqui).
  const dreDataPrev = useMemo((): DREData | null => {
    if (!buildDRE) return null;
    const durMs = selectedPeriod.end.getTime() - selectedPeriod.start.getTime();
    if (durMs > 40 * 24 * 60 * 60 * 1000) return null;
    const prevEnd = new Date(selectedPeriod.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durMs);
    return buildDRE({ start: prevStart, end: prevEnd, label: 'Período anterior' });
  }, [buildDRE, selectedPeriod]);

  // Série dos últimos 6 meses — independe do período selecionado. Todos os
  // dados já estão em memória; é só rodar o buildDRE (puro) por janela.
  const dreTrend = useMemo((): DRETrendPoint[] => {
    if (!buildDRE) return [];
    return getMonthlyPeriods(6).map(p => {
      const d = buildDRE(p);
      return {
        label: p.label,
        faturamento: d.receitaBrutaTotal,
        lucroOperacional: d.lucroOperacional,
        lucroLiquido: d.lucroLiquido,
        margemOperacional: d.margemOperacional,
      };
    });
  }, [buildDRE]);

  const refetch = async () => {
    if (!user) return;
    logger.debug('[DRE] refetch iniciado');
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

  const scope = useMemo(
    () => ({
      byCompany: !!companyId,
      hasUnassignedConnection: !!companyId && connections.some((c) => !c.company_id),
    }),
    [companyId, connections],
  );

  return {
    dreData,
    dreDataPrev,
    dreTrend,
    isLoading,
    error,
    periods,
    selectedPeriod,
    setSelectedPeriod,
    selectedCompany,
    setSelectedCompany,
    scope,
    refetch,
  };
}