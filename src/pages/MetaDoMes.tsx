import { useEffect, useMemo, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, XCircle, CalendarClock, AlertCircle } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CompanySelector } from '@/components/dashboard/CompanySelector';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { parseMoneyInput, type Cents } from '@/lib/money';
import { useDREData } from '@/hooks/useDREData';
import { useSelectedCompany } from '@/hooks/useSelectedCompany';
import { useRevenueGoal } from '@/hooks/useRevenueGoal';
import { computeRevenueGoal, type RevenueGoalVeredito } from '@/lib/goal';

const VEREDITO: Record<RevenueGoalVeredito, { icon: typeof Target; ring: string; color: string }> = {
  batida:   { icon: CheckCircle2,  ring: 'ring-success/30 bg-success/5',         color: 'text-success' },
  no_ritmo: { icon: TrendingUp,    ring: 'ring-success/30 bg-success/5',         color: 'text-success' },
  aperto:   { icon: AlertTriangle, ring: 'ring-warning/40 bg-warning/5',         color: 'text-warning' },
  longe:    { icon: XCircle,       ring: 'ring-destructive/40 bg-destructive/5', color: 'text-destructive' },
};

const brl = (cents: number) => formatCurrency(cents / 100);

function MetaContent() {
  // Bloco D: a meta segue a empresa selecionada (mesmo store global do topbar/DRE).
  //   - empresa X → faturamento/ritmo/projeção só de X, contra a meta de X
  //     (companies.monthly_revenue_goal_cents).
  //   - "Todas" → consolidado, contra a meta da operação
  //     (cash_flow_settings.monthly_revenue_goal_cents).
  // Como o dreData já vem recortado (Stage 4), faturamento e meta ficam no
  // mesmo escopo — a comparação fecha.
  const { dreData, isLoading, selectedPeriod, selectedCompany, setSelectedCompany, scope } = useDREData();
  const { companies } = useSelectedCompany();
  const companyId = selectedCompany?.id ?? null;
  const multiEmpresa = companies.length >= 2;
  const goal = useRevenueGoal(companyId);
  const [draft, setDraft] = useState('');

  // troca de empresa → limpa o rascunho pra não vazar a meta digitada de uma
  // empresa pro campo de outra.
  useEffect(() => { setDraft(''); }, [companyId]);

  const header = multiEmpresa ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {companyId
          ? <>Meta e faturamento de <strong className="text-foreground">{selectedCompany?.name}</strong>.</>
          : 'Meta consolidada — todas as empresas somadas.'}
      </p>
      <CompanySelector selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
    </div>
  ) : null;

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
    };
  }, [dreData, selectedPeriod]);

  if (isLoading || goal.isLoading) {
    return (
      <div className="space-y-4">
        {header}
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={Target}
          title={companyId ? `Sem faturamento de ${selectedCompany?.name} no mês` : 'Sem faturamento no mês ainda'}
          description="A meta acompanha o faturamento do mês corrente contra o alvo que você definir. Assim que entrarem vendas, ela aparece aqui."
        />
      </div>
    );
  }

  const metaCents = goal.goalCents;
  const parsedDraft = draft.trim() !== '' ? parseMoneyInput(draft) : null;
  const podeSalvar = parsedDraft !== null && parsedDraft > 0 && !goal.save.isPending;

  const salvar = () => {
    if (parsedDraft !== null && parsedDraft > 0) {
      goal.save.mutate(parsedDraft as Cents, { onSuccess: () => setDraft('') });
    }
  };

  return (
    <div className="space-y-5">
      {header}

      {scope.byCompany && (multiEmpresa || scope.hasUnassignedConnection) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Faturamento, ritmo e projeção são só das lojas de <strong>{selectedCompany?.name}</strong>.
            {scope.hasUnassignedConnection && ' Há loja sem empresa atribuída — o que ela fatura não entra aqui.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Onde você está */}
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
          <Stat label="Faturado no mês" value={formatCurrency(dados.faturamentoAteAgora)}
            hint={`dia ${dados.diaDoMes} de ${dados.diasNoMes} · ${Math.max(0, dados.diasNoMes - dados.diaDoMes)} restantes`} />
          <Stat label="Ritmo atual" value={`${formatCurrency(dados.faturamentoAteAgora / dados.diaDoMes)}/dia`}
            hint="média do mês até hoje" />
          <Stat label="Margem de contribuição" value={`${dados.mcPct.toFixed(0)}%`}
            hint="de cada R$ faturado, o que sobra pros custos fixos + lucro" />
        </CardContent>
      </Card>

      {/* Definir / editar a meta */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <Label htmlFor="meta-mes">
            Meta de faturamento do mês
            {multiEmpresa && (
              <span className="ml-1 font-normal text-muted-foreground">
                — {companyId ? selectedCompany?.name : 'consolidada'}
              </span>
            )}
          </Label>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <Input
                id="meta-mes"
                inputMode="decimal"
                className="font-mono"
                placeholder={metaCents != null ? brl(metaCents) : 'R$ 100.000,00'}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && podeSalvar) salvar(); }}
              />
            </div>
            <Button disabled={!podeSalvar} onClick={salvar}>
              {goal.save.isPending ? 'Salvando…' : metaCents != null ? 'Atualizar' : 'Definir meta'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {draft.trim() !== '' && parsedDraft === null && <span className="text-destructive">Valor inválido. </span>}
            {metaCents != null
              ? <>Meta atual: <strong>{brl(metaCents)}</strong>. Usa o faturamento bruto do mês (o número cheio da plataforma).</>
              : 'Defina quanto você quer faturar neste mês pra acompanhar o quanto já foi e se o ritmo leva lá.'}
          </p>
        </CardContent>
      </Card>

      {metaCents != null && metaCents > 0 && (
        <MetaVeredito
          metaCents={metaCents}
          faturamentoAteAgora={dados.faturamentoAteAgora}
          diaDoMes={dados.diaDoMes}
          diasNoMes={dados.diasNoMes}
          custosFixosMes={dados.custosFixosMes}
          mcPct={dados.mcPct}
        />
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
        Projeção linear pelo ritmo do mês até hoje. Não considera sazonalidade nem concentração de vendas no fim do mês (13º, datas). Os custos fixos vêm do que está cadastrado em Fluxo de Caixa.
      </p>
    </div>
  );
}

function MetaVeredito({
  metaCents, faturamentoAteAgora, diaDoMes, diasNoMes, custosFixosMes, mcPct,
}: {
  metaCents: number; faturamentoAteAgora: number; diaDoMes: number; diasNoMes: number;
  custosFixosMes: number; mcPct: number;
}) {
  const meta = metaCents / 100;
  const g = computeRevenueGoal({
    metaFaturamentoMes: meta,
    faturamentoAteAgora,
    diaDoMes,
    diasNoMes,
    custosFixosMes,
    margemContribuicaoPct: mcPct,
  });
  const st = VEREDITO[g.veredito];
  const Icon = st.icon;

  const escala = Math.max(meta, g.projecaoFimDoMes, 1);
  const pctFaturado = Math.min(100, (faturamentoAteAgora / escala) * 100);
  const pctProjecao = Math.min(100, (g.projecaoFimDoMes / escala) * 100);
  const pctMeta = Math.min(100, (meta / escala) * 100);

  return (
    <>
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Meta do mês" value={formatCurrency(meta)} hint="alvo de faturamento bruto" />
          <Stat label="Realizado" value={`${g.pctRealizado.toFixed(0)}%`}
            hint={`${formatCurrency(faturamentoAteAgora)} faturados`} />
          <Stat label="Falta" value={formatCurrency(g.faltaMeta)}
            hint={g.pctRestante > 0 ? `${g.pctRestante.toFixed(0)}% da meta` : 'meta batida'} />
          <Stat label="Projeção do mês" value={formatCurrency(g.projecaoFimDoMes)}
            hint="mantendo o ritmo atual" />
        </CardContent>
      </Card>

      <Card className={cn('ring-1', st.ring)}>
        <CardContent className="space-y-3 py-5">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 size-5 shrink-0', st.color)} />
            <p className="text-sm font-medium">
              {g.veredito === 'batida' && (
                <>Meta batida — <strong className={st.color}>{formatCurrency(faturamentoAteAgora)}</strong> faturados contra a meta de{' '}
                {formatCurrency(meta)}. No ritmo atual o mês fecha em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong>.</>
              )}
              {g.veredito === 'no_ritmo' && (
                <>No ritmo de {formatCurrency(g.ritmoDiarioAtual)}/dia, o mês projeta fechar em{' '}
                <strong className={st.color}>{formatCurrency(g.projecaoFimDoMes)}</strong> — <strong>bate a meta</strong> de {formatCurrency(meta)}.{' '}
                Faltam {formatCurrency(g.faltaMeta)} e {g.diasRestantes} dias.</>
              )}
              {g.veredito === 'aperto' && (
                <>O mês projeta fechar em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong>, colado na meta de {formatCurrency(meta)}.{' '}
                {g.ritmoDiarioNecessario != null && (
                  <>Pra garantir, precisa de <strong className={st.color}>{formatCurrency(g.ritmoDiarioNecessario)}/dia</strong>{' '}
                  nos {g.diasRestantes} dias que faltam (hoje: {formatCurrency(g.ritmoDiarioAtual)}/dia).</>
                )}</>
              )}
              {g.veredito === 'longe' && (
                <>No ritmo atual, o mês fecha em <strong>{formatCurrency(g.projecaoFimDoMes)}</strong> —{' '}
                <strong className={st.color}>abaixo da meta</strong> de {formatCurrency(meta)}.{' '}
                {g.ritmoDiarioNecessario != null
                  ? <>Bater exigiria <strong className={st.color}>{formatCurrency(g.ritmoDiarioNecessario)}/dia</strong> nos {g.diasRestantes} dias restantes — {(g.ritmoDiarioNecessario / Math.max(g.ritmoDiarioAtual, 1)).toFixed(1)}× o ritmo de hoje.</>
                  : 'Sem dias restantes no mês pra recuperar.'}</>
              )}
            </p>
          </div>

          {/* barra: faturado → projeção, com a marca da meta */}
          <div className="pt-1">
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 bg-primary/30" style={{ width: `${pctProjecao}%` }} />
              <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pctFaturado}%` }} />
              <div className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${pctMeta}%` }} title="meta" />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block size-2 rounded-full bg-primary align-middle" />faturado {formatCurrency(faturamentoAteAgora)}</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-primary/30 align-middle" />projeção {formatCurrency(g.projecaoFimDoMes)}</span>
              <span><span className="mr-1 inline-block h-2 w-px bg-foreground/60 align-middle" />meta {formatCurrency(meta)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
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
