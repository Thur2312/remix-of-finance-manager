import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProductCost {
  id: string;
  external_item_id: string | null;
  sku: string | null;
  item_name: string | null;
  cost: number;
  packaging_cost: number;
  other_costs: number;
  tax_percent: number;
}

export function useProductCosts() {
  const { user } = useAuth();

  return useQuery({
    // A key sem user.id fazia o cache (persistido em localStorage por até 24h)
    // vazar entre contas diferentes no mesmo navegador após um logout/login.
    queryKey: ['product-costs', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_costs')
        .select('id, external_item_id, sku, item_name, cost, packaging_cost, other_costs, tax_percent');
      if (error) throw error;
      return (data || []) as unknown as ProductCost[];
    },
  });
}