import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Upload, Settings, FileSpreadsheet, Package, ArrowRight, TrendingUp, DollarSign, ShoppingCart, RefreshCw, Zap } from 'lucide-react';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { InPageNav, shopeeNavTabs } from '@/components/layout/InPageNav';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  // ✅ Dados da integração
  const { getConnection, syncNow } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isConnected = shopeeConnection?.status === 'connected';
  const { data: syncData, isLoading: syncLoading } = useShopeeSync(
    isConnected ? shopeeConnection!.id : null
  );

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .order('is_default', { ascending: false })
      .limit(1);
    if (settingsData && settingsData.length > 0) {
      setSettings(settingsData[0] as SettingsData);
    }
    const ordersData = await fetchAllOrders();
    setOrders(ordersData);
    setIsLoading(false);
  };

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateResults(orders, settings, 'produto');
  }, [orders, settings]);

  // ✅ Decide qual fonte de dados usar para os stats
  const usingSyncData = isConnected && syncData && syncData.stats.totalOrders > 0;

  const totalOrders = usingSyncData
    ? syncData.stats.totalOrders
    : orders.length;

  const totalRevenue = usingSyncData
    ? syncData.stats.totalRevenue
    : (calculatedResults?.totals.total_faturado || 0);

  const totalProfit = usingSyncData
    ? syncData.stats.totalNetAmount - syncData.stats.totalFees
    : (calculatedResults?.totals.lucro_reais || 0);

  const totalFees = usingSyncData
    ? syncData.stats.totalFees
    : (calculatedResults?.totals.taxa_shopee_reais || 0);

  const loading = isLoading || (isConnected && syncLoading);

  const stats = [
    {
      title: 'Total de Pedidos',
      value: loading ? '...' : totalOrders.toString(),
      description: usingSyncData ? 'Últimos 15 dias (sync)' : 'Pedidos importados',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Faturamento',
      value: loading ? '...' : formatCurrency(totalRevenue),
      description: usingSyncData ? 'Receita bruta sincronizada' : 'Total faturado',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: usingSyncData ? 'Valor Líquido' : 'Lucro Estimado',
      value: loading ? '...' : formatCurrency(totalProfit),
      description: usingSyncData ? 'Após taxas Shopee' : (settings ? 'Após taxas e custos' : 'Configure as taxas primeiro'),
      icon: TrendingUp,
      color: 'text-primary',
    },
    ...(usingSyncData ? [{
      title: 'Taxas Shopee',
      value: loading ? '...' : formatCurrency(totalFees),
      description: 'Comissão + serviço + frete',
      icon: Package,
      color: 'text-orange-500',
    }] : []),
  ];

  const quickActions = [
    {
      title: 'Upload de Relatório',
      description: 'Importe seu relatório XLSX da Shopee',
      icon: Upload,
      href: 'shopee/upload',
      color: 'bg-blue-500',
    },
    {
      title: 'Configurações',
      description: 'Configure taxas, impostos e parâmetros',
      icon: Settings,
      href: 'shopee/configuracoes',
      color: 'bg-primary',
    },
    {
      title: 'Resultados Simplificados',
      description: 'Visualize resultados por produto',
      icon: FileSpreadsheet,
      href: 'shopee/resultados',
      color: 'bg-green-500',
    },
    {
      title: 'Resultados com Variações',
      description: 'Análise detalhada por variação',
      icon: Package,
      href: 'shopee/resultados-variacoes',
      color: 'bg-purple-500',
    },
  ];

  return (
    <AppLayout title="Gestão Shopee">
      <InPageNav tabs={shopeeNavTabs} />
      <div className="space-y-8 animate-fade-in">

        {/* ✅ Banner de integração conectada */}
        {isConnected && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Shopee conectada
                      {shopeeConnection?.shop_name && (
                        <span className="text-muted-foreground font-normal"> — {shopeeConnection.shop_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {syncData?.stats.totalOrders
                        ? `${syncData.stats.totalOrders} pedidos sincronizados nos últimos 15 dias`
                        : 'Nenhum pedido sincronizado ainda'}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500 text-white text-xs">
                    Sincronizado
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncNow.mutate(shopeeConnection!.id)}
                    disabled={syncNow.isPending}
                  >
                    {syncNow.isPending
                      ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Sincronizando...</>
                      : <><RefreshCw className="h-3 w-3 mr-1" /> Sincronizar</>
                    }
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/integrations/shopee')}
                  >
                    Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className={`grid gap-4 ${usingSyncData ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[28px] font-semibold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ✅ Breakdown de taxas (só aparece quando tem sync) */}
        {usingSyncData && syncData.stats.feeBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento de Taxas</CardTitle>
              <CardDescription>Taxas cobradas pela Shopee nos últimos 15 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncData.stats.feeBreakdown.map((fee) => (
                  <div key={fee.type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fee.label}</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(fee.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex items-center justify-between text-sm font-semibold">
                  <span>Total de taxas</span>
                  <span className="text-destructive">-{formatCurrency(syncData.stats.totalFees)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ Status dos pedidos (só aparece quando tem sync) */}
        {usingSyncData && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{syncData.stats.paidOrders}</div>
                  <p className="text-sm text-muted-foreground mt-1">Pedidos concluídos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">{syncData.stats.pendingOrders}</div>
                  <p className="text-sm text-muted-foreground mt-1">Pedidos em andamento</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{syncData.stats.cancelledOrders}</div>
                  <p className="text-sm text-muted-foreground mt-1">Pedidos cancelados</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos do upload manual (mantém se não tem sync) */}
        {!usingSyncData && calculatedResults && calculatedResults.groups.length > 0 && (
          <DashboardCharts data={calculatedResults.groups} />
        )}

        {/* TOP Variations (mantém do upload manual) */}
        {!usingSyncData && orders.length > 0 && (
          <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Card key={action.title} className="group hover:border-primary transition-colors">
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${action.color} text-primary-foreground mb-3`}>
                    <action.icon className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="w-full justify-between group-hover:bg-accent">
                    <Link to={action.href}>
                      Acessar
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Getting Started — só aparece se não tem sync nem dados */}
        {!usingSyncData && orders.length === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">🚀 Primeiros Passos</CardTitle>
              <CardDescription>
                Para começar a usar o sistema, siga estes passos:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Conecte sua loja Shopee</span>
                  {' '}— Acesse{' '}
                  <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link>
                  {' '}e conecte sua conta
                </li>
                <li>
                  <span className="font-medium text-foreground">Configure seus parâmetros</span>
                  {' '}— Defina taxas, impostos e custos na tela de Configurações
                </li>
                <li>
                  <span className="font-medium text-foreground">Faça o upload do relatório</span>
                  {' '}— Ou importe seu arquivo XLSX da Shopee manualmente
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}