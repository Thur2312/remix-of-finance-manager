import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, ShoppingCart, DollarSign, TrendingUp, ChevronDown,
  Store, Trophy, ArrowRight, Zap,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboardData, Marketplace, MarketplaceStats } from '@/hooks/useDashboardData';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useRecentSaleEvents } from '@/hooks/useSaleEvents';
import { useDREData } from '@/hooks/useDREData';
import { useSelectedCompany } from '@/hooks/useSelectedCompany';
import { useCompanyConnections } from '@/hooks/useCompanyConnections';
import { useProductCosts } from '@/hooks/useProductCosts';
import { buildInsights } from '@/lib/insights';
import { aggregateShopeeSkuFinance } from '@/lib/shopee-sku-finance';
import { useCatalog } from '@/hooks/useCatalog';
import { rankTopProdutos, type CatalogRow, type TopProdutoCriterio } from '@/lib/catalog';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { TaxSummaryRow } from '@/hooks/useIntegrationTax';
import { formatCurrency } from '@/lib/calculations';
import { formatCents, type Cents } from '@/lib/money';
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

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

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


// ── EmptyState ────────────────────────────────────────────────────────────────
// Primeira tela que um usuário novo vê após o login — por isso usa o mesmo
// OnboardingChecklist dos dashboards por marketplace (em vez de um card
// genérico "sem dados") para já orientar o próximo passo concreto.
function EmptyState({ mp }: { mp: Marketplace }) {
  if (mp === 'shopee') {
    return (
      <OnboardingChecklist
        description="Para começar a usar o sistema, siga estes passos:"
        steps={[
          {
            title: 'Conecte sua loja Shopee',
            description: (
              <>Acesse <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link> e conecte sua conta, ou faça upload de um relatório em <Link to="/shopee/upload" className="text-primary underline underline-offset-2">Upload</Link></>
            ),
          },
          {
            title: 'Configure seus parâmetros',
            description: (
              <>Defina taxas, impostos e custos na tela de <Link to="/shopee/configuracoes" className="text-primary underline underline-offset-2">Configurações</Link></>
            ),
          },
          { title: 'Veja seus resultados', description: 'Os dados aparecem aqui automaticamente após a sincronização ou upload' },
        ]}
      />
    );
  }
  if (mp === 'tiktok') {
    return (
      <OnboardingChecklist
        description="O TikTok Shop ainda não possui integração ativa. Siga estes passos:"
        steps={[
          {
            title: 'Faça o upload do relatório',
            description: (
              <>Importe seu arquivo CSV do TikTok Shop em <Link to="/tiktok/upload" className="text-primary underline underline-offset-2">Upload</Link></>
            ),
          },
          {
            title: 'Configure seus parâmetros',
            description: (
              <>Defina taxas, impostos e custos na tela de <Link to="/tiktok/configuracoes" className="text-primary underline underline-offset-2">Configurações</Link></>
            ),
          },
        ]}
      />
    );
  }
  if (mp === 'mercadolivre') {
    return (
      <OnboardingChecklist
        description="Nenhum pedido encontrado. Para começar, siga estes passos:"
        steps={[
          {
            title: 'Conecte sua conta ML',
            description: (
              <>Acesse <Link to="/integrations" className="text-primary underline underline-offset-2">Integrações</Link> e autorize o acesso</>
            ),
          },
          { title: 'Sincronize seus pedidos', description: <>Clique em <em>Sincronizar</em> após conectar</> },
        ]}
      />
    );
  }
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Store className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-sm">Nenhum marketplace com dados. Conecte uma loja para começar.</p>
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
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradLiquido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} width={56} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name="Bruto" stroke="hsl(var(--primary))" fill="url(#gradBruto)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="net" name="Líquido" stroke="hsl(var(--success))" fill="url(#gradLiquido)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Detalhamento de taxas (recolhível) ───────────────────────────────────────
// Fora da vista principal de propósito: o dashboard prioriza decisão (lucro,
// produtos, meta), não "quanto o marketplace levou". Fica a um clique pra quem
// quiser auditar as cobranças do período.
function FeesBreakdownCollapsible({ breakdown }: { breakdown: { type: string; label: string; amount: number }[] }) {
  const data = breakdown.filter(f => f.type !== 'adjustment' && f.amount > 0);
  if (data.length === 0) return null;
  const total = data.reduce((a, f) => a + f.amount, 0);
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-6 py-4 text-left [&[data-state=open]_svg.chev]:rotate-180">
            <div>
              <p className="text-base font-semibold">Detalhamento de taxas</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(total)} em comissão, serviço e frete no período
              </p>
            </div>
            <ChevronDown className="chev size-4 shrink-0 text-muted-foreground transition-transform" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
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

// ── Status dos Pedidos (funil enxuto) ────────────────────────────────────────
// Opção "financeira enxuta": só os estágios que importam pra decisão —
// realizados (pedidos válidos que entraram) → a caminho → concluídos.
// Cancelamentos e reembolsos ficam no rodapé, como sinal de alerta, sem
// competir com o funil.
function OrderStatusCard({ concluidos, emTransito, cancelados, devolucoes }: {
  concluidos: number; emTransito: number; cancelados: number; devolucoes: number;
}) {
  const realizados = concluidos + emTransito;
  if (realizados + cancelados + devolucoes === 0) return null;
  // cancelados vem com TO_RETURN dentro (ver shopee-sync-status); separa o puro.
  const canceladosPuro = Math.max(0, cancelados - devolucoes);
  const consideraveis = realizados + canceladosPuro + devolucoes;
  const pct = (n: number) => consideraveis > 0 ? (n / consideraveis) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Status dos pedidos</CardTitle>
        <CardDescription>Funil do período selecionado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
          {concluidos > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${pct(concluidos)}%` }} />}
          {emTransito > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${pct(emTransito)}%` }} />}
          {canceladosPuro > 0 && <div className="bg-muted-foreground/40 transition-all" style={{ width: `${pct(canceladosPuro)}%` }} />}
          {devolucoes > 0 && <div className="bg-destructive transition-all" style={{ width: `${pct(devolucoes)}%` }} />}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Realizados', value: realizados, hint: 'pedidos válidos que entraram', textColor: 'text-foreground' },
            { label: 'A caminho', value: emTransito, hint: 'pagos, ainda em trânsito', textColor: 'text-yellow-600' },
            { label: 'Concluídos', value: concluidos, hint: 'entregues e reconhecidos', textColor: 'text-emerald-600' },
          ].map(item => (
            <div key={item.label}>
              <p className={`font-mono text-2xl font-bold ${item.textColor}`}>{item.value}</p>
              <p className="mt-0.5 text-xs font-medium">{item.label}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </div>
        {(canceladosPuro > 0 || devolucoes > 0) && (
          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            {canceladosPuro > 0 && <>{canceladosPuro} cancelado{canceladosPuro !== 1 ? 's' : ''} ({pct(canceladosPuro).toFixed(0)}%)</>}
            {canceladosPuro > 0 && devolucoes > 0 && ' · '}
            {devolucoes > 0 && (
              <span className={pct(devolucoes) >= 5 ? 'font-medium text-destructive' : undefined}>
                {devolucoes} reembolso{devolucoes !== 1 ? 's' : ''} ({pct(devolucoes).toFixed(0)}%)
              </span>
            )}
            {' '}no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Top Produtos (item 3 das diretrizes) ────────────────────────────────────
// Alimentado pelo catálogo unificado (src/lib/catalog.ts) — soma Shopee, ML e
// TikTok, não só a Shopee. O ranking NÃO é só por faturamento: um produto pode
// faturar muito e sobrar pouco. Critério padrão = lucro; o usuário troca.
const TOP_CRITERIOS: { key: TopProdutoCriterio; label: string }[] = [
  { key: 'lucro', label: 'Lucro' },
  { key: 'faturamento', label: 'Faturamento' },
  { key: 'margem', label: 'Margem' },
  { key: 'unidades', label: 'Unidades' },
];

function TopProductsCard({ rows }: { rows: CatalogRow[] }) {
  const [by, setBy] = useState<TopProdutoCriterio>('lucro');
  const top = useMemo(() => rankTopProdutos(rows, { by, limit: 5 }), [rows, by]);
  const totalSkus = useMemo(() => rows.filter(r => r.temSku && !r.archived).length, [rows]);
  if (top.length === 0) return null;

  const headline = (r: CatalogRow) =>
    by === 'faturamento' ? formatCurrency(r.faturamento)
    : by === 'unidades' ? `${r.unidadesVendidas} un`
    : by === 'margem' ? (r.margemPct != null ? `${r.margemPct.toFixed(0)}%` : '—')
    : (r.lucro != null ? formatCurrency(r.lucro) : '—');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">Top produtos</CardTitle>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-muted/60 p-0.5 text-xs font-medium">
            {TOP_CRITERIOS.map(c => (
              <button key={c.key} onClick={() => setBy(c.key)}
                className={`rounded-md px-2 py-1 transition-colors ${
                  by === c.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <CardDescription>
          <Link to="/produtos" className="hover:underline">5 produtos no topo por {TOP_CRITERIOS.find(c => c.key === by)!.label.toLowerCase()}</Link>
          {' '}— soma as três plataformas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.map((p, i) => (
          <div key={p.skuKey} className="flex items-center gap-3">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
              i === 0 ? 'bg-yellow-500/15 text-yellow-600' :
              i === 1 ? 'bg-slate-400/15 text-slate-600' :
              i === 2 ? 'bg-amber-700/15 text-amber-700' :
              'bg-muted text-muted-foreground'
            }`}>{i + 1}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.nome.length > 40 ? p.nome.slice(0, 40) + '…' : p.nome}</p>
              <p className="text-xs text-muted-foreground">
                {p.unidadesVendidas} un · {formatCurrency(p.faturamento)} fat.{p.marketplaces.length > 1 ? ` · ${p.marketplaces.length} plataformas` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`block text-sm font-semibold tabular-nums ${
                by === 'lucro' && p.lucro != null && p.lucro < 0 ? 'text-destructive' : ''
              }`}>{headline(p)}</span>
              {by !== 'margem' && p.margemPct != null && (
                <span className="text-[10px] text-muted-foreground">{p.margemPct.toFixed(0)}% margem</span>
              )}
            </div>
          </div>
        ))}
        <Link to="/produtos" className="flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline">
          Ver os {totalSkus} produtos do catálogo <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Atividade recente (vendas novas) ────────────────────────────────────────
const SALE_EVENT_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Concluído', SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A caminho',
  PROCESSED: 'Processando', UNPAID: 'Aguardando pagamento', TO_RETURN: 'Devolução',
  CANCELLED: 'Cancelado', paid: 'Pago', payment_required: 'Aguardando pagamento',
  payment_in_process: 'Pagamento em processamento', partially_paid: 'Parcialmente pago',
  confirmed: 'Confirmado', invalid: 'Inválido',
};

function RecentSalesActivityCard() {
  const { data: events, isLoading } = useRecentSaleEvents(5);

  if (!isLoading && (!events || events.length === 0)) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Atividade recente</CardTitle>
        </div>
        <CardDescription>Últimas vendas registradas (Shopee e Mercado Livre)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {events!.map(ev => (
              <div key={ev.id} className="flex items-center gap-3">
                <MarketplaceBadge mp={ev.provider} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {ev.product_name || `Pedido ${ev.external_order_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {SALE_EVENT_STATUS_LABEL[ev.status] || ev.status} · {formatDistanceToNow(new Date(ev.order_created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatCurrency(ev.total_amount)}
                </span>
              </div>
            ))}
            <Link to="/vendas" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline pt-1">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
function UnifiedDashboardContent() {
  const [marketplace, setMarketplace] = useState<Marketplace>('shopee');
  const [syncPeriod, setSyncPeriod] = useState<number>(15);

  // Recorte por empresa (Bloco D Fase 2 Stage 4b): a empresa selecionada no
  // switcher do topbar filtra o dashboard pelas lojas dela. Sem empresa
  // ("Todas") → consolidado (loja Shopee ativa + todo o ML).
  const { companyId } = useSelectedCompany();
  const { connections: companyConnections } = useCompanyConnections();
  const scope = useMemo(() => {
    if (!companyId) return null;
    const mine = companyConnections.filter(c => c.companyId === companyId);
    return {
      shopeeConnectionIds: mine.filter(c => c.provider === 'shopee').map(c => c.id),
      mlConnectionIds: mine.filter(c => c.provider === 'mercadolivre').map(c => c.id),
    };
  }, [companyId, companyConnections]);

  const { shopee, tiktok, mercadolivre, combined, isShopeeConnected, syncData, syncNow, shopeeConnection } =
    useDashboardData(syncPeriod, scope);
  const { shopeeConnections, setActiveConnectionId } = useActiveShopeeConnection();

  // A empresa é a mesma da DRE (fonte única — dreData é calculado com ela e o
  // TaxSummaryRow / insights leem a mesma). Insights: DRE + finança Shopee
  // (só na aba relevante). Lógica pura em src/lib/insights.ts.
  const { dreData, dreDataPrev, isLoading: dreLoading, selectedCompany } = useDREData();
  const { data: productCosts } = useProductCosts();
  // mesmo período do resto do dashboard → compartilha o cache de useShopeeSync
  const catalog = useCatalog(syncPeriod);
  const showShopeeInsights = marketplace === 'shopee' || marketplace === 'todos';

  // Resultado por SKU do path sync da Shopee (order_items × escrow × custos).
  const shopeeSkuRows = useMemo(() => {
    if (!showShopeeInsights || !syncData?.orders?.length) return null;
    return aggregateShopeeSkuFinance(syncData.orders, syncData.payments ?? [], productCosts ?? []);
  }, [showShopeeInsights, syncData, productCosts]);

  const insights = useMemo(
    () => buildInsights({
      dre: dreData,
      drePrev: dreDataPrev,
      company: selectedCompany,
      shopeeFinance: showShopeeInsights ? (syncData?.stats ?? null) : null,
      shopeeFinancePrev: showShopeeInsights ? (syncData?.prevStats ?? null) : null,
      products: shopeeSkuRows,
    }),
    [dreData, dreDataPrev, selectedCompany, syncData, showShopeeInsights, shopeeSkuRows],
  );

  const statsMap: Record<Marketplace, MarketplaceStats> = { shopee, tiktok, mercadolivre, todos: combined };
  const stats = statsMap[marketplace];
  const prevStats = syncData?.prevStats;

  const revenueByDay = (marketplace === 'shopee' || marketplace === 'todos')
    ? (syncData?.stats.porDia ?? []).map(d => ({ date: d.date, revenue: d.faturamento, net: d.liquido }))
    : [];
  const feeBreakdown = (marketplace === 'shopee' || marketplace === 'todos') ? (syncData?.stats.feeBreakdown ?? []) : [];
  const showPie = marketplace === 'todos' && (shopee.hasData || tiktok.hasData || mercadolivre.hasData);

  const makeDelta = (cur: number, prev?: number) => prev !== undefined ? { current: cur, previous: prev } : undefined;

  return (
    <PageShell
      title="Dashboard"
      subtitle={scope
        ? `Só ${selectedCompany?.name ?? 'a empresa selecionada'} — lojas dela nos marketplaces.`
        : 'Visão consolidada dos seus marketplaces.'}
      className="space-y-6"
      action={
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
      }
    >

      {/* ── Sync Shopee ───────────────────────────────────────────── */}
      {(marketplace === 'shopee' || marketplace === 'todos') && isShopeeConnected && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sem recorte por empresa, o seletor de loja ativa aparece com 2+
              lojas. Com recorte, as lojas da empresa já estão implícitas. */}
          {!scope && shopeeConnections.length > 1 && (
            <Select value={shopeeConnection?.id} onValueChange={setActiveConnectionId}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
              <SelectContent>
                {shopeeConnections.map(conn => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.shop_name || conn.external_shop_id || 'Loja sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
            onClick={() => {
              const target = scope ? scope.shopeeConnectionIds[0] : shopeeConnection?.id;
              if (target) syncNow.mutate({ connectionId: target, days: syncPeriod });
            }}
            disabled={syncNow.isPending}
          >
            {syncNow.isPending
              ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />Sincronizando...</>
              : <><RefreshCw className="h-3 w-3 mr-1.5" />Sincronizar Shopee</>}
          </Button>
          {syncData && (
            <Badge variant="secondary" className="text-xs">
              {syncData.stats.pedidos} pedidos concluídos{!scope && shopeeConnection?.shop_name ? ` · ${shopeeConnection.shop_name}` : ''}
            </Badge>
          )}
        </div>
      )}

      {/* ── Conteúdo principal ────────────────────────────────────── */}
      {!stats.hasData && !stats.isLoading ? (
        <EmptyState mp={marketplace} />
      ) : (
        <>
          {/* Insights — o que o vendedor precisa saber antes dos números crus */}
          {(insights.length > 0 || dreLoading) && (
            <InsightsPanel insights={insights} loading={dreLoading && insights.length === 0} />
          )}

          {/* Números crus primeiro — pedidos, faturamento, líquido — antes das
              listas. O "retido pelos marketplaces" saiu daqui de propósito
              (vira o bloco recolhível "Detalhamento de taxas" mais abaixo);
              o dashboard prioriza o que sobra, não o que o marketplace levou. */}
          <KpiRow className="lg:grid-cols-3">
            <StatCard title="Pedidos" value={stats.totalOrders.toString()} description="Concluídos no período"
              icon={ShoppingCart} variant="brand" loading={stats.isLoading}
              delta={makeDelta(stats.totalOrders, prevStats?.pedidos)} />
            <StatCard title="Faturamento" value={formatCents((stats.grossRevenueCents ?? 0) as Cents)} description="Vendas concluídas no período"
              icon={DollarSign} variant="success" loading={stats.isLoading}
              delta={makeDelta(stats.grossRevenue, prevStats?.faturamento)} />
            <StatCard title="Valor Líquido" value={formatCents((stats.netRevenueCents ?? 0) as Cents)} description="Repasses dos marketplaces"
              icon={TrendingUp} variant="brand" loading={stats.isLoading}
              delta={makeDelta(stats.netRevenue, prevStats?.valorLiquido)}
            >
              {!stats.isLoading && selectedCompany && selectedCompany.tax_rate > 0 && (
                <TaxSummaryRow
                  netProfit={stats.netRevenue}
                  revenue={stats.grossRevenue}
                  taxRate={selectedCompany.tax_rate}
                  taxBase={selectedCompany.tax_base}
                  companyName={selectedCompany.name}
                />
              )}
            </StatCard>
          </KpiRow>

          {/* Produtos — item 1 das diretrizes: logo após os KPIs. O ranking
              vem do catálogo unificado; a tela cheia é /produtos. */}
          {catalog.rows.length > 0 && <TopProductsCard rows={catalog.rows} />}

          {/* Gráfico de área */}
          {revenueByDay.length > 0 && <RevenueAreaChart data={revenueByDay} />}

          {/* Status dos pedidos + vendas recentes */}
          <div className="grid gap-4 md:grid-cols-2">
            {syncData && (
              <OrderStatusCard
                concluidos={syncData.stats.pedidos}
                emTransito={syncData.stats.emTransito}
                cancelados={syncData.stats.cancelados}
                devolucoes={syncData.stats.devolucoes}
              />
            )}
            <RecentSalesActivityCard />
          </div>

          {/* Distribuição + breakdown por marketplace — andam juntos */}
          {showPie && (
            <MarketplacePieChart shopee={shopee} tiktok={tiktok} mercadolivre={mercadolivre} />
          )}

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
                  <Card key={mp} className={`${color} panel-interactive`} onClick={() => setMarketplace(mp)}>
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
                            { label: 'Bruto',   value: formatCents((s.grossRevenueCents ?? 0) as Cents) },
                            { label: 'Líquido', value: formatCents((s.netRevenueCents ?? 0) as Cents),  className: 'text-primary' },
                            { label: 'Taxas',   value: formatCents((s.feesCents ?? 0) as Cents),        className: 'text-orange-600' },
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

          {/* Detalhamento de taxas — o que o marketplace reteve. Fim, recolhido. */}
          {feeBreakdown.length > 0 && <FeesBreakdownCollapsible breakdown={feeBreakdown} />}
        </>
      )}
    </PageShell>
  );
}

export default function UnifiedDashboard() {
  return <UnifiedDashboardContent />;
}