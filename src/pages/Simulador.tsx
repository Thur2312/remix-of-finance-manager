import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, ReferenceDot, type TooltipProps,
} from 'recharts';
import {
  FlaskConical, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles,
  Save, RotateCcw, Trash2, Scissors,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { simulatePrice, priceCurve, projectVolume, type PriceScenarioBaseline } from '@/lib/scenario';
import { aggregateShopeeSkuFinance } from '@/lib/shopee-sku-finance';
import { type Marketplace } from '@/lib/marketplace-fees';
import { useAnuncios } from '@/hooks/useProdutos';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useProductCosts } from '@/hooks/useProductCosts';

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
const round1 = (n: number) => Math.round(n * 10) / 10;

interface Fields {
  nome: string;
  marketplace: MpValue;
  custo: string;
  custoVar: string;
  custoExtra: string;
  impostoPct: string;
  afiliadosPct: string;
  comissaoPctManual: string;
  taxaFixaManual: string;
  precoAtual: string;
  unidadesMes: string;
}

const EMPTY: Fields = {
  nome: '', marketplace: 'Shopee', custo: '', custoVar: '0', custoExtra: '0',
  impostoPct: '0', afiliadosPct: '0', comissaoPctManual: '', taxaFixaManual: '',
  precoAtual: '', unidadesMes: '',
};

function fieldsToBaseline(f: Fields): PriceScenarioBaseline {
  return {
    nome: f.nome || 'Produto',
    marketplace: f.marketplace === 'outro' ? '' : f.marketplace,
    custo: num(f.custo),
    custoVar: num(f.custoVar),
    custoExtraPorVenda: num(f.custoExtra),
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

// ─── Expectativa de volume (a outra metade do modelo) ───────────────────────

function VolumeExpectativa({
  base, novoPreco, volPct, onChange,
}: { base: PriceScenarioBaseline; novoPreco: number; volPct: number | null; onChange: (v: number) => void }) {
  const pct = volPct ?? 0;
  const unidades = Math.max(0, base.unidadesMes * (1 + pct / 100));
  const proj = projectVolume(base, novoPreco, unidades);
  const ganhou = proj.deltaVsHoje >= 0;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-baseline justify-between">
          <Label>E se o volume mudar?</Label>
          <span className={cn('text-sm font-medium', pct >= 0 ? 'text-success' : 'text-destructive')}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(0)}% · {Math.round(unidades)} un/mês
          </span>
        </div>
        <Slider min={-40} max={100} step={1} value={[pct]} onValueChange={([v]) => onChange(v)} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>−40%</span><span>hoje: {base.unidadesMes} un</span><span>+100%</span>
        </div>
        <div className={cn('rounded-md px-3 py-2.5 text-sm', ganhou ? 'bg-success/10' : 'bg-destructive/10')}>
          Com <strong>{Math.round(unidades)} un/mês</strong> a {formatCurrency(novoPreco)}, o lucro deste produto seria{' '}
          <strong>{formatCurrency(proj.lucroMes)}/mês</strong> —{' '}
          <strong className={ganhou ? 'text-success' : 'text-destructive'}>
            {proj.deltaVsHoje >= 0 ? '+' : ''}{formatCurrency(proj.deltaVsHoje)}
          </strong>{' '}
          vs hoje. {proj.cobreBreakEven ? 'Passa do ponto de equilíbrio.' : 'Ainda abaixo do ponto de equilíbrio.'}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Cenário "tirar do ar" ──────────────────────────────────────────────────

function TirarDoAr({ base }: { base: PriceScenarioBaseline }) {
  const s = simulatePrice(base, base.precoAtual);
  const contribUnit = s.baseline.lucroUnit;         // margem de contribuição por unidade
  const contribMes = s.lucroMesAtual;
  const daPrejuizo = contribUnit <= 0;

  return (
    <Card className={cn('ring-1', daPrejuizo ? 'ring-success/30 bg-success/5' : 'ring-warning/40 bg-warning/5')}>
      <CardContent className="space-y-3 py-5 text-sm">
        {daPrejuizo ? (
          <p className="font-medium">
            <CheckCircle2 className="mr-1.5 inline size-4 text-success" />
            Cada venda deste produto <strong>tira {formatCurrency(Math.abs(contribUnit))} do seu bolso</strong>. Tirar do ar
            melhora seu resultado em <strong className="text-success">{formatCurrency(Math.abs(contribMes))}/mês</strong>.
            {' '}A menos que ele exista pra girar estoque ou trazer tráfego pros outros — aí é decisão de estratégia, não de finanças.
          </p>
        ) : (
          <p className="font-medium">
            <AlertTriangle className="mr-1.5 inline size-4 text-warning" />
            Este produto <strong>contribui {formatCurrency(contribMes)}/mês</strong> pro seu resultado
            ({formatCurrency(contribUnit)} por unidade × {base.unidadesMes}).
          </p>
        )}
        {!daPrejuizo && (
          <div className="rounded-md bg-background/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Cuidado com a intuição de "margem baixa → cortar".</strong> Cortar
            <strong> não reduz</strong> seus custos fixos (aluguel, contador, ferramentas) — eles continuam e se
            redistribuem pros produtos que sobraram, apertando a margem deles. Só vale cortar se você usa o
            <strong> capital de giro</strong> parado neste produto e o <strong>tempo de operação</strong> dele (anúncio,
            atendimento, compra) pra algo que rende <strong>mais de {formatCurrency(contribMes)}/mês</strong>.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Cenários salvos (localStorage, por navegador) ──────────────────────────

interface SavedScenario {
  id: string;
  nome: string;
  fields: Fields;
  novoPreco: number;
  // headline pré-calculado, só pra listar
  precoAtual: number;
  lucroMesAntes: number;
  lucroMesDepois: number;
  veredito: string;
}

const STORE_KEY = 'simulador:cenarios';

function loadSaved(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SavedScenario[]) : [];
  } catch {
    return [];
  }
}
function persist(list: SavedScenario[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 12))); } catch { /* quota / private mode */ }
}

const VEREDITO_LABEL: Record<string, string> = {
  melhora: 'Melhora', plausivel: 'Plausível', dificil: 'Difícil', inviavel: 'Inviável',
};

function CenariosSalvos({ list, onLoad, onRemove }: {
  list: SavedScenario[]; onLoad: (s: SavedScenario) => void; onRemove: (id: string) => void;
}) {
  if (list.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="text-sm font-semibold">Cenários salvos <span className="font-normal text-muted-foreground">— comparar</span></h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Cenário</th>
                <th className="pb-2 pr-3 font-medium">Preço</th>
                <th className="pb-2 pr-3 font-medium">Lucro/mês</th>
                <th className="pb-2 pr-3 font-medium">Veredito</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {list.map(s => {
                const delta = s.lucroMesDepois - s.lucroMesAntes;
                return (
                  <tr key={s.id}>
                    <td className="py-2 pr-3">{s.nome}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {formatCurrency(s.precoAtual)} <ArrowRight className="inline size-3 text-muted-foreground" /> {formatCurrency(s.novoPreco)}
                    </td>
                    <td className={cn('py-2 pr-3 font-mono tabular-nums', delta >= 0 ? 'text-success' : 'text-destructive')}>
                      {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                    </td>
                    <td className="py-2 pr-3 text-xs">{VEREDITO_LABEL[s.veredito] ?? s.veredito}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => onLoad(s)} className="mr-2 text-xs text-primary hover:underline">
                        <RotateCcw className="inline size-3" /> carregar
                      </button>
                      <button onClick={() => onRemove(s.id)} className="text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="inline size-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

const SYNC_DIAS = 15;

export default function Simulador() {
  const { anuncios, isLoading } = useAnuncios();
  const { activeConnection } = useActiveShopeeConnection();
  const { data: syncData } = useShopeeSync(activeConnection?.status === 'connected' ? activeConnection.id : null, SYNC_DIAS);
  const { data: productCosts } = useProductCosts();

  // Top SKUs vendidos de verdade (path sync Shopee) — origem "das minhas vendas".
  const skusVendidos = useMemo(() => {
    if (!syncData?.orders?.length) return [];
    return aggregateShopeeSkuFinance(syncData.orders, syncData.payments ?? [], productCosts ?? [])
      .filter(r => r.itens_vendidos > 0 && r.total_faturado > 0)
      .sort((a, b) => b.total_faturado - a.total_faturado)
      .slice(0, 20);
  }, [syncData, productCosts]);

  const [origem, setOrigem] = useState<'anuncio' | 'vendas' | 'manual'>('anuncio');
  const [anuncioId, setAnuncioId] = useState<string>('');
  const [skuKey, setSkuKey] = useState<string>('');
  const [f, setF] = useState<Fields>(EMPTY);
  // Preço simulado: número (fonte de verdade) + texto do input (evita
  // reformatar no meio da digitação). `null` = ainda igual ao preço atual.
  const [novoPrecoRaw, setNovoPrecoRaw] = useState<number | null>(null);
  const [precoText, setPrecoText] = useState<string | null>(null);
  // expectativa de mudança de volume no novo preço (%). null = ainda não mexeu.
  const [volPct, setVolPct] = useState<number | null>(null);
  const [cenario, setCenario] = useState<'preco' | 'cortar'>('preco');
  const [salvos, setSalvos] = useState<SavedScenario[]>(loadSaved);

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
      custoExtra: '0',
      impostoPct: String(a.imposto_pct || 0),
      afiliadosPct: String(a.afiliados || 0),
      comissaoPctManual: String(parseFloat(String(a.comissao_taxa)) || 0),
      taxaFixaManual: '0',
      precoAtual: String(a.valor_venda),
      unidadesMes: '',
    });
    setNovoPrecoRaw(null);
    setPrecoText(null);
    setVolPct(null);
  };

  const pickSku = (key: string) => {
    setSkuKey(key);
    const r = skusVendidos.find(x => x.key === key);
    if (!r) return;
    const precoMedio = r.total_faturado / r.itens_vendidos;
    const unidadesMes = r.itens_vendidos * (30 / SYNC_DIAS); // extrapola a janela de 15d
    setF({
      ...EMPTY,
      nome: r.nome_produto,
      marketplace: 'Shopee',
      custo: r.custo_unitario_medio > 0 ? String(round1(r.custo_unitario_medio)) : '',
      precoAtual: String(round1(precoMedio)),
      unidadesMes: String(Math.round(unidadesMes)),
    });
    setNovoPrecoRaw(null);
    setPrecoText(null);
    setVolPct(null);
  };

  const base = useMemo(() => fieldsToBaseline(f), [f]);
  const pronto = base.precoAtual > 0 && base.custo >= 0 && base.unidadesMes > 0
    && (base.marketplace !== '' || (base.comissaoPctManual ?? 0) > 0);
  const novoPreco = novoPrecoRaw ?? base.precoAtual;

  const salvarCenario = () => {
    const s = simulatePrice(base, novoPreco);
    const novo: SavedScenario = {
      id: crypto.randomUUID(),
      nome: `${base.nome} — ${formatCurrency(novoPreco)}`,
      fields: f,
      novoPreco,
      precoAtual: base.precoAtual,
      lucroMesAntes: s.lucroMesAtual,
      lucroMesDepois: s.simulado.lucroMesVolumeConstante,
      veredito: s.veredito,
    };
    const next = [novo, ...salvos].slice(0, 12);
    setSalvos(next);
    persist(next);
  };
  const carregarCenario = (s: SavedScenario) => {
    setF(s.fields);
    setPreco(s.novoPreco);
    setCenario('preco');
  };
  const removerCenario = (id: string) => {
    const next = salvos.filter(s => s.id !== id);
    setSalvos(next);
    persist(next);
  };

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
            {([
              ['vendas', 'Das minhas vendas'],
              ['anuncio', 'De um anúncio'],
              ['manual', 'Manual'],
            ] as const).map(([o, label]) => (
              <button
                key={o}
                onClick={() => setOrigem(o)}
                className={cn('flex-1 rounded-md px-3 py-1.5 transition-colors',
                  origem === o ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>

          {origem === 'vendas' && (
            <div className="space-y-1.5">
              <Label>Produto vendido (Shopee, últimos {SYNC_DIAS} dias)</Label>
              <Select value={skuKey} onValueChange={pickSku} disabled={skusVendidos.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={skusVendidos.length ? 'Escolha um produto' : 'Nenhuma venda sincronizada'} />
                </SelectTrigger>
                <SelectContent>
                  {skusVendidos.map(r => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.nome_produto} — {r.itens_vendidos} un · {formatCurrency(r.total_faturado)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preço, custo e volume vêm dos pedidos reais. O volume/mês é estimado ({SYNC_DIAS} dias × 2) — ajuste se souber melhor.
              </p>
            </div>
          )}

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
            <Fld label="Frete / ads por venda (R$)" v={f.custoExtra} onChange={v => set('custoExtra', v)} numeric
              hint="O que você paga por venda e não muda com o preço" />
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
          {/* Cenário */}
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1 text-sm font-medium">
            <button onClick={() => setCenario('preco')}
              className={cn('flex-1 rounded-md px-3 py-1.5 transition-colors',
                cenario === 'preco' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              Mudar o preço
            </button>
            <button onClick={() => setCenario('cortar')}
              className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors',
                cenario === 'cortar' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Scissors className="size-3.5" /> Tirar do ar
            </button>
          </div>

          {cenario === 'cortar' ? (
            <TirarDoAr base={base} />
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
                min={round1(base.precoAtual * 0.75)}
                max={round1(base.precoAtual * 1.3)}
                step={0.5}
                value={[Math.min(Math.max(novoPreco, base.precoAtual * 0.75), base.precoAtual * 1.3)]}
                onValueChange={([v]) => setPreco(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(base.precoAtual * 0.75)}</span>
                <span>atual: {formatCurrency(base.precoAtual)}</span>
                <span>{formatCurrency(base.precoAtual * 1.3)}</span>
              </div>
            </CardContent>
          </Card>

          {Math.abs(novoPreco - base.precoAtual) < 0.01 ? (
            <Card className="ring-1 ring-border">
              <CardContent className="py-5 text-center text-sm text-muted-foreground">
                Mexa no preço acima para ver o efeito no lucro e o ponto de equilíbrio de volume.
              </CardContent>
            </Card>
          ) : (
            <>
              <Veredito base={base} novoPreco={novoPreco} />
              <VolumeExpectativa base={base} novoPreco={novoPreco} volPct={volPct} onChange={setVolPct} />
            </>
          )}
          <Curva base={base} novoPreco={novoPreco} />

          {Math.abs(novoPreco - base.precoAtual) >= 0.01 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={salvarCenario}>
                <Save className="mr-1.5 size-3.5" /> Salvar este cenário
              </Button>
            </div>
          )}
          </>
          )}

          <CenariosSalvos list={salvos} onLoad={carregarCenario} onRemove={removerCenario} />
        </>
      )}
    </PageShell>
  );
}

function Fld({ label, v, onChange, numeric, hint }: { label: string; v: string; onChange: (v: string) => void; numeric?: boolean; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-9"
        inputMode={numeric ? 'decimal' : undefined}
        value={v}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <p className="text-[10px] leading-tight text-muted-foreground">{hint}</p>}
    </div>
  );
}
