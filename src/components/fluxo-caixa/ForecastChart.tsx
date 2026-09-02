import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, type TooltipProps,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import type { ForecastDay } from '@/lib/cashflow-forecast';

interface ForecastChartProps {
  dias: ForecastDay[];
  /** mostra a banda de tendência (só faz sentido quando há ritmo projetado) */
  showTendencia: boolean;
}

interface Row {
  label: string;
  saldo: number;
  tendencia: number;
}

function ForecastTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Row | undefined;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">
        Confirmado: {formatCurrency(row.saldo, { whole: true })}
      </p>
      {row.tendencia !== row.saldo && (
        <p className="font-mono tabular-nums text-muted-foreground">
          Com tendência: {formatCurrency(row.tendencia, { whole: true })}
        </p>
      )}
    </div>
  );
}

// Duas séries deliberadamente: a LINHA sólida é só o que está confirmado
// (recebível com data + contas lançadas) — é ela que carrega o alerta. A ÁREA
// sombreada por cima é o cenário com a tendência de vendas somada, sempre
// mostrada como faixa, nunca como número de destaque.
export function ForecastChart({ dias, showTendencia }: ForecastChartProps) {
  const data: Row[] = dias.map(d => ({
    label: format(parseISO(d.dateIso), 'dd/MM'),
    saldo: d.saldoCents / 100,
    tendencia: d.saldoComTendenciaCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
        <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="4 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          width={64}
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => formatCurrency(v, { whole: true })}
        />
        <Tooltip content={<ForecastTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
        {showTendencia && (
          <Area
            type="monotone"
            dataKey="tendencia"
            stroke="none"
            fill="url(#forecastBand)"
            isAnimationActive={false}
          />
        )}
        <Line
          type="monotone"
          dataKey="saldo"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
