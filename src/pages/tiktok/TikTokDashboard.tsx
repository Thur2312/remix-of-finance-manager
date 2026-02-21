import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2, Upload, Settings, FileSpreadsheet, Package, ArrowRight, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { TikTokSettingsData, TikTokOrder, calculateTikTokResults, formatCurrency } from '@/lib/tiktok-calculations';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { FeatureGate } from '@/components/FeatureGate';


const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

function TikTokDashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<TikTokOrder[]>([]);
  const [settings, setSettings] = useState<TikTokSettingsData | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [settingsResult, ordersData] = await Promise.all([
        supabase.from('tiktok_settings').select('*').eq('is_default', true).maybeSingle(),
        fetchAllTikTokOrders(user.id),
      ]);
      if (settingsResult.data) {
        setSettings(settingsResult.data);
      }
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user]);

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateTikTokResults(orders, settings, 'produto');
  }, [orders, settings]);

  const totalOrders = orders.length;
  const totalRevenue = calculatedResults?.totals.total_faturado || 0;
  const totalProfit = calculatedResults?.totals.lucro_reais || 0;

  // Convert TikTok results to format expected by shared components
  const chartData = useMemo(() => {
    if (!calculatedResults) return [];
    return calculatedResults.groups.map(g => ({
      ...g,
      rebates_shopee: 0,
      taxa_shopee_reais: g.taxa_tiktok_reais,
    }));
  }, [calculatedResults]);

  // Convert TikTok orders to format expected by shared components
  const ordersForCharts = useMemo(() => {
    return orders.map(order => ({
      ...order,
      rebate_shopee: 0,
    }));
  }, [orders]);

  const quickActions = [
    {
      title: 'Upload de Relatório',
      description: 'Importe seu relatório CSV do TikTok',
      icon: Upload,
      href: '/tiktok/upload',
      color: 'bg-blue-500',
    },
    {
      title: 'Configurações',
      description: 'Configure taxas, impostos e parâmetros',
      icon: Settings,
      href: '/tiktok/configuracoes',
      color: 'bg-blue-600',
    },
    {
      title: 'Resultados Simplificados',
      description: 'Visualize resultados por produto',
      icon: FileSpreadsheet,
      href: '/tiktok/resultados',
      color: 'bg-green-500',
    },
    {
      title: 'Resultados com Variações',
      description: 'Análise detalhada por variação',
      icon: Package,
      href: '/tiktok/variacoes',
      color: 'bg-purple-500',
    },
  ];

  const stats = [
    {
      title: 'Total de Pedidos',
      value: isLoading ? '...' : totalOrders.toString(),
      description: 'Pedidos importados',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Faturamento',
      value: isLoading ? '...' : formatCurrency(totalRevenue),
      description: 'Total faturado',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Lucro Estimado',
      value: isLoading ? '...' : formatCurrency(totalProfit),
      description: settings ? 'Após taxas e custos' : 'Configure as taxas primeiro',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <FeatureGate permission="dashboard_access" requiredPlanName="Essencial">
    <motion.div
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Welcome Section */}
      <motion.div variants={fadeInUp} className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          TikTok Shop Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Acompanhe seus resultados e tome decisões estratégicas
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="border border-blue-200 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-600">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* TOP Products Charts */}
      {chartData.length > 0 && (
        <motion.div variants={fadeInUp}>
          <DashboardCharts data={chartData} />
        </motion.div>
      )}

      {/* TOP Variations Section */}
      {orders.length > 0 && (
        <motion.div variants={fadeInUp}>
          <TopVariationsSection orders={ordersForCharts} topProducts={5} topVariations={3} />
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Ações Rápidas</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="border border-blue-200 shadow-lg bg-white hover:shadow-xl transition-shadow group">
              <CardHeader>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${action.color} text-white mb-3`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-base text-gray-900">{action.title}</CardTitle>
                <CardDescription className="text-gray-600">{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-between group-hover:bg-blue-50 text-blue-700 hover:text-blue-900"
                >
                  <Link to={action.href}>
                    Acessar
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Getting Started */}
      <motion.div variants={fadeInUp}>
        <Card className="border border-blue-200 shadow-lg bg-white border-dashed">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <CardTitle className="text-lg text-gray-900">🚀 Primeiros Passos</CardTitle>
            <CardDescription className="text-gray-600">
              Para começar a usar o sistema, siga estes passos:
            </CardDescription>
          </CardHeader>
          <br />
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-gray-600">
              <li>
                <span className="font-medium text-gray-900">Configure seus parâmetros</span>
                {' '}— Defina taxas, impostos e custos na tela de Configurações
              </li>
              <li>
                <span className="font-medium text-gray-900">Faça o upload do relatório</span>
                {' '}— Importe seu arquivo CSV do TikTok Shop
              </li>
              <li>
                <span className="font-medium text-gray-900">Visualize seus resultados</span>
                {' '}— Analise lucros por produto e variação
              </li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
    </FeatureGate>
  );
}

export default function TikTokDashboard() {
  return (
    <ProtectedRoute>
      <AppLayout title="TikTok Shop">
        <TikTokDashboardContent />
      </AppLayout>
    </ProtectedRoute>
  );
}