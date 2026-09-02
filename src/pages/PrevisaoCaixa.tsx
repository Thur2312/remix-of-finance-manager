import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, CheckCircle2, TrendingUp, Wallet, Plug,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { parseMoneyInput } from '@/lib/money';
import { useCashFlowForecast } from '@/hooks/useCashFlowForecast';
import { ForecastChart } from '@/components/fluxo-caixa/ForecastChart';

const dataCurta = (iso: string) => format(parseISO(iso.slice(0, 10)), "dd 'de' MMM", { locale: ptBR });
/** cents (number puro vindo da lib de forecast) → "R$ 1.234,56" */
const brl = (cents: number) => formatCurrency(cents / 100);

function PrevisaoContent() {
  const f = useCashFlowForecast();

  if (f.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!f.hasMercadoLivre) {
    return (
      <EmptyState
        icon={Plug}
        title="Conecte o Mercado Livre"
        description="A previsão de caixa usa a data de liberação de cada pagamento do Mercado Livre pra projetar o seu saldo. Shopee e TikTok entram nas próximas versões."
        action={
          <Button asChild>
            <Link to="/integrations">Ir para Integrações</Link>
          </Button>
        }
      />
    );
  }

  const { result } = f;
  const neg = result.primeiroNegativo;
  const showTendencia = f.ritmoLiquidoDiaCents > 0;

  return (
    <div className="space-y-5">
      <AnchorCard f={f} />

      {/* Veredito */}
      {neg ? (
        <Card className="ring-1 ring-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium">
              Em <strong>{dataCurta(neg.dateIso)}</strong> ({neg.offset} dias) o saldo projetado fica em{' '}
              <strong className="text-destructive">{brl(neg.saldoCents)}</strong> —
              contando só o dinheiro já garantido (recebíveis com data de liberação + contas lançadas).
              Antecipe um recebível, adie uma conta ou reforce o caixa antes disso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="ring-1 ring-success/30 bg-success/5">
          <CardContent className="flex items-start gap-3 py-5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <p className="text-sm font-medium">
              Saldo positivo nos próximos 30 dias. O ponto mais baixo é{' '}
              <strong className="text-success">{brl(result.saldoMinimo.saldoCents)}</strong>{' '}
              em <strong>{dataCurta(result.saldoMinimo.dateIso)}</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gráfico */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold">Saldo projetado — 30 dias</h3>
            <div className="flex flex-wrap gap-x-4 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block h-0.5 w-3 bg-primary align-middle" />confirmado</span>
              {showTendencia && (
                <span><span className="mr-1 inline-block size-2 rounded-sm bg-primary/20 align-middle" />com tendência de vendas</span>
              )}
              <span><span className="mr-1 inline-block h-px w-3 bg-destructive align-middle" />zero</span>
            </div>
          </div>
          <ForecastChart dias={result.dias} showTendencia={showTendencia} />
          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            <Stat label="Entra (garantido)" value={brl(result.totalEntradasCents)}
              hint="recebíveis com data + entradas pendentes" />
            <Stat label="Sai" value={brl(result.totalSaidasCents)}
              hint="contas a pagar lançadas no período" />
            <Stat label="Saldo em 30 dias" value={brl(result.saldoFinalCents)}
              hint="linha conservadora, sem tendência" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard
          title="Próximas entradas"
          icon={TrendingUp}
          rows={f.receivables.slice(0, 6).map(r => ({
            label: r.source === 'ml' ? 'Mercado Livre' : 'Entrada prevista',
            date: r.dateIso,
            amount: r.amountCents,
            positive: true,
          }))}
          empty="Nenhum recebível com data de liberação nos próximos 30 dias."
        />
        <ListCard
          title="Próximas saídas"
          icon={Wallet}
          rows={f.payables.slice(0, 6).map(p => ({
            label: p.label,
            date: p.dateIso,
            amount: p.amountCents,
            positive: false,
          }))}
          empty="Nenhuma conta a pagar lançada para os próximos 30 dias."
        />
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
        Isto é caixa, não competência: mostra quando o dinheiro entra e sai da conta, não quando a venda
        acontece — por isso pode divergir do lucro da DRE no mesmo período. Por enquanto só o Mercado Livre
        entra nos recebíveis; a tendência é uma estimativa pelo ritmo dos últimos 30 dias.
      </p>
    </div>
  );
}

function AnchorCard({ f }: { f: ReturnType<typeof useCashFlowForecast> }) {
  const [draft, setDraft] = useState('');
  const editing = draft !== '';
  const parsed = editing ? parseMoneyInput(draft) : null;

  const desatualizado = f.openingIsConfirmed && (f.openingAgeDays ?? 0) > 7;

  return (
    <Card className={cn('ring-1', desatualizado ? 'ring-warning/40 bg-warning/5' : 'ring-transparent')}>
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor="saldo-hoje">Saldo em conta hoje</Label>
            <Input
              id="saldo-hoje"
              inputMode="decimal"
              className="mt-1 font-mono"
              placeholder={brl(f.openingBalanceCents)}
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
          </div>
          <Button
            disabled={!editing || parsed === null || f.saveAnchor.isPending}
            onClick={() => {
              if (parsed !== null) f.saveAnchor.mutate(parsed, { onSuccess: () => setDraft('') });
            }}
          >
            {f.saveAnchor.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {editing && parsed === null && <span className="text-destructive">Valor inválido. </span>}
          {f.openingIsConfirmed ? (
            <>
              Em uso: <strong>{brl(f.openingBalanceCents)}</strong>, informado{' '}
              {f.openingAgeDays === 0 ? 'hoje' : `há ${f.openingAgeDays} ${f.openingAgeDays === 1 ? 'dia' : 'dias'}`}.
              {desatualizado && ' Confira se ainda bate com o extrato.'}
            </>
          ) : (
            <>
              Estimado pelo acumulado do Fluxo de Caixa (<strong>{brl(f.suggestedOpeningCents)}</strong>).
              Confirme com o saldo real do seu banco pra projeção ficar precisa.
            </>
          )}
        </p>
      </CardContent>
    </Card>
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

interface ListRow { label: string; date: string; amount: number; positive: boolean }

function ListCard({
  title, icon: Icon, rows, empty,
}: { title: string; icon: typeof TrendingUp; rows: ListRow[]; empty: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </h3>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{r.label}</span>
                  <span className="text-[10px] text-muted-foreground">{dataCurta(r.date)}</span>
                </span>
                <span className={cn('font-mono tabular-nums', r.positive ? 'text-success' : 'text-destructive')}>
                  {r.positive ? '+' : '−'}{brl(r.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrevisaoCaixa() {
  return (
    <PageShell
      icon={CalendarClock}
      title="Previsão de caixa"
      subtitle="Quanto entra, quanto sai, e em que dia o saldo aperta"
    >
      <PrevisaoContent />
    </PageShell>
  );
}
