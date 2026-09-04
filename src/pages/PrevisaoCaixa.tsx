import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, AlertTriangle, CheckCircle2, TrendingUp, Wallet, Plug, TrendingDown, Clock3,
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
import { planejarAntecipacao, diasParaRecuperar, type AntecipacaoCandidato } from '@/lib/antecipacao';

const dataCurta = (iso: string) => {
  const d = parseISO(iso.slice(0, 10));
  return Number.isNaN(d.getTime()) ? '—' : format(d, "dd 'de' MMM", { locale: ptBR });
};
const emQuantosDias = (offset: number) =>
  offset === 0 ? 'hoje' : offset === 1 ? 'amanhã' : `daqui a ${offset} dias`;

/** frase sobre como a estimativa Shopee foi calibrada, pro rodapé */
function textoCalibShopee(c: ReturnType<typeof useCashFlowForecast>['shopeeCalib']): string {
  if (!c) return '';
  const pct = Math.round(c.netRatio * 100);
  return c.observado
    ? `Os da Shopee são estimados e estão calibrados pelo seu histórico: liberação em ~${c.lagDias} dias e ~${pct}% do valor da venda (média dos seus últimos ${c.amostras} repasses).`
    : `Os da Shopee são estimados com padrões (liberação ~${c.lagDias} dias, ~${pct}% do valor) porque ainda não há repasses liberados suficientes pra calibrar — vão se ajustar sozinhos conforme seu histórico cresce.`;
}
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

  const { result } = f;
  const neg = result.primeiroNegativo;
  const showTendencia = f.ritmoLiquidoDiaCents > 0;
  const temProvavel = f.probableReceivables.length > 0;
  const temShopeeProv = f.probableReceivables.some(r => r.source === 'shopee');
  const temTiktokProv = f.probableReceivables.some(r => r.source === 'tiktok');
  const labelEstimado =
    temShopeeProv && temTiktokProv ? 'Shopee/TikTok estimado'
    : temTiktokProv ? 'TikTok estimado'
    : 'Shopee estimado';
  // O zero só vira referência no gráfico quando o saldo chega perto dele —
  // senão comprime a variação semana a semana no topo do gráfico à toa.
  const perigo = !!neg || result.saldoMinimo.saldoCents < Math.max(result.dias[0].saldoCents * 0.25, 0);

  const semMarketplace = !f.hasMercadoLivre && !f.hasShopee && !f.hasTiktok;
  // Sem marketplace E sem nada no Fluxo de Caixa não há o que projetar.
  const semDados = semMarketplace && f.receivables.length === 0 && f.payables.length === 0;

  // Entradas confirmadas + prováveis, juntas e ordenadas, pra lista lateral.
  const proximasEntradas = [
    ...f.receivables.map(r => ({
      label: r.source === 'ml' ? 'Mercado Livre' : 'Entrada prevista',
      date: r.dateIso, amount: r.amountCents, positive: true, estimado: false,
    })),
    ...f.probableReceivables.map(r => ({
      label: r.source === 'tiktok' ? 'TikTok' : 'Shopee',
      date: r.dateIso, amount: r.amountCents, positive: true, estimado: true,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);

  if (semDados) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Ainda não dá pra projetar"
        description="A previsão precisa de recebíveis (um marketplace conectado) ou de contas a pagar lançadas no Fluxo de Caixa. Faça um dos dois pra começar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/integrations">Conectar marketplace</Link></Button>
            <Button asChild variant="outline"><Link to="/fluxo-caixa/lancamentos">Abrir Fluxo de Caixa</Link></Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {semMarketplace && (
        <Card className="ring-1 ring-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Plug className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm">
              Nenhum marketplace conectado — a projeção está usando só o que você lançou no Fluxo de Caixa
              (contas a pagar e entradas previstas).{' '}
              <Link to="/integrations" className="font-medium underline underline-offset-2">Conecte o Mercado Livre</Link>{' '}
              pra incluir os recebíveis com data de liberação.
            </p>
          </CardContent>
        </Card>
      )}

      <AnchorCard f={f} />

      {/* Veredito */}
      {neg ? (
        <Card className="ring-1 ring-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-sm font-medium">
              {neg.offset === 0 ? (
                <>
                  O saldo projetado já fecha <strong className="text-destructive">{brl(neg.saldoCents)}</strong> hoje —
                </>
              ) : (
                <>
                  <strong className="capitalize">{emQuantosDias(neg.offset)}</strong> ({dataCurta(neg.dateIso)}) o
                  saldo projetado fica em <strong className="text-destructive">{brl(neg.saldoCents)}</strong> —
                </>
              )}{' '}
              contando só o dinheiro já garantido (recebíveis com data de liberação + contas lançadas).
              Antecipe um recebível, adie uma conta ou reforce o caixa antes disso.
              {temProvavel && (
                <span className="mt-1 block font-normal text-muted-foreground">
                  Contando também os recebíveis estimados ({labelEstimado.replace(' estimado', '')}), o pior dia seria{' '}
                  <strong>{brl(result.saldoMinimoComProvavel.saldoCents)}</strong> em{' '}
                  {dataCurta(result.saldoMinimoComProvavel.dateIso)} — mas isso é estimativa, não conte com ela.
                </span>
              )}
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
              em <strong>{dataCurta(result.saldoMinimo.dateIso)}</strong>
              {temProvavel && ' — contando só o que já está garantido'}.
            </p>
          </CardContent>
        </Card>
      )}

      <AntecipacaoCard f={f} />

      {/* Gráfico */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-semibold">Saldo projetado — 30 dias</h3>
            <div className="flex flex-wrap gap-x-4 text-[10px] text-muted-foreground">
              <span><span className="mr-1 inline-block h-0.5 w-3 bg-primary align-middle" />confirmado</span>
              {temProvavel && (
                <span><span className="mr-1 inline-block h-0 w-3 border-t-2 border-dashed border-primary/70 align-middle" />+ {labelEstimado}</span>
              )}
              {showTendencia && (
                <span><span className="mr-1 inline-block size-2 rounded-sm bg-primary/20 align-middle" />+ tendência de vendas</span>
              )}
              {perigo && (
                <span><span className="mr-1 inline-block h-px w-3 bg-destructive align-middle" />zero</span>
              )}
            </div>
          </div>
          <ForecastChart
            dias={result.dias}
            showTendencia={showTendencia}
            showProvavel={temProvavel}
            destacarZero={perigo}
          />
          <div className={cn('grid gap-3 pt-1 sm:grid-cols-2', temProvavel ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            <Stat label="Entra (garantido)" value={brl(result.totalEntradasCents)}
              hint="recebíveis com data + entradas pendentes" />
            {temProvavel && (
              <Stat label="Entra (estimado)" value={`≈ ${brl(result.totalProvavelCents)}`}
                hint={
                  temShopeeProv && temTiktokProv ? 'escrow Shopee projetado + repasses TikTok pendentes'
                  : temTiktokProv ? 'repasses TikTok pendentes do último upload'
                  : 'escrow Shopee projetado por D+N dos pedidos em trânsito'
                } />
            )}
            <Stat label="Sai" value={brl(result.totalSaidasCents)}
              hint="contas a pagar lançadas no período" />
            <Stat label="Saldo em 30 dias" value={brl(result.saldoFinalCents)}
              hint="linha conservadora, sem estimativa" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard
          title="Próximas entradas"
          icon={TrendingUp}
          rows={proximasEntradas}
          empty="Nenhum recebível previsto nos próximos 30 dias."
        />
        <ListCard
          title="Próximas saídas"
          icon={Wallet}
          rows={f.payables.slice(0, 7).map(p => ({
            label: p.label,
            date: p.dateIso,
            amount: p.amountCents,
            positive: false,
            estimado: false,
          }))}
          empty="Nenhuma conta a pagar lançada para os próximos 30 dias."
        />
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Isto é caixa, não competência: mostra quando o dinheiro entra e sai da conta, não quando a venda
          acontece — por isso pode divergir do lucro da DRE no mesmo período. Os recebíveis do Mercado Livre
          usam a data real de liberação.
          {f.hasShopee && ` ${textoCalibShopee(f.shopeeCalib)}`}
          {f.hasTiktok && ' Os do TikTok são os repasses ainda pendentes do último arquivo que você importou — reimporte de vez em quando pra manter a projeção viva.'}
          {' '}A tendência é uma estimativa pelo ritmo de vendas dos últimos 30 dias.
        </span>
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

// Antecipação inteligente: só aparece quando o pior dia da janela fica no
// vermelho. Calcula o valor MÍNIMO a antecipar pra cobrir o buraco, não
// "antecipe tudo" — e só em cima de recebíveis do Mercado Livre (o único com
// data de liberação real hoje; Shopee/TikTok são estimativa, não dá pra
// antecipar em cima de estimativa).
function AntecipacaoCard({ f }: { f: ReturnType<typeof useCashFlowForecast> }) {
  const [taxaDraft, setTaxaDraft] = useState('');
  const { result } = f;
  const gapCents = Math.max(0, -result.saldoMinimo.saldoCents);
  if (gapCents <= 0) return null;

  const recupera = diasParaRecuperar(result.dias, result.saldoMinimo.offset);

  const taxaNum = parseFloat(taxaDraft.trim().replace(',', '.'));
  const taxaValida = taxaDraft.trim() !== '' && Number.isFinite(taxaNum) && taxaNum > 0;

  const candidatos: AntecipacaoCandidato[] = f.receivables
    .filter(r => r.source === 'ml')
    .map(r => ({ dateIso: r.dateIso, amountCents: r.amountCents, source: r.source }));

  const plano = taxaValida
    ? planejarAntecipacao(gapCents, format(new Date(), 'yyyy-MM-dd'), candidatos, { taxaDiariaPct: taxaNum })
    : null;

  return (
    <Card className="ring-1 ring-warning/40 bg-warning/5">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start gap-3">
          <TrendingDown className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium">
              Pra não fechar no vermelho em <strong>{dataCurta(result.saldoMinimo.dateIso)}</strong>, faltam{' '}
              <strong className="text-warning">{brl(gapCents)}</strong>.
            </p>
            {recupera != null && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3 shrink-0" />
                Sem fazer nada, o saldo se recupera sozinho {recupera === 0 ? 'no dia seguinte' : `em ${recupera} dia${recupera === 1 ? '' : 's'}`}
                {' '}— se der pra esperar, não precisa antecipar nada.
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-warning">
              ⚠️ Isso é uma projeção (recebíveis + contas lançadas), não uma garantia. Confira o saldo real
              em conta e as datas antes de decidir antecipar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="taxa-antecipacao" className="text-xs">Taxa de antecipação (% ao dia)</Label>
            <Input
              id="taxa-antecipacao"
              inputMode="decimal"
              className="mt-1 w-32 font-mono"
              placeholder="ex.: 0,15"
              value={taxaDraft}
              onChange={e => setTaxaDraft(e.target.value)}
            />
          </div>
          <p className="max-w-sm text-xs text-muted-foreground">
            Confira a sua taxa real na Central do Vendedor — varia por marketplace e por quantos dias faltam
            pro repasse cair sozinho.
          </p>
        </div>

        {plano && plano.itens.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-background px-3 py-3">
            <p className="text-xs font-semibold">
              {plano.cobre ? 'Antecipando isso, cobre o buraco todo:' : 'Não cobre tudo, mas é o que dá pra antecipar:'}
            </p>
            <ul className="space-y-1.5">
              {plano.itens.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate">
                    {it.fracaoUsada < 0.99 ? `${(it.fracaoUsada * 100).toFixed(0)}% do ` : ''}recebível de {dataCurta(it.dateIso)}
                    <span className="text-muted-foreground"> · {it.diasAntecipados}d antecipados</span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">
                    +{brl(it.valorLiquidoCents)} <span className="text-muted-foreground">(−{brl(it.custoCents)})</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs font-semibold">
              <span>Total líquido hoje</span>
              <span className="font-mono">
                {brl(plano.totalLiquidoCents)}{' '}
                <span className="font-normal text-muted-foreground">({plano.taxaMediaEfetivaPct.toFixed(2)}% de custo médio)</span>
              </span>
            </div>
          </div>
        )}
        {plano && plano.itens.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Não há recebível do Mercado Livre com data futura pra antecipar nesse período — só dá pra esperar
            ou reforçar o caixa de outra forma.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          Só considera recebíveis do Mercado Livre com data de liberação confirmada — é o único hoje com uma
          data real. Estimativa de Shopee/TikTok fica de fora (não dá pra antecipar em cima de estimativa).
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

interface ListRow { label: string; date: string; amount: number; positive: boolean; estimado: boolean }

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
                  <span className="block truncate">
                    {r.label}
                    {r.estimado && <span className="ml-1 text-[10px] text-muted-foreground">estimado</span>}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{dataCurta(r.date)}</span>
                </span>
                <span className={cn('font-mono tabular-nums', r.positive ? 'text-success' : 'text-destructive')}>
                  {r.estimado ? '≈ ' : r.positive ? '+' : '−'}{brl(r.amount)}
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
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/fluxo-caixa">Fluxo de caixa completo</Link>
        </Button>
      }
    >
      <PrevisaoContent />
    </PageShell>
  );
}
