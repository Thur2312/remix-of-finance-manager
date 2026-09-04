import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cents } from '@/lib/money';

// Meta de faturamento do mês — item 8 das diretrizes, ampliado no Bloco D pra
// separar por empresa (CNPJ):
//   - companyId setado  → meta daquela empresa (companies.monthly_revenue_goal_cents)
//   - companyId null    → meta CONSOLIDADA da operação
//                         (cash_flow_settings.monthly_revenue_goal_cents, user-scoped)
//
// A tela /meta escolhe o escopo pelo seletor de empresa (mesmo store global do
// topbar/DRE). Passar `undefined` = consolidado, igual a `null`.
export function useRevenueGoal(companyId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const scope = companyId ?? null;

  const query = useQuery({
    queryKey: ['revenue-goal', user?.id, scope],
    enabled: !!user?.id,
    queryFn: async (): Promise<Cents | null> => {
      if (scope) {
        const { data, error } = await supabase
          .from('companies')
          .select('monthly_revenue_goal_cents')
          .eq('id', scope)
          .maybeSingle();
        if (error) throw error;
        const raw = data?.monthly_revenue_goal_cents;
        return raw != null ? (Number(raw) as Cents) : null;
      }
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
      if (scope) {
        const { error } = await supabase
          .from('companies')
          .update({ monthly_revenue_goal_cents: goalCents })
          .eq('id', scope);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('cash_flow_settings')
        .upsert(
          { user_id: user!.id, monthly_revenue_goal_cents: goalCents },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    // prefixo → invalida todos os escopos (consolidado + cada empresa)
    onSuccess: () => qc.invalidateQueries({ queryKey: ['revenue-goal', user?.id] }),
  });

  return {
    goalCents: query.data ?? null,
    isLoading: query.isLoading,
    save,
  };
}
