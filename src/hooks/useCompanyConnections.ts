import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanies, type Company } from './useCompanies';
import type { ScopedConnection } from '@/lib/company-scope';

// Bloco D — junta as conexões de marketplace (as "lojas") com as empresas.
// A conexão é dona da coluna company_id; a atribuição é uma UPDATE simples
// (RLS `for all using auth.uid() = user_id` permite ao dono).

const PROVIDER_LABEL: Record<string, string> = {
  shopee: 'Shopee', mercadolivre: 'Mercado Livre', tiktok: 'TikTok Shop',
};

export interface StoreConnection extends ScopedConnection {
  provider: string;
  status: string;
  shopName: string | null;
}

export function useCompanyConnections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companies } = useCompanies();

  const query = useQuery({
    queryKey: ['company-connections', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_connections')
        .select('id, provider, status, external_shop_id, shop_name, company_id')
        .eq('user_id', user!.id)
        .order('provider');
      if (error) throw error;
      return data ?? [];
    },
  });

  const connections = useMemo<StoreConnection[]>(
    () => (query.data ?? []).map(c => ({
      id: c.id,
      provider: c.provider,
      marketplace: c.provider,
      status: c.status,
      companyId: c.company_id,
      shopName: c.shop_name,
      label: c.shop_name || c.external_shop_id || PROVIDER_LABEL[c.provider] || c.provider,
    })),
    [query.data],
  );

  const assignCompany = useMutation<void, Error, { connectionId: string; companyId: string | null }>({
    mutationFn: async ({ connectionId, companyId }) => {
      const { error } = await supabase
        .from('integration_connections')
        .update({ company_id: companyId })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-connections', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['integrations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['revenue-by-company', user?.id] });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível atribuir a empresa.', variant: 'destructive' }),
  });

  const companyById = useMemo(
    () => new Map(companies.map(c => [c.id, c] as const)),
    [companies],
  );
  const companyForConnection = (connId: string): Company | null => {
    const cid = connections.find(c => c.id === connId)?.companyId;
    return cid ? companyById.get(cid) ?? null : null;
  };

  return {
    connections,
    companies,
    isLoading: query.isLoading,
    hasUnassigned: connections.some(c => !c.companyId && c.status === 'connected'),
    assignCompany,
    companyForConnection,
  };
}
