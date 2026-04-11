import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import { SyncedOrder, SyncedFee, SyncedPayment } from '@/hooks/useShopeeSync';
import { useProductCosts } from '@/hooks/useProductCosts';
import {
  Package,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductRow {
  productId: string;
  productName: string;
  totalOrders: number;
  totalUnits: number;
  totalRevenue: number;
  totalFees: number;
  totalNet: number;
  totalCost: number;       // custo total (custo × unidades)
  totalProfit: number;     // lucro real = net - custo total
  marginPercent: number;   // % margem sobre faturamento
  hasCost: boolean;
  lastCompletedAt: string | null;
  status: string;
}

type SortKey = 'lastCompletedAt' | 'totalRevenue' | 'totalFees' | 'totalNet' | 'totalProfit' | 'marginPercent';
type SortDir = 'asc' | 'desc';

const COMPLETED_STATUSES = ['COMPLETED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'READY_TO_SHIP', 'PROCESSED'];
const PAGE_SIZE = 10;

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MarginBadge({ percent, hasCost }: { percent: number; hasCost: boolean }) {
  if (!hasCost) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
        Sem custo
      </Badge>
    );
  }
  const color =
    percent >= 30 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
    percent >= 15 ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' :
                    'bg-destructive/15 text-destructive border-destructive/30';
  const Icon = percent >= 15 ? TrendingUp : TrendingDown;
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${color} flex items-center gap-0.5 w-fit`}>
      <Icon className="h-3 w-3" />
      {percent.toFixed(1)}%
    </Badge>
  );
}

interface Props {
  orders: SyncedOrder[];
  fees: SyncedFee[];
  payments: SyncedPayment[];
}

export function ProductOrdersList({ orders, fees, payments }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const { data: productCosts = [] } = useProductCosts();

  // Mapa de custo por external_item_id e por sku (fallback)
  const costByItemId = useMemo(() => {
    const map = new Map<string, number>();
    productCosts.forEach(c => {
      const unitCost = Number(c.cost) + Number(c.packaging_cost) + Number(c.other_costs);
      if (c.external_item_id) map.set(c.external_item_id, unitCost);
    });
    return map;
  }, [productCosts]);

  const costBySku = useMemo(() => {
    const map = new Map<string, number>();
    productCosts.forEach(c => {
      const unitCost = Number(c.cost) + Number(c.packaging_cost) + Number(c.other_costs);
      if (c.sku) map.set(c.sku, unitCost);
    });
    return map;
  }, [productCosts]);

  const feesByOrder = useMemo(() => {
    const map = new Map<string, number>();
    fees
      .filter(f => ['commission','service_fee','shipping_fee'].includes(f.fee_type))
      .forEach(f => {
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

    orders
      .filter(o => COMPLETED_STATUSES.includes(o.status))
      .forEach(o => {
        const item = o.order_items?.[0];
        const productId = item?.external_item_id || item?.sku || o.external_order_id;
        const productName = item?.item_name || 'Produto sem nome';
        const quantity = item?.quantity || 1;

        // Busca custo unitário: tenta por external_item_id, depois por sku
        const unitCost =
          costByItemId.get(item?.external_item_id || '') ??
          costBySku.get(item?.sku || '') ??
          null;

        const hasCost = unitCost !== null;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            totalOrders: 0,
            totalUnits: 0,
            totalRevenue: 0,
            totalFees: 0,
            totalNet: 0,
            totalCost: 0,
            totalProfit: 0,
            marginPercent: 0,
            hasCost,
            lastCompletedAt: null,
            status: o.status,
          });
        }

        const product = productMap.get(productId)!;
        const orderFees = feesByOrder.get(o.id) || 0;
        const orderNet = netByOrder.get(o.id) || (Number(o.total_amount) - orderFees);
        const orderCost = hasCost ? (unitCost! * quantity) : 0;

        product.totalRevenue += Number(o.total_amount);
        product.totalFees += orderFees;
        product.totalNet += orderNet;
        product.totalUnits += quantity;
        product.totalCost += orderCost;
        product.totalOrders += 1;

        const completionDate = o.paid_at || o.order_updated_at;
        if (completionDate && (!product.lastCompletedAt || completionDate > product.lastCompletedAt)) {
          product.lastCompletedAt = completionDate;
        }
      });

    // Calcula lucro e margem após agregar todos os pedidos
    return Array.from(productMap.values()).map(p => {
      const profit = p.hasCost ? p.totalNet - p.totalCost : p.totalNet;
      const margin = p.totalRevenue > 0 && p.hasCost
        ? (profit / p.totalRevenue) * 100
        : 0;
      return { ...p, totalProfit: profit, marginPercent: margin };
    });
  }, [orders, feesByOrder, netByOrder, costByItemId, costBySku]);

  const sorted = useMemo(() => {
    return [...productRows].sort((a, b) => {
      const va = a[sortKey] as number;
      const vb = b[sortKey] as number;
      if (sortKey === 'lastCompletedAt') {
        const ta = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : 0;
        const tb = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : 0;
        return sortDir === 'desc' ? tb - ta : ta - tb;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [productRows, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const displayed = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors select-none ${
          active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {label}
        {active
          ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
          : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    );
  }

  // Totais do rodapé
  const totals = useMemo(() => ({
    revenue: productRows.reduce((s, p) => s + p.totalRevenue, 0),
    fees: productRows.reduce((s, p) => s + p.totalFees, 0),
    net: productRows.reduce((s, p) => s + p.totalNet, 0),
    cost: productRows.reduce((s, p) => s + p.totalCost, 0),
    profit: productRows.reduce((s, p) => s + p.totalProfit, 0),
  }), [productRows]);

  const withCostCount = productRows.filter(p => p.hasCost).length;

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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base leading-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Top Produtos Concluídos
            </CardTitle>
            <CardDescription className="mt-0.5">
              {productRows.length} produto{productRows.length !== 1 ? 's' : ''} ·{' '}
              {productRows.reduce((s, p) => s + p.totalOrders, 0)} pedidos ·{' '}
              {withCostCount > 0
                ? `${withCostCount} com custo cadastrado`
                : 'nenhum custo cadastrado — configure em Configurações'}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-normal shrink-0">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[minmax(180px,_1fr)_repeat(2,_minmax(0,_110px))_minmax(0,_110px)_minmax(0,_110px)_130px] gap-x-3 px-6 pb-3 border-b">
          <span className="text-xs font-medium text-muted-foreground">Produto</span>
          <SortBtn col="totalRevenue"   label="Faturamento" />
          <SortBtn col="totalFees"      label="Taxas" />
          <SortBtn col="totalNet"       label="Líquido" />
          <SortBtn col="totalProfit"    label="Lucro Real" />
          <SortBtn col="marginPercent"  label="Margem" />
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
                className="grid grid-cols-[minmax(180px,_1fr)_repeat(2,_minmax(0,_110px))_minmax(0,_110px)_minmax(0,_110px)_130px] gap-x-3 px-6 py-4 items-start hover:bg-muted/40 transition-colors"
              >
                {/* Produto */}
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    globalIndex < 3
                      ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/30 text-emerald-600 border-2 border-emerald-500/30'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}>
                    #{globalIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{row.productName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-auto font-normal">
                        {row.totalOrders} pedidos
                      </Badge>
                      <span className="text-xs text-muted-foreground">{row.totalUnits} un.</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarCheck className="h-3 w-3" />
                        {formatDate(row.lastCompletedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Faturamento */}
                <div className="pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-emerald-600">
                    {formatCurrency(row.totalRevenue)}
                  </span>
                </div>

                {/* Taxas */}
                <div className="pt-0.5">
                  <span className="text-sm font-semibold tabular-nums text-destructive">
                    −{formatCurrency(row.totalFees)}
                  </span>
                  <p className="text-xs text-muted-foreground">{feePercent}%</p>
                </div>

                {/* Líquido */}
                <div className="pt-0.5">
                  <span className={`text-sm font-bold tabular-nums ${row.totalNet >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatCurrency(row.totalNet)}
                  </span>
                  {row.hasCost && (
                    <p className="text-xs text-muted-foreground">
                      custo {formatCurrency(row.totalCost)}
                    </p>
                  )}
                </div>

                {/* Lucro Real */}
                <div className="pt-0.5">
                  {row.hasCost ? (
                    <>
                      <span className={`text-sm font-bold tabular-nums ${row.totalProfit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                        {formatCurrency(row.totalProfit)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </div>

                {/* Margem */}
                <div className="pt-0.5">
                  <MarginBadge percent={row.marginPercent} hasCost={row.hasCost} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com totais */}
        <div className="border-t bg-muted/30 px-6 py-3 grid grid-cols-[minmax(180px,_1fr)_repeat(2,_minmax(0,_110px))_minmax(0,_110px)_minmax(0,_110px)_130px] gap-x-3 items-center">
          <span className="text-xs font-semibold text-muted-foreground">TOTAL</span>
          <span className="text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(totals.revenue)}</span>
          <span className="text-xs font-bold text-destructive tabular-nums">−{formatCurrency(totals.fees)}</span>
          <span className="text-xs font-bold tabular-nums">{formatCurrency(totals.net)}</span>
          <span className={`text-xs font-bold tabular-nums ${totals.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {withCostCount > 0 ? formatCurrency(totals.profit) : '—'}
          </span>
          <span className="text-xs text-muted-foreground">
            {withCostCount > 0 && totals.revenue > 0
              ? `${((totals.profit / totals.revenue) * 100).toFixed(1)}% margem`
              : '—'}
          </span>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="border-t px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button key={i} variant={page === i ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(i)}>
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 