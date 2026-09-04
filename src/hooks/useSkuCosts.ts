import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildSkuCostOptions, type SkuCostOption } from '@/lib/sku-cost-lookup';

// SKUs com custo cadastrado (product_costs) — alimenta o seletor de SKU da
// Calculadora de Precificação. Leve de propósito: só a tabela product_costs,
// sem tocar em sync de marketplace (diferente de useCatalog).
export function useSkuCosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sku-costs', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SkuCostOption[]> => {
      const { data, error } = await supabase
        .from('product_costs')
        .select('sku, item_name, cost, packaging_cost, other_costs, tax_percent')
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return buildSkuCostOptions(data ?? []);
    },
  });
}
