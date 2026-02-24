import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Upload, Settings, FileSpreadsheet, Package, ArrowRight, TrendingUp, DollarSign, ShoppingCart, BarChart3, Sparkles, CheckCircle2 } from 'lucide-react';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';
import { motion } from 'framer-motion';

// Animações (alinhadas com Landing Page)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

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
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      title: 'Resultados Simplificados',
      description: 'Visualize resultados por produto',
      icon: FileSpreadsheet,
      href: '/resultados',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      title: 'Resultados com Variações',
      description: 'Análise detalhada por variação',
      icon: Package,
      href: '/resultados-variacoes',
      gradient: 'from-blue-600 to-indigo-600',
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 space-y-8 animate-fade-in">
        {/* Stats Cards */}
        <motion.div 
          className="grid gap-4 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp}>
            <StatCard
              title="Total de Pedidos"
              value={isLoading ? '...' : totalOrders.toString()}
              subtitle="Pedidos importados"
              icon={ShoppingCart}
              trend="neutral"
              className="bg-white border border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <StatCard
              title="Faturamento"
              value={isLoading ? '...' : formatCurrency(totalRevenue)}
              subtitle="Total faturado"
              icon={DollarSign}
              trend="up"
              className="bg-white border border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <StatCard
              title="Lucro Estimado"
              value={isLoading ? '...' : formatCurrency(totalProfit)}
              subtitle={settings ? 'Após taxas e custos' : 'Configure as taxas primeiro'}
              icon={TrendingUp}
              trend={totalProfit >= 0 ? 'up' : 'down'}
              className="bg-white border border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            />
          </motion.div>
        </motion.div>

        {/* Charts */}
        {calculatedResults && calculatedResults.groups.length > 0 && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <DashboardCharts data={calculatedResults.groups} />
          </motion.div>
        )}

        {/* TOP Variations */}
        {orders.length > 0 && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Ações Rápidas
          </h3>
          <motion.div 
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
          >
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.05 }}
              >
                <Card className="group relative overflow-hidden bg-white border border-blue-200 shadow-lg hover:shadow-2xl transition-all duration-400">
                  <CardHeader className="relative">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg mb-3`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-base font-semibold text-gray-900">{action.title}</CardTitle>
                    <CardDescription className="text-sm text-gray-600">{action.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <Button asChild className="w-full justify-between bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-300">
                      <Link to={action.href}>
                        Acessar
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Getting Started */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <SectionCard
            title="🚀 Primeiros Passos"
            description="Para começar a usar o sistema, siga estes passos:"
            className="bg-white border border-blue-200 shadow-lg"
          >
            <ol className="space-y-4">
              {[
                { step: 1, title: 'Configure seus parâmetros', desc: 'Defina taxas, impostos e custos na tela de Configurações' },
                { step: 2, title: 'Faça o upload do relatório', desc: 'Importe seu arquivo XLSX da Shopee' },
                { step: 3, title: 'Visualize seus resultados', desc: 'Analise lucros por produto e variação' },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{item.title}</span>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </motion.div>
      </div>
    </AppLayout>
  );
}