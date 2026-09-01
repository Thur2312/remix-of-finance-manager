import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, Lightbulb, ArrowRight, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeSlideUp, staggerContainer } from '@/lib/motion';
import type { Insight, InsightSeverity } from '@/lib/insights';

const SEVERITY: Record<InsightSeverity, { icon: LucideIcon; rail: string; iconColor: string; metric: string }> = {
  critical: { icon: AlertOctagon,  rail: 'border-destructive',   iconColor: 'text-destructive', metric: 'text-destructive' },
  warning:  { icon: AlertTriangle, rail: 'border-warning',       iconColor: 'text-warning',     metric: 'text-warning' },
  info:     { icon: Lightbulb,     rail: 'border-border',        iconColor: 'text-muted-foreground', metric: 'text-foreground' },
};

interface InsightsPanelProps {
  insights: Insight[];
  loading?: boolean;
  /** quantos mostrar antes do "ver mais" */
  initialCount?: number;
  className?: string;
}

// Painel de recados acionáveis — deliberadamente NÃO é um grid de cards. É um
// consultor: uma coluna de linhas, trilho de severidade à esquerda, número
// direto à direita. Ver src/lib/insights.ts pra lógica (pura).
export function InsightsPanel({ insights, loading, initialCount = 4, className }: InsightsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className={cn('panel bg-card border-transparent p-4', className)}>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted/60" />)}
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  const shown = expanded ? insights : insights.slice(0, initialCount);
  const hidden = insights.length - shown.length;
  const criticos = insights.filter(i => i.severity === 'critical').length;

  return (
    <section className={cn('panel bg-card border-transparent overflow-hidden', className)}>
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <Compass className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">O que merece sua atenção</h2>
        {criticos > 0 && (
          <span className="ml-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            {criticos} {criticos === 1 ? 'crítico' : 'críticos'}
          </span>
        )}
      </header>

      <motion.ul variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-border/50">
        {shown.map(ins => {
          const s = SEVERITY[ins.severity];
          const Icon = s.icon;
          return (
            <motion.li
              key={ins.id}
              variants={fadeSlideUp}
              className={cn('flex gap-3 border-l-2 py-3 pl-4 pr-4', s.rail)}
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', s.iconColor)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-medium">{ins.title}</p>
                  {ins.metric && (
                    <span className={cn('font-mono text-sm font-semibold tabular-nums', s.metric)}>
                      {ins.metric}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ins.detail}</p>
                {ins.action && (
                  <Link
                    to={ins.action.to}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {ins.action.label}
                    <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      {(hidden > 0 || expanded) && insights.length > initialCount && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full border-t border-border/60 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {expanded ? 'Mostrar menos' : `Ver mais ${hidden}`}
        </button>
      )}
    </section>
  );
}
