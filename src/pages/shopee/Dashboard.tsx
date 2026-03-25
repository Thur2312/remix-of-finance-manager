import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Upload, Settings, FileSpreadsheet, Package, ArrowRight, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { InPageNav, shopeeNavTabs } from '@/components/layout/InPageNav';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';
export default function Dashboard() {
  const {
    user
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);
  const fetchData = async () => {
    setIsLoading(true);

    // Fetch settings
    const {
      data: settingsData
    } = await supabase.from('settings').select('*').order('is_default', {
      ascending: false
    }).limit(1);
    if (settingsData && settingsData.length > 0) {
      setSettings(settingsData[0] as SettingsData);
    }

    // Fetch ALL orders using pagination (Supabase limits to 1000 per query)
    const ordersData = await fetchAllOrders();
    setOrders(ordersData);
    setIsLoading(false);
  };
  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateResults(orders, settings, 'produto');
  }, [orders, settings]);
  const totalOrders = orders.length;
  const totalRevenue = calculatedResults?.totals.total_faturado || 0;
  const totalProfit = calculatedResults?.totals.lucro_reais || 0;
  const quickActions = [{
    title: 'Upload de Relatório',
    description: 'Importe seu relatório XLSX da Shopee',
    icon: Upload,
    href: 'shopee/upload',
    color: 'bg-blue-500'
  }, {
    title: 'Configurações',
    description: 'Configure taxas, impostos e parâmetros',
    icon: Settings,
    href: 'shopee/configuracoes',
    color: 'bg-primary'
  }, {
    title: 'Resultados Simplificados',
    description: 'Visualize resultados por produto',
    icon: FileSpreadsheet,
    href: 'shopee/resultados',
    color: 'bg-green-500'
  }, {
    title: 'Resultados com Variações',
    description: 'Análise detalhada por variação',
    icon: Package,
    href: 'shopee/resultados-variacoes',
    color: 'bg-purple-500'
  }];
  const stats = [{
    title: 'Total de Pedidos',
    value: isLoading ? '...' : totalOrders.toString(),
    description: 'Pedidos importados',
    icon: ShoppingCart,
    color: 'text-blue-500'
  }, {
    title: 'Faturamento',
    value: isLoading ? '...' : formatCurrency(totalRevenue),
    description: 'Total faturado',
    icon: DollarSign,
    color: 'text-green-500'
  }, {
    title: 'Lucro Estimado',
    value: isLoading ? '...' : formatCurrency(totalProfit),
    description: settings ? 'Após taxas e custos' : 'Configure as taxas primeiro',
    icon: TrendingUp,
    color: 'text-primary'
  }];
  return <AppLayout title="Gestão Shopee">
      <InPageNav tabs={shopeeNavTabs} />
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                
              </CardHeader>
              <CardContent>
                <div className="text-[28px] font-semibold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>)}
        </div>

        {/* TOP Products Charts */}
        {calculatedResults && calculatedResults.groups.length > 0 && <DashboardCharts data={calculatedResults.groups} />}

        {/* TOP Variations Section */}
        {orders.length > 0 && <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => <Card key={action.title} className="group hover:border-primary transition-colors">
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
              </Card>)}
          </div>
        </div>

        {/* Getting Started */}
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
                <span className="font-medium text-foreground">Configure seus parâmetros</span>
                {' '}— Defina taxas, impostos e custos na tela de Configurações
              </li>
              <li>
                <span className="font-medium text-foreground">Faça o upload do relatório</span>
                {' '}— Importe seu arquivo XLSX da Shopee
              </li>
              <li>
                <span className="font-medium text-foreground">Visualize seus resultados</span>
                {' '}— Analise lucros por produto e variação
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
}