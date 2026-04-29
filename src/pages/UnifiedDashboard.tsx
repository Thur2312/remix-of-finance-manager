import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ShoppingCart, DollarSign, TrendingUp, Percent, Store } from 'lucide-react';
import { useDashboardData, Marketplace, MarketplaceStats } from '@/hooks/useDashboardData';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { Company } from '@/hooks/useCompanies';
import { formatCurrency } from '@/lib/calculations';

// ── Logos dos marketplaces ───────────────────────────────────────────────────
import logoShopee from '@/assets/logo-shopee.jpg';
import logoTikTok from '@/assets/logo-tiktok.png';

const MARKETPLACE_OPTIONS: { value: Marketplace; label: string }[] = [
  { value: 'todos', label: 'Todos os marketplaces' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
];

// ── Badge de marketplace ─────────────────────────────────────────────────────
function MarketplaceBadge({ mp }: { mp: Marketplace }) {
  if (mp === 'shopee') return (
    <img src={logoShopee} alt="Shopee" className="h-5 w-5 rounded-full object-cover" />
  );
  if (mp === 'tiktok') return (
    <img src={logoTikTok} alt="TikTok" className="h-5 w-5 rounded object-cover" />
  );
  if (mp === 'mercadolivre') return (
    <div className="h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] font-bold text-yellow-900">ML</div>
  );
  return <Store className="h-4 w-4 text-muted-foreground" />;
}

// ── Card de stat ─────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  isLoading: boolean;
  children?: React.ReactNode;
}

function StatCard({ title, value, description, icon: Icon, iconColor, iconBg, isLoading, children }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-[28px] font-semibold">
          {isLoading ? <span className="text-muted-foreground text-lg">Carregando...</span> : value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

// ── Barra de marketplace sem dados ───────────────────────────────────────────
function EmptyState({ mp }: { mp: Marketplace }) {
  const msgs: Record<Marketplace, string> = {
    tiktok: 'O TikTok Shop ainda não possui integração ativa. Os dados aparecerão aqui quando a API estiver disponível.',
    mercadolivre: 'A integração com Mercado Livre ainda não está disponível. Em breve!',
    shopee: 'Nenhum dado encontrado. Faça upload de um relatório ou conecte sua loja.',
    todos: 'Nenhum marketplace com dados. Faça upload de um relatório ou conecte uma loja.',
  };
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
        <Store className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground max-w-sm">{msgs[mp]}</p>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
function UnifiedDashboardContent() {
  const [marketplace, setMarketplace] = useState<Marketplace>('shopee');
  const [syncPeriod, setSyncPeriod] = useState<number>(15);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { shopee, tiktok, mercadolivre, combined, isShopeeConnected, syncData, syncNow, shopeeConnection } =
    useDashboardData(syncPeriod);

  const statsMap: Record<Marketplace, MarketplaceStats> = {
    shopee,
    tiktok,
    mercadolivre,
    todos: combined,
  };

  const stats = statsMap[marketplace];
  const isLoading = stats.isLoading;
  const hasData = stats.hasData;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Visão consolidada dos seus marketplaces.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de marketplace */}
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg p-1">
            {MARKETPLACE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMarketplace(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  marketplace === opt.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MarketplaceBadge mp={opt.value} />
                <span className="hidden sm:inline">{opt.value === 'todos' ? 'Todos' : opt.label}</span>
              </button>
            ))}
          </div>

          <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
        </div>
      </div>

      {/* ── Controles de sync (Shopee conectada) ─────────────────── */}
      {(marketplace === 'shopee' || marketplace === 'todos') && isShopeeConnected && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Período:</span>
            <Select
              value={String(syncPeriod)}
              onValueChange={(v) => setSyncPeriod(Number(v))}
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
            onClick={() => syncNow.mutate({ connectionId: shopeeConnection!.id, days: syncPeriod })}
            disabled={syncNow.isPending}
          >
            {syncNow.isPending
              ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
              : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar Shopee</>}
          </Button>
          {syncData && (
            <span className="text-xs text-muted-foreground">
              {syncData.stats.totalOrders} pedidos sincronizados
              {shopeeConnection?.shop_name && ` · ${shopeeConnection.shop_name}`}
            </span>
          )}
        </div>
      )}

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      {!hasData && !isLoading ? (
        <EmptyState mp={marketplace} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pedidos"
            value={stats.totalOrders.toString()}
            description="Total de pedidos no período"
            icon={ShoppingCart}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            isLoading={isLoading}
          />
          <StatCard
            title="Faturamento Bruto"
            value={formatCurrency(stats.grossRevenue)}
            description="Total cobrado dos compradores"
            icon={DollarSign}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
            isLoading={isLoading}
          />
          <StatCard
            title="Faturamento Líquido"
            value={formatCurrency(stats.netRevenue)}
            description="Após taxas dos marketplaces"
            icon={TrendingUp}
            iconColor="text-primary"
            iconBg="bg-primary/10"
            isLoading={isLoading}
          >
            {!isLoading && selectedCompany && selectedCompany.tax_rate > 0 && (
              <TaxSummaryRow
                netProfit={stats.netRevenue}
                taxRate={selectedCompany.tax_rate}
                companyName={selectedCompany.name}
              />
            )}
          </StatCard>
          <StatCard
            title="Taxas"
            value={formatCurrency(stats.fees)}
            description="Total descontado pelos marketplaces"
            icon={Percent}
            iconColor="text-orange-500"
            iconBg="bg-orange-500/10"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* ── Breakdown por marketplace (view "Todos") ─────────────── */}
      {marketplace === 'todos' && (shopee.hasData || tiktok.hasData) && (
        <div>
          <h3 className="text-base font-semibold mb-3">Por marketplace</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { mp: 'shopee' as Marketplace, label: 'Shopee', stats: shopee, color: 'border-orange-400/40 bg-orange-500/5' },
              { mp: 'tiktok' as Marketplace, label: 'TikTok Shop', stats: tiktok, color: 'border-slate-400/40 bg-slate-500/5' },
              { mp: 'mercadolivre' as Marketplace, label: 'Mercado Livre', stats: mercadolivre, color: 'border-yellow-400/40 bg-yellow-500/5' },
            ].map(({ mp, label, stats: s, color }) => (
              <Card key={mp} className={`${color} transition-shadow hover:shadow-md cursor-pointer`} onClick={() => setMarketplace(mp)}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MarketplaceBadge mp={mp} />
                    <span className="text-sm font-medium">{label}</span>
                    {!s.hasData && (
                      <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">sem dados</span>
                    )}
                  </div>
                  {s.hasData ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pedidos</span>
                        <span className="font-medium">{s.totalOrders}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Bruto</span>
                        <span className="font-medium">{formatCurrency(s.grossRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Líquido</span>
                        <span className="font-medium text-primary">{formatCurrency(s.netRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxas</span>
                        <span className="font-medium text-orange-600">{formatCurrency(s.fees)}</span>
                      </div>
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