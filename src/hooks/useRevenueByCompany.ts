import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isShopeeCompletedStatus } from '@/lib/shopee-sync-status';
import { isExcludedOrderStatus } from '@/lib/marketplace-order-status';

// Bloco D — Σ faturamento por empresa (CNPJ) no período. Enxuto: só o que o
// rateio de custo fixo (cost-allocation.ts) precisa, sem tocar no useDREData.
//
// Atribuição:
//   Shopee  → orders.integration_id → integration_connections.company_id
//   ML/TikTok → a conexão única do provider (ml_orders/tiktok_orders não têm
//               integration_id; hoje é 1 conexão por provider). Se um dia
//               houver 2, isto fica errado — ver plano, Fase 2.

export interface RevenueByCompany {
  /** company_id → faturamento em centavos */
  byCompanyCents: Record<string, number>;
  /** faturamento de conexões sem empresa atribuída */
  naoAtribuidoCents: number;
  isLoading: boolean;
}

export function useRevenueByCompany(windowDays = 30): RevenueByCompany {
  const { user } = useAuth();
  const startIso = useMemo(
    () => format(subDays(new Date(), windowDays), 'yyyy-MM-dd'),
    [windowDays],
  );

  const query = useQuery({
    queryKey: ['revenue-by-company', user?.id, windowDays],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [connRes, mlRes, tiktokRes] = await Promise.all([
        supabase
          .from('integration_connections')
          .select('id, provider, company_id')
          .eq('user_id', user!.id),
        supabase
          .from('ml_orders')
          .select('total_faturado_cents, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', startIso),
        supabase
          .from('tiktok_orders')
          .select('total_faturado_cents, status_pedido, data_pedido')
          .eq('user_id', user!.id)
          .gte('data_pedido', startIso),
      ]);
      if (connRes.error) throw connRes.error;
      if (mlRes.error) throw mlRes.error;
      if (tiktokRes.error) throw tiktokRes.error;

      const conns = connRes.data ?? [];
      const companyByConn = new Map(conns.map(c => [c.id, c.company_id]));
      const companyByProvider = (p: string) => conns.find(c => c.provider === p)?.company_id ?? null;
      const shopeeConnIds = conns.filter(c => c.provider === 'shopee').map(c => c.id);

      // Shopee: pedidos concluídos na janela, por conexão
      let shopeeOrders: { total_amount_cents: number; status: string; integration_id: string }[] = [];
      if (shopeeConnIds.length) {
        const { data, error } = await supabase
          .from('orders')
          .select('total_amount_cents, status, integration_id')
          .in('integration_id', shopeeConnIds)
          .gte('order_updated_at', startIso);
        if (error) throw error;
        shopeeOrders = (data ?? []) as typeof shopeeOrders;
      }

      const byCompanyCents: Record<string, number> = {};
      let naoAtribuidoCents = 0;
      const add = (companyId: string | null | undefined, cents: number) => {
        if (cents <= 0) return;
        if (companyId) byCompanyCents[companyId] = (byCompanyCents[companyId] ?? 0) + cents;
        else naoAtribuidoCents += cents;
      };

      for (const o of shopeeOrders) {
        if (!isShopeeCompletedStatus(o.status)) continue;
        add(companyByConn.get(o.integration_id), Math.round(Number(o.total_amount_cents) || 0));
      }
      const mlCompany = companyByProvider('mercadolivre');
      for (const o of mlRes.data ?? []) {
        if (isExcludedOrderStatus(o.status_pedido)) continue;
        add(mlCompany, Math.round(Number(o.total_faturado_cents) || 0));
      }
      const tiktokCompany = companyByProvider('tiktok');
      for (const o of tiktokRes.data ?? []) {
        if (isExcludedOrderStatus(o.status_pedido)) continue;
        add(tiktokCompany, Math.round(Number(o.total_faturado_cents) || 0));
      }

      return { byCompanyCents, naoAtribuidoCents };
    },
  });

  return {
    byCompanyCents: query.data?.byCompanyCents ?? {},
    naoAtribuidoCents: query.data?.naoAtribuidoCents ?? 0,
    isLoading: query.isLoading,
  };
}
