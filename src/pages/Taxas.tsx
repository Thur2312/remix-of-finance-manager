import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  type TooltipProps,
} from 'recharts';
import { Percent, Plug, Package, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { formatCents, type Cents } from '@/lib/money';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import {
  aggregateShopeeFeesBySku, feeRateSeries, effectiveFeeRatePct,
} from '@/lib/fee-detail';

const PERIODOS = ['7', '15', '30', '60'] as const;
type Periodo = (typeof PERIODOS)[number];

const pct1 = (n: number) => `${n.toFixed(1)}%`;

// ─── Por tipo de cobrança ───────────────────────────────────────────────────

function PorTipo({
  breakdown, faturamento,
}: {
  breakdown: { type: string; label: string; amount: number; amountCents: Cents }[];
  faturamento: number;
}) {
  const linhas = breakdown.filter(f => f.type !== 'adjustment');
  if (linhas.length === 0) return null;
  const maxAbs = Math.max(...linhas.map(l => Math.abs(l.amount)), 1);

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Por tipo de cobrança</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Decomposição estimada do que a Shopee retém — comissão, serviço, frete e frete reverso.
        </p>
        <div className="mt-4 space-y-3">
          {linhas.map(l => {
            const credito = l.amountCents < 0;
            const share = faturamento > 0 ? (Math.abs(l.amount) / faturamento) * 100 : 0;
            return (
              <div key={l.type} className="space-y-1">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-[11px] text-muted-foreground tabular-nums">{pct1(share)} do fat.</span>
                    <span className={cn('font-mono font-medium tabular-nums', credito ? 'text-success' : 'text-foreground')}>
                      {credito ? '+' : '−'}{formatCents(Math.abs(l.amountCents) as Cents)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', credito ? 'bg-success/60' : 'bg-primary/60')}
                    style={{ width: `${(Math.abs(l.amount) / maxAbs) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Por produto / anúncio ──────────────────────────────────────────────────

function PorProduto({ orders, payments }: {
  orders: Parameters<typeof aggregateShopeeFeesBySku>[0];
  payments: Parameters<typeof aggregateShopeeFeesBySku>[1];
}) {
  const rows = useMemo(() => aggregateShopeeFeesBySku(orders, payments), [orders, payments]);
  const [aberto, setAberto] = useState(false);
  if (rows.length === 0) return null;
  const visiveis = aberto ? rows : rows.slice(0, 8);

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Por produto / anúncio</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quanto a Shopee reteve em cada SKU (só pedidos com repasse já liberado). Ordenado pelo que mais custou.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Produto</th>
                <th className="pb-2 pr-3 text-right font-medium">Itens</th>
                <th className="pb-2 pr-3 text-right font-medium">Faturado</th>
                <th className="pb-2 pr-3 text-right font-medium">Retido</th>
                <th className="pb-2 text-right font-medium">Taxa efetiva</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visiveis.map(r => (
                <tr key={r.key}>
                  <td className="max-w-[240px] truncate py-2 pr-3" title={r.nome}>{r.nome}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{r.itensVendidos}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatCurrency(r.faturado)}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-destructive">−{formatCurrency(r.retido)}</td>
                  <td className={cn('py-2 text-right font-mono tabular-nums',
                    r.taxaEfetivaPct > 30 ? 'text-destructive' : 'text-foreground')}>
                    {pct1(r.taxaEfetivaPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 8 && (
          <button
            onClick={() => setAberto(v => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ChevronDown className={cn('size-3.5 transition-transform', aberto && 'rotate-180')} />
            {aberto ? 'Mostrar menos' : `Ver todos os ${rows.length}`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Por período ────────────────────────────────────────────────────────────

function RateTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as { retido: number; faturamento: number } | undefined;
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">{pct1(payload[0]?.value ?? 0)} retido</p>
      {p && <p className="text-muted-foreground">−{formatCurrency(p.retido)} de {formatCurrency(p.faturamento)}</p>}
    </div>
  );
}

function PorPeriodo({ porDia }: { porDia: { date: string; faturamento: number; liquido: number }[] }) {
  const data = useMemo(
    () => feeRateSeries(porDia).map(p => ({ ...p, dia: p.date.slice(8, 10) + '/' + p.date.slice(5, 7) })),
    [porDia],
  );
  if (data.length < 2) return null;

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Taxa efetiva no tempo</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          % do faturamento retido a cada dia (pedidos concluídos naquele dia). Os dias mais
          recentes ficam altos enquanto a Shopee não libera o repasse — tendem a baixar depois.
        </p>
        <ResponsiveContainer width="100%" height={200} className="mt-3">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }}
              axisLine={false} tickLine={false} width={34}
            />
            <Tooltip content={<RateTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.4 }} />
            <Bar dataKey="taxaEfetivaPct" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Por plataforma ─────────────────────────────────────────────────────────

function PorPlataforma({ faturamento, retido, taxaPct }: { faturamento: number; retido: number; taxaPct: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Por plataforma</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span className="font-medium">Shopee</span>
            <span className="flex items-baseline gap-3">
              <span className="text-xs text-muted-foreground">taxa efetiva {pct1(taxaPct)}</span>
              <span className="font-mono font-medium tabular-nums text-destructive">−{formatCurrency(retido)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-muted-foreground">
            <span>Mercado Livre · TikTok Shop</span>
            <span className="text-xs">detalhamento por linha ainda não sincronizado</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Só a Shopee entrega hoje a linha de taxa por pedido (tabela de repasses). ML e TikTok
          aparecem aqui conforme os syncs passarem a capturar comissão e frete por venda.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Taxas() {
  const { activeConnection } = useActiveShopeeConnection();
  const conectado = activeConnection?.status === 'connected';
  const [periodo, setPeriodo] = useState<Periodo>('30');
  const { data, isLoading } = useShopeeSync(conectado ? activeConnection!.id : null, Number(periodo));

  const seletor = (
    <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
      <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIODOS.map(p => <SelectItem key={p} value={p}>Últimos {p} dias</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const conteudo = (() => {
    if (!conectado) {
      return (
        <EmptyState
          icon={Plug}
          title="Conecte a Shopee para ver o detalhamento"
          description="As taxas por pedido vêm da tabela de repasses da Shopee. Assim que a conta estiver conectada e sincronizada, o detalhamento aparece aqui."
          action={<Button asChild><Link to="/integrations">Ir para Integrações</Link></Button>}
        />
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      );
    }
    if (!data || data.orders.length === 0 || data.stats.faturamento <= 0) {
      return (
        <EmptyState
          icon={Package}
          title="Sem vendas concluídas no período"
          description="Nenhum pedido concluído nos últimos dias selecionados. Aumente o período ou rode uma sincronização."
        />
      );
    }

    const { stats, prevStats } = data;
    const retido = stats.faturamento - stats.valorLiquido;
    const retidoCents = (stats.faturamentoCents - stats.valorLiquidoCents) as Cents;
    const taxaPct = effectiveFeeRatePct(stats.faturamento, stats.valorLiquido);
    const taxaPctPrev = effectiveFeeRatePct(prevStats.faturamento, prevStats.valorLiquido);
    const retidoPrev = prevStats.faturamento - prevStats.valorLiquido;

    return (
      <div className="space-y-6">
        <KpiRow>
          <StatCard
            title="Faturamento no período"
            value={formatCents(stats.faturamentoCents)}
            description={`${stats.pedidos} pedidos concluídos`}
            icon={Percent}
            variant="brand"
          />
          <StatCard
            title="Total retido pela plataforma"
            value={<span className="text-destructive">−{formatCents(retidoCents)}</span>}
            description="Comissão, serviço, frete e descontos"
            icon={Package}
            variant="warning"
            delta={retidoPrev > 0 ? { current: retido, previous: retidoPrev, invert: true } : undefined}
          />
          <StatCard
            title="Taxa efetiva"
            value={pct1(taxaPct)}
            description={taxaPctPrev > 0 ? `período anterior ${pct1(taxaPctPrev)}` : 'faturamento − líquido'}
            icon={Percent}
            variant={taxaPct > 25 ? 'danger' : 'success'}
            delta={taxaPctPrev > 0 ? { current: taxaPct, previous: taxaPctPrev, invert: true } : undefined}
          />
          <StatCard
            title="Valor líquido"
            value={formatCents(stats.valorLiquidoCents)}
            description={stats.pedidosSemRepasse > 0 ? `${stats.pedidosSemRepasse} com repasse estimado` : 'repasses liberados'}
            icon={Percent}
            variant="success"
          />
        </KpiRow>

        <PorTipo breakdown={stats.feeBreakdown} faturamento={stats.faturamento} />
        <PorProduto orders={data.orders} payments={data.payments} />
        <PorPeriodo porDia={stats.porDia} />
        <PorPlataforma faturamento={stats.faturamento} retido={retido} taxaPct={taxaPct} />
      </div>
    );
  })();

  return (
    <PageShell
      icon={Percent}
      title="Detalhamento de taxas"
      subtitle="O que cada plataforma retém sobre as suas vendas — fora do dashboard principal."
      action={conectado ? seletor : undefined}
    >
      {conteudo}
    </PageShell>
  );
}
