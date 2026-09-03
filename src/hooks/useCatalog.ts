import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isExcludedOrderStatus } from '@/lib/marketplace-order-status';
import { skuKey } from '@/lib/sku';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import {
  buildCatalog, rankTopProdutos,
  type CatalogRow, type TopProdutoCriterio,
} from '@/lib/catalog';

// Compõe o catálogo de produtos (Bloco C). Junta as vendas dos 3 marketplaces
// com custo/estoque/precificação cadastrados e delega o merge à lib pura
// src/lib/catalog.ts. As mutações escrevem nas tabelas que já existem
// (product_costs, inventory_settings) e numa nova de metadados (product_catalog),
// e invalidam também a Reposição de estoque — as duas telas leem inventory_settings.

export interface SaveCostInput {
  skuRaw: string;
  itemName?: string | null;
  /** custo do produto, R$ */
  cost: number;
  packagingCost?: number;
  otherCosts?: number;
}
export interface SaveStockInput {
  skuRaw: string;
  itemName?: string | null;
  stockUnits: number;
}
export interface SaveMetaInput {
  skuKey: string;
  displayName?: string | null;
  archived?: boolean;
}

export interface UseCatalog {
  rows: CatalogRow[];
  topProdutos: (by: TopProdutoCriterio, limit?: number) => CatalogRow[];
  isLoading: boolean;
  windowDays: number;
  /** há venda sincronizada de algum marketplace? */
  hasData: boolean;
  /** SKUs sem custo cadastrado (lucro fica estimado/oculto) */
  skusSemCusto: number;
  saveCost: ReturnType<typeof useMutation<void, Error, SaveCostInput>>;
  saveStock: ReturnType<typeof useMutation<void, Error, SaveStockInput>>;
  saveMeta: ReturnType<typeof useMutation<void, Error, SaveMetaInput>>;
}

export function useCatalog(windowDays = 60): UseCatalog {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { activeConnection } = useActiveShopeeConnection();
  const shopeeConnected = activeConnection?.status === 'connected';
  const shopee = useShopeeSync(shopeeConnected ? activeConnection!.id : null, windowDays);

  const startIso = useMemo(
    () => format(subDays(new Date(), windowDays), 'yyyy-MM-dd'),
    [windowDays],
  );

  const salesQuery = useQuery({
    queryKey: ['catalog-sales', user?.id, windowDays],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [mlRes, tiktokRes] = await Promise.all([
        supabase
          .from('ml_orders')
          .select('sku, nome_produto, quantidade, total_faturado, taxa_ml, frete_ml, custo_unitario, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', startIso),
        supabase
          .from('tiktok_orders')
          .select('sku, nome_produto, quantidade, total_faturado, custo_unitario, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', startIso),
      ]);
      if (mlRes.error) throw mlRes.error;
      if (tiktokRes.error) throw tiktokRes.error;
      return { ml: mlRes.data ?? [], tiktok: tiktokRes.data ?? [] };
    },
  });

  const configQuery = useQuery({
    queryKey: ['catalog-config', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [costsRes, stockRes, invRes, metaRes, anunciosRes] = await Promise.all([
        supabase
          .from('product_costs')
          .select('id, sku, item_name, cost, packaging_cost, other_costs, effective_from')
          .eq('user_id', user!.id)
          .order('effective_from', { ascending: false }),
        supabase
          .from('product_stock')
          .select('sku, stock_units, source')
          .eq('user_id', user!.id),
        supabase
          .from('inventory_settings')
          .select('sku, stock_units, active')
          .eq('user_id', user!.id),
        supabase
          .from('product_catalog')
          .select('sku_key, display_name, archived, alias_of')
          .eq('user_id', user!.id),
        supabase
          .from('anuncios')
          .select('sku, valor_venda, custo')
          .not('sku', 'is', null),
      ]);
      if (costsRes.error) throw costsRes.error;
      if (stockRes.error) throw stockRes.error;
      if (invRes.error) throw invRes.error;
      if (metaRes.error) throw metaRes.error;
      if (anunciosRes.error) throw anunciosRes.error;
      return {
        costs: costsRes.data ?? [],
        stock: stockRes.data ?? [],
        inv: invRes.data ?? [],
        meta: metaRes.data ?? [],
        anuncios: anunciosRes.data ?? [],
      };
    },
  });

  const rows = useMemo<CatalogRow[]>(() => {
    if (!salesQuery.data || !configQuery.data) return [];
    const cfg = configQuery.data;
    return buildCatalog({
      shopeeOrders: shopee.data?.orders ?? [],
      shopeePayments: shopee.data?.payments ?? [],
      mlOrders: salesQuery.data.ml,
      tiktokOrders: salesQuery.data.tiktok,
      costs: cfg.costs.map(c => ({
        sku: c.sku,
        custoTotal: (Number(c.cost) || 0) + (Number(c.packaging_cost) || 0) + (Number(c.other_costs) || 0),
      })),
      stock: cfg.stock.map(s => ({ sku: s.sku, stockUnits: Number(s.stock_units) || 0, source: s.source })),
      inventoryOverrides: cfg.inv.map(i => ({
        sku: i.sku, stockUnits: Number(i.stock_units) || 0, active: i.active,
      })),
      anuncios: cfg.anuncios.map(a => ({
        sku: a.sku, valorVenda: Number(a.valor_venda) || 0, custo: Number(a.custo) || 0,
      })),
      meta: cfg.meta.map(m => ({
        skuKey: m.sku_key, displayName: m.display_name, archived: m.archived, aliasOf: m.alias_of,
      })),
      windowDays,
      isExcludedStatus: isExcludedOrderStatus,
    });
  }, [salesQuery.data, configQuery.data, shopee.data, windowDays]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog-config', user?.id] });
    // a Reposição de estoque lê as mesmas tabelas
    queryClient.invalidateQueries({ queryKey: ['replenishment-inventory', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['replenishment-costs', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['product-costs', user?.id] });
  };
  const fail = (msg: string) => () => toast({ title: 'Erro', description: msg, variant: 'destructive' });

  const saveCost = useMutation<void, Error, SaveCostInput>({
    mutationFn: async (i) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const kNorm = skuKey(i.skuRaw);
      // atualiza a linha de hoje se existir; senão cria uma nova (mantém histórico)
      const existing = (configQuery.data?.costs ?? []).find(
        c => skuKey(c.sku) === kNorm && String(c.effective_from).slice(0, 10) === today,
      );
      const payload = {
        cost: Math.max(0, i.cost),
        packaging_cost: Math.max(0, i.packagingCost ?? 0),
        other_costs: Math.max(0, i.otherCosts ?? 0),
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabase.from('product_costs').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('product_costs').insert({
          user_id: user!.id,
          sku: i.skuRaw.trim(),
          item_name: i.itemName ?? null,
          effective_from: today,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: fail('Não foi possível salvar o custo.'),
  });

  const saveStock = useMutation<void, Error, SaveStockInput>({
    mutationFn: async (i) => {
      const { error } = await supabase.from('inventory_settings').upsert({
        user_id: user!.id,
        sku: i.skuRaw.trim(),
        item_name: i.itemName ?? null,
        stock_units: Math.max(0, Math.round(i.stockUnits)),
        stock_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sku' });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail('Não foi possível salvar o estoque.'),
  });

  const saveMeta = useMutation<void, Error, SaveMetaInput>({
    mutationFn: async (i) => {
      // merge sobre a linha atual — não zerar o campo que não veio no input
      const prev = (configQuery.data?.meta ?? []).find(m => m.sku_key === i.skuKey);
      const { error } = await supabase.from('product_catalog').upsert({
        user_id: user!.id,
        sku_key: i.skuKey,
        display_name: i.displayName !== undefined ? i.displayName : (prev?.display_name ?? null),
        archived: i.archived !== undefined ? i.archived : (prev?.archived ?? false),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,sku_key' });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail('Não foi possível salvar.'),
  });

  const skusSemCusto = useMemo(
    () => rows.filter(r => r.temSku && !r.archived && r.custoOrigem !== 'cadastrado').length,
    [rows],
  );

  return {
    rows,
    topProdutos: (by, limit) => rankTopProdutos(rows, { by, limit }),
    isLoading: salesQuery.isLoading || configQuery.isLoading || (shopeeConnected && shopee.isLoading),
    windowDays,
    hasData: rows.length > 0,
    skusSemCusto,
    saveCost,
    saveStock,
    saveMeta,
  };
}
