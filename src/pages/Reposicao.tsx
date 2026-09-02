import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PackageSearch, AlertTriangle, CheckCircle2, Truck, Boxes, Plus,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { parseMoneyInput } from '@/lib/money';
import { useReplenishment, type OpenPurchaseOrder } from '@/hooks/useReplenishment';
import type { ReplenishmentRow, Urgencia } from '@/lib/replenishment';

const brl = (cents: number) => formatCurrency(cents / 100);
const dataCurta = (iso: string) => format(parseISO(iso.slice(0, 10)), "dd 'de' MMM", { locale: ptBR });
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

  return (
    <div className="space-y-5">
      {/* Veredito */}
      {pedir.length === 0 ? (
        <Card className="ring-1 ring-success/30 bg-success/5">
          <CardContent className="flex items-start gap-3 py-5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <p className="text-sm font-medium">
              Nenhum SKU no ponto de reposição agora. O mais apertado é{' '}
              {plan.rows[0]?.rupturaIso ? (
                <>
                  <strong>{plan.rows[0].itemName}</strong>, que dura até{' '}
                  <strong>{dataCurta(plan.rows[0].rupturaIso)}</strong>.
                </>
              ) : 'sem previsão de ruptura.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="ring-1 ring-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium">
                <strong>{pedir.length}</strong> {pedir.length === 1 ? 'SKU' : 'SKUs'} no ponto de reposição —
                repor tudo custa <strong>{brl(plan.custoTotalCents)}</strong> ao fornecedor.
              </p>
              {plan.caixaDisponivelCents !== null && plan.cortadosPorCaixa.length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  Seu caixa projetado comporta <strong>{brl(plan.caixaDisponivelCents)}</strong> em compras sem
                  ficar no vermelho. Priorize os {pedir.length - plan.cortadosPorCaixa.length} de maior lucro/dia
                  ({brl(plan.custoNoCaixaCents)}); os outros {plan.cortadosPorCaixa.length} podem esperar o próximo ciclo.
                </p>
              )}
              {plan.caixaDisponivelCents !== null && plan.cortadosPorCaixa.length === 0 && (
                <p className="mt-1 text-muted-foreground">
                  Cabe no caixa projetado ({brl(plan.caixaDisponivelCents)} disponível).
                </p>
              )}
              {!r.caixaConfiavel && (
                <p className="mt-1 text-muted-foreground">
                  Confirme o saldo real em <Link to="/previsao" className="underline underline-offset-2">Previsão de caixa</Link>{' '}
                  pra eu priorizar pelo que o seu caixa aguenta.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">SKUs — {r.windowDays} dias de venda</h3>
            <NovoPedidoDialog onAdd={(i) => r.addPurchaseOrder.mutate(i)} pending={r.addPurchaseOrder.isPending} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Produto</th>
                  <th className="pb-2 px-2 text-right font-medium">Vende/dia</th>
                  <th className="pb-2 px-2 text-right font-medium">Cobertura</th>
                  <th className="pb-2 px-2 text-right font-medium">Estoque</th>
                  <th className="pb-2 px-2 text-right font-medium">Em trânsito</th>
                  <th className="pb-2 px-2 text-right font-medium">Pedir</th>
                  <th className="pb-2 px-2 text-right font-medium">Custo</th>
                  <th className="pb-2 pl-2 text-right font-medium">Lucro/dia</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((row) => (
                  <SkuRow
                    key={row.sku}
                    row={row}
                    cortado={cortadosSet.has(row.sku)}
                    onStock={(units) => r.saveInventory.mutate({ sku: row.sku, itemName: row.itemName, stockUnits: units })}
                    saving={r.saveInventory.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pedidos em trânsito */}
      {r.openPurchaseOrders.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Truck className="size-4 text-muted-foreground" />
              Pedidos de compra em aberto
            </h3>
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
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        A velocidade é a média dos últimos {r.windowDays} dias e não desconta dias em que o SKU esteve zerado —
        se houve ruptura no período, ela sai um pouco baixa. O estoque é o que você informou (some as unidades
        quando um pedido chega).
        {r.skusSemCusto > 0 && ` ${r.skusSemCusto} ${r.skusSemCusto === 1 ? 'SKU está' : 'SKUs estão'} com custo estimado — cadastre em Custos de produto pra afinar o lucro/dia e o custo do pedido.`}
      </p>
    </div>
  );
}

function SkuRow({
  row, cortado, onStock, saving,
}: { row: ReplenishmentRow; cortado: boolean; onStock: (u: number) => void; saving: boolean }) {
  const [draft, setDraft] = useState('');
  const meta = URGENCIA_META[row.urgencia];
  const editing = draft !== '';
  const parsed = editing ? Number(draft.replace(/\D/g, '')) : null;

  return (
    <tr className={cn('border-b border-border/50 last:border-0', row.precisaPedir && 'bg-warning/5')}>
      <td className="py-2 pr-2">
        <div className="flex items-center gap-2">
          <span className="min-w-0">
            <span className="block max-w-[220px] truncate font-medium">{row.itemName}</span>
            <span className="flex items-center gap-1.5">
              <span className={cn('rounded px-1 py-px text-[10px] ring-1', meta.cls)}>{meta.label}</span>
              {cortado && <span className="text-[10px] text-muted-foreground">espera o próximo ciclo</span>}
              {row.estoqueVelho && <span className="text-[10px] text-warning">estoque desatualizado</span>}
            </span>
          </span>
        </div>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{num(row.velocidadeDia, row.velocidadeDia < 10 ? 1 : 0)}</td>
      <td className="px-2 py-2 text-right tabular-nums">
        {Number.isFinite(row.coberturaDias) ? (
          <>
            {num(row.coberturaDias)}d
            {row.rupturaIso && <span className="block text-[10px] text-muted-foreground">até {dataCurta(row.rupturaIso)}</span>}
          </>
        ) : '—'}
      </td>
      <td className="px-2 py-2 text-right">
        <input
          inputMode="numeric"
          className="w-16 rounded border bg-background px-1.5 py-0.5 text-right font-mono text-sm tabular-nums"
          placeholder={String(row.estoqueAtual)}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (parsed !== null && !Number.isNaN(parsed)) onStock(parsed); setDraft(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
      </td>
      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{row.emTransito || '—'}</td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">
        {row.precisaPedir ? <strong>{num(row.sugestaoUnidades)}</strong> : '—'}
      </td>
      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.precisaPedir ? brl(row.custoCompraCents) : '—'}</td>
      <td className="py-2 pl-2 text-right font-mono tabular-nums text-muted-foreground">{brl(row.lucroDiaCents)}</td>
    </tr>
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
