import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { ConnectDialog } from '@/components/integrations/ConnectDialog';
import { IntegrationHealthPanel } from '@/components/integrations/IntegrationHealthPanel';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plug } from 'lucide-react';

export default function IntegrationsOverview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connections, logs, isLoading, getConnection, startAuth, manualAuth, syncNow } = useIntegrations();
  const [connectProvider, setConnectProvider] = useState<'shopee' | 'tiktok' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      toast({ title: `${connected === 'shopee' ? 'Shopee' : 'TikTok Shop'} conectado com sucesso!` });
      window.history.replaceState({}, '', '/integrations');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    }
    const error = searchParams.get('error');
    if (error) {
      toast({ title: 'Erro na conexão', description: error, variant: 'destructive' });
      window.history.replaceState({}, '', '/integrations');
    }
  }, [searchParams, toast, queryClient]);

  const shopee = getConnection('shopee');
  const tiktok = getConnection('tiktok');

  const allErrors = connections
    .filter(c => c.last_error_message)
    .map(c => `${c.provider}: ${c.last_error_message}`)
    .join('; ');

  return (
    <ProtectedRoute>
      <AppLayout title="Integrações">
        <div className="space-y-6 max-w">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Plug className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Integrações</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Conecte seus marketplaces para sincronização automática de pedidos, produtos, pagamentos e taxas.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <IntegrationCard
              provider="shopee"
              status={shopee?.status || 'disconnected'}
              shopName={shopee?.shop_name}
              shopId={shopee?.external_shop_id}
              lastSyncAt={shopee?.last_sync_at}
              nextSyncAt={shopee?.next_sync_at}
              onConnect={() => setConnectProvider('shopee')}
              onManage={() => navigate('/integrations/shopee')}
              isConnecting={startAuth.isPending}
            />
            <IntegrationCard
              provider="tiktok"
              status={tiktok?.status || 'disconnected'}
              shopName={tiktok?.shop_name}
              shopId={tiktok?.external_shop_id}
              lastSyncAt={tiktok?.last_sync_at}
              nextSyncAt={tiktok?.next_sync_at}
              onConnect={() => setConnectProvider('tiktok')}
              onManage={() => navigate('/integrations/tiktok')}
              isConnecting={startAuth.isPending}
            />
          </div>

          <IntegrationHealthPanel
            logs={logs}
            lastError={allErrors || null}
            onViewLogs={() => {
              const firstConnected = connections.find(c => c.status === 'connected');
              if (firstConnected) navigate(`/integrations/${firstConnected.provider}`);
            }}
          />
        </div>

        <ConnectDialog
          provider={connectProvider || 'shopee'}
          open={!!connectProvider}
          onOpenChange={(open) => !open && setConnectProvider(null)}
          onConfirm={async () => {
            if (connectProvider === 'shopee') {
              try {
                const response = await fetch(
                  "https://opzsrqdvotozawuqpapo.functions.supabase.co/shopee-auth",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider: "shopee" }),
                  }
                );
                const data = await response.json();
                if (data.authorization_url) {
                  window.location.href = data.authorization_url;
                } else {
                  toast({ title: "Erro ao conectar Shopee", variant: "destructive" });
                }
              } catch {
                toast({ title: "Erro ao conectar Shopee", variant: "destructive" });
              }
            } else if (connectProvider === 'tiktok') {
              startAuth.mutate(connectProvider);
            }
          }}
          onManualAuth={({ shopId, accessToken, refreshToken }) => {
            if (connectProvider) {
              manualAuth.mutate({ provider: connectProvider, shopId, accessToken, refreshToken }, {
                onSuccess: async () => {
                  setConnectProvider(null);
                  toast({ title: 'Conectado! Iniciando sincronização...' });
                  setIsSyncing(true);

                  // ✅ Refresca os dados via queryClient em vez de axios
                  await queryClient.invalidateQueries({ queryKey: ['integrations'] });
                  
                  setTimeout(() => {
                    const conn = connections.find(
                      c => c.provider === connectProvider && c.status === 'connected'
                    );
                    if (conn) {
                      syncNow.mutate(conn.id, {
                        onSettled: () => setIsSyncing(false),
                      });
                    } else {
                      setIsSyncing(false);
                    }
                  }, 1500);
                },
              });
            }
          }}
          isLoading={startAuth.isPending}
          isManualLoading={manualAuth.isPending}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}