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
  /** mostra a linha tracejada com os recebíveis prováveis (Shopee estimado) */
  showProvavel: boolean;
  /** força o zero a aparecer no eixo (quando o saldo chega perto do vermelho) */
  destacarZero: boolean;
}

interface Row {
  label: string;
  saldo: number;
  provavel: number;
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
      {row.provavel !== row.saldo && (
        <p className="font-mono tabular-nums text-muted-foreground">
          Com estimados: {formatCurrency(row.provavel, { whole: true })}
        </p>
      )}
      {row.tendencia !== row.provavel && (
        <p className="font-mono tabular-nums text-muted-foreground">
          Com tendência: {formatCurrency(row.tendencia, { whole: true })}
        </p>
      )}
    </div>
  );
}

// Camadas deliberadas, do pessimista pro otimista:
//   - LINHA sólida = só o confirmado (recebível com data + contas lançadas).
//     É ela que carrega o alerta.
//   - LINHA tracejada = confirmado + recebível provável da Shopee (escrow
//     estimado por D+N). Só aparece quando há Shopee conectada.
//   - ÁREA sombreada = tudo acima + a tendência do ritmo de vendas. Sempre
//     faixa, nunca número de destaque.
export function ForecastChart({ dias, showTendencia, showProvavel, destacarZero }: ForecastChartProps) {
  const data: Row[] = dias.map(d => ({
    label: format(parseISO(d.dateIso), 'dd/MM'),
    saldo: d.saldoCents / 100,
    provavel: d.saldoComProvavelCents / 100,
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
        <ReferenceLine
          y={0}
          stroke="hsl(var(--destructive))"
          strokeWidth={1}
          strokeDasharray="4 3"
          ifOverflow={destacarZero ? 'extendDomain' : 'discard'}
        />
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
        {showProvavel && (
          <Line
            type="monotone"
            dataKey="provavel"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeOpacity={0.7}
            dot={false}
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
