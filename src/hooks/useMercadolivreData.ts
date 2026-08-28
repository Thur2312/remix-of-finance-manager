import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Cents } from '@/lib/money';

export interface MlOrder {
  user_id: string;
  order_id: string;
  sku: string | null;
  nome_produto: string | null;
  variacao: string | null;
  quantidade: number;
  total_faturado: number;
  total_faturado_cents?: number | null;
  desconto_plataforma: number;
  desconto_plataforma_cents?: number | null;
  desconto_vendedor: number;
  desconto_vendedor_cents?: number | null;
  custo_unitario: number;
  custo_unitario_cents?: number | null;
  taxa_ml: number;
  taxa_ml_cents?: number | null;
  frete_ml: number;
  frete_ml_cents?: number | null;
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

  // Equivalentes em centavos (Fase 4, aditivo). Só existem quando hasData —
  // nos dois retornos "vazios" acima ficam undefined, igual aos demais campos
  // que já eram 0 antes (nada de novo pra inicializar ali).
  grossRevenueCents?: Cents;
  netRevenueCents?: Cents;
  feesCents?: Cents;
  profitCents?: Cents;
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
        const { data, error: err } = await supabase
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

    // status_pedido vem direto de order.status da API do ML — valores reais são
    // confirmed/payment_required/payment_in_process/paid/partially_paid/
    // cancelled/invalid. 'delivered' e 'payment_done' nunca existiram nessa
    // API; só 'paid' batia de fato (comportamento não muda, só remove o morto).
    const paidOrders = orders.filter(o => o.status_pedido === 'paid');

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

    // Sem multiplicação por percentual em nenhum lugar aqui (taxa_ml/frete_ml
    // já vêm em R$ absoluto) — soma pura de inteiros, sempre exata, sem risco
    // de arredondamento em cascata divergir do float.
    const grossRevenueCents = paidOrders.reduce((acc, o) => acc + Number(o.total_faturado_cents ?? 0), 0);
    const feesCents = paidOrders.reduce(
      (acc, o) => acc + Number(o.taxa_ml_cents ?? 0) + Number(o.frete_ml_cents ?? 0),
      0
    );
    const descontosCents = paidOrders.reduce(
      (acc, o) => acc + Number(o.desconto_plataforma_cents ?? 0) + Number(o.desconto_vendedor_cents ?? 0),
      0
    );
    const custosCents = paidOrders.reduce(
      (acc, o) => acc + Number(o.custo_unitario_cents ?? 0) * (o.quantidade ?? 1),
      0
    );
    const netRevenueCents = grossRevenueCents - feesCents - descontosCents;
    const profitCents = netRevenueCents - custosCents;

    return {
      totalOrders: paidOrders.length,
      grossRevenue,
      netRevenue,
      fees,
      profit,
      isLoading: false,
      hasData: true,
      grossRevenueCents: grossRevenueCents as Cents,
      netRevenueCents: netRevenueCents as Cents,
      feesCents: feesCents as Cents,
      profitCents: profitCents as Cents,
    };
  }, [orders, loading]);

  return { orders, stats, loading, error };
}