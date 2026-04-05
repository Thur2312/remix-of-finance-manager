import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['product-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_costs')
        .select('id, external_item_id, sku, item_name, cost, packaging_cost, other_costs, tax_percent');
      if (error) throw error;
      return (data || []) as unknown as ProductCost[];
    },
  });
}