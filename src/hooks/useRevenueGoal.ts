import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cents } from '@/lib/money';

// Meta de faturamento do mês — item 8 das diretrizes. Um valor por usuário,
// persistido em cash_flow_settings.monthly_revenue_goal_cents (mesma tabela da
// âncora de saldo da Previsão de caixa). Bloco D vai ampliar isto pra
// empresa/loja; por ora é global do usuário.
export function useRevenueGoal() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['revenue-goal', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Cents | null> => {
      const { data, error } = await supabase
        .from('cash_flow_settings')
        .select('monthly_revenue_goal_cents')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      const raw = data?.monthly_revenue_goal_cents;
      return raw != null ? (Number(raw) as Cents) : null;
    },
  });

  const save = useMutation({
    mutationFn: async (goalCents: Cents | null) => {
      const { error } = await supabase
        .from('cash_flow_settings')
        .upsert(
          { user_id: user!.id, monthly_revenue_goal_cents: goalCents },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revenue-goal', user?.id] }),
  });

  return {
    goalCents: query.data ?? null,
    isLoading: query.isLoading,
    save,
  };
}
