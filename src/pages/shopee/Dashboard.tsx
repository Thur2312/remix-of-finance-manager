import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import {
  Package, ArrowRight,
  TrendingUp, DollarSign, ShoppingCart, RefreshCw, Zap,
  CheckCircle2, Clock, XCircle, HelpCircle,
} from 'lucide-react';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { TopVariationsSection } from '@/components/charts/TopVariationsSection';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { supabase } from '@/integrations/supabase/client';
import { calculateResults, formatCurrency, RawOrder, SettingsData } from '@/lib/calculations';
import { fetchAllOrders } from '@/lib/supabase-helpers';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useNavigate } from 'react-router-dom';
import { ProductOrdersList } from '@/components/dashboard/ProductOrdersList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PeriodComparison } from '@/components/dashboard/PeriodComparison';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';

// ─── Tooltip de info reutilizável ────────────────────────────────────────────
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
    title: 'Valor Líquido (repasse da Shopee)',
    description: (
      <>
        Soma do <span className="font-medium text-foreground">escrow_amount</span> — o valor que a Shopee efetivamente
        repassa por cada pedido, já com comissão, taxa de serviço e frete descontados.
        <br /><br />
        Considera os pedidos <span className="font-medium text-foreground">concluídos no período</span> (mesma safra do
        Faturamento ao lado). Pedido concluído cujo repasse ainda não caiu entra por estimativa.
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
        O detalhamento abaixo mostra cada tipo separadamente.
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

// Superfície de cartão da área interna — mesma família visual do .glass-card
// da landing, calibrada pra densidade (ver .app-card em index.css).
const CARD = 'app-card bg-card border-transparent';

// ─── Conteúdo interno — exportado para reuso na Gestão unificada ─────────────
export function ShopeeDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [syncPeriod, setSyncPeriod] = useState<'7' | '15' | '30' | '60'>('15');

  const { syncNow } = useIntegrations();
  const { shopeeConnections, activeConnection: shopeeConnection, setActiveConnectionId } = useActiveShopeeConnection();
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
    if (settingsData && settingsData.length > 0) setSettings(settingsData[0] as SettingsData);
    const ordersData = await fetchAllOrders();
    setOrders(ordersData);
    setIsLoading(false);
  };

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateResults(orders, settings, 'produto');
  }, [orders, settings]);

  const usingSyncData = isConnected && !!syncData && syncData.orders.length > 0;
  // Regime de competência: coorte = pedido concluído na janela (ver
  // shopee-sync-status.ts / docs seção 7.1). Faturamento e Valor Líquido saem da
  // mesma coorte; o Líquido é Σ escrow_amount, não `receita − taxas`.
  const totalOrders = usingSyncData ? syncData.stats.pedidos : orders.length;
  const totalRevenue = usingSyncData ? syncData.stats.faturamento : (calculatedResults?.totals.total_faturado || 0);
  const totalProfit = usingSyncData ? syncData.stats.valorLiquido : (calculatedResults?.totals.lucro_reais || 0);
  // "Taxas Shopee" = tudo que a Shopee reteve/abateu (comissão, serviço, frete,
  // descontos) = faturamento − líquido. É o único número que reconcilia os 3 cards.
  const totalFees = usingSyncData
    ? syncData.stats.faturamento - syncData.stats.valorLiquido
    : (calculatedResults?.totals.taxa_shopee_reais || 0);
  const statusTotal = usingSyncData
    ? syncData.stats.pedidos + syncData.stats.emTransito + syncData.stats.cancelados
    : 0;

  const loading = isLoading || (isConnected && syncLoading);
  const profitTitle = usingSyncData ? 'Valor Líquido' : 'Lucro Estimado';

  const stats = [
    {
      title: 'Total de Pedidos',
      value: loading ? '...' : totalOrders.toString(),
      description: usingSyncData
        ? (syncData!.stats.emTransito > 0
            ? `Concluídos · +${syncData!.stats.emTransito} em trânsito`
            : `Concluídos nos últimos ${syncPeriod} dias`)
        : 'Pedidos importados',
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Faturamento',
      value: loading ? '...' : formatCurrency(totalRevenue),
      description: usingSyncData ? 'Vendas concluídas no período' : 'Total faturado',
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: profitTitle,
      value: loading ? '...' : formatCurrency(totalProfit),
      description: usingSyncData
        ? (syncData!.stats.pedidosSemRepasse > 0
            ? `${syncData!.stats.pedidosSemRepasse} pedido(s) com repasse ainda estimado`
            : 'Repasses já liberados pela Shopee')
        : (settings ? 'Após taxas e custos' : 'Configure as taxas primeiro'),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    ...(usingSyncData ? [{
      title: 'Taxas Shopee',
      value: loading ? '...' : formatCurrency(totalFees),
      description: 'Comissão, serviço, frete e descontos',
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    }] : []),
  ];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Título/subtítulo já vêm do topbar (AppLayout, via Gestao.tsx) — não
         repetir aqui. Seletor de loja só aparece com 2+ lojas Shopee
         conectadas — não faz sentido escolher entre 1 opção só. */}
      <div className="flex items-center justify-end gap-2">
        {shopeeConnections.length > 1 && (
          <Select value={shopeeConnection?.id} onValueChange={setActiveConnectionId}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              {shopeeConnections.map(conn => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.shop_name || conn.external_shop_id || 'Loja sem nome'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
      </div>

      {/* ── Banner integração ────────────────────────────────────── */}
      {isConnected && (
        <Card className={`${CARD} border-success/30 bg-success/5`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    Shopee conectada
                    {shopeeConnection?.shop_name && (
                      <span className="text-muted-foreground font-normal"> — {shopeeConnection.shop_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {syncData && syncData.orders.length > 0
                      ? `${syncData.stats.pedidos} pedidos concluídos nos últimos ${syncPeriod} dias`
                      : 'Nenhum pedido sincronizado ainda — clique em Sincronizar'}
                  </p>
                </div>
                <Badge className="bg-success text-success-foreground text-xs shrink-0">Sincronizado</Badge>
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

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className={`grid gap-4 ${usingSyncData ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {stats.map((stat) => {
          const info = statInfo[stat.title];
          const isProfit = stat.title === profitTitle;
          return (
            <Card key={stat.title} className={`${CARD} relative overflow-hidden transition-shadow hover:shadow-md`}>
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
                {isProfit && !loading && selectedCompany && selectedCompany.tax_rate > 0 && (
                  <TaxSummaryRow
                    netProfit={totalProfit}
                    revenue={totalRevenue}
                    taxRate={selectedCompany.tax_rate}
                    taxBase={selectedCompany.tax_base}
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

      {/* ── Detalhamento de Taxas ────────────────────────────────── */}
      {usingSyncData && syncData.stats.feeBreakdown.length > 0 && (
        <Card className={CARD}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Detalhamento de Taxas</CardTitle>
              <InfoPopover title="De onde vêm essas taxas?">
                A Shopee cobra diferentes tipos de taxa sobre cada venda. Elas são deduzidas automaticamente antes do repasse ao vendedor.
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
                        <InfoPopover title={feeLabels[key] ?? fee.label}>{explanation}</InfoPopover>
                      )}
                    </div>
                    <span className="text-sm font-medium text-destructive tabular-nums shrink-0">
                      −{formatCurrency(fee.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Total retido pela Shopee</span>
                <span className="text-sm font-semibold text-destructive tabular-nums">
                  −{formatCurrency(totalFees)}
                </span>
              </div>
              {syncData.stats.faturamento > 0 && (
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    💡 O total retido é <span className="font-medium text-foreground">faturamento − valor líquido</span>{' '}
                    dos pedidos concluídos no período. A lista acima é a decomposição estimada;
                    pode não fechar exato com o total enquanto o frete não usar o valor real.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Status dos Pedidos ───────────────────────────────────── */}
      {usingSyncData && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-base font-semibold">Status dos Pedidos</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={`${CARD} border-success/20 bg-success/5 hover:shadow-md transition-shadow`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
                    <div className="text-3xl font-bold text-success mt-1">{syncData.stats.pedidos}</div>
                    {statusTotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((syncData.stats.pedidos / statusTotal) * 100).toFixed(0)}% do total
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${CARD} border-warning/20 bg-warning/5 hover:shadow-md transition-shadow`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Em andamento</span>
                    <div className="text-3xl font-bold text-warning mt-1">{syncData.stats.emTransito}</div>
                    {statusTotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((syncData.stats.emTransito / statusTotal) * 100).toFixed(0)}% do total
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${CARD} border-destructive/20 bg-destructive/5 hover:shadow-md transition-shadow`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Cancelados</span>
                    <div className="text-3xl font-bold text-destructive mt-1">{syncData.stats.cancelados}</div>
                    {statusTotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((syncData.stats.cancelados / statusTotal) * 100).toFixed(0)}% do total
                        {syncData.stats.cancelados / statusTotal > 0.05 && (
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

      {/* ── Lista de Pedidos ─────────────────────────────────────── */}
      {usingSyncData && (
        <div>
          <h3 className="text-base font-semibold mb-3">Lista de Pedidos</h3>
          <ProductOrdersList
            orders={syncData.orders}
            fees={syncData.fees}
            payments={syncData.payments}
          />
        </div>
      )}

      {/* ── Gráficos (upload manual) ─────────────────────────────── */}
      {!usingSyncData && calculatedResults && calculatedResults.groups.length > 0 && (
        <DashboardCharts data={calculatedResults.groups} />
      )}
      {!usingSyncData && orders.length > 0 && (
        <TopVariationsSection orders={orders} topProducts={5} topVariations={3} />
      )}

      {/* ── Primeiros Passos ─────────────────────────────────────── */}
      {!usingSyncData && orders.length === 0 && (
        <OnboardingChecklist
          description="Para começar a usar o sistema, siga estes passos:"
          steps={[
            {
              title: 'Conecte sua loja Shopee',
              description: (
                <>
                  Acesse <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link> e conecte sua conta
                </>
              ),
            },
            {
              title: 'Configure seus parâmetros',
              description: (
                <>
                  Defina taxas, impostos e custos na tela de{' '}
                  <Link to="/shopee/configuracoes" className="text-primary underline underline-offset-2">Configurações</Link>
                </>
              ),
            },
            {
              title: 'Faça o upload do relatório',
              description: 'Ou importe seu arquivo XLSX da Shopee manualmente',
            },
          ]}
        />
      )}
    </div>
  );
}

