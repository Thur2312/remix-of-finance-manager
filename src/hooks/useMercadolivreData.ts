import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

// Cast tipado para tabelas fora do schema gerado (igual ao useCompanies.ts)
const db = supabase as unknown as SupabaseClient;

export interface MlOrder {
  user_id: string;
  order_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao: string | null;
  quantidade: number;
  total_faturado: number;
  desconto_plataforma: number;
  desconto_vendedor: number;
  custo_unitario: number;
  taxa_ml: number;
  frete_ml: number;
  status_pedido: string;
  data_pedido: string;
  updated_at: string;
}

export interface MlStats {
  totalOrders: number;
  grossRevenue: number;
  netRevenue: number;
  fees: number;
  profit: number;
  isLoading: boolean;
  hasData: boolean;
}

export function useMercadolivreData() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<MlOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await db
          .from('ml_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('data_pedido', { ascending: false });

        if (err) throw err;
        setOrders((data ?? []) as MlOrder[]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar pedidos do Mercado Livre');
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  const stats: MlStats = useMemo(() => {
    if (loading) {
      return {
        totalOrders: 0,
        grossRevenue: 0,
        netRevenue: 0,
        fees: 0,
        profit: 0,
        isLoading: true,
        hasData: false,
      };
    }

    const paidOrders = orders.filter(o =>
      ['paid', 'delivered', 'payment_done'].includes(o.status_pedido)
    );

    if (paidOrders.length === 0) {
      return {
        totalOrders: 0,
        grossRevenue: 0,
        netRevenue: 0,
        fees: 0,
        profit: 0,
        isLoading: false,
        hasData: false,
      };
    }

    const grossRevenue = paidOrders.reduce((acc, o) => acc + (o.total_faturado ?? 0), 0);
    const fees = paidOrders.reduce((acc, o) => acc + (o.taxa_ml ?? 0) + (o.frete_ml ?? 0), 0);
    const descontos = paidOrders.reduce(
      (acc, o) => acc + (o.desconto_plataforma ?? 0) + (o.desconto_vendedor ?? 0),
      0
    );
    const custos = paidOrders.reduce(
      (acc, o) => acc + (o.custo_unitario ?? 0) * (o.quantidade ?? 1),
      0
    );
    const netRevenue = grossRevenue - fees - descontos;
    const profit = netRevenue - custos;

    return {
      totalOrders: paidOrders.length,
      grossRevenue,
      netRevenue,
      fees,
      profit,
      isLoading: false,
      hasData: true,
    };
  }, [orders, loading]);

  return { orders, stats, loading, error };
}