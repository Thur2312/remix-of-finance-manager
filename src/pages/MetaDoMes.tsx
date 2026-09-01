import { useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useDREData } from '@/hooks/useDREData';
import { computeGoal, type GoalVeredito } from '@/lib/goal';

const VEREDITO: Record<GoalVeredito, { icon: typeof Target; ring: string; color: string }> = {
  meta:      { icon: CheckCircle2,  ring: 'ring-success/30 bg-success/5',        color: 'text-success' },
  breakeven: { icon: TrendingUp,    ring: 'ring-primary/30 bg-primary/5',        color: 'text-primary' },
  aperto:    { icon: AlertTriangle, ring: 'ring-warning/40 bg-warning/5',        color: 'text-warning' },
  vermelho:  { icon: XCircle,       ring: 'ring-destructive/40 bg-destructive/5', color: 'text-destructive' },
};

function MetaContent() {
  const { dreData, isLoading, selectedPeriod } = useDREData();
  const [alvoPct, setAlvoPct] = useState(10);

  const dados = useMemo(() => {
    if (!dreData || dreData.receitaBrutaTotal <= 0) return null;
    const diasNoMes = dreData.diasPeriodo;
    const diaDoMes = Math.min(
      diasNoMes,
      Math.max(1, differenceInDays(new Date(), selectedPeriod.start) + 1),
    );
    const mcPct = (dreData.margemContribuicao / dreData.receitaBrutaTotal) * 100;
    return {
      diasNoMes,
      diaDoMes,
      mcPct,
      custosFixosMes: dreData.custosFixosTotal,
      faturamentoAteAgora: dreData.receitaBrutaTotal,
      inputs: {
        custosFixosMes: dreData.custosFixosTotal,
        margemContribuicaoPct: mcPct,
        faturamentoAteAgora: dreData.receitaBrutaTotal,
        diaDoMes,
        diasNoMes,
      },
    };
  }, [dreData, selectedPeriod]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!dados) {
    return (
      <EmptyState
        icon={Target}
        title="Sem faturamento no mês ainda"
        description="A meta é calculada a partir das suas vendas do mês corrente e dos custos fixos cadastrados."
      />
    );
  }

  const alvoMax = Math.max(1, Math.floor(dados.mcPct) - 1);
  const alvo = Math.min(alvoPct, alvoMax);
  const g = computeGoal(dados.inputs, alvo);
  const st = VEREDITO[g.veredito];
  const Icon = st.icon;

  // barra de progresso: faturamento até agora vs a meta (ou break-even se sem meta)
  const escala = g.faturamentoMeta ?? g.faturamentoBreakEven;
  const pctAteAgora = escala > 0 && Number.isFinite(escala) ? Math.min(100, (dados.faturamentoAteAgora / escala) * 100) : 0;
  const pctProjecao = escala > 0 && Number.isFinite(escala) ? Math.min(100, (g.projecaoFimDoMes / escala) * 100) : 0;
  const pctBE = escala > 0 && Number.isFinite(escala) ? Math.min(100, (g.faturamentoBreakEven / escala) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Onde você está */}
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <Stat label="Faturado no mês" value={formatCurrency(dados.faturamentoAteAgora)}
            hint={`dia ${dados.diaDoMes} de ${dados.diasNoMes} · ${g.diasRestantes} restantes`} />
          <Stat label="Ritmo atual" value={`${formatCurrency(g.ritmoDiarioAtual)}/dia`}
            hint="média do mês até hoje" />
          <Stat label="Margem de contribuição" value={`${dados.mcPct.toFixed(0)}%`}
            hint="de cada R$ faturado, o que sobra pros custos fixos + lucro" />
        </CardContent>
      </Card>

      {/* Slider da meta */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-baseline justify-between">
            <Label>Margem de lucro que você quer no mês</Label>
            <span className="font-mono text-sm font-semibold">{alvo}%</span>
          </div>
          <Slider min={0} max={alvoMax} step={1} value={[alvo]} onValueChange={([v]) => setAlvoPct(v)} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (empatar)</span>
            <span>máx viável: {alvoMax}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Veredito */}
      <Card className={cn('ring-1', st.ring)}>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 size-5 shrink-0', st.color)} />
            <p className="text-sm font-medium">
              {g.veredito === 'meta' && (
                <>No ritmo de {formatCurrency(g.ritmoDiarioAtual)}/dia, o mês fecha em cerca de{' '}
                <strong>{formatCurrency(g.projecaoFimDoMes)}</strong> — <strong className={st.color}>acima da meta</strong> de{' '}
                {g.faturamentoMeta != null ? formatCurrency(g.faturamentoMeta) : '—'}. Lucro projetado:{' '}
                <strong className={st.color}>{formatCurrency(g.lucroProjetado)}</strong>.</>
              )}
              {g.veredito === 'breakeven' && (
                <>O mês projeta fechar em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong> — cobre os custos, mas fica{' '}
                {g.faltaMeta != null && <strong>{formatCurrency(g.faltaMeta)}</strong>} abaixo da meta.{' '}
                {g.ritmoDiarioNecessarioMeta != null && g.diasRestantes > 0 && (
                  <>Para bater, precisa de <strong className={st.color}>{formatCurrency(g.ritmoDiarioNecessarioMeta)}/dia</strong>{' '}
                  nos {g.diasRestantes} dias que faltam (hoje: {formatCurrency(g.ritmoDiarioAtual)}/dia).</>
                )}</>
              )}
              {g.veredito === 'aperto' && (
                <>O mês projeta fechar em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong>, colado no ponto de equilíbrio de{' '}
                {formatCurrency(g.faturamentoBreakEven)}. Qualquer imprevisto (devolução, alta de frete) e o mês fecha no vermelho.</>
              )}
              {g.veredito === 'vermelho' && (
                <>No ritmo atual, o mês fecha em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong> —{' '}
                <strong className={st.color}>abaixo do ponto de equilíbrio</strong> de {formatCurrency(g.faturamentoBreakEven)}.{' '}
                Lucro projetado: <strong className={st.color}>{formatCurrency(g.lucroProjetado)}</strong>. Faltam{' '}
                <strong>{formatCurrency(g.faltaBreakEven)}</strong> pra pelo menos empatar.</>
              )}
            </p>
          </div>

          {/* barra: faturado → projeção, com marcas de break-even e meta */}
          <div className="pt-1">
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 bg-primary/30" style={{ width: `${pctProjecao}%` }} />
              <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pctAteAgora}%` }} />
              {Number.isFinite(escala) && (
                <div className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: `${pctBE}%` }} title="break-even" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block size-2 rounded-full bg-primary align-middle" />faturado {formatCurrency(dados.faturamentoAteAgora)}</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-primary/30 align-middle" />projeção {formatCurrency(g.projecaoFimDoMes)}</span>
              <span><span className="mr-1 inline-block h-2 w-px bg-foreground/50 align-middle" />break-even {formatCurrency(g.faturamentoBreakEven)}</span>
              {g.faturamentoMeta != null && <span>meta {formatCurrency(g.faturamentoMeta)}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
        Projeção linear pelo ritmo do mês até hoje. Não considera sazonalidade nem concentração de vendas no fim do mês (13º, datas). Os custos fixos vêm do que está cadastrado em Fluxo de Caixa.
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] leading-tight text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function MetaDoMes() {
  return (
    <PageShell icon={Target} title="Meta do mês" subtitle="Dá pra bater a meta no ritmo atual?">
      <MetaContent />
    </PageShell>
  );
}
