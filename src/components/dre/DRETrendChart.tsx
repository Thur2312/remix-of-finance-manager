import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, type TooltipProps,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/dre-calculations';
import type { DRETrendPoint } from '@/hooks/useDREData';

type MetricKey = 'faturamento' | 'lucroOperacional' | 'margemOperacional';

const METRICS: { key: MetricKey; label: string; fmt: (n: number) => string; unit: 'money' | 'pp' }[] = [
  { key: 'faturamento',       label: 'Faturamento',       fmt: formatCurrency, unit: 'money' },
  { key: 'lucroOperacional',  label: 'Lucro Operacional', fmt: formatCurrency, unit: 'money' },
  { key: 'margemOperacional', label: 'Margem Operacional', fmt: (n) => formatPercent(n), unit: 'pp' },
];

function TrendTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { fmt: (n: number) => string } | undefined;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">{row ? row.fmt(v) : v}</p>
    </div>
  );
}

function MiniTrend({ points, metric }: { points: DRETrendPoint[]; metric: (typeof METRICS)[number] }) {
  const values = points.map(p => p[metric.key]);
  const last = values[values.length - 1];
  const first = values[0];
  const delta = metric.unit === 'pp'
    ? last - first
    : first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  const flat = Math.abs(delta) < 0.5;
  const DeltaIcon = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor = flat ? 'text-muted-foreground' : delta > 0 ? 'text-success' : 'text-destructive';
  const deltaTxt = metric.unit === 'pp'
    ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)} p.p.`
    : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`;

  const chartData = points.map(p => ({ label: p.label, v: p[metric.key], fmt: metric.fmt }));

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-lg font-bold tabular-nums">{metric.fmt(last)}</span>
        <span className={cn('flex items-center gap-0.5 text-xs font-medium', deltaColor)}>
          <DeltaIcon className="size-3" />
          {deltaTxt}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">vs {points[0].label}</p>

      <ResponsiveContainer width="100%" height={64} className="mt-2">
        <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: 2 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
          <Line
            type="monotone"
            dataKey="v"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Série histórica da DRE — small multiples (3 medidas de escalas diferentes,
// nunca eixo duplo). Cada mini-gráfico é uma série só; a cor é sempre --primary
// e o número carrega o significado.
export function DRETrendChart({ points }: { points: DRETrendPoint[] }) {
  const comDados = points.filter(p => p.faturamento > 0);
  if (comDados.length < 2) return null;

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Tendência — últimos 6 meses</h3>
        <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-3">
          {METRICS.map(m => <MiniTrend key={m.key} points={points} metric={m} />)}
        </div>
      </CardContent>
    </Card>
  );
}
