import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes, Plug, Search, ArrowUpDown, Archive, ArchiveRestore, PackageSearch,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useCatalog } from '@/hooks/useCatalog';
import type { CatalogRow, CatalogMarketplace, TopProdutoCriterio } from '@/lib/catalog';

const JANELAS = ['30', '60', '90'] as const;
type Janela = (typeof JANELAS)[number];

const MP_LABEL: Record<CatalogMarketplace, string> = {
  shopee: 'Shopee', mercadolivre: 'ML', tiktok: 'TikTok',
};
const MP_CLASS: Record<CatalogMarketplace, string> = {
  shopee: 'bg-[#F97316]/10 text-[#F97316]',
  mercadolivre: 'bg-[#2D3277]/10 text-[#2D3277]',
  tiktok: 'bg-foreground/10 text-foreground',
};

const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(0)}%`);

// célula editável — salva no blur / Enter, mostra o valor atual como placeholder
function InlineNumber({
  value, placeholder, prefix, disabled, onSave,
}: {
  value: number | null; placeholder?: string; prefix?: string; disabled?: boolean;
  onSave: (n: number) => void;
}) {
  const [draft, setDraft] = useState('');
  return (
    <span className="inline-flex items-center gap-0.5">
      {prefix && <span className="text-[10px] text-muted-foreground">{prefix}</span>}
      <input
        inputMode="decimal"
        disabled={disabled}
        className="w-16 rounded border bg-background px-1.5 py-0.5 text-right font-mono text-sm tabular-nums disabled:opacity-50"
        placeholder={placeholder ?? (value != null ? String(value) : '—')}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { const n = num(draft); if (n != null && n >= 0) onSave(n); setDraft(''); }}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </span>
  );
}

type SortKey = 'faturamento' | 'unidadesVendidas' | 'retidoPlataforma' | 'lucro' | 'margemPct' | 'diasDeCobertura';

function CatalogTable({
  rows, saving, onCost, onStock, onArchive,
}: {
  rows: CatalogRow[];
  saving: boolean;
  onCost: (r: CatalogRow, n: number) => void;
  onStock: (r: CatalogRow, n: number) => void;
  onArchive: (r: CatalogRow, archived: boolean) => void;
}) {
  const [sort, setSort] = useState<SortKey>('faturamento');
  const sorted = useMemo(() => {
    const v = (r: CatalogRow) => {
      const raw = r[sort];
      return typeof raw === 'number' && Number.isFinite(raw) ? raw : -Infinity;
    };
    return [...rows].sort((a, b) => v(b) - v(a));
  }, [rows, sort]);

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn('pb-2 font-medium', className)}>
      <button onClick={() => setSort(k)} className={cn('inline-flex items-center gap-1 hover:text-foreground', sort === k && 'text-foreground')}>
        {children}<ArrowUpDown className="size-3 opacity-50" />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Produto</th>
            <Th k="unidadesVendidas" className="pr-3 text-right">Un.</Th>
            <Th k="faturamento" className="pr-3 text-right">Faturamento</Th>
            <Th k="retidoPlataforma" className="pr-3 text-right">Taxa</Th>
            <th className="pb-2 pr-3 text-right font-medium">Custo un.</th>
            <Th k="lucro" className="pr-3 text-right">Lucro</Th>
            <Th k="margemPct" className="pr-3 text-right">Margem</Th>
            <th className="pb-2 pr-3 text-right font-medium">Estoque</th>
            <Th k="diasDeCobertura" className="pr-3 text-right">Cobertura</Th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map(r => (
            <tr key={r.skuKey || r.sku} className={cn(r.archived && 'opacity-50')}>
              <td className="max-w-[240px] py-2 pr-3">
                <div className="truncate font-medium" title={r.nome}>{r.nome}</div>
                <div className="mt-0.5 flex items-center gap-1">
                  {r.temSku
                    ? <span className="text-[10px] text-muted-foreground">{r.sku}</span>
                    : <span className="text-[10px] text-warning">sem SKU</span>}
                  {r.marketplaces.map(mp => (
                    <span key={mp} className={cn('rounded px-1 text-[10px] font-medium', MP_CLASS[mp])}>{MP_LABEL[mp]}</span>
                  ))}
                </div>
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{r.unidadesVendidas}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatCurrency(r.faturamento)}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums text-destructive">−{formatCurrency(r.retidoPlataforma)}</td>
              <td className="py-2 pr-3 text-right">
                {r.temSku ? (
                  <InlineNumber
                    value={r.custoUnit}
                    disabled={saving}
                    placeholder={r.custoUnit != null ? r.custoUnit.toFixed(2) : 'custo'}
                    onSave={n => onCost(r, n)}
                  />
                ) : '—'}
                {r.custoOrigem === 'marketplace' && <span className="mt-0.5 block text-[10px] text-muted-foreground">do pedido</span>}
                {r.custoOrigem === 'nenhum' && <span className="mt-0.5 block text-[10px] text-warning">informe</span>}
              </td>
              <td className={cn('py-2 pr-3 text-right font-mono tabular-nums', r.lucro != null && r.lucro < 0 && 'text-destructive')}>
                {r.lucro != null ? formatCurrency(r.lucro) : '—'}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{pct(r.margemPct)}</td>
              <td className="py-2 pr-3 text-right">
                {r.temSku ? (
                  <InlineNumber
                    value={r.estoque}
                    disabled={saving}
                    placeholder={r.estoque != null ? String(r.estoque) : 'estoque'}
                    onSave={n => onStock(r, n)}
                  />
                ) : '—'}
                {r.estoqueOrigem === 'sync' && <span className="mt-0.5 block text-[10px] text-muted-foreground">catálogo</span>}
                {r.estoqueOrigem === 'import' && <span className="mt-0.5 block text-[10px] text-muted-foreground">planilha</span>}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">
                {r.diasDeCobertura == null ? '—'
                  : r.diasDeCobertura === Infinity ? <span className="text-muted-foreground">sem giro</span>
                  : <span className={cn(r.diasDeCobertura < 14 && 'text-warning')}>{Math.round(r.diasDeCobertura)}d</span>}
              </td>
              <td className="py-2 text-right">
                {r.temSku && (
                  <button
                    onClick={() => onArchive(r, !r.archived)}
                    className="text-muted-foreground hover:text-foreground"
                    title={r.archived ? 'Desarquivar' : 'Arquivar'}
                  >
                    {r.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Top Produtos (item 3) ──────────────────────────────────────────────────

const CRITERIOS: { key: TopProdutoCriterio; label: string }[] = [
  { key: 'lucro', label: 'Lucro' },
  { key: 'faturamento', label: 'Faturamento' },
  { key: 'margem', label: 'Margem' },
  { key: 'unidades', label: 'Unidades' },
];

function TopProdutos({ pick }: { pick: (by: TopProdutoCriterio, limit?: number) => CatalogRow[] }) {
  const [by, setBy] = useState<TopProdutoCriterio>('lucro');
  const top = pick(by, 5);
  if (top.length === 0) return null;
  const val = (r: CatalogRow) =>
    by === 'faturamento' ? formatCurrency(r.faturamento)
    : by === 'unidades' ? `${r.unidadesVendidas} un`
    : by === 'margem' ? pct(r.margemPct)
    : r.lucro != null ? formatCurrency(r.lucro) : '—';

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Top produtos</h3>
          <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5 text-xs font-medium">
            {CRITERIOS.map(c => (
              <button key={c.key} onClick={() => setBy(c.key)}
                className={cn('rounded-md px-2 py-1 transition-colors',
                  by === c.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <ol className="mt-3 space-y-1.5">
          {top.map((r, i) => (
            <li key={r.skuKey} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate"><span className="text-muted-foreground">{i + 1}.</span> {r.nome}</span>
              <span className="font-mono font-medium tabular-nums">{val(r)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Produtos() {
  const [janela, setJanela] = useState<Janela>('60');
  const c = useCatalog(Number(janela));
  const [busca, setBusca] = useState('');
  const [soSemCusto, setSoSemCusto] = useState(false);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const saving = c.saveCost.isPending || c.saveStock.isPending || c.saveMeta.isPending;

  const rowsFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return c.rows.filter(r => {
      if (!mostrarArquivados && r.archived) return false;
      if (soSemCusto && r.custoOrigem === 'cadastrado') return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.sku.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [c.rows, busca, soSemCusto, mostrarArquivados]);

  const totais = useMemo(() => {
    const ativos = c.rows.filter(r => r.temSku && !r.archived);
    return {
      skus: ativos.length,
      faturamento: ativos.reduce((s, r) => s + r.faturamento, 0),
      lucro: ativos.reduce((s, r) => s + (r.lucro ?? 0), 0),
      temLucroParcial: ativos.some(r => r.lucro == null),
    };
  }, [c.rows]);

  const seletor = (
    <Select value={janela} onValueChange={v => setJanela(v as Janela)}>
      <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {JANELAS.map(j => <SelectItem key={j} value={j}>Últimos {j} dias</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const conteudo = (() => {
    if (c.isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      );
    }
    if (!c.hasData) {
      return (
        <EmptyState
          icon={Plug}
          title="Nenhuma venda sincronizada ainda"
          description="O catálogo é montado a partir dos seus pedidos reais nas plataformas. Conecte Shopee, Mercado Livre ou TikTok e rode uma sincronização."
          action={<Button asChild><Link to="/integrations">Ir para Integrações</Link></Button>}
        />
      );
    }

    return (
      <div className="space-y-6">
        <KpiRow>
          <StatCard title="SKUs ativos" value={String(totais.skus)} description={`vendas dos últimos ${janela} dias`} icon={Boxes} variant="brand" />
          <StatCard
            title="SKUs sem custo"
            value={String(c.skusSemCusto)}
            description={c.skusSemCusto > 0 ? 'lucro fica estimado — cadastre o custo' : 'todo produto com custo'}
            icon={PackageSearch}
            variant={c.skusSemCusto > 0 ? 'warning' : 'success'}
          />
          <StatCard title="Faturamento" value={formatCurrency(totais.faturamento)} description="produtos com SKU, no período" icon={Boxes} variant="success" />
          <StatCard
            title="Lucro real"
            value={formatCurrency(totais.lucro)}
            description={totais.temLucroParcial ? 'parcial — há SKU sem custo' : 'após taxas e custo do produto'}
            icon={Boxes}
            variant="brand"
          />
        </KpiRow>

        <TopProdutos pick={c.topProdutos} />

        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto ou SKU…" className="h-9 pl-9" />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={soSemCusto} onChange={e => setSoSemCusto(e.target.checked)} />
                Só sem custo
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={mostrarArquivados} onChange={e => setMostrarArquivados(e.target.checked)} />
                Mostrar arquivados
              </label>
            </div>

            {rowsFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto com esse filtro.</p>
            ) : (
              <CatalogTable
                rows={rowsFiltradas}
                saving={saving}
                onCost={(r, n) => c.saveCost.mutate({ skuRaw: r.sku, itemName: r.nome, cost: n })}
                onStock={(r, n) => c.saveStock.mutate({ skuRaw: r.sku, itemName: r.nome, stockUnits: n })}
                onArchive={(r, archived) => c.saveMeta.mutate({ skuKey: r.skuKey, archived })}
              />
            )}

            <p className="text-xs text-muted-foreground">
              O custo editado aqui vale como o custo do produto (grava em Custos por Produto) e reflete
              na <Link to="/reposicao" className="text-primary hover:underline">Reposição de estoque</Link>.
              Vendas por planilha (upload manual) não entram no catálogo — só os marketplaces sincronizados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  })();

  return (
    <PageShell
      icon={Boxes}
      title="Produtos"
      subtitle="A base de todos os cálculos — cada SKU com custo, estoque, vendas, taxas e lucro real."
      action={c.hasData ? seletor : undefined}
    >
      {conteudo}
    </PageShell>
  );
}
