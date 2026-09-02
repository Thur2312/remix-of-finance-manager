import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PackageSearch, AlertTriangle, Truck, Boxes, Plus, ChevronDown, Coins, Wallet, Settings2, Upload,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { parseMoneyInput } from '@/lib/money';
import { useReplenishment, type OpenPurchaseOrder, type SaveInventoryInput } from '@/hooks/useReplenishment';
import type { ReplenishmentRow, Urgencia } from '@/lib/replenishment';
import { parseStockImport, type StockImportResult } from '@/lib/stock-import';

const brl = (cents: number) => formatCurrency(cents / 100);
const dataCurta = (iso: string) => {
  const d = parseISO(iso.slice(0, 10));
  return Number.isNaN(d.getTime()) ? '—' : format(d, "dd 'de' MMM", { locale: ptBR });
};
const num = (n: number, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

const URGENCIA_META: Record<Urgencia, { label: string; cls: string }> = {
  ruptura: { label: 'Rompe antes de repor', cls: 'bg-destructive/10 text-destructive ring-destructive/30' },
  critico: { label: 'Crítico', cls: 'bg-warning/10 text-warning ring-warning/30' },
  atencao: { label: 'Atenção', cls: 'bg-amber-500/10 text-amber-600 ring-amber-500/30' },
  ok: { label: 'Ok', cls: 'bg-success/10 text-success ring-success/30' },
  sem_giro: { label: 'Sem giro', cls: 'bg-muted text-muted-foreground ring-border' },
};

function ReposicaoContent() {
  const r = useReplenishment();

  if (r.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!r.hasData) {
    return (
      <EmptyState
        icon={Boxes}
        title="Ainda não dá pra montar o plano"
        description="A reposição precisa de histórico de vendas por SKU (últimos 60 dias) e do custo dos produtos. Sincronize um marketplace e cadastre os custos em Custos de produto."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/integrations">Integrações</Link></Button>
            <Button asChild variant="outline"><Link to="/precificacao/custos">Custos de produto</Link></Button>
          </div>
        }
      />
    );
  }

  const { plan } = r;
  const pedir = plan.pedidos;
  const cortadosSet = new Set(plan.cortadosPorCaixa);
  const onSave = (i: SaveInventoryInput) => r.saveInventory.mutate(i);

  // ── Veredito em uma frase ─────────────────────────────────────────────────
  let veredito: ReactNode;
  if (pedir.length === 0) {
    veredito = (
      <>
        Nenhum SKU no ponto de reposição.{' '}
        {plan.rows[0]?.rupturaIso
          ? <>O mais apertado é <strong>{plan.rows[0].itemName}</strong>, até <strong>{dataCurta(plan.rows[0].rupturaIso)}</strong>.</>
          : 'Sem previsão de ruptura na janela.'}
      </>
    );
  } else if (!r.caixaConfiavel) {
    veredito = (
      <>
        Confirme o saldo real em <Link to="/previsao" className="underline underline-offset-2">Previsão de caixa</Link>{' '}
        pra eu priorizar o pedido pelo que o seu caixa aguenta.
      </>
    );
  } else if (plan.cortadosPorCaixa.length > 0) {
    veredito = (
      <>
        O caixa projetado comporta <strong>{brl(plan.caixaDisponivelCents ?? 0)}</strong> em compras. Feche o pedido
        com os <strong>{pedir.length - plan.cortadosPorCaixa.length}</strong> de maior lucro/dia
        (<strong>{brl(plan.custoNoCaixaCents)}</strong>); os outros {plan.cortadosPorCaixa.length} esperam o próximo ciclo.
      </>
    );
  } else {
    veredito = <>Repor tudo (<strong>{brl(plan.custoTotalCents)}</strong>) cabe no caixa projetado.</>;
  }

  return (
    <div className="space-y-5">
      {/* 1 · Resumo */}
      <KpiRow className={plan.pedidosSemCusto.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}>
        <StatCard
          title="Pedir agora"
          value={pedir.length}
          icon={AlertTriangle}
          variant={pedir.length ? 'warning' : 'success'}
          description={pedir.length ? `de ${plan.rows.length} SKUs` : 'catálogo coberto'}
        />
        <StatCard
          title="Custo do pedido"
          value={brl(plan.custoTotalCents)}
          icon={Coins}
          description="SKUs com custo cadastrado"
        />
        <StatCard
          title="Cabe no caixa"
          value={r.caixaConfiavel ? brl(plan.custoNoCaixaCents) : '—'}
          icon={Wallet}
          variant={r.caixaConfiavel && plan.cortadosPorCaixa.length > 0 ? 'warning' : 'brand'}
          description={r.caixaConfiavel
            ? `${brl(plan.caixaDisponivelCents ?? 0)} disponível`
            : 'confirme o saldo na Previsão'}
        />
        {plan.pedidosSemCusto.length > 0 && (
          <StatCard
            title="Sem custo"
            value={plan.pedidosSemCusto.length}
            icon={PackageSearch}
            variant="danger"
            description="fora da conta — cadastre o custo"
          />
        )}
      </KpiRow>

      {/* 2 · Veredito */}
      <Card className={cn('ring-1', pedir.length === 0 ? 'bg-success/5 ring-success/30' : 'bg-warning/5 ring-warning/40')}>
        <CardContent className="py-4 text-sm">{veredito}</CardContent>
      </Card>

      {/* 3 · Pedir agora */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Pedir agora</h3>
            <div className="flex flex-wrap gap-2">
              <ImportarEstoqueDialog
                onImport={(rows) => r.importStock.mutate(rows)}
                pending={r.importStock.isPending}
              />
              <NovoPedidoDialog onAdd={(i) => r.addPurchaseOrder.mutate(i)} pending={r.addPurchaseOrder.isPending} />
            </div>
          </div>
          {pedir.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nada no ponto de reposição. O catálogo completo está mais abaixo.
            </p>
          ) : (
            <PlanTable rows={pedir} cortadosSet={cortadosSet} onSave={onSave} saving={r.saveInventory.isPending} compact />
          )}
        </CardContent>
      </Card>

      {/* 4 · Fornecedor */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Truck className="size-4 text-muted-foreground" />
            Pedidos ao fornecedor em aberto
          </h3>
          {r.openPurchaseOrders.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Nenhum pedido em aberto. Registre um pra ele contar como estoque em trânsito e como saída na Previsão de caixa.
            </p>
          ) : (
            <ul className="space-y-2">
              {r.openPurchaseOrders.map((po) => (
                <PurchaseOrderRow
                  key={po.id}
                  po={po}
                  onReceive={() => r.receivePurchaseOrder.mutate(po.id)}
                  pending={r.receivePurchaseOrder.isPending}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 5 · Catálogo completo */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold [&[data-state=open]_svg]:rotate-180">
              Catálogo completo · {plan.rows.length} SKUs
              <ChevronDown className="size-4 text-muted-foreground transition-transform" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <PlanTable rows={plan.rows} cortadosSet={cortadosSet} onSave={onSave} saving={r.saveInventory.isPending} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 6 · Notas */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          <strong>Velocidade</strong>: média dos últimos {r.windowDays} dias. Pra SKU zerado hoje, os dias sem venda
          até a última venda saem da janela (marcados com <span className="font-mono">*</span>) — foi falta de produto,
          não de demanda.
        </p>
        <p>
          <strong>Lucro/dia</strong>: margem de contribuição × velocidade, com a taxa real do Mercado Livre e a tabela
          de comissão pra Shopee/TikTok. É por ele que o corte pelo caixa prioriza.
        </p>
        <p>
          <strong>Estoque</strong>:{' '}
          {r.syncedStockCount > 0
            ? `${r.syncedStockCount} ${r.syncedStockCount === 1 ? 'SKU vem' : 'SKUs vêm'} do catálogo${
                r.stockSyncDaysAgo === 0 ? ' (sincronizado hoje)' : r.stockSyncDaysAgo != null ? ` (há ${r.stockSyncDaysAgo}d)` : ''
              }; digite por cima pra corrigir.`
            : 'o que você informou — atualize quando um pedido chega.'}
          {r.skusSemCusto > 0 && ` ${r.skusSemCusto} ${r.skusSemCusto === 1 ? 'SKU vendeu' : 'SKUs venderam'} sem custo cadastrado.`}
        </p>
      </div>
    </div>
  );
}

// ── Tabela ──────────────────────────────────────────────────────────────────
function PlanTable({
  rows, cortadosSet, onSave, saving, compact,
}: {
  rows: ReplenishmentRow[];
  cortadosSet: Set<string>;
  onSave: (i: SaveInventoryInput) => void;
  saving: boolean;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', compact ? 'min-w-[640px]' : 'min-w-[760px]')}>
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-2 font-medium">Produto</th>
            <th className="pb-2 px-2 text-right font-medium">Vende/dia</th>
            <th className="pb-2 px-2 text-right font-medium">Cobertura</th>
            <th className="pb-2 px-2 text-right font-medium">Estoque</th>
            <th className="pb-2 px-2 text-right font-medium">Trânsito</th>
            <th className="pb-2 px-2 text-right font-medium">Pedir</th>
            <th className="pb-2 px-2 text-right font-medium">Custo</th>
            {!compact && <th className="pb-2 px-2 text-right font-medium">Lucro/dia</th>}
            <th className="pb-2 pl-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SkuRow
              key={row.sku}
              row={row}
              cortado={cortadosSet.has(row.sku)}
              onSave={onSave}
              saving={saving}
              compact={compact}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkuRow({
  row, cortado, onSave, saving, compact,
}: { row: ReplenishmentRow; cortado: boolean; onSave: (i: SaveInventoryInput) => void; saving: boolean; compact?: boolean }) {
  const [draft, setDraft] = useState('');
  const meta = URGENCIA_META[row.urgencia];
  const parsed = draft !== '' ? Number(draft.replace(/\D/g, '')) : null;

  return (
    <tr className={cn('border-b border-border/50 last:border-0', row.precisaPedir && !compact && 'bg-warning/5')}>
      <td className="py-2 pr-2">
        <span className="block max-w-[200px] truncate font-medium">{row.itemName}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded px-1 py-px text-[10px] ring-1', meta.cls)}>{meta.label}</span>
          {cortado && <span className="text-[10px] text-muted-foreground">espera o ciclo</span>}
          {row.estoqueVelho && <span className="text-[10px] text-warning">estoque velho</span>}
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {num(row.velocidadeDia, row.velocidadeDia < 10 ? 1 : 0)}
        {row.velocidadeAjustada && <span className="ml-0.5 text-[10px] text-muted-foreground" title="janela ajustada pelos dias sem estoque">*</span>}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {!Number.isFinite(row.coberturaDias) ? '—'
          : row.coberturaDias > 3650 ? <span className="text-muted-foreground">10+ anos</span>
          : (
            <>
              {num(row.coberturaDias)}d
              {row.rupturaIso && <span className="block text-[10px] text-muted-foreground">{dataCurta(row.rupturaIso)}</span>}
            </>
          )}
      </td>
      <td className="px-2 py-2 text-right">
        <input
          inputMode="numeric"
          className="w-14 rounded border bg-background px-1.5 py-0.5 text-right font-mono text-sm tabular-nums"
          placeholder={String(row.estoqueAtual)}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (parsed !== null && !Number.isNaN(parsed)) onSave({ sku: row.sku, itemName: row.itemName, stockUnits: parsed }); setDraft(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
        {row.estoqueOrigem === 'sync' && <span className="mt-0.5 block text-[10px] text-muted-foreground">catálogo</span>}
        {row.estoqueOrigem === 'nenhum' && <span className="mt-0.5 block text-[10px] text-warning">informe</span>}
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.emTransito || '—'}</td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">
        {row.precisaPedir ? <strong>{num(row.sugestaoUnidades)}</strong> : '—'}
      </td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">
        {!row.precisaPedir ? '—'
          : row.custoCompraCents === null
            ? <span className="text-[10px] text-warning">sem custo</span>
            : brl(row.custoCompraCents)}
      </td>
      {!compact && (
        <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
          {row.lucroDiaCents === null ? '—' : brl(row.lucroDiaCents)}
        </td>
      )}
      <td className="py-2 pl-2 text-right">
        <ConfigSkuDialog row={row} onSave={onSave} pending={saving} />
      </td>
    </tr>
  );
}

function ConfigSkuDialog({
  row, onSave, pending,
}: { row: ReplenishmentRow; onSave: (i: SaveInventoryInput) => void; pending: boolean }) {
  const [lead, setLead] = useState(String(row.leadTimeDays));
  const [safety, setSafety] = useState(String(row.safetyDays));
  const [moq, setMoq] = useState(row.moqUnits ? String(row.moqUnits) : '');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7 text-muted-foreground" aria-label={`Configurar ${row.itemName}`}>
          <Settings2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="truncate">{row.itemName}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cfg-lead">Lead time (dias)</Label>
            <Input id="cfg-lead" inputMode="numeric" className="mt-1" value={lead} onChange={(e) => setLead(e.target.value)} />
            <p className="mt-1 text-[10px] text-muted-foreground">do pedido ao fornecedor até chegar no estoque</p>
          </div>
          <div>
            <Label htmlFor="cfg-safety">Estoque de segurança (dias)</Label>
            <Input id="cfg-safety" inputMode="numeric" className="mt-1" value={safety} onChange={(e) => setSafety(e.target.value)} />
            <p className="mt-1 text-[10px] text-muted-foreground">folga pra oscilação da demanda</p>
          </div>
          <div className="col-span-2">
            <Label htmlFor="cfg-moq">Lote mínimo do fornecedor (opcional)</Label>
            <Input id="cfg-moq" inputMode="numeric" className="mt-1" value={moq} onChange={(e) => setMoq(e.target.value)} placeholder="sem mínimo" />
            <p className="mt-1 text-[10px] text-muted-foreground">a sugestão de compra arredonda pra cima nesse múltiplo</p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              disabled={pending}
              onClick={() => onSave({
                sku: row.sku,
                itemName: row.itemName,
                leadTimeDays: Number(lead.replace(/\D/g, '')) || 0,
                safetyDays: Number(safety.replace(/\D/g, '')) || 0,
                moqUnits: moq.trim() === '' ? null : (Number(moq.replace(/\D/g, '')) || null),
              })}
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseOrderRow({
  po, onReceive, pending,
}: { po: OpenPurchaseOrder; onReceive: () => void; pending: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0">
        <span className="block truncate">{po.itemName || po.sku}</span>
        <span className="text-[10px] text-muted-foreground">
          {num(po.qtyUnits)} un · {brl(po.qtyUnits * po.unitCostCents)}
          {po.expectedAt ? ` · chega ~${dataCurta(po.expectedAt)}` : ''}
        </span>
      </span>
      <Button size="sm" variant="outline" disabled={pending} onClick={onReceive}>Recebi</Button>
    </li>
  );
}

function ImportarEstoqueDialog({
  onImport, pending,
}: { onImport: (rows: { sku: string; itemName: string | null; stockUnits: number }[]) => void; pending: boolean }) {
  const [parse, setParse] = useState<StockImportResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setErro(null); setParse(null); setLendo(true);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      const r = parseStockImport(linhas);
      if (!r.colunaSku || !r.colunaEstoque) {
        setErro(`Não achei as colunas de SKU e estoque. Cabeçalhos do arquivo: ${r.colunasDetectadas.slice(0, 12).join(', ') || '(nenhum)'}`);
      } else if (r.rows.length === 0) {
        setErro('O arquivo foi lido mas não tinha nenhuma linha com SKU e estoque.');
      } else {
        setParse(r);
      }
    } catch {
      setErro('Não consegui ler o arquivo. Use o Excel/CSV exportado do Seller Center.');
    } finally {
      setLendo(false);
    }
  };

  return (
    <Dialog onOpenChange={(o) => { if (!o) { setParse(null); setErro(null); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="mr-1 size-3.5" />Importar estoque</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Importar estoque de planilha</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            No Seller Center da Shopee, exporte a lista de produtos (Excel/CSV com SKU e estoque) e suba aqui.
            Funciona com a planilha de qualquer marketplace que tenha as colunas de SKU e quantidade.
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={lendo || pending}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {lendo && <p className="text-xs text-muted-foreground">Lendo…</p>}
          {erro && <p className="text-xs text-destructive">{erro}</p>}
          {parse && (
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p><strong>{parse.rows.length}</strong> SKUs prontos pra importar.</p>
              <p className="mt-1 text-muted-foreground">
                SKU = coluna “{parse.colunaSku}” · estoque = coluna “{parse.colunaEstoque}”
                {(parse.semSku > 0 || parse.semEstoque > 0) && ` · ${parse.semSku + parse.semEstoque} linhas ignoradas (sem SKU ou sem estoque)`}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              disabled={!parse || pending}
              onClick={() => parse && onImport(parse.rows)}
            >
              {pending ? 'Importando…' : parse ? `Importar ${parse.rows.length} SKUs` : 'Importar'}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoPedidoDialog({
  onAdd, pending,
}: { onAdd: (i: { sku: string; itemName: string; qtyUnits: number; unitCostCents: number; expectedAt: string | null }) => void; pending: boolean }) {
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [eta, setEta] = useState('');

  const qtyN = Number(qty.replace(/\D/g, ''));
  const costC = parseMoneyInput(cost);
  const valido = sku.trim() !== '' && qtyN > 0 && costC !== null && costC > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 size-3.5" />Pedido de compra</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo pedido de compra</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="po-sku">SKU</Label>
            <Input id="po-sku" className="mt-1" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex.: CAMISA-P-AZUL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="po-qty">Quantidade</Label>
              <Input id="po-qty" inputMode="numeric" className="mt-1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="po-cost">Custo unitário</Label>
              <Input id="po-cost" inputMode="decimal" className="mt-1 font-mono" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="R$ 0,00" />
            </div>
          </div>
          <div>
            <Label htmlFor="po-eta">Previsão de chegada (opcional)</Label>
            <Input id="po-eta" type="date" className="mt-1" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Entra como estoque em trânsito (o plano para de pedir de novo) e como saída na Previsão de caixa
            na data de chegada.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              disabled={!valido || pending}
              onClick={() => {
                if (!valido) return;
                onAdd({ sku: sku.trim(), itemName: sku.trim(), qtyUnits: qtyN, unitCostCents: costC!, expectedAt: eta || null });
              }}
            >
              {pending ? 'Salvando…' : 'Registrar pedido'}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Reposicao() {
  return (
    <PageShell
      icon={PackageSearch}
      title="Reposição de estoque"
      subtitle="O que pedir agora, quanto, e o que o caixa aguenta"
    >
      <ReposicaoContent />
    </PageShell>
  );
}
