import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isExcludedOrderStatus } from '@/lib/marketplace-order-status';
import { calcComissaoTaxaReais, type Marketplace } from '@/lib/marketplace-fees';
import { skuKey } from '@/lib/sku';
import type { TablesInsert } from '@/integrations/supabase/types';
import type { StockImportRow } from '@/lib/stock-import';
import {
  buildReplenishmentPlan,
  type ReplenishmentPlan,
  type ReplenishmentSku,
} from '@/lib/replenishment';
import { useCashFlowForecast } from '@/hooks/useCashFlowForecast';

// Compõe a Aposta C (reposição de estoque), Fase 1. Junta:
//   - velocidade de venda por SKU (order_items Shopee + ml_orders + tiktok_orders,
//     últimos WINDOW_DIAS, fora os cancelados/devolvidos), descontando dias sem
//     estoque quando o SKU está zerado hoje;
//   - receita líquida por unidade (taxa real do ML; tabela de comissão pra
//     Shopee/TikTok) e custo (product_costs → custo do pedido do marketplace →
//     null se nenhum dos dois);
//   - estoque + lead time + MOQ informados (inventory_settings);
//   - pedidos de compra em aberto (purchase_orders) → estoque em trânsito;
//   - caixa disponível pra compra (previsão de caixa → pior saldo projetado).
// O modelo em si é puro, em src/lib/replenishment.ts.

const WINDOW_DIAS = 60;
const WINDOW_MIN_DIAS = 7;
const REVIEW_CYCLE_DIAS = 14;
const STOCK_STALE_DIAS = 10;
const LEAD_TIME_PADRAO = 14;
const SAFETY_DIAS_PADRAO = 7;
// Estoque zerado hoje → os dias sem venda até a última venda foram ruptura, não
// falta de demanda. Descontamos da janela, com teto: SKU parado há muito tempo
// não deve ganhar velocidade inflada.
const STOCKOUT_TRIM_MAX_DIAS = 21;

interface SkuAccum {
  sku: string;
  itemName: string;
  units: number;
  grossCents: number;
  /** receita líquida (bruto − taxa do marketplace) acumulada */
  netCents: number;
  /** custo unitário do marketplace (ml/tiktok), média ponderada */
  mpCostCentsSum: number;
  mpCostUnits: number;
  earliestIso: string;
  lastSaleIso: string;
}

export interface UseReplenishment {
  plan: ReplenishmentPlan;
  isLoading: boolean;
  /** há dados de venda + custo suficientes pra montar o plano */
  hasData: boolean;
  /** true = o caixa foi usado como restrição (âncora de saldo confirmada) */
  caixaConfiavel: boolean;
  /** quantos SKUs entraram com custo estimado (não estão em product_costs) */
  skusSemCusto: number;
  /** quantos SKUs têm estoque vindo do catálogo sincronizado */
  syncedStockCount: number;
  /** há quantos dias o sync de estoque mais recente rodou (null se nunca) */
  stockSyncDaysAgo: number | null;
  windowDays: number;
  saveInventory: ReturnType<typeof useMutation<void, Error, SaveInventoryInput>>;
  importStock: ReturnType<typeof useMutation<number, Error, StockImportRow[]>>;
  addPurchaseOrder: ReturnType<typeof useMutation<void, Error, AddPurchaseOrderInput>>;
  receivePurchaseOrder: ReturnType<typeof useMutation<void, Error, string>>;
  openPurchaseOrders: OpenPurchaseOrder[];
}

export interface SaveInventoryInput {
  sku: string;
  itemName?: string | null;
  stockUnits?: number;
  leadTimeDays?: number;
  safetyDays?: number;
  moqUnits?: number | null;
  active?: boolean;
}

export interface AddPurchaseOrderInput {
  sku: string;
  itemName?: string | null;
  qtyUnits: number;
  unitCostCents: number;
  expectedAt?: string | null;
  paymentDueAt?: string | null;
  notes?: string | null;
}

export interface OpenPurchaseOrder {
  id: string;
  sku: string;
  itemName: string | null;
  qtyUnits: number;
  unitCostCents: number;
  orderedAt: string;
  expectedAt: string | null;
}

export function useReplenishment(): UseReplenishment {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const forecast = useCashFlowForecast();

  const now = useMemo(() => new Date(), []);
  const todayIso = format(now, 'yyyy-MM-dd');
  const windowStartIso = format(subDays(now, WINDOW_DIAS), 'yyyy-MM-dd');

  const salesQuery = useQuery({
    queryKey: ['replenishment-sales', user?.id, todayIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: conns, error: connErr } = await supabase
        .from('integration_connections')
        .select('id')
        .eq('user_id', user!.id);
      if (connErr) throw connErr;
      const connIds = (conns ?? []).map(c => c.id);

      const [shopeeRes, mlRes, tiktokRes] = await Promise.all([
        connIds.length
          ? supabase
              .from('orders')
              .select('status, order_created_at, order_items(sku, quantity, total_price_cents)')
              .in('integration_id', connIds)
              .gte('order_created_at', windowStartIso)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('ml_orders')
          .select('sku, nome_produto, quantidade, total_faturado_cents, taxa_ml_cents, frete_ml_cents, custo_unitario_cents, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', windowStartIso),
        supabase
          .from('tiktok_orders')
          .select('sku, nome_produto, quantidade, total_faturado_cents, custo_unitario_cents, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', windowStartIso),
      ]);
      if (shopeeRes.error) throw shopeeRes.error;
      if (mlRes.error) throw mlRes.error;
      if (tiktokRes.error) throw tiktokRes.error;

      const acc = new Map<string, SkuAccum>();
      const bump = (
        rawSku: string | null | undefined,
        name: string | null | undefined,
        units: number,
        grossCents: number,
        netCents: number,
        dateIso: string | null,
        mpUnitCostCents?: number | null,
      ) => {
        const key = skuKey(rawSku);
        if (!key || units <= 0) return;
        const iso = (dateIso ?? todayIso).slice(0, 10);
        const cur = acc.get(key) ?? {
          sku: (rawSku ?? '').trim(),
          itemName: (name ?? '').trim() || (rawSku ?? '').trim(),
          units: 0, grossCents: 0, netCents: 0, mpCostCentsSum: 0, mpCostUnits: 0,
          earliestIso: iso, lastSaleIso: iso,
        };
        cur.units += units;
        cur.grossCents += Math.max(0, grossCents);
        cur.netCents += Math.max(0, netCents);
        if (mpUnitCostCents && mpUnitCostCents > 0) {
          cur.mpCostCentsSum += mpUnitCostCents * units;
          cur.mpCostUnits += units;
        }
        if (iso < cur.earliestIso) cur.earliestIso = iso;
        if (iso > cur.lastSaleIso) cur.lastSaleIso = iso;
        acc.set(key, cur);
      };

      // Taxa estimada pela tabela de comissão (Shopee/TikTok), sobre o preço
      // unitário — mesma fonte da Calculadora.
      const netByTable = (mp: Marketplace, grossCents: number, units: number) => {
        if (units <= 0 || grossCents <= 0) return grossCents;
        const feeReais = calcComissaoTaxaReais(mp, grossCents / units / 100) * units;
        return Math.max(0, grossCents - Math.round(feeReais * 100));
      };

      for (const o of shopeeRes.data ?? []) {
        if (isExcludedOrderStatus((o as { status: string | null }).status)) continue;
        const items = (o as { order_items?: { sku: string | null; quantity: number | null; total_price_cents: number | null }[] }).order_items ?? [];
        for (const it of items) {
          const units = Number(it.quantity) || 0;
          const gross = Math.round(Number(it.total_price_cents) || 0);
          bump(it.sku, it.sku, units, gross, netByTable('Shopee', gross, units),
            (o as { order_created_at: string | null }).order_created_at);
        }
      }
      for (const r of mlRes.data ?? []) {
        if (isExcludedOrderStatus(r.status_pedido)) continue;
        const units = Number(r.quantidade) || 0;
        const gross = Math.round(Number(r.total_faturado_cents) || 0);
        // ML entrega a comissão e o frete reais por pedido.
        const net = Math.max(0, gross
          - Math.round(Number(r.taxa_ml_cents) || 0)
          - Math.round(Number(r.frete_ml_cents) || 0));
        bump(r.sku, r.nome_produto, units, gross, net, r.data_pedido, Math.round(Number(r.custo_unitario_cents) || 0));
      }
      for (const r of tiktokRes.data ?? []) {
        if (isExcludedOrderStatus(r.status_pedido)) continue;
        const units = Number(r.quantidade) || 0;
        const gross = Math.round(Number(r.total_faturado_cents) || 0);
        bump(r.sku, r.nome_produto, units, gross, netByTable('TiktokShop', gross, units),
          r.data_pedido, Math.round(Number(r.custo_unitario_cents) || 0));
      }

      return [...acc.values()];
    },
  });

  const costsQuery = useQuery({
    queryKey: ['replenishment-costs', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Devolve um objeto simples (não Map): o cache do React Query é
      // persistido em JSON no localStorage e um Map vira {} na re-hidratação.
      const { data, error } = await supabase
        .from('product_costs')
        .select('sku, cost, packaging_cost, other_costs, effective_from')
        .eq('user_id', user!.id)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      const byKey: Record<string, number> = {};
      for (const c of data ?? []) {
        const key = skuKey(c.sku);
        if (!key || key in byKey) continue; // primeiro = mais recente
        byKey[key] = Math.round(
          ((Number(c.cost) || 0) + (Number(c.packaging_cost) || 0) + (Number(c.other_costs) || 0)) * 100,
        );
      }
      return byKey;
    },
  });

  const inventoryQuery = useQuery({
    queryKey: ['replenishment-inventory', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [invRes, poRes, stockRes] = await Promise.all([
        supabase
          .from('inventory_settings')
          .select('sku, item_name, stock_units, stock_updated_at, lead_time_days, safety_days, moq_units, active')
          .eq('user_id', user!.id),
        supabase
          .from('purchase_orders')
          .select('id, sku, item_name, qty_units, unit_cost_cents, ordered_at, expected_at')
          .eq('user_id', user!.id)
          .is('received_at', null),
        supabase
          .from('product_stock')
          .select('sku, item_name, stock_units, synced_at')
          .eq('user_id', user!.id),
      ]);
      if (invRes.error) throw invRes.error;
      if (poRes.error) throw poRes.error;
      if (stockRes.error) throw stockRes.error;
      return { inv: invRes.data ?? [], po: poRes.data ?? [], stock: stockRes.data ?? [] };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['replenishment-inventory', user?.id] });
    // a previsão de caixa conta os pedidos de compra em aberto como saída
    queryClient.invalidateQueries({ queryKey: ['cash-flow-forecast-po', user?.id] });
  };

  const saveInventory = useMutation<void, Error, SaveInventoryInput>({
    mutationFn: async (i) => {
      const row: TablesInsert<'inventory_settings'> = { user_id: user!.id, sku: i.sku.trim() };
      if (i.itemName !== undefined) row.item_name = i.itemName;
      if (i.stockUnits !== undefined) { row.stock_units = Math.max(0, Math.round(i.stockUnits)); row.stock_updated_at = new Date().toISOString(); }
      if (i.leadTimeDays !== undefined) row.lead_time_days = Math.max(0, Math.round(i.leadTimeDays));
      if (i.safetyDays !== undefined) row.safety_days = Math.max(0, Math.round(i.safetyDays));
      if (i.moqUnits !== undefined) row.moq_units = i.moqUnits;
      if (i.active !== undefined) row.active = i.active;
      row.updated_at = new Date().toISOString();
      const { error } = await supabase.from('inventory_settings').upsert(row, { onConflict: 'user_id,sku' });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' }),
  });

  const importStock = useMutation<number, Error, StockImportRow[]>({
    mutationFn: async (rows) => {
      const nowIso = new Date().toISOString();
      const payload = rows
        .filter((r) => r.sku.trim() !== '')
        .map((r) => ({
          user_id: user!.id,
          sku: r.sku.trim(),
          item_name: r.itemName,
          stock_units: Math.max(0, Math.round(r.stockUnits)),
          source: 'import',
          synced_at: nowIso,
        }));
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase
          .from('product_stock')
          .upsert(payload.slice(i, i + 500), { onConflict: 'user_id,sku' });
        if (error) throw error;
      }
      return payload.length;
    },
    onSuccess: (n) => {
      invalidate();
      toast({ title: `${n} SKUs importados`, description: 'O estoque da planilha entra na reposição.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível importar a planilha.', variant: 'destructive' }),
  });

  const addPurchaseOrder = useMutation<void, Error, AddPurchaseOrderInput>({
    mutationFn: async (i) => {
      const { error } = await supabase.from('purchase_orders').insert({
        user_id: user!.id,
        sku: i.sku.trim(),
        item_name: i.itemName ?? null,
        qty_units: Math.max(1, Math.round(i.qtyUnits)),
        unit_cost_cents: Math.max(0, Math.round(i.unitCostCents)),
        expected_at: i.expectedAt ?? null,
        payment_due_at: i.paymentDueAt ?? null,
        notes: i.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Pedido registrado', description: 'Entra como estoque em trânsito e como saída na previsão de caixa.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível registrar o pedido.', variant: 'destructive' }),
  });

  const receivePurchaseOrder = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ received_at: todayIso })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Recebido', description: 'Lembre de somar as unidades no estoque do SKU.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível marcar como recebido.', variant: 'destructive' }),
  });

  const composed = useMemo(() => {
    const sales = salesQuery.data ?? [];
    const costs = costsQuery.data ?? {};
    const inv = inventoryQuery.data?.inv ?? [];
    const po = inventoryQuery.data?.po ?? [];

    const stock = inventoryQuery.data?.stock ?? [];
    const invByKey = new Map(inv.map(r => [skuKey(r.sku), r]));
    const stockByKey = new Map(stock.map(r => [skuKey(r.sku), r]));
    const transitByKey = new Map<string, number>();
    for (const p of po) {
      const k = skuKey(p.sku);
      transitByKey.set(k, (transitByKey.get(k) ?? 0) + (Number(p.qty_units) || 0));
    }

    // Universo de SKUs = os que venderam + os configurados manualmente + os
    // que vieram do catálogo sincronizado.
    const keys = new Set<string>([
      ...sales.map(s => skuKey(s.sku)),
      ...invByKey.keys(),
      ...stockByKey.keys(),
    ]);
    const semCusto = new Set<string>();

    const skus: ReplenishmentSku[] = [];
    for (const key of keys) {
      const s = sales.find(x => skuKey(x.sku) === key);
      const settings = invByKey.get(key);
      const synced = stockByKey.get(key);
      if (!s && !settings?.active && !synced) continue;

      const units = s?.units ?? 0;
      const spanDias = s
        ? Math.min(WINDOW_DIAS, Math.max(WINDOW_MIN_DIAS, differenceInCalendarDays(now, parseISO(s.earliestIso)) + 1))
        : WINDOW_DIAS;

      // Estoque: vale o mais recente entre o sincronizado do catálogo e o que
      // o vendedor informou. O manual "gruda" até o próximo sync; se o sync
      // estiver errado, o vendedor digita de novo.
      const manualAt = settings?.stock_updated_at ? new Date(settings.stock_updated_at).getTime() : 0;
      const syncedAt = synced?.synced_at ? new Date(synced.synced_at).getTime() : 0;
      const temManual = manualAt > 0 && settings?.stock_units != null;
      const usaSync = !!synced && (!temManual || syncedAt >= manualAt);

      const stockUnits = usaSync ? (synced!.stock_units ?? 0) : (settings?.stock_units ?? 0);
      const stockSource: ReplenishmentSku['stockSource'] =
        usaSync ? 'sync' : temManual ? 'manual' : 'nenhum';
      const stockRefIso = usaSync ? synced!.synced_at : settings?.stock_updated_at;
      const inTransitUnits = transitByKey.get(key) ?? 0;

      // Ruptura: estoque + trânsito zerados hoje → os dias sem venda desde a
      // última venda foram falta de produto. Desconta da janela (com teto).
      const daysOutOfStock =
        stockUnits + inTransitUnits === 0 && s
          ? Math.min(STOCKOUT_TRIM_MAX_DIAS, Math.max(0, differenceInCalendarDays(now, parseISO(s.lastSaleIso))))
          : 0;

      // Custo pousado: product_costs → custo do pedido do marketplace → null.
      const cadastrado = costs[key];
      const mpCostUnit = s && s.mpCostUnits > 0 ? Math.round(s.mpCostCentsSum / s.mpCostUnits) : null;
      const landedCost = cadastrado ?? mpCostUnit;
      if (landedCost === null && (s?.units ?? 0) > 0) semCusto.add(key);

      // Receita líquida por unidade: taxa real do ML; tabela pra Shopee/TikTok.
      const netUnit = units > 0 ? Math.round((s?.netCents ?? 0) / units) : 0;
      const contributionMarginCents = landedCost === null ? null : netUnit - landedCost;

      skus.push({
        sku: (s?.sku || key).toUpperCase(),
        itemName: (settings?.item_name || s?.itemName || s?.sku || key) as string,
        unitsSold: units,
        windowDays: spanDias,
        daysOutOfStock,
        contributionMarginCents,
        purchaseUnitCostCents: landedCost,
        stockUnits,
        stockSource,
        stockUpdatedDaysAgo: stockRefIso
          ? Math.max(0, differenceInCalendarDays(now, parseISO(stockRefIso)))
          : 999,
        inTransitUnits,
        leadTimeDays: settings?.lead_time_days ?? LEAD_TIME_PADRAO,
        safetyDays: settings?.safety_days ?? SAFETY_DIAS_PADRAO,
        moqUnits: settings?.moq_units ?? null,
      });
    }

    // Caixa disponível: só quando a âncora de saldo foi confirmada — senão o
    // número da previsão é chute e não deve travar compra.
    const caixaConfiavel = forecast.openingIsConfirmed && !forecast.isLoading;
    const caixaCents = caixaConfiavel ? Math.max(0, forecast.result.saldoMinimo.saldoCents) : null;

    const plan = buildReplenishmentPlan(skus, {
      todayIso,
      reviewCycleDays: REVIEW_CYCLE_DIAS,
      stockStaleDays: STOCK_STALE_DIAS,
      minWindowDays: WINDOW_MIN_DIAS,
    }, caixaCents);

    const openPurchaseOrders: OpenPurchaseOrder[] = po
      .map(p => ({
        id: p.id,
        sku: p.sku,
        itemName: p.item_name,
        qtyUnits: Number(p.qty_units) || 0,
        unitCostCents: Math.round(Number(p.unit_cost_cents) || 0),
        orderedAt: p.ordered_at,
        expectedAt: p.expected_at,
      }))
      .sort((a, b) => (a.expectedAt ?? '9999').localeCompare(b.expectedAt ?? '9999'));

    const stockSyncAges = stock
      .map(r => (r.synced_at ? differenceInCalendarDays(now, parseISO(r.synced_at)) : null))
      .filter((n): n is number => n !== null);

    return {
      plan,
      caixaConfiavel,
      openPurchaseOrders,
      hasData: skus.length > 0,
      skusSemCusto: semCusto.size,
      syncedStockCount: stock.length,
      stockSyncDaysAgo: stockSyncAges.length ? Math.min(...stockSyncAges) : null,
    };
  }, [salesQuery.data, costsQuery.data, inventoryQuery.data, forecast.openingIsConfirmed, forecast.isLoading, forecast.result, now, todayIso]);

  return {
    ...composed,
    isLoading:
      salesQuery.isLoading || costsQuery.isLoading || inventoryQuery.isLoading || forecast.isLoading,
    windowDays: WINDOW_DIAS,
    saveInventory,
    importStock,
    addPurchaseOrder,
    receivePurchaseOrder,
  };
}
