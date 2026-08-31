import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Loader2, Upload, Settings, FileSpreadsheet, Package,
  ArrowRight, TrendingUp, DollarSign, ShoppingCart,
} from 'lucide-react';
import { TikTokSettingsData, TikTokOrder, calculateTikTokResults, formatCurrency, normalizeTikTokSettings } from '@/lib/tiktok-calculations';
import { formatCents, type Cents } from '@/lib/money';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';

// Superfície de cartão da área interna — mesma família visual do .glass-card
// da landing, calibrada pra densidade (ver .panel em index.css).
const CARD = 'panel bg-card border-transparent';

// ─── Conteúdo interno — exportado para reuso na Gestão unificada ─────────────
export function TikTokDashboardContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<TikTokOrder[]>([]);
  const [settings, setSettings] = useState<TikTokSettingsData | null>(null);
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
        if (settingsResult.data) setSettings(normalizeTikTokSettings(settingsResult.data));
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
  const totalRevenueCents = (calculatedResults?.totals.total_faturado_cents ?? 0) as Cents;

  // Quando a empresa tem imposto configurado, o TaxSummaryRow (applyTax, por
  // empresa) é a fonte de verdade do imposto — então o card mostra o lucro
  // ANTES do imposto, senão o imposto de settings.imposto_nf_saida embutido em
  // lucro_reais seria contado de novo pelo TaxSummaryRow (dupla tributação).
  const hasCompanyTax = (selectedCompany?.tax_rate ?? 0) > 0;
  const totalProfit = hasCompanyTax
    ? (calculatedResults?.totals.lucro_antes_imposto ?? 0)
    : (calculatedResults?.totals.lucro_reais ?? 0);
  const totalProfitCents = (hasCompanyTax
    ? (calculatedResults?.totals.lucro_antes_imposto_cents ?? 0)
    : (calculatedResults?.totals.lucro_reais_cents ?? 0)) as Cents;

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
    { title: 'Upload de Relatório', description: 'Importe seu relatório CSV do TikTok', icon: Upload, href: '/gestao/tiktok/upload', color: 'bg-blue-500' },
    { title: 'Configurações', description: 'Configure taxas, impostos e parâmetros', icon: Settings, href: '/gestao/tiktok/configuracoes', color: 'bg-primary' },
    { title: 'Resultados Simplificados', description: 'Visualize resultados por produto', icon: FileSpreadsheet, href: '/gestao/tiktok/resultados', color: 'bg-green-500' },
    { title: 'Resultados com Variações', description: 'Análise detalhada por variação', icon: Package, href: '/gestao/tiktok/variacoes', color: 'bg-purple-500' },
  ];

  const stats: {
    title: string;
    value: string;
    description: string;
    icon: typeof ShoppingCart;
    variant: 'brand' | 'success';
    isProfit: boolean;
  }[] = [
    {
      title: 'Total de Pedidos',
      value: totalOrders.toString(),
      description: 'Pedidos importados',
      icon: ShoppingCart,
      variant: 'brand',
      isProfit: false,
    },
    {
      title: 'Faturamento',
      value: formatCents(totalRevenueCents),
      description: 'Total faturado',
      icon: DollarSign,
      variant: 'success',
      isProfit: false,
    },
    {
      title: 'Lucro Estimado',
      value: formatCents(totalProfitCents),
      description: !settings
        ? 'Configure as taxas primeiro'
        : hasCompanyTax ? 'Após taxas e custos, antes do imposto' : 'Após taxas e custos',
      icon: TrendingUp,
      variant: 'brand',
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
    <div className="space-y-8">

      {/* O título vem do breadcrumb / da casca de Gestão. Só o seletor de
         empresa aqui. */}
      <div className="flex items-center justify-end">
        <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
      </div>

      {/* ── Aviso: sem integração ativa ──────────────────────────── */}
      <Card className={`${CARD} border-muted-foreground/20 bg-muted/30`}>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            🔌 A integração automática com o TikTok Shop ainda está em desenvolvimento.
            Por enquanto, faça upload do relatório CSV manualmente para visualizar seus dados.
          </p>
        </CardContent>
      </Card>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <KpiRow className="lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            variant={stat.variant}
            loading={isLoading}
          >
            {stat.isProfit && !isLoading && selectedCompany && selectedCompany.tax_rate > 0 && (
              <TaxSummaryRow
                netProfit={totalProfit}
                revenue={totalRevenue}
                taxRate={selectedCompany.tax_rate}
                taxBase={selectedCompany.tax_base}
                companyName={selectedCompany.name}
              />
            )}
          </StatCard>
        ))}
      </KpiRow>

      {/* ── Gráficos ─────────────────────────────────────────────── */}
      {chartData.length > 0 && <DashboardCharts data={chartData} />}
      {orders.length > 0 && <TopVariationsSection orders={ordersForCharts} topProducts={5} topVariations={3} />}

      {/* ── Ações Rápidas ────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.title} className={`${CARD} panel-interactive group`}>
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
      {orders.length === 0 && (
        <OnboardingChecklist
          description="Para começar a usar o sistema, siga estes passos:"
          steps={[
            {
              title: 'Configure seus parâmetros',
              description: (
                <>
                  Defina taxas, impostos e custos na tela de{' '}
                  <Link to="/tiktok/configuracoes" className="text-primary underline underline-offset-2">Configurações</Link>
                </>
              ),
            },
            {
              title: 'Faça o upload do relatório',
              description: 'Importe seu arquivo CSV do TikTok Shop',
            },
            {
              title: 'Visualize seus resultados',
              description: 'Analise lucros por produto e variação',
            },
          ]}
        />
      )}
    </div>
  );
}

