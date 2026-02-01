import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Upload, Settings, FileSpreadsheet, Package, ArrowRight, TrendingUp, DollarSign, ShoppingCart, BarChart3, Sparkles } from 'lucide-react';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';

export default function Dashboard() {
  const { user } = useAuth();
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

  const totalOrders = orders.length;
  const totalRevenue = calculatedResults?.totals.total_faturado || 0;
  const totalProfit = calculatedResults?.totals.lucro_reais || 0;

  const quickActions = [
    {
      title: 'Upload de Relatório',
      description: 'Importe seu relatório XLSX da Shopee',
      icon: Upload,
      href: '/upload',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Configurações',
      description: 'Configure taxas, impostos e parâmetros',
      icon: Settings,
      href: '/configuracoes',
      gradient: 'from-primary to-primary/70',
    },
    {
      title: 'Resultados Simplificados',
      description: 'Visualize resultados por produto',
      icon: FileSpreadsheet,
      href: '/resultados',
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      title: 'Resultados com Variações',
      description: 'Análise detalhada por variação',
      icon: Package,
      href: '/resultados-variacoes',
      gradient: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total de Pedidos"
            value={isLoading ? '...' : totalOrders.toString()}
            subtitle="Pedidos importados"
            icon={ShoppingCart}
            trend="neutral"
          />
          <StatCard
            title="Faturamento"
            value={isLoading ? '...' : formatCurrency(totalRevenue)}
            subtitle="Total faturado"
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Lucro Estimado"
            value={isLoading ? '...' : formatCurrency(totalProfit)}
            subtitle={settings ? 'Após taxas e custos' : 'Configure as taxas primeiro'}
            icon={TrendingUp}
            trend={totalProfit >= 0 ? 'up' : 'down'}
          />
        </div>

        {/* Charts */}
        {calculatedResults && calculatedResults.groups.length > 0 && (
          <DashboardCharts data={calculatedResults.groups} />
        )}

        {/* TOP Variations */}
        {orders.length > 0 && (
          <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ações Rápidas
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardHeader className="relative">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg mb-3`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">{action.title}</CardTitle>
                  <CardDescription className="text-sm">{action.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative">
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

        {/* Getting Started */}
        <SectionCard
          title="🚀 Primeiros Passos"
          description="Para começar a usar o sistema, siga estes passos:"
          className="border-dashed border-2 border-border bg-gradient-to-br from-card to-muted/20"
        >
          <ol className="space-y-4">
            {[
              { step: 1, title: 'Configure seus parâmetros', desc: 'Defina taxas, impostos e custos na tela de Configurações' },
              { step: 2, title: 'Faça o upload do relatório', desc: 'Importe seu arquivo XLSX da Shopee' },
              { step: 3, title: 'Visualize seus resultados', desc: 'Analise lucros por produto e variação' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {item.step}
                </div>
                <div>
                  <span className="font-medium text-foreground">{item.title}</span>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
