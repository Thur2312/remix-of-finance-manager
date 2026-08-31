import { type ReactNode } from 'react';
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconBadge, type IconBadgeVariant } from '@/components/layout/IconBadge';
import { cn } from '@/lib/utils';

export interface StatDelta {
  current: number;
  previous: number;
  /** true quando "menos é melhor" (ex.: taxas retidas, prejuízo) */
  invert?: boolean;
}

interface StatCardProps {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** cor da caixinha de ícone (mesma paleta do IconBadge) */
  variant?: IconBadgeVariant;
  loading?: boolean;
  delta?: StatDelta;
  /** slot ao lado do título — ex.: <InfoPopover> */
  info?: ReactNode;
  /** slot abaixo do valor — ex.: <TaxSummaryRow> */
  children?: ReactNode;
  className?: string;
}

function DeltaBadge({ delta }: { delta: StatDelta }) {
  if (delta.previous <= 0) return null;
  const pct = ((delta.current - delta.previous) / delta.previous) * 100;
  const good = delta.invert ? pct <= 0 : pct >= 0;
  const Icon = pct === 0 ? Minus : good ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs font-medium',
        pct === 0 ? 'text-muted-foreground' : good ? 'text-success' : 'text-destructive',
      )}
    >
      <Icon className="size-3" />
      {pct > 0 ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  );
}

// "Card de número" da área interna — antes cada dashboard (shopee/tiktok/ml,
// unificado, IntegrationManage) montava o seu à mão, com espaçamento e cor de
// ícone divergentes. Um só, com slot de delta (comparação de período), de
// tooltip e de conteúdo extra.
export function StatCard({
  title,
  value,
  description,
  icon,
  variant = 'brand',
  loading,
  delta,
  info,
  children,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('panel border-transparent bg-card transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {info}
        </div>
        {icon && <IconBadge icon={icon} variant={variant} size="sm" />}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="font-mono text-2xl font-bold tracking-tight tabular-nums">
          {loading ? (
            <span className="animate-pulse font-sans text-base text-muted-foreground">Carregando…</span>
          ) : (
            value
          )}
        </div>
        {(description || delta) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {delta && <DeltaBadge delta={delta} />}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

export function KpiRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>;
}
