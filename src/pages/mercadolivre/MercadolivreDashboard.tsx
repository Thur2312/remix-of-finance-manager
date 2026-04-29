import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, ShoppingCart, Package,
  CheckCircle2, Clock, XCircle, HelpCircle, RefreshCw, ArrowRight,
} from 'lucide-react';
import { InPageNav, NavTab } from '@/components/layout/InPageNav';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';
import { useIntegrations } from '@/hooks/useIntegrations';
import { formatCurrency } from '@/lib/calculations';

// ─── Abas do Mercado Livre ────────────────────────────────────────────────────
export const mercadolivreNavTabs: NavTab[] = [
  { label: 'Dashboard',     href: '/mercadolivre/dashboard' },
  { label: 'Resultados',    href: '/mercadolivre/resultados' },
  { label: 'Variações',     href: '/mercadolivre/variacoes' },
  { label: 'Pagamentos',    href: '/mercadolivre/pagamentos' },
  { label: 'Configurações', href: '/mercadolivre/configuracoes' },
];

// ─── Info Popover ─────────────────────────────────────────────────────────────
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
        Quantidade de pedidos com status <strong>pago</strong> ou <strong>entregue</strong> sincronizados do Mercado Livre.
      </>
    ),
  },
  'Faturamento': {
    title: 'Faturamento Bruto',
    description: (
      <>
        Soma do valor total cobrado dos compradores antes de taxas e descontos.
        <br /><br />
        <span className="font-medium text-foreground">Atenção:</span> não representa o valor recebido — inclui taxas do ML e frete.
      </>
    ),
  },
  'Valor Líquido': {
    title: 'Valor Líquido',
    description: (
      <>
        Valor recebido após o Mercado Livre deduzir comissões e frete.
        <br /><br />
        <span className="font-medium text-foreground">Fórmula:</span> Faturamento − Taxa ML − Frete ML − Descontos
      </>
    ),
  },
  'Taxas ML': {
    title: 'Taxas cobradas pelo Mercado Livre',
    description: (
      <>
        Soma das comissões e custo de frete cobrados pelo ML sobre os pedidos do período.
      </>
    ),
  },
};

// ─── Conteúdo interno — exportado para reuso na Gestão unificada ─────────────
export function MercadolivreDashboardContent() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { orders, stats, loading } = useMercadolivreData();
  const { getConnection, syncNow } = useIntegrations();

  const mlConnection = getConnection('mercadolivre');
  const isConnected = mlConnection?.status === 'connected';

  // ── Calcular status dos pedidos ───────────────────────────────────────────
  const paidOrders = orders.filter(o =>
    ['paid', 'delivered', 'payment_done'].includes(o.status_pedido)
  ).length;
  const pendingOrders = orders.filter(o =>
    ['pending', 'payment_required', 'in_process'].includes(o.status_pedido)
  ).length;
  const cancelledOrders = orders.filter(o =>
    ['cancelled', 'invalid'].includes(o.status_pedido)
  ).length;
  const totalOrdersAll = orders.length;

  const statCards = [
    {
      title: 'Total de Pedidos',
      value: loading ? '...' : stats.totalOrders.toString(),
      description: 'Pedidos pagos/entregues',
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Faturamento',
      value: loading ? '...' : formatCurrency(stats.grossRevenue),
      description: 'Receita bruta sincronizada',
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Valor Líquido',
      value: loading ? '...' : formatCurrency(stats.netRevenue),
      description: 'Após taxas e descontos ML',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Taxas ML',
      value: loading ? '...' : formatCurrency(stats.fees),
      description: 'Comissão + frete ML',
      icon: Package,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard Mercado Livre</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus resultados e aplique a alíquota de imposto correta.
          </p>
        </div>
        <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
      </div>

      {/* ── Banner integração ────────────────────────────────────── */}
      {isConnected ? (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0 text-[11px] font-bold text-yellow-700">
                  ML
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    Mercado Livre conectado
                    {mlConnection?.shop_name && (
                      <span className="text-muted-foreground font-normal"> — {mlConnection.shop_name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.totalOrders > 0
                      ? `${stats.totalOrders} pedidos sincronizados`
                      : 'Nenhum pedido sincronizado ainda — clique em Sincronizar'}
                  </p>
                </div>
                <Badge className="bg-yellow-500 text-white text-xs shrink-0">Sincronizado</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncNow.mutate({ connectionId: mlConnection!.id, days: 30, provider: 'mercadolivre' })}
                  disabled={syncNow.isPending}
                >
                  {syncNow.isPending
                    ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
                    : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar</>}
                </Button>
                <Button size="sm" onClick={() => {}}>
                  Ver detalhes <ArrowRight className="h-3 w-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-yellow-500/15 flex items-center justify-center text-[11px] font-bold text-yellow-700 shrink-0">
                ML
              </div>
              <div>
                <p className="text-sm font-medium">Mercado Livre não conectado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conecte sua conta para sincronizar pedidos automaticamente.
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/integrations">Conectar agora <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => {
          const info = statInfo[stat.title];
          const isLiquido = stat.title === 'Valor Líquido';
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
                {isLiquido && !loading && selectedCompany && selectedCompany.tax_rate > 0 && (
                  <TaxSummaryRow
                    netProfit={stats.netRevenue}
                    taxRate={selectedCompany.tax_rate}
                    companyName={selectedCompany.name}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Status dos Pedidos ───────────────────────────────────── */}
      {totalOrdersAll > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3">Status dos Pedidos</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-500/20 bg-emerald-500/5 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
                    <div className="text-3xl font-bold text-emerald-600 mt-1">{paidOrders}</div>
                    {totalOrdersAll > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((paidOrders / totalOrdersAll) * 100).toFixed(0)}% do total
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20 bg-yellow-500/5 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Em andamento</span>
                    <div className="text-3xl font-bold text-yellow-600 mt-1">{pendingOrders}</div>
                    {totalOrdersAll > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((pendingOrders / totalOrdersAll) * 100).toFixed(0)}% do total
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20 bg-destructive/5 hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground">Cancelados</span>
                    <div className="text-3xl font-bold text-destructive mt-1">{cancelledOrders}</div>
                    {totalOrdersAll > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {((cancelledOrders / totalOrdersAll) * 100).toFixed(0)}% do total
                        {cancelledOrders / totalOrdersAll > 0.05 && (
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

      {/* ── Primeiros Passos ─────────────────────────────────────── */}
      {!loading && orders.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">🚀 Primeiros Passos</CardTitle>
            <CardDescription>Para começar a usar o Mercado Livre, siga estes passos:</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground text-sm">
              <li>
                <span className="font-medium text-foreground">Conecte sua conta ML</span>
                {' '}— Acesse{' '}
                <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link>
                {' '}e autorize o acesso
              </li>
              <li>
                <span className="font-medium text-foreground">Sincronize seus pedidos</span>
                {' '}— Clique em <em>Sincronizar</em> após conectar
              </li>
              <li>
                <span className="font-medium text-foreground">Acompanhe seus resultados</span>
                {' '}— Os dados aparecerão aqui automaticamente
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MercadolivreDashboard() {
  return (
    <AppLayout title="Gestão Mercado Livre">
      <InPageNav tabs={mercadolivreNavTabs} />
      <MercadolivreDashboardContent />
    </AppLayout>
  );
}