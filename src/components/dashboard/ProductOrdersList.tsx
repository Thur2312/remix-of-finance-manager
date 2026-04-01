import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { SyncedOrder, SyncedFee, SyncedPayment } from '@/hooks/useShopeeSync';
import {
  Package,
  TrendingDown,
  Wallet,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderRow {
  orderId: string;
  externalId: string;
  revenue: number;
  fees: number;
  netAmount: number;
  completedAt: string | null;
  status: string;
}

type SortKey = 'completedAt' | 'revenue' | 'fees' | 'netAmount';
type SortDir = 'asc' | 'desc';

const COMPLETED_STATUSES = ['COMPLETED', 'SHIPPED', 'TO_CONFIRM_RECEIVE'];

const statusConfig: Record<string, { label: string; className: string }> = {
  COMPLETED:           { label: 'Concluído',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  SHIPPED:             { label: 'Enviado',       className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  TO_CONFIRM_RECEIVE:  { label: 'Aguard. conf.', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  CANCELLED:           { label: 'Cancelado',     className: 'bg-destructive/10 text-destructive border-destructive/20' },
  UNPAID:              { label: 'Não pago',      className: 'bg-muted text-muted-foreground border-border' },
};

function getStatusConfig(status: string) {
  return statusConfig[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  orders: SyncedOrder[];
  fees: SyncedFee[];
  payments: SyncedPayment[];
}

export function ProductOrdersList({ orders, fees, payments }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('completedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAll, setShowAll] = useState(false);

  // Agrupa fees por order_id
  const feesByOrder = useMemo(() => {
    const map = new Map<string, number>();
    fees.forEach(f => {
      if (!f.order_id) return;
      map.set(f.order_id, (map.get(f.order_id) || 0) + Number(f.amount));
    });
    return map;
  }, [fees]);

  // Agrupa net_amount (escrow) por order_id via payments
  const netByOrder = useMemo(() => {
    const map = new Map<string, number>();
    payments
      .filter(p => p.payment_method === 'escrow' && p.order_id)
      .forEach(p => {
        map.set(p.order_id!, (map.get(p.order_id!) || 0) + Number(p.net_amount));
      });
    return map;
  }, [payments]);

  const rows: OrderRow[] = useMemo(() =>
    orders
      .filter(o => COMPLETED_STATUSES.includes(o.status))
      .map(o => {
        const fees = feesByOrder.get(o.id) || 0;
        const net  = netByOrder.get(o.id) || (Number(o.total_amount) - fees);
        return {
          orderId:     o.id,
          externalId:  o.external_order_id,
          revenue:     Number(o.total_amount),
          fees,
          netAmount:   net,
          completedAt: o.paid_at || o.order_updated_at,
          status:      o.status,
        };
      }),
    [orders, feesByOrder, netByOrder]
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'completedAt') {
        va = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        vb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [rows, sortKey, sortDir]);

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors select-none ${
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        {active
          ? sortDir === 'desc'
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronUp className="h-3 w-3" />
          : <ArrowUpDown className="h-3 w-3 opacity-50" />
        }
      </button>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Package className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum pedido concluído encontrado nos últimos 15 dias.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Pedidos Concluídos</CardTitle>
            <CardDescription className="mt-0.5">
              {rows.length} pedido{rows.length !== 1 ? 's' : ''} nos últimos 15 dias
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            Últimos 15 dias
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* ── Cabeçalho da tabela ── */}
        <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,_120px))_100px_80px] gap-x-4 px-6 pb-2 border-b">
          <span className="text-xs font-medium text-muted-foreground">Pedido</span>
          <SortBtn col="revenue"     label="Faturamento"  />
          <SortBtn col="fees"        label="Taxas"        />
          <SortBtn col="netAmount"   label="Líquido"      />
          <SortBtn col="completedAt" label="Concluído em" />
          <span className="text-xs font-medium text-muted-foreground text-right">Status</span>
        </div>

        {/* ── Linhas ── */}
        <div className="divide-y">
          {displayed.map((row, i) => {
            const st = getStatusConfig(row.status);
            const feePercent = row.revenue > 0
              ? ((row.fees / row.revenue) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={row.orderId}
                className="grid grid-cols-[1fr_repeat(3,_minmax(0,_120px))_100px_80px] gap-x-4 px-6 py-3.5 items-center hover:bg-muted/40 transition-colors"
              >
                {/* Pedido */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{row.externalId}</p>
                    <p className="text-xs text-muted-foreground">ID do pedido</p>
                  </div>
                </div>

                {/* Faturamento */}
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(row.revenue)}</span>
                </div>

                {/* Taxas */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-sm font-medium tabular-nums text-destructive">
                      −{formatCurrency(row.fees)}
                    </span>
                  </div>
                  {row.fees > 0 && (
                    <span className="text-xs text-muted-foreground ml-5">{feePercent}% do bruto</span>
                  )}
                </div>

                {/* Líquido */}
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className={`text-sm font-semibold tabular-nums ${row.netAmount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(row.netAmount)}
                  </span>
                </div>

                {/* Data */}
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(row.completedAt)}
                  </span>
                </div>

                {/* Status */}
                <div className="flex justify-end">
                  <Badge variant="outline" className={`text-xs ${st.className}`}>
                    {st.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Ver mais / recolher ── */}
        {rows.length > 10 && (
          <div className="border-t px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Exibindo {displayed.length} de {rows.length} pedidos
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? (
                <><ChevronUp className="h-3.5 w-3.5 mr-1" /> Recolher</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5 mr-1" /> Ver todos ({rows.length})</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini ícone inline (evita import extra)
function DollarSign({ className }: { className?: string }) {
  return <Wallet className={className} />;
}