import { cn } from '@/lib/utils';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import type { Cents } from '@/lib/money';

// Valor monetário do app interno. Space Mono + tabular-nums pra alinhamento
// vertical e a "precisão auditável" que fintech de verdade transmite. Envolve
// o formatCurrency/formatCents do src/lib — não reimplementa formatação.
//
// Uso:
//   <Money reais={1234.5} />           R$ 1.234,50
//   <Money cents={sale.total_cents} /> aceita o path em centavos
//   <Money reais={x} whole />          R$ 1.235 (sem centavos)
//   <Money reais={x} compact />        R$ 1,2 mil
//   <Money reais={delta} sign />       verde se > 0, vermelho se < 0
//   <Money reais={x} size="lg" />      escala de KPI

type MoneySize = 'sm' | 'base' | 'lg' | 'xl';

const SIZE: Record<MoneySize, string> = {
  sm: 'text-xs',
  base: 'text-sm',
  lg: 'text-xl',
  xl: 'text-3xl',
};

interface MoneyProps {
  /** valor em reais (float) — path legado */
  reais?: number;
  /** valor em centavos (branded Cents ou number) — preferir onde a fonte já é *_cents */
  cents?: Cents | number;
  /** sem centavos: "R$ 1.235" */
  whole?: boolean;
  /** notação compacta: "R$ 1,2 mil" */
  compact?: boolean;
  /** cor por sinal: verde (>0) / vermelho (<0) / neutro (=0) */
  sign?: boolean;
  size?: MoneySize;
  className?: string;
}

export function Money({ reais, cents, whole, compact, sign, size = 'base', className }: MoneyProps) {
  const value = cents != null ? Number(cents) / 100 : reais ?? 0;
  const text = compact
    ? formatCurrencyCompact(value)
    : formatCurrency(value, whole ? { whole: true } : undefined);

  return (
    <span
      className={cn(
        'font-mono tabular-nums tracking-[-0.01em]',
        SIZE[size],
        sign && (value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'),
        className,
      )}
    >
      {text}
    </span>
  );
}
