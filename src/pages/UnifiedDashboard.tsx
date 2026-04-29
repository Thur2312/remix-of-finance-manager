import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, ShoppingCart, DollarSign, TrendingUp, Percent,
  Store, TrendingDown, Minus, Trophy, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardData, Marketplace, MarketplaceStats } from '@/hooks/useDashboardData';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';
import { formatCurrency } from '@/lib/calculations';
import { Link } from 'react-router-dom';

import logoShopee from '@/assets/logo-shopee.jpg';
import logoTikTok from '@/assets/logo-tiktok.png';

// ── Constantes ───────────────────────────────────────────────────────────────
const MARKETPLACE_OPTIONS: { value: Marketplace; label: string }[] = [
  { value: 'todos',        label: 'Todos'          },
  { value: 'shopee',       label: 'Shopee'         },
  { value: 'tiktok',       label: 'TikTok Shop'    },
  { value: 'mercadolivre', label: 'Mercado Livre'  },
];

const MP_COLORS: Record<string, string> = {
  shopee:       '#F97316',
  tiktok:       '#64748b',
  mercadolivre: '#EAB308',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899'];

// ── Types ────────────────────────────────────────────────────────────────────
interface TooltipPayloadItem {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface OrderItem {
  external_item_id?: string;
  item_name?: string;
  quantity?: number;
  total_price?: number;
}

interface Order {
  order_items?: OrderItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function MarketplaceBadge({ mp }: { mp: Marketplace }) {
  if (mp === 'shopee') return <img src={logoShopee} alt="Shopee" className="h-5 w-5 rounded-full object-cover" />;
  if (mp === 'tiktok') return <img src={logoTikTok} alt="TikTok" className="h-5 w-5 rounded object-cover" />;
  if (mp === 'mercadolivre') return (
    <div className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] font-bold text-yellow-900">ML</div>
  );
  return <Store className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatK(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${value.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-sm space-y-1.5">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  isLoading: boolean;
  delta?: { current: number; previous: number; invert?: boolean };
  children?: React.ReactNode;
}

function StatCard({ title, value, description, icon: Icon, iconColor, iconBg, isLoading, delta, children }: StatCardProps) {
  const pct = delta && delta.previous > 0
    ? ((delta.current - delta.previous) / delta.previous) * 100
    : null;
  const positive = pct !== null ? (delta?.invert ? pct <= 0 : pct >= 0) : null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight">
          {isLoading ? <span className="text-muted-foreground text-base animate-pulse">Carregando...</span> : value}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-muted-foreground">{description}</p>
          {pct !== null && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-500' : 'text-destructive'}`}>
              {pct === 0 ? <Minus className="h-3 w-3" /> : positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ mp }: { mp: Marketplace }) {
  const msgs: Record<Marketplace, string> = {
    tiktok:        'O TikTok Shop ainda não possui integração ativa.',
    mercadolivre:  'Nenhum pedido encontrado. Conecte sua conta do Mercado Livre em Integrações.',
    shopee:        'Nenhum dado encontrado. Faça upload de um relatório ou conecte sua loja.',
    todos:         'Nenhum marketplace com dados. Conecte uma loja para começar.',
  };
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Store className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-sm">{msgs[mp]}</p>
        <Button size="sm" asChild variant="outline">
          <Link to="/integrations">Ir para Integrações <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Gráfico de área ───────────────────────────────────────────────────────────
function RevenueAreaChart({ data }: { data: { date: string; revenue: number; net: number }[] }) {
  if (!data || data.length === 0) return null;
  const formatted = data.map(d => ({ ...d, date: formatDate(d.date) }));
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Faturamento por Dia</CardTitle>
        <CardDescription>Bruto vs Líquido no período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradBruto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLiquido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} width={56} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name="Bruto" stroke="#3b82f6" fill="url(#gradBruto)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="net" name="Líquido" stroke="#10b981" fill="url(#gradLiquido)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Gráfico de barras: taxas ──────────────────────────────────────────────────
function FeesBarChart({ breakdown }: { breakdown: { type: string; label: string; amount: number }[] }) {
  const data = breakdown.filter(f => f.type !== 'adjustment' && f.amount > 0);
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Detalhamento de Taxas</CardTitle>
        <CardDescription>Breakdown das cobranças no período</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
            <XAxis type="number" tickFormatter={formatK} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
            <Tooltip formatter={(v: number) => [formatCurrency(v), 'Taxa']} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Pizza por marketplace ─────────────────────────────────────────────────────
function MarketplacePieChart({ shopee, tiktok, mercadolivre }: {
  shopee: MarketplaceStats; tiktok: MarketplaceStats; mercadolivre: MarketplaceStats;
}) {
  const data = [
    { name: 'Shopee',       value: shopee.grossRevenue,       color: MP_COLORS.shopee       },
    { name: 'TikTok Shop',  value: tiktok.grossRevenue,       color: MP_COLORS.tiktok       },
    { name: 'Mercado Livre',value: mercadolivre.grossRevenue, color: MP_COLORS.mercadolivre },
  ].filter(d => d.value > 0);
  if (data.length === 0) return null;
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribuição por Marketplace</CardTitle>
        <CardDescription>Participação no faturamento bruto</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {data.map(d => {
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(d.value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status dos Pedidos ────────────────────────────────────────────────────────
function OrderStatusCard({ paid, pending, cancelled, total }: {
  paid: number; pending: number; cancelled: number; total: number;
}) {
  if (total === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Status dos Pedidos</CardTitle>
        <CardDescription>Distribuição no período selecionado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {paid > 0    && <div className="bg-emerald-500 transition-all" style={{ width: `${(paid / total) * 100}%` }} />}
          {pending > 0 && <div className="bg-yellow-500 transition-all"  style={{ width: `${(pending / total) * 100}%` }} />}
          {cancelled > 0 && <div className="bg-destructive transition-all" style={{ width: `${(cancelled / total) * 100}%` }} />}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Concluídos',   value: paid,      textColor: 'text-emerald-600' },
            { label: 'Em andamento', value: pending,    textColor: 'text-yellow-600'  },
            { label: 'Cancelados',   value: cancelled,  textColor: 'text-destructive' },
          ].map(item => (
            <div key={item.label}>
              <p className={`text-2xl font-bold ${item.textColor}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {((item.value / total) * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Produtos ──────────────────────────────────────────────────────────────
function TopProductsCard({ orders }: { orders: Order[] }) {
  const top5 = useMemo(() => {
    if (!orders?.length) return [];
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach(o => {
      (o.order_items || []).forEach((item: OrderItem) => {
        const key = item.external_item_id || item.item_name || 'unknown';
        const ex = map.get(key) || { name: item.item_name || 'Sem nome', qty: 0, revenue: 0 };
        map.set(key, { name: ex.name, qty: ex.qty + (item.quantity || 0), revenue: ex.revenue + (item.total_price || 0) });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);
  if (!top5.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-base">Top Produtos</CardTitle>
        </div>
        <CardDescription>5 produtos com maior faturamento no período</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {top5.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              i === 0 ? 'bg-yellow-500/15 text-yellow-600' :
              i === 1 ? 'bg-slate-400/15 text-slate-600' :
              i === 2 ? 'bg-amber-700/15 text-amber-700' :
              'bg-muted text-muted-foreground'
            }`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name.length > 40 ? p.name.slice(0, 40) + '…' : p.name}</p>
              <p className="text-xs text-muted-foreground">{p.qty} unid.</p>
            </div>
            <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(p.revenue)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
function UnifiedDashboardContent() {
  const [marketplace, setMarketplace] = useState<Marketplace>('shopee');
  const [syncPeriod, setSyncPeriod] = useState<number>(15);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { shopee, tiktok, mercadolivre, combined, isShopeeConnected, syncData, syncNow, shopeeConnection } =
    useDashboardData(syncPeriod);

  const statsMap: Record<Marketplace, MarketplaceStats> = { shopee, tiktok, mercadolivre, todos: combined };
  const stats = statsMap[marketplace];
  const prevStats = syncData?.prevStats;

  const revenueByDay = (marketplace === 'shopee' || marketplace === 'todos') ? (syncData?.stats.revenueByDay ?? []) : [];
  const feeBreakdown = (marketplace === 'shopee' || marketplace === 'todos') ? (syncData?.stats.feeBreakdown ?? []) : [];
  const showPie = marketplace === 'todos' && (shopee.hasData || tiktok.hasData || mercadolivre.hasData);

  const makeDelta = (cur: number, prev?: number) => prev !== undefined ? { current: cur, previous: prev } : undefined;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada dos seus marketplaces.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            {MARKETPLACE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setMarketplace(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  marketplace === opt.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MarketplaceBadge mp={opt.value} />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
          <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
        </div>
      </div>

      {/* ── Sync Shopee ───────────────────────────────────────────── */}
      {(marketplace === 'shopee' || marketplace === 'todos') && isShopeeConnected && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Período:</span>
            <Select value={String(syncPeriod)} onValueChange={(v) => setSyncPeriod(Number(v))} disabled={syncNow.isPending}>
              <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['7','15','30','60'].map(v => <SelectItem key={v} value={v}>{v} dias</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline"
            onClick={() => syncNow.mutate({ connectionId: shopeeConnection!.id, days: syncPeriod })}
            disabled={syncNow.isPending}
          >
            {syncNow.isPending
              ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
              : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar Shopee</>}
          </Button>
          {syncData && (
            <Badge variant="secondary" className="text-xs">
              {syncData.stats.totalOrders} pedidos{shopeeConnection?.shop_name ? ` · ${shopeeConnection.shop_name}` : ''}
            </Badge>
          )}
        </div>
      )}

      {/* ── Conteúdo principal ────────────────────────────────────── */}
      {!stats.hasData && !stats.isLoading ? (
        <EmptyState mp={marketplace} />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Pedidos" value={stats.totalOrders.toString()} description="Total no período"
              icon={ShoppingCart} iconColor="text-blue-500" iconBg="bg-blue-500/10" isLoading={stats.isLoading}
              delta={makeDelta(stats.totalOrders, prevStats?.totalOrders)} />
            <StatCard title="Faturamento Bruto" value={formatCurrency(stats.grossRevenue)} description="Total cobrado dos compradores"
              icon={DollarSign} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" isLoading={stats.isLoading}
              delta={makeDelta(stats.grossRevenue, prevStats?.totalRevenue)} />
            <StatCard title="Faturamento Líquido" value={formatCurrency(stats.netRevenue)} description="Após taxas dos marketplaces"
              icon={TrendingUp} iconColor="text-primary" iconBg="bg-primary/10" isLoading={stats.isLoading}
              delta={makeDelta(stats.netRevenue, prevStats ? prevStats.totalRevenue - prevStats.totalFees : undefined)}
            >
              {!stats.isLoading && selectedCompany && selectedCompany.tax_rate > 0 && (
                <TaxSummaryRow netProfit={stats.netRevenue} taxRate={selectedCompany.tax_rate} companyName={selectedCompany.name} />
              )}
            </StatCard>
            <StatCard title="Taxas" value={formatCurrency(stats.fees)} description="Total descontado pelos marketplaces"
              icon={Percent} iconColor="text-orange-500" iconBg="bg-orange-500/10" isLoading={stats.isLoading}
              delta={makeDelta(stats.fees, prevStats?.totalFees) ? { ...makeDelta(stats.fees, prevStats?.totalFees)!, invert: true } : undefined} />
          </div>

          {/* Gráfico de área */}
          {revenueByDay.length > 0 && <RevenueAreaChart data={revenueByDay} />}

          {/* Segunda linha de gráficos */}
          <div className="grid gap-4 md:grid-cols-2">
            {showPie && <MarketplacePieChart shopee={shopee} tiktok={tiktok} mercadolivre={mercadolivre} />}
            {syncData && (
              <OrderStatusCard
                paid={syncData.stats.paidOrders}
                pending={syncData.stats.pendingOrders}
                cancelled={syncData.stats.cancelledOrders}
                total={syncData.stats.totalOrders}
              />
            )}
            {syncData?.orders?.length > 0 && <TopProductsCard orders={syncData.orders} />}
            {feeBreakdown.length > 0 && <FeesBarChart breakdown={feeBreakdown} />}
          </div>

          {/* Breakdown por marketplace */}
          {marketplace === 'todos' && (shopee.hasData || tiktok.hasData || mercadolivre.hasData) && (
            <div>
              <h3 className="text-base font-semibold mb-3">Por marketplace</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { mp: 'shopee'       as Marketplace, label: 'Shopee',        s: shopee,       color: 'border-orange-400/40 bg-orange-500/5'  },
                  { mp: 'tiktok'       as Marketplace, label: 'TikTok Shop',   s: tiktok,       color: 'border-slate-400/40 bg-slate-500/5'    },
                  { mp: 'mercadolivre' as Marketplace, label: 'Mercado Livre', s: mercadolivre, color: 'border-yellow-400/40 bg-yellow-500/5'  },
                ].map(({ mp, label, s, color }) => (
                  <Card key={mp} className={`${color} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setMarketplace(mp)}>
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <MarketplaceBadge mp={mp} />
                        <span className="text-sm font-medium">{label}</span>
                        {!s.hasData && <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">sem dados</span>}
                      </div>
                      {s.hasData ? (
                        <div className="space-y-1.5">
                          {[
                            { label: 'Pedidos', value: s.totalOrders.toString() },
                            { label: 'Bruto',   value: formatCurrency(s.grossRevenue) },
                            { label: 'Líquido', value: formatCurrency(s.netRevenue),  className: 'text-primary' },
                            { label: 'Taxas',   value: formatCurrency(s.fees),        className: 'text-orange-600' },
                          ].map(row => (
                            <div key={row.label} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className={`font-medium ${row.className ?? ''}`}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Clique para ver detalhes</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function UnifiedDashboard() {
  return (
    <ProtectedRoute>
      <AppLayout title="Dashboard">
        <UnifiedDashboardContent />
      </AppLayout>
    </ProtectedRoute>
  );
}