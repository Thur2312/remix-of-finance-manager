import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceDot, type TooltipProps,
} from 'recharts';
import { FlaskConical, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { simulatePrice, priceCurve, type PriceScenarioBaseline } from '@/lib/scenario';
import { type Marketplace } from '@/lib/marketplace-fees';
import { useAnuncios } from '@/hooks/useProdutos';

// Radix Select não aceita value="" — o "outro" usa o sentinel 'outro'.
type MpValue = Marketplace | 'outro';

const MP_OPTIONS: { value: MpValue; label: string }[] = [
  { value: 'Shopee', label: 'Shopee' },
  { value: 'TiktokShop', label: 'TikTok Shop' },
  { value: 'MercadoLivre', label: 'Mercado Livre' },
  { value: 'outro', label: 'Outro / manual' },
];

function toMpValue(raw: string | null): MpValue {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('shopee')) return 'Shopee';
  if (s.includes('tiktok')) return 'TiktokShop';
  if (s.includes('mercado') || s === 'ml') return 'MercadoLivre';
  return 'outro';
}

const num = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

interface Fields {
  nome: string;
  marketplace: MpValue;
  custo: string;
  custoVar: string;
  impostoPct: string;
  afiliadosPct: string;
  comissaoPctManual: string;
  taxaFixaManual: string;
  precoAtual: string;
  unidadesMes: string;
}

const EMPTY: Fields = {
  nome: '', marketplace: 'Shopee', custo: '', custoVar: '0',
  impostoPct: '0', afiliadosPct: '0', comissaoPctManual: '', taxaFixaManual: '',
  precoAtual: '', unidadesMes: '',
};

function fieldsToBaseline(f: Fields): PriceScenarioBaseline {
  return {
    nome: f.nome || 'Produto',
    marketplace: f.marketplace === 'outro' ? '' : f.marketplace,
    custo: num(f.custo),
    custoVar: num(f.custoVar),
    impostoPct: num(f.impostoPct),
    afiliadosPct: num(f.afiliadosPct),
    comissaoPctManual: num(f.comissaoPctManual),
    taxaFixaManual: num(f.taxaFixaManual),
    precoAtual: num(f.precoAtual),
    unidadesMes: num(f.unidadesMes),
  };
}

// ─── Veredito (o coração) ────────────────────────────────────────────────────

const VEREDITO_STYLE = {
  melhora:   { ring: 'ring-success/30 bg-success/5',       icon: CheckCircle2,  color: 'text-success' },
  plausivel: { ring: 'ring-primary/30 bg-primary/5',       icon: TrendingUp,    color: 'text-primary' },
  dificil:   { ring: 'ring-warning/40 bg-warning/5',       icon: AlertTriangle, color: 'text-warning' },
  inviavel:  { ring: 'ring-destructive/40 bg-destructive/5', icon: TrendingDown, color: 'text-destructive' },
} as const;

function Veredito({ base, novoPreco }: { base: PriceScenarioBaseline; novoPreco: number }) {
  const s = simulatePrice(base, novoPreco);
  const st = VEREDITO_STYLE[s.veredito];
  const Icon = st.icon;
  const dPreco = ((novoPreco - base.precoAtual) / base.precoAtual) * 100;
  const dPrecoTxt = `${dPreco >= 0 ? '+' : ''}${dPreco.toFixed(0)}%`;

  const faixaMudou = s.baseline.taxaFixa !== s.simulado.taxaFixa || s.baseline.comissaoPct !== s.simulado.comissaoPct;
  const faixaPior = faixaMudou && s.simulado.lucroUnit < s.baseline.lucroUnit
    && (s.simulado.taxaFixa - s.baseline.taxaFixa) + base.precoAtual * ((s.simulado.comissaoPct - s.baseline.comissaoPct) / 100) > 0;

  return (
    <Card className={cn('ring-1', st.ring)}>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-start gap-3">
          <Icon className={cn('mt-0.5 size-5 shrink-0', st.color)} />
          <div className="space-y-1">
            {s.veredito === 'inviavel' ? (
              <p className="text-sm font-medium">
                A {formatCurrency(novoPreco)} ({dPrecoTxt}) você <strong>perde {formatCurrency(Math.abs(s.simulado.lucroUnit))} por unidade</strong>.
                Não existe volume que salve — cada venda aumenta o prejuízo.
              </p>
            ) : s.veredito === 'melhora' ? (
              <p className="text-sm font-medium">
                A {formatCurrency(novoPreco)} ({dPrecoTxt}), o lucro por unidade vai de{' '}
                {formatCurrency(s.baseline.lucroUnit)} para <strong>{formatCurrency(s.simulado.lucroUnit)}</strong>.
                Vendendo o mesmo tanto, são <strong className={st.color}>{formatCurrency(s.simulado.deltaLucroVolumeConstante)} a mais por mês</strong>.
                {s.simulado.deltaVolumePct != null && s.simulado.deltaVolumePct < -1 && (
                  <> Dá até para <strong className={st.color}>vender {Math.abs(s.simulado.deltaVolumePct).toFixed(0)}% menos</strong> e ainda manter o lucro de hoje.</>
                )}
              </p>
            ) : (
              <p className="text-sm font-medium">
                A {formatCurrency(novoPreco)} ({dPrecoTxt}), o lucro por unidade cai para{' '}
                <strong>{formatCurrency(s.simulado.lucroUnit)}</strong>. Para manter os{' '}
                <strong>{formatCurrency(s.lucroMesAtual)}/mês</strong> deste produto você precisa vender{' '}
                <strong className={st.color}>{s.simulado.volumeBreakEven} un/mês</strong> — hoje são {base.unidadesMes}.{' '}
                <strong className={st.color}>{s.simulado.deltaVolumePct! >= 0 ? '+' : ''}{s.simulado.deltaVolumePct!.toFixed(0)}%</strong>.{' '}
                {s.veredito === 'plausivel'
                  ? 'É pouca venda a mais — se o preço menor destrava mais demanda que isso, vale.'
                  : 'É muita venda a mais só para empatar. Precisa destravar bastante demanda (Buy Box, campanha) para compensar.'}
              </p>
            )}
          </div>
        </div>

        {faixaPior && (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              A faixa de taxa do marketplace muda nesse intervalo — comissão {s.baseline.comissaoPct}% → {s.simulado.comissaoPct}%,
              taxa fixa {formatCurrency(s.baseline.taxaFixa)} → {formatCurrency(s.simulado.taxaFixa)}. Ficar logo abaixo do limite pode render mais.
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3 text-center">
          <MiniStat label="Margem" cur={`${s.baseline.margemPct.toFixed(0)}%`} nov={`${s.simulado.margemPct.toFixed(0)}%`} />
          <MiniStat label="Lucro / un." cur={formatCurrency(s.baseline.lucroUnit)} nov={formatCurrency(s.simulado.lucroUnit)} />
          <MiniStat
            label="Lucro / mês (volume atual)"
            cur={formatCurrency(s.baseline.lucroMesVolumeConstante)}
            nov={formatCurrency(s.simulado.lucroMesVolumeConstante)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, cur, nov }: { label: string; cur: string; nov: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1.5 font-mono text-sm tabular-nums">
        <span className="text-muted-foreground line-through decoration-1">{cur}</span>
        <ArrowRight className="size-3 text-muted-foreground" />
        <span className="font-semibold">{nov}</span>
      </p>
    </div>
  );
}

// ─── Curva lucro × preço ────────────────────────────────────────────────────

function CurveTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-lg">
      <p className="font-medium">{formatCurrency(Number(label))}</p>
      <p className="font-mono tabular-nums">{formatCurrency(payload[0]?.value ?? 0)}/mês</p>
    </div>
  );
}

function Curva({ base, novoPreco }: { base: PriceScenarioBaseline; novoPreco: number }) {
  const data = useMemo(() => priceCurve(base), [base]);
  const atualLucro = useMemo(() => simulatePrice(base, base.precoAtual).baseline.lucroMesVolumeConstante, [base]);
  const novoLucro = useMemo(() => simulatePrice(base, novoPreco).simulado.lucroMesVolumeConstante, [base, novoPreco]);

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Lucro do mês × preço <span className="font-normal text-muted-foreground">(mesmo volume)</span></h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Se nada mais mudasse, o lucro sobe com o preço — as quedinhas são as trocas de faixa de taxa do marketplace.
        </p>
        <ResponsiveContainer width="100%" height={220} className="mt-3">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="preco" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => `R$${v.toFixed(0)}`} tick={{ fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CurveTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
            <Line type="monotone" dataKey="lucroMes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <ReferenceDot x={base.precoAtual} y={atualLucro} r={4} fill="hsl(var(--muted-foreground))" stroke="hsl(var(--background))" strokeWidth={2} />
            <ReferenceDot x={novoPreco} y={novoLucro} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground" /> Preço atual</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Simulado</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Simulador() {
  const { anuncios, isLoading } = useAnuncios();
  const [origem, setOrigem] = useState<'anuncio' | 'manual'>('anuncio');
  const [anuncioId, setAnuncioId] = useState<string>('');
  const [f, setF] = useState<Fields>(EMPTY);
  // Preço simulado: número (fonte de verdade) + texto do input (evita
  // reformatar no meio da digitação). `null` = ainda igual ao preço atual.
  const [novoPrecoRaw, setNovoPrecoRaw] = useState<number | null>(null);
  const [precoText, setPrecoText] = useState<string | null>(null);

  const set = (k: keyof Fields, v: string) => setF(prev => ({ ...prev, [k]: v }));
  const setPreco = (n: number) => { setNovoPrecoRaw(n); setPrecoText(n.toFixed(2)); };

  const pickAnuncio = (id: string) => {
    setAnuncioId(id);
    const a = anuncios.find(x => x.id === id);
    if (!a) return;
    const custoAdd = (a.custos_adicionais ?? []).reduce(
      (acc, c) => acc + (c.tipo === 'percent' ? a.custo * (c.valor / 100) : c.valor), 0,
    );
    setF({
      nome: a.nome_anuncio,
      marketplace: toMpValue(a.marketplace),
      custo: String(a.custo + custoAdd + (a.antecipado || 0)),
      custoVar: String(a.custo_var || 0),
      impostoPct: String(a.imposto_pct || 0),
      afiliadosPct: String(a.afiliados || 0),
      comissaoPctManual: String(parseFloat(String(a.comissao_taxa)) || 0),
      taxaFixaManual: '0',
      precoAtual: String(a.valor_venda),
      unidadesMes: '',
    });
    setNovoPrecoRaw(null);
    setPrecoText(null);
  };

  const base = useMemo(() => fieldsToBaseline(f), [f]);
  const pronto = base.precoAtual > 0 && base.custo >= 0 && base.unidadesMes > 0
    && (base.marketplace !== '' || (base.comissaoPctManual ?? 0) > 0);
  const novoPreco = novoPrecoRaw ?? base.precoAtual;

  return (
    <PageShell
      icon={FlaskConical}
      title="Simulador"
      subtitle="E se você mexesse no preço de um produto que já vende?"
      className="space-y-6"
    >
      {/* Setup */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1 text-sm font-medium">
            {(['anuncio', 'manual'] as const).map(o => (
              <button
                key={o}
                onClick={() => setOrigem(o)}
                className={cn('flex-1 rounded-md px-3 py-1.5 transition-colors',
                  origem === o ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {o === 'anuncio' ? 'De um anúncio' : 'Manual'}
              </button>
            ))}
          </div>

          {origem === 'anuncio' && (
            <div className="space-y-1.5">
              <Label>Anúncio cadastrado</Label>
              <Select value={anuncioId} onValueChange={pickAnuncio} disabled={isLoading || anuncios.length === 0}>
                <SelectTrigger><SelectValue placeholder={anuncios.length ? 'Escolha um produto' : 'Nenhum anúncio cadastrado'} /></SelectTrigger>
                <SelectContent>
                  {anuncios.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome_anuncio} — {formatCurrency(a.valor_venda)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Preenche os campos abaixo. Revise antes de simular — os anúncios não guardam quantas unidades você vende.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fld label="Produto" v={f.nome} onChange={v => set('nome', v)} />
            <div className="space-y-1.5">
              <Label className="text-xs">Marketplace</Label>
              <Select value={f.marketplace} onValueChange={v => set('marketplace', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Fld label="Preço de venda atual (R$)" v={f.precoAtual} onChange={v => set('precoAtual', v)} numeric />
            <Fld label="Unidades vendidas / mês" v={f.unidadesMes} onChange={v => set('unidadesMes', v)} numeric />
            <Fld label="Custo do produto (R$)" v={f.custo} onChange={v => set('custo', v)} numeric />
            <Fld label="Custo variável / embalagem (R$)" v={f.custoVar} onChange={v => set('custoVar', v)} numeric />
            <Fld label="Imposto (%)" v={f.impostoPct} onChange={v => set('impostoPct', v)} numeric />
            <Fld label="Afiliados (%)" v={f.afiliadosPct} onChange={v => set('afiliadosPct', v)} numeric />
            {f.marketplace === 'outro' && (
              <>
                <Fld label="Comissão (%)" v={f.comissaoPctManual} onChange={v => set('comissaoPctManual', v)} numeric />
                <Fld label="Taxa fixa por venda (R$)" v={f.taxaFixaManual} onChange={v => set('taxaFixaManual', v)} numeric />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!pronto ? (
        <EmptyState
          icon={Sparkles}
          title="Preencha o produto para simular"
          description="Precisa do preço atual, do custo e de quantas unidades você vende por mês. O resto o simulador calcula."
        />
      ) : (
        <>
          {/* Slider de preço */}
          <Card>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-baseline justify-between">
                <Label>Novo preço de venda</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <Input
                    className="h-9 w-28 text-right font-mono"
                    inputMode="decimal"
                    value={precoText ?? novoPreco.toFixed(2)}
                    onChange={e => { setPrecoText(e.target.value); setNovoPrecoRaw(num(e.target.value)); }}
                    onBlur={() => setPrecoText(novoPreco.toFixed(2))}
                  />
                  <span className={cn('w-14 text-right text-sm font-medium',
                    novoPreco >= base.precoAtual ? 'text-success' : 'text-destructive')}>
                    {novoPreco >= base.precoAtual ? '+' : ''}{(((novoPreco - base.precoAtual) / base.precoAtual) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <Slider
                min={Math.round(base.precoAtual * 0.6)}
                max={Math.round(base.precoAtual * 1.5)}
                step={0.5}
                value={[Math.min(Math.max(novoPreco, base.precoAtual * 0.6), base.precoAtual * 1.5)]}
                onValueChange={([v]) => setPreco(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(base.precoAtual * 0.6)}</span>
                <span>atual: {formatCurrency(base.precoAtual)}</span>
                <span>{formatCurrency(base.precoAtual * 1.5)}</span>
              </div>
            </CardContent>
          </Card>

          <Veredito base={base} novoPreco={novoPreco} />
          <Curva base={base} novoPreco={novoPreco} />
        </>
      )}
    </PageShell>
  );
}

function Fld({ label, v, onChange, numeric }: { label: string; v: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-9"
        inputMode={numeric ? 'decimal' : undefined}
        value={v}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
