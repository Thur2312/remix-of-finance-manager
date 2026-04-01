import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IntegrationLogsTable } from '@/components/integrations/IntegrationLogsTable';
import { DisconnectDialog } from '@/components/integrations/DisconnectDialog';
import { ExportDataSection } from '../../components/integrations/ExportDataSection';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { formatCurrency } from '@/lib/calculations';
import {
  RefreshCw, ArrowLeft, ShoppingBag, Store, AlertCircle,
  Clock, Zap, TrendingUp, DollarSign, ShoppingCart, Package,
  CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const providerNames: Record<string, string> = { shopee: 'Shopee', tiktok: 'TikTok Shop' };
const providerIcons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: string | number }>> = {
  shopee: ShoppingBag, tiktok: Store,
};
const statusLabels: Record<string, string> = {
  disconnected: 'Desconectado', connecting: 'Conectando',
  connected: 'Conectado', error: 'Erro', expired: 'Expirado',
};
const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  disconnected: 'secondary', connecting: 'outline',
  connected: 'default', error: 'destructive', expired: 'destructive',
};

const COMPLETED_STATUSES = ['COMPLETED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'READY_TO_SHIP'];
const CANCELLED_STATUSES = ['CANCELLED', 'UNPAID', 'TO_RETURN'];

export default function IntegrationManage() {
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const { getConnection, getLogsForConnection, syncNow, disconnect, updateSyncSettings } = useIntegrations();
  const [syncPeriod, setSyncPeriod] = useState<'7' | '15' | '30' | '60'>('15');

  const connection = getConnection(provider || '');
  const logs = connection ? getLogsForConnection(connection.id) : [];
  const Icon = providerIcons[provider || ''] || Store;
  const name = providerNames[provider || ''] || provider;

  const { data: syncData, isLoading: syncLoading } = useShopeeSync(
    connection?.status === 'connected' ? connection.id : null,
    Number(syncPeriod)
  );

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

  const orders = syncData?.orders ?? [];
  const fees = syncData?.fees ?? [];
  const payments = syncData?.payments ?? [];

  const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status));
  const cancelledOrders = orders.filter(o => CANCELLED_STATUSES.includes(o.status));
  const pendingOrders = orders.filter(o => !COMPLETED_STATUSES.includes(o.status) && !CANCELLED_STATUSES.includes(o.status));

  const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalFees = fees
    .filter(f => ['commission', 'service_fee', 'shipping_fee'].includes(f.fee_type))
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const totalNet = payments
    .filter(p => p.payment_method === 'escrow')
    .reduce((sum, p) => sum + Number(p.net_amount), 0);

  // Gráfico dos últimos 7 dias
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().substring(0, 10);
    const label = format(date, 'dd/MM', { locale: ptBR });
    const vendas = completedOrders
      .filter(o => o.order_created_at?.startsWith(dateStr))
      .reduce((sum, o) => sum + Number(o.total_amount), 0);
    const liquido = payments
      .filter(p => p.payment_method === 'escrow' && p.transaction_date?.startsWith(dateStr))
      .reduce((sum, p) => sum + Number(p.net_amount), 0);
    return { date: label, vendas, liquido };
  });

  return (
    <ProtectedRoute>
      <AppLayout title={`Gerenciar ${name}`}>
        <div className="space-y-6 max-w-4xl">

          {/* ── Voltar ── */}
          <Button variant="ghost" onClick={() => navigate('/integrations')} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          {/* ── Header da loja ── */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Zap className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">{name}</h2>
                      <Badge variant={statusVariants[connection.status]}>
                        {statusLabels[connection.status]}
                      </Badge>
                    </div>
                    {connection.shop_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">{connection.shop_name}</p>
                    )}
                    {connection.external_shop_id && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {connection.external_shop_id}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground text-right">
                  {connection.last_sync_at && (
                    <span className="flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      Última sync: {format(new Date(connection.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                  {connection.next_sync_at && (
                    <span className="flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      Próxima sync: {format(new Date(connection.next_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>

              {connection.last_error_message && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3 mt-4">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Erro na última sincronização</p>
                    <p className="text-xs mt-0.5">{connection.last_error_message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Stats ── */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-semibold">Resumo — últimos {syncPeriod} dias</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Período:</span>
                <Select value={syncPeriod} onValueChange={(v) => setSyncPeriod(v as typeof syncPeriod)} disabled={syncNow.isPending}>
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncNow.mutate({ connectionId: connection.id, days: Number(syncPeriod) })}
                  disabled={syncNow.isPending}
                >
                  {syncNow.isPending
                    ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
                    : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar</>}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pedidos', value: syncLoading ? '...' : orders.length.toString(), icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Faturamento', value: syncLoading ? '...' : formatCurrency(totalRevenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Taxas Shopee', value: syncLoading ? '...' : formatCurrency(totalFees), icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { label: 'Valor Líquido', value: syncLoading ? '...' : formatCurrency(totalNet), icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
              ].map((stat) => (
                <Card key={stat.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Status dos Pedidos ── */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                    <p className="text-2xl font-bold text-emerald-600">{syncLoading ? '...' : completedOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Em andamento</p>
                    <p className="text-2xl font-bold text-yellow-600">{syncLoading ? '...' : pendingOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cancelados</p>
                    <p className="text-2xl font-bold text-destructive">{syncLoading ? '...' : cancelledOrders.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Gráfico ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Vendas dos últimos 7 dias</CardTitle>
              </div>
              <CardDescription>Faturamento bruto vs valor líquido por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.every(d => d.vendas === 0 && d.liquido === 0) ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  Nenhum dado disponível. Sincronize para ver os dados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(l) => `Dia: ${l}`} />
                    <Bar dataKey="vendas" name="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="liquido" name="Líquido" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* ── Sincronização automática ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sincronização Automática</CardTitle>
              <CardDescription>Configure a frequência de atualização dos dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ativar sincronização automática</p>
                  <p className="text-xs text-muted-foreground">Os dados serão atualizados automaticamente</p>
                </div>
                <Switch
                  checked={connection.auto_sync_enabled}
                  onCheckedChange={(checked) => updateSyncSettings.mutate({ connectionId: connection.id, autoSync: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Frequência</p>
                  <p className="text-xs text-muted-foreground">Intervalo entre sincronizações</p>
                </div>
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

          {/* ── Exportar ── */}
          <ExportDataSection connectionId={connection.id} providerName={name} />

          {/* ── Logs ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Sincronizações</CardTitle>
              <CardDescription>Registro das últimas operações realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <IntegrationLogsTable logs={logs} />
            </CardContent>
          </Card>

          {/* ── Zona de perigo ── */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis — tome cuidado</CardDescription>
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