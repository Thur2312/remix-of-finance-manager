import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IntegrationConnection {
  id: string;
  provider: string;
  status: string;
  external_shop_id: string | null;
  shop_name: string | null;
  scopes: string | null;
  token_expires_at: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  auto_sync_enabled: boolean;
  auto_sync_frequency_minutes: number;
  last_error_code: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  connection_id: string;
  user_id: string;
  type: string;
  status: string;
  message: string | null;
  metadata: Record<string, string> | null;
  created_at: string;
}

export function useIntegrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('integration-list');
      if (error) throw error;
      return data as { connections: IntegrationConnection[]; logs: SyncLog[] };
    },
  });

 const getConnection = useCallback((provider: string) => {
  return data?.connections?.find(c => c.provider === provider && c.status === 'connected') 
    || data?.connections?.find(c => c.provider === provider) 
    || null;
}, [data]);

  const getLogsForConnection = useCallback((connectionId: string) => {
    return data?.logs?.filter(l => l.connection_id === connectionId) || [];
  }, [data]);

  const startAuth = useMutation({
    mutationFn: async (provider: string) => {
      const { data, error } = await supabase.functions.invoke('integration-auth-start', {
        body: { provider },
      });
      if (error) throw error;
      return data as { authorization_url: string };
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Erro ao iniciar conexão', description: err.message, variant: 'destructive' });
    },
  });

  const syncNow = useMutation({
    mutationFn: async ({ connectionId, days }: { connectionId: string; days?: number }) => {
    const daysToSync = days || 15
    const windowSize = 1
    const windows = Math.ceil(daysToSync / windowSize)

    // Etapa 1: Orders — janelas em paralelo (grupos de 3 para não sobrecarregar)
    const orderWindows = Array.from({ length: windows }, (_, i) => {
      const timeTo = new Date()
      timeTo.setDate(timeTo.getDate() - i * windowSize)
      const timeFrom = new Date()
      timeFrom.setDate(timeFrom.getDate() - (i + 1) * windowSize)
      return { timeTo, timeFrom }
    })

    const chunkSize = 5
    for (let i = 0; i < windows; i++) {
  const timeTo = new Date()
  timeTo.setDate(timeTo.getDate() - i * windowSize)
  const timeFrom = new Date()
  timeFrom.setDate(timeFrom.getDate() - (i + 1) * windowSize)

  console.log(`🔄 Chamando janela ${i + 1}/${windows}: ${timeFrom.toISOString()} → ${timeTo.toISOString()}`)

  const { data, error } = await supabase.functions.invoke('integration-sync', {
    body: {
      connection_id: connectionId,
      time_from: timeFrom.toISOString(),
      time_to: timeTo.toISOString(),
      step: 'orders',
    },
  })

  console.log(`✅ Janela ${i + 1} resultado:`, data, 'erro:', error)

  if (error) throw error
}

    // Etapa 2: Payments — período completo
    const { error: paymentsError } = await supabase.functions.invoke('integration-sync', {
      body: {
        connection_id: connectionId,
        days: daysToSync,
        step: 'payments',
      },
    })
    if (paymentsError) throw paymentsError

    // Etapa 3: Wallet — período completo
    const { data: walletData, error: walletError } = await supabase.functions.invoke('integration-sync', {
      body: {
        connection_id: connectionId,
        days: daysToSync,
        step: 'wallet',
      },
    })
    if (walletError) throw walletError

    return walletData
  },
    onSuccess: (data) => {
      toast({ title: 'Sincronização concluída', description: data?.message });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['shopee-sync'] });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' });
    },
  });

  const disconnect = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke('integration-disconnect', {
        body: { connection_id: connectionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Integração desconectada' });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Erro ao desconectar', description: err.message, variant: 'destructive' });
    },
  });

  const manualAuth = useMutation({
    mutationFn: async ({ provider, shopId, accessToken, refreshToken }: { provider: string; shopId: string; accessToken: string; refreshToken?: string }) => {
      const { data, error } = await supabase.functions.invoke('integration-manual-auth', {
        body: { provider, shop_id: shopId, access_token: accessToken, refresh_token: refreshToken || null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: data.message || 'Integração conectada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err: { message: string }) => {
      toast({ title: 'Erro na autorização manual', description: err.message, variant: 'destructive' });
    },
  });

  const updateSyncSettings = useMutation({
    mutationFn: async ({ connectionId, autoSync, frequency }: { connectionId: string; autoSync?: boolean; frequency?: number }) => {
      const { error } = await supabase.functions.invoke('integration-update-settings', {
        body: { connection_id: connectionId, auto_sync_enabled: autoSync, auto_sync_frequency_minutes: frequency },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  return {
    connections: data?.connections || [],
    logs: data?.logs || [],
    isLoading,
    error,
    getConnection,
    getLogsForConnection,
    startAuth,
    manualAuth,
    syncNow,
    disconnect,
    updateSyncSettings,
  };
}