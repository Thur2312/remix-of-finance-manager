import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import {
  Settings, Package, ArrowRight,
  TrendingUp, DollarSign, ShoppingCart, RefreshCw, Zap,
  CheckCircle2, Clock, XCircle, HelpCircle,
} from 'lucide-react';
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
import { ProductOrdersList } from '@/components/dashboard/ProductOrdersList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PeriodComparison } from '@/components/dashboard/PeriodComparison';
// ── Novos imports ────────────────────────────────────────────────────────────
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';

// ─── Tooltip de info reutilizável ───────────────────────────────────────────
function InfoPopover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-full w-4 h-4 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Saiba mais sobre ${title}`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-xs text-sm space-y-1 leading-relaxed">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Definições dos popovers por stat ───────────────────────────────────────
const statInfo: Record<string, { title: string; description: React.ReactNode }> = {
  'Total de Pedidos': {
    title: 'Total de Pedidos',
    description: (
      <>
        Quantidade de pedidos registrados no período.
        <br /><br />
        <span className="font-medium text-foreground">Com integração ativa:</span> considera apenas os pedidos dos últimos 15 dias sincronizados automaticamente da Shopee.
        <br /><br />
        <span className="font-medium text-foreground">Sem integração:</span> conta os pedidos importados manualmente via planilha XLSX.
      </>
    ),
  },
  'Faturamento': {
    title: 'Faturamento Bruto',
    description: (
      <>
        Soma do valor total cobrado dos compradores, antes de qualquer desconto ou taxa.
        <br /><br />
        <span className="font-medium text-foreground">Atenção:</span> este valor não representa o que você recebeu — inclui taxas da Shopee, fretes e possíveis cancelamentos.
      </>
    ),
  },
  'Valor Líquido': {
    title: 'Valor Líquido (após taxas Shopee)',
    description: (
      <>
        Valor que você efetivamente recebe após a Shopee deduzir comissões, taxas de serviço e frete subsidiado.
        <br /><br />
        <span className="font-medium text-foreground">Fórmula:</span> Faturamento − Total de Taxas Shopee
        <br /><br />
        <span className="font-medium text-foreground">⚠️ Atenção ao período:</span> a Shopee repassa o valor 7 a 15 dias após a confirmação de entrega. Por isso, períodos curtos como 7 dias podem mostrar um líquido menor que o esperado — as vendas recentes ainda não foram repassadas.
        <br /><br />
        Não inclui seus custos de produto e operação — para lucro real, configure os custos em <em>Configurações</em>.
      </>
    ),
  },
  'Lucro Estimado': {
    title: 'Lucro Estimado',
    description: (
      <>
        Estimativa de lucro calculada com base nas taxas e custos que você configurou manualmente.
        <br /><br />
        <span className="font-medium text-foreground">Fórmula:</span> Faturamento − Taxas Shopee − Impostos − Custo dos Produtos
        <br /><br />
        Para maior precisão, conecte sua loja via integração ou mantenha as configurações de taxa atualizadas.
      </>
    ),
  },
  'Taxas Shopee': {
    title: 'Taxas Cobradas pela Shopee',
    description: (
      <>
        Soma de todas as cobranças da Shopee no período: comissão de venda, taxa de serviço e subsídio de frete.
        <br /><br />
        O detalhamento abaixo mostra cada tipo separadamente. Esses valores são deduzidos diretamente do seu repasse.
      </>
    ),
  },
};

const feeInfo: Record<string, string> = {
  commission: 'Percentual cobrado sobre o valor de cada venda. Varia conforme a categoria do produto e seu nível de vendedor na Shopee.',
  service: 'Taxa fixa ou percentual cobrada por cada transação processada na plataforma.',
  shipping: 'Quando a Shopee subsidia o frete para o comprador, parte desse custo pode ser repassada ao vendedor dependendo do programa de frete.',
};

const feeLabels: Record<string, string> = {
  commission: 'Comissão de Venda',
  service: 'Taxa de Serviço',
  shipping: 'Subsídio de Frete',
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  // ── Empresa selecionada ──────────────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [syncPeriod, setSyncPeriod] = useState<'7' | '15' | '30' | '60'>('15');

  const { getConnection, syncNow } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isConnected = shopeeConnection?.status === 'connected';
  const { data: syncData, isLoading: syncLoading } = useShopeeSync(
    isConnected ? shopeeConnection!.id : null,
    Number(syncPeriod)
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

  const usingSyncData = isConnected && syncData && syncData.stats.totalOrders > 0;

  const totalOrders = usingSyncData ? syncData.stats.totalOrders : orders.length;
  const totalRevenue = usingSyncData ? syncData.stats.totalRevenue : (calculatedResults?.totals.total_faturado || 0);
  const totalFees = usingSyncData
    ? syncData.stats.totalFees
    : (calculatedResults?.totals.taxa_shopee_reais || 0);
  const totalProfit = usingSyncData
    ? syncData.stats.totalRevenue - syncData.stats.totalFees
    : (calculatedResults?.totals.lucro_reais || 0);

  const loading = isLoading || (isConnected && syncLoading);
  const profitTitle = usingSyncData ? 'Valor Líquido' : 'Lucro Estimado';

  const stats = [
    {
      title: 'Total de Pedidos',
      value: loading ? '...' : totalOrders.toString(),
      description: usingSyncData ? `Últimos ${syncPeriod} dias (sync)` : 'Pedidos importados',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Faturamento',
      value: loading ? '...' : formatCurrency(totalRevenue),
      description: usingSyncData ? 'Receita bruta sincronizada' : 'Total faturado',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: profitTitle,
      value: loading ? '...' : formatCurrency(totalProfit),
      description: usingSyncData
        ? 'Repasses podem levar 7–15 dias após a entrega'
        : (settings ? 'Após taxas e custos' : 'Configure as taxas primeiro'),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    ...(usingSyncData ? [{
      title: 'Taxas Shopee',
      value: loading ? '...' : formatCurrency(totalFees),
      description: 'Comissão + serviço + frete (inclui taxas de pedidos concluídos, em andamento e cancelados)',
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    }] : []),
  ];

  return (
    <AppLayout title="Gestão Shopee">
      <InPageNav tabs={shopeeNavTabs} />
      <div className="space-y-8 animate-fade-in">

        {/* ── Header com CompanySelector ─────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Dashboard Shopee</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe seus resultados e aplique a alíquota de imposto correta.
            </p>
          </div>
          <CompanySelector
            selectedCompany={selectedCompany}
            onSelect={setSelectedCompany}
          />
        </div>

        {/* ── Banner de integração ───────────────────────────────── */}
        {isConnected && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      Shopee conectada
                      {shopeeConnection?.shop_name && (
                        <span className="text-muted-foreground font-normal"> — {shopeeConnection.shop_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {syncData?.stats.totalOrders
                        ? `${syncData.stats.totalOrders} pedidos sincronizados nos últimos ${syncPeriod} dias`
                        : 'Nenhum pedido sincronizado ainda — clique em Sincronizar'}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500 text-white text-xs shrink-0">
                    Sincronizado
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Período:</span>
                    <Select
                      value={syncPeriod}
                      onValueChange={(v) => setSyncPeriod(v as typeof syncPeriod)}
                      disabled={syncNow.isPending}
                    >
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
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncNow.mutate({ connectionId: shopeeConnection!.id, days: Number(syncPeriod) })}
                    disabled={syncNow.isPending}
                  >
                    {syncNow.isPending
                      ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
                      : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar</>}
                  </Button>

                  <Button size="sm" onClick={() => navigate('/integrations/shopee')}>
                    Ver detalhes <ArrowRight className="h-3 w-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Stats Cards ────────────────────────────────────────── */}
        <div className={`grid gap-4 ${usingSyncData ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {stats.map((stat) => {
            const info = statInfo[stat.title];
            const isProfit = stat.title === profitTitle;
            return (
              <Card key={stat.title} className="relative overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                    {info && <InfoPopover title={info.title}>{info.description}</InfoPopover>}
                  </div>
                  <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>

                  {/* ── Resumo de imposto no card de Lucro/Líquido ── */}
                  {isProfit && !loading && selectedCompany && selectedCompany.tax_rate > 0 && (
                    <TaxSummaryRow
                      netProfit={totalProfit}
                      taxRate={selectedCompany.tax_rate}
                      companyName={selectedCompany.name}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {usingSyncData && syncData.prevStats && (
          <PeriodComparison
            current={syncData.stats}
            previous={syncData.prevStats}
            days={Number(syncPeriod)}
          />
        )}

        {/* ── Detalhamento de Taxas ──────────────────────────────── */}
        {usingSyncData && syncData.stats.feeBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Detalhamento de Taxas</CardTitle>
                <InfoPopover title="De onde vêm essas taxas?">
                  A Shopee cobra diferentes tipos de taxa sobre cada venda. Elas são deduzidas automaticamente antes do repasse ao vendedor. O detalhamento aqui ajuda a entender exatamente o que foi cobrado e por quê.
                </InfoPopover>
              </div>
              <CardDescription>Taxas cobradas pela Shopee nos últimos {syncPeriod} dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncData.stats.feeBreakdown.filter(f => f.type !== 'adjustment').map((fee) => {
                  const key = Object.keys(feeLabels).find(k => fee.label.toLowerCase().includes(k)) ?? '';
                  const explanation = feeInfo[key];
                  return (
                    <div key={fee.type} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm text-muted-foreground truncate">{fee.label}</span>
                        {explanation && (
                          <InfoPopover title={feeLabels[key] ?? fee.label}>
                            {explanation}
                          </InfoPopover>
                        )}
                      </div>
                      <span className="text-sm font-medium text-destructive tabular-nums shrink-0">
                        −{formatCurrency(fee.amount)}
                      </span>
                    </div>
                  );
                })}

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Total de taxas</span>
                  <span className="text-sm font-semibold text-destructive tabular-nums">
                    −{formatCurrency(totalFees)}
                  </span>
                </div>

                {syncData.stats.totalRevenue > 0 && (
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      💡 Inclui taxas de pedidos <span className="font-medium text-foreground">concluídos</span>,{' '}
                      <span className="font-medium text-foreground">em andamento</span> e{' '}
                      <span className="font-medium text-foreground">cancelados</span> —
                      representa o total cobrado pela Shopee no período.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Status dos Pedidos ─────────────────────────────────── */}
        {usingSyncData && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-base font-semibold">Status dos Pedidos</h3>
              <InfoPopover title="O que significa cada status?">
                Os pedidos são classificados pela Shopee em três grupos. Acompanhe a proporção para identificar problemas como alta taxa de cancelamento.
              </InfoPopover>
            </div>
            <div className="grid gap-4 md:grid-cols-3">

              {/* Concluídos */}
              <Card className="border-emerald-500/20 bg-emerald-500/5 hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
                        <InfoPopover title="Pedidos Concluídos">
                          Pedidos com pagamento confirmado e entrega realizada. São os pedidos que já geraram receita efetiva para você — o valor líquido destes já foi ou será repassado pela Shopee.
                        </InfoPopover>
                      </div>
                      <div className="text-3xl font-bold text-emerald-600 mt-1">
                        {syncData.stats.paidOrders}
                      </div>
                      {syncData.stats.totalOrders > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {((syncData.stats.paidOrders / syncData.stats.totalOrders) * 100).toFixed(0)}% do total
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Em andamento */}
              <Card className="border-yellow-500/20 bg-yellow-500/5 hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Em andamento</span>
                        <InfoPopover title="Pedidos em Andamento">
                          Pedidos aprovados que ainda estão sendo preparados, em transporte ou aguardando confirmação de entrega pelo comprador.
                          <br /><br />
                          O valor destes pedidos ainda <span className="font-medium">não foi repassado</span> — só entra no seu saldo após a conclusão.
                        </InfoPopover>
                      </div>
                      <div className="text-3xl font-bold text-yellow-600 mt-1">
                        {syncData.stats.pendingOrders}
                      </div>
                      {syncData.stats.totalOrders > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {((syncData.stats.pendingOrders / syncData.stats.totalOrders) * 100).toFixed(0)}% do total
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cancelados */}
              <Card className="border-destructive/20 bg-destructive/5 hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Cancelados</span>
                        <InfoPopover title="Pedidos Cancelados">
                          Pedidos que foram cancelados pelo comprador, pelo vendedor ou pela Shopee.
                          <br /><br />
                          Uma taxa de cancelamento acima de <span className="font-medium">5%</span> pode afetar negativamente sua pontuação na plataforma. Se estiver alta, verifique estoque e prazo de envio.
                        </InfoPopover>
                      </div>
                      <div className="text-3xl font-bold text-destructive mt-1">
                        {syncData.stats.cancelledOrders}
                      </div>
                      {syncData.stats.totalOrders > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {((syncData.stats.cancelledOrders / syncData.stats.totalOrders) * 100).toFixed(0)}% do total
                          {syncData.stats.cancelledOrders / syncData.stats.totalOrders > 0.05 && (
                            <span className="text-destructive font-medium"> · atenção</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {/* ── Lista de Pedidos (integração ativa) ───────────────── */}
        {usingSyncData && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-base font-semibold">Lista de Pedidos</h3>
              <InfoPopover title="Lista de Pedidos Concluídos">
                Detalhamento individual de cada pedido concluído nos últimos {syncPeriod} dias. Mostra o faturamento bruto, as taxas cobradas pela Shopee, o valor líquido que você recebe e a data de conclusão.
                <br /><br />
                Clique nos cabeçalhos das colunas para ordenar a lista.
              </InfoPopover>
            </div>
            <ProductOrdersList
              orders={syncData.orders}
              fees={syncData.fees}
              payments={syncData.payments}
            />
          </div>
        )}

        {/* ── Gráficos (upload manual) ───────────────────────────── */}
        {!usingSyncData && calculatedResults && calculatedResults.groups.length > 0 && (
          <DashboardCharts data={calculatedResults.groups} />
        )}

        {!usingSyncData && orders.length > 0 && (
          <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />
        )}

        {/* ── Primeiros Passos ───────────────────────────────────── */}
        {!usingSyncData && orders.length === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">🚀 Primeiros Passos</CardTitle>
              <CardDescription>
                Para começar a usar o sistema, siga estes passos:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground text-sm">
                <li>
                  <span className="font-medium text-foreground">Conecte sua loja Shopee</span>
                  {' '}— Acesse{' '}
                  <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link>
                  {' '}e conecte sua conta
                </li>
                <li>
                  <span className="font-medium text-foreground">Configure seus parâmetros</span>
                  {' '}— Defina taxas, impostos e custos na tela de{' '}
                  <Link to="/shopee/configuracoes" className="text-primary underline underline-offset-2">Configurações</Link>
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