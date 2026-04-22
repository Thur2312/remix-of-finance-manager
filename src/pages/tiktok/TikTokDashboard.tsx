import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, Upload, Settings, FileSpreadsheet, Package,
  ArrowRight, TrendingUp, DollarSign, ShoppingCart,
} from 'lucide-react';
import { TikTokSettingsData, TikTokOrder, calculateTikTokResults, formatCurrency } from '@/lib/tiktok-calculations';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { InPageNav, tiktokNavTabs } from '@/components/layout/InPageNav';
// ── Novos imports ────────────────────────────────────────────────────────────
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';

function TikTokDashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<TikTokOrder[]>([]);
  const [settings, setSettings] = useState<TikTokSettingsData | null>(null);

  // ── Empresa selecionada ──────────────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [settingsResult, ordersData] = await Promise.all([
          supabase.from('tiktok_settings').select('*').eq('is_default', true).maybeSingle(),
          fetchAllTikTokOrders(user.id),
        ]);
        if (settingsResult.data) setSettings(settingsResult.data);
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateTikTokResults(orders, settings, 'produto');
  }, [orders, settings]);

  const totalOrders = orders.length;
  const totalRevenue = calculatedResults?.totals.total_faturado || 0;
  const totalProfit = calculatedResults?.totals.lucro_reais || 0;

  const chartData = useMemo(() => {
    if (!calculatedResults) return [];
    return calculatedResults.groups.map((g) => ({
      ...g,
      rebates_shopee: 0,
      taxa_shopee_reais: g.taxa_tiktok_reais,
    }));
  }, [calculatedResults]);

  const ordersForCharts = useMemo(() => {
    return orders.map((order) => ({ ...order, rebate_shopee: 0 }));
  }, [orders]);

  const quickActions = [
    { title: 'Upload de Relatório', description: 'Importe seu relatório CSV do TikTok', icon: Upload, href: '/tiktok/upload', color: 'bg-blue-500' },
    { title: 'Configurações', description: 'Configure taxas, impostos e parâmetros', icon: Settings, href: '/tiktok/configuracoes', color: 'bg-primary' },
    { title: 'Resultados Simplificados', description: 'Visualize resultados por produto', icon: FileSpreadsheet, href: '/tiktok/resultados', color: 'bg-green-500' },
    { title: 'Resultados com Variações', description: 'Análise detalhada por variação', icon: Package, href: '/tiktok/variacoes', color: 'bg-purple-500' },
  ];

  const stats = [
    {
      title: 'Total de Pedidos',
      value: isLoading ? '...' : totalOrders.toString(),
      description: 'Pedidos importados',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      isProfit: false,
    },
    {
      title: 'Faturamento',
      value: isLoading ? '...' : formatCurrency(totalRevenue),
      description: 'Total faturado',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      isProfit: false,
    },
    {
      title: 'Lucro Estimado',
      value: isLoading ? '...' : formatCurrency(totalProfit),
      description: settings ? 'Após taxas e custos' : 'Configure as taxas primeiro',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      isProfit: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header com CompanySelector ───────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard TikTok Shop</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus resultados e aplique a alíquota de imposto correta.
          </p>
        </div>
        <CompanySelector
          selectedCompany={selectedCompany}
          onSelect={setSelectedCompany}
        />
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
              <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-[28px] font-semibold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>

              {/* ── Resumo de imposto no card de Lucro Estimado ── */}
              {stat.isProfit && !isLoading && selectedCompany && selectedCompany.tax_rate > 0 && (
                <TaxSummaryRow
                  netProfit={totalProfit}
                  taxRate={selectedCompany.tax_rate}
                  companyName={selectedCompany.name}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────── */}
      {chartData.length > 0 && <DashboardCharts data={chartData} />}
      {orders.length > 0 && <TopVariationsSection orders={ordersForCharts} topProducts={5} topVariations={3} />}

      {/* ── Ações Rápidas ────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="group hover:border-primary transition-colors">
              <CardHeader>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${action.color} text-white mb-3`}>
                  <action.icon className="h-6 w-6" />
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

      {/* ── Primeiros Passos ─────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">🚀 Primeiros Passos</CardTitle>
          <CardDescription>Para começar a usar o sistema, siga estes passos:</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Configure seus parâmetros</span>
              {' '}— Defina taxas, impostos e custos na tela de Configurações
            </li>
            <li>
              <span className="font-medium text-foreground">Faça o upload do relatório</span>
              {' '}— Importe seu arquivo CSV do TikTok Shop
            </li>
            <li>
              <span className="font-medium text-foreground">Visualize seus resultados</span>
              {' '}— Analise lucros por produto e variação
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TikTokDashboard() {
  return (
    <ProtectedRoute>
      <AppLayout title="Gestão TikTok">
        <InPageNav tabs={tiktokNavTabs} />
        <TikTokDashboardContent />
      </AppLayout>
    </ProtectedRoute>
  );
}