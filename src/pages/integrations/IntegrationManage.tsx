import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IntegrationLogsTable } from '@/components/integrations/IntegrationLogsTable';
import { DisconnectDialog } from '@/components/integrations/DisconnectDialog';
import { useIntegrations } from '@/hooks/useIntegrations';
import { RefreshCw, ArrowLeft, ShoppingBag, Store, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExportDataSection } from '../../components/integrations/ExportDataSection';

const providerNames: Record<string, string> = { shopee: 'Shopee', tiktok: 'TikTok Shop' };
const providerIcons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: string | number }>> = { shopee: ShoppingBag, tiktok: Store };
const statusLabels: Record<string, string> = { disconnected: 'Desconectado', connecting: 'Conectando', connected: 'Conectado', error: 'Erro', expired: 'Expirado' };
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { disconnected: 'secondary', connecting: 'outline', connected: 'default', error: 'destructive', expired: 'destructive' };

export default function IntegrationManage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const { getConnection, getLogsForConnection, syncNow, disconnect, updateSyncSettings } = useIntegrations();

  const connection = getConnection(provider || '');
  const logs = connection ? getLogsForConnection(connection.id) : [];
  const Icon = providerIcons[provider || ''] || Store;
  const name = providerNames[provider || ''] || provider;

  if (!connection || connection.status === 'disconnected') {
    return (
      <ProtectedRoute>
        <AppLayout title={`Gerenciar ${name}`}>
          <div className="space-y-4 max-w-4xl">
            <Button variant="ghost" onClick={() => navigate('/integrations')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma conexão ativa para {name}.</p>
                <Button className="mt-4" onClick={() => navigate('/integrations')}>Ir para Integrações</Button>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout title={`Gerenciar ${name}`}>
        <div className="space-y-6 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          {/* Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <Badge variant={statusVariants[connection.status]} className="mt-1">
                      {statusLabels[connection.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm">
                {connection.shop_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loja</span>
                    <span className="font-medium">{connection.shop_name}</span>
                  </div>
                )}
                {connection.external_shop_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shop ID</span>
                    <span className="font-mono text-xs">{connection.external_shop_id}</span>
                  </div>
                )}
                {connection.last_sync_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Última sync
                    </span>
                    <span>{format(new Date(connection.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                {connection.next_sync_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Próxima sync
                    </span>
                    <span>{format(new Date(connection.next_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
              </div>

              {/* ✅ Mensagem de erro */}
              {connection.last_error_message && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Erro na última sincronização</p>
                    <p className="text-xs mt-0.5">{connection.last_error_message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sincronização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => syncNow.mutate(connection.id)} disabled={syncNow.isPending}>
                {syncNow.isPending
                  ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sincronizando...</>
                  : <><RefreshCw className="mr-2 h-4 w-4" /> Sincronizar agora</>
                }
              </Button>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sincronização automática</span>
                <Switch
                  checked={connection.auto_sync_enabled}
                  onCheckedChange={(checked) => updateSyncSettings.mutate({ connectionId: connection.id, autoSync: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Frequência</span>
                <Select
                  value={String(connection.auto_sync_frequency_minutes)}
                  onValueChange={(v) => updateSyncSettings.mutate({ connectionId: connection.id, frequency: parseInt(v) })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="360">6 horas</SelectItem>
                    <SelectItem value="1440">24 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <IntegrationLogsTable logs={logs} />
            </CardContent>
          </Card>

          {/* ✅ Exportar Dados — adiciona aqui */}
          <ExportDataSection
            connectionId={connection.id}
            providerName={name}
          />

          {/* Disconnect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zona de perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <DisconnectDialog
                providerName={name}
                onConfirm={() => {
                  disconnect.mutate(connection.id);
                  navigate('/integrations');
                }}
                isLoading={disconnect.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}