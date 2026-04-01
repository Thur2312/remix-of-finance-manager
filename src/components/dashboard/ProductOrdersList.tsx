import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { SyncedOrder, SyncedFee, SyncedPayment } from '@/hooks/useShopeeSync';
import {
  Package,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductRow {
  productId: string;
  productName: string;
  totalOrders: number;
  totalRevenue: number;
  totalFees: number;
  totalNet: number;
  lastCompletedAt: string | null;
  status: string;
}

type SortKey = 'lastCompletedAt' | 'totalRevenue' | 'totalFees' | 'totalNet';
type SortDir = 'asc' | 'desc';

const COMPLETED_STATUSES = [
  'COMPLETED',
  'SHIPPED',
  'TO_CONFIRM_RECEIVE',
  'READY_TO_SHIP',
  'PROCESSED',
  'IN_CANCEL', 
];

const PAGE_SIZE = 10;

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  orders: SyncedOrder[];
  fees: SyncedFee[];
  payments: SyncedPayment[];
}

export function ProductOrdersList({ orders, fees, payments }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('lastCompletedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const feesByOrder = useMemo(() => {
    const map = new Map<string, number>();
    fees.forEach(f => {
      if (!f.order_id) return;
      map.set(f.order_id, (map.get(f.order_id) || 0) + Number(f.amount));
    });
    return map;
  }, [fees]);

  const netByOrder = useMemo(() => {
    const map = new Map<string, number>();
    payments
      .filter(p => p.payment_method === 'escrow' && p.order_id)
      .forEach(p => {
        map.set(p.order_id!, (map.get(p.order_id!) || 0) + Number(p.net_amount));
      });
    return map;
  }, [payments]);

  const productRows: ProductRow[] = useMemo(() => {
    const productMap = new Map<string, ProductRow>();
 console.log(JSON.stringify(orders.slice(0, 5).map(o => ({
  orderId: o.external_order_id,
  status: o.status,
  itemsLength: o.order_items?.length,
  firstItem: o.order_items?.[0],
})), null, 2));
    orders
      .filter(o => COMPLETED_STATUSES.includes(o.status))
      .forEach(o => {
        const item = o.order_items?.[0];
        const productId = item?.external_item_id || item?.sku || o.external_order_id;
        const productName = item?.item_name || 'Produto sem nome';

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            totalOrders: 0,
            totalRevenue: 0,
            totalFees: 0,
            totalNet: 0,
            lastCompletedAt: null,
            status: o.status,
          });
        }

        const product = productMap.get(productId)!;
        const orderFees = feesByOrder.get(o.id) || 0;
        const orderNet = netByOrder.get(o.id) || (Number(o.total_amount) - orderFees);

        product.totalRevenue += Number(o.total_amount);
        product.totalFees += orderFees;
        product.totalNet += orderNet;
        product.totalOrders += 1;

        const completionDate = o.paid_at || o.order_updated_at;
        if (completionDate && (!product.lastCompletedAt || completionDate > product.lastCompletedAt)) {
          product.lastCompletedAt = completionDate;
        }
      });

    return Array.from(productMap.values());
  }, [orders, feesByOrder, netByOrder]);

  const sorted = useMemo(() => {
    return [...productRows].sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case 'lastCompletedAt':
          va = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
          vb = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
          break;
        default:
          va = a[sortKey];
          vb = b[sortKey];
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [productRows, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const displayed = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0); // volta para primeira página ao mudar ordenação
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors select-none ${
          active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
        }`}
        title={`Ordenar por ${label}`}
      >
        {label}
        {active ? (
          sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    );
  }

  if (productRows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Package className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum produto com pedidos concluídos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base leading-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Produtos Concluídos
            </CardTitle>
            <CardDescription className="mt-0.5">
              {productRows.length} produto{productRows.length !== 1 ? 's' : ''} com{' '}
              {productRows.reduce((sum, p) => sum + p.totalOrders, 0)} pedidos
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[minmax(200px,_1fr)_repeat(3,_minmax(0,_120px))_140px] gap-x-4 px-6 pb-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">Produto</span>
          <SortBtn col="totalRevenue" label="Faturamento" />
          <SortBtn col="totalFees"    label="Taxas" />
          <SortBtn col="totalNet"     label="Líquido" />
          <SortBtn col="lastCompletedAt" label="Últ. venda" />
        </div>

        {/* Linhas */}
        <div className="divide-y divide-border">
          {displayed.map((row, i) => {
            const globalIndex = page * PAGE_SIZE + i;
            const feePercent = row.totalRevenue > 0
              ? ((row.totalFees / row.totalRevenue) * 100).toFixed(1)
              : '0.0';

            return (
              <div
                key={row.productId}
                className="grid grid-cols-[minmax(200px,_1fr)_repeat(3,_minmax(0,_120px))_140px] gap-x-4 px-6 py-4 items-start hover:bg-muted/40 transition-colors group"
              >
                {/* Produto */}
                <div className="flex items-start gap-3 min-w-0 pr-4">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    globalIndex < 3
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/30 text-emerald-600 border-2 border-emerald-500/30'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}>
                    #{globalIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {row.productName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                      ID: {row.productId}
                    </p>
                  </div>
                </div>

                {/* Faturamento */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-emerald-600">
                    {formatCurrency(row.totalRevenue)}
                  </span>
                </div>

                {/* Taxas */}
                <div className="flex items-center gap-1 pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    −{formatCurrency(row.totalFees)}
                  </span>
                  <span className="text-xs text-muted-foreground">({feePercent}%)</span>
                </div>

                {/* Líquido */}
                <div className="flex items-center pt-0.5">
                  <span className={`text-sm font-bold tabular-nums text-lg leading-tight ${
                    row.totalNet >= 0 ? 'text-primary' : 'text-destructive'
                  }`}>
                    {formatCurrency(row.totalNet)}
                  </span>
                </div>

                {/* Última venda + pedidos */}
                <div className="flex flex-col gap-1 pt-0.5">
                  <div className="flex items-center gap-1">
                    <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(row.lastCompletedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
                      {row.totalOrders}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">pedidos</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}