import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  DollarSign,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/calculations';
import { FiltersCard } from '@/components/layout/FiltersCard';
import { EmptyState } from '@/components/ui/empty-state';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';

// Superfície de cartão da área interna — mesma família visual do .glass-card
// da landing, calibrada pra densidade (ver .panel em index.css).
const CARD = 'panel bg-card border-transparent';

type PaymentStatus = 'approved' | 'pending' | 'cancelled' | string;

function getStatusInfo(status: PaymentStatus) {
  switch (status) {
    case 'approved':
    case 'paid':
    case 'delivered':
    case 'payment_done':
      return {
        label: 'Aprovado',
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-success',
        bg: 'bg-success/10',
      };
    case 'pending':
    case 'payment_required':
    case 'in_process':
      return {
        label: 'Pendente',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-warning',
        bg: 'bg-warning/10',
      };
    case 'cancelled':
    case 'invalid':
      return {
        label: 'Cancelado',
        variant: 'destructive' as const,
        icon: XCircle,
        color: 'text-destructive',
        bg: 'bg-destructive/10',
      };
    default:
      return {
        label: status,
        variant: 'outline' as const,
        icon: Clock,
        color: 'text-muted-foreground',
        bg: 'bg-muted/10',
      };
  }
}

export function PagamentosContent() {
  const { orders, stats, loading } = useMercadolivreData();

  // Aggregate payment summary by status
  const paymentSummary = useCallback(() => {
    const map = new Map<string, { count: number; valor_total: number; taxa: number; liquido: number }>();

    orders.forEach((order) => {
      const status = order.status_pedido ?? 'unknown';
      const taxa = (order.taxa_ml ?? 0) + (order.frete_ml ?? 0);
      const existing = map.get(status);

      if (existing) {
        existing.count += 1;
        existing.valor_total += order.total_faturado ?? 0;
        existing.taxa += taxa;
        existing.liquido += (order.total_faturado ?? 0) - taxa;
      } else {
        map.set(status, {
          count: 1,
          valor_total: order.total_faturado ?? 0,
          taxa,
          liquido: (order.total_faturado ?? 0) - taxa,
        });
      }
    });

    return Array.from(map.entries()).map(([status, data]) => ({ status, ...data }));
  }, [orders]);

  const summary = paymentSummary();

  const handleExport = () => {
    if (orders.length === 0) return;

    const headers = [
      'ID Pedido', 'Produto', 'Data', 'Status',
      'Valor Total', 'Taxa ML', 'Frete ML', 'Valor Líquido',
    ];

    const rows = orders.map((o) => {
      const taxa = (o.taxa_ml ?? 0) + (o.frete_ml ?? 0);
      return [
        o.order_id ?? '-',
        o.nome_produto ?? '-',
        o.data_pedido ? new Date(o.data_pedido).toLocaleDateString('pt-BR') : '-',
        o.status_pedido ?? '-',
        (o.total_faturado ?? 0).toFixed(2),
        (o.taxa_ml ?? 0).toFixed(2),
        (o.frete_ml ?? 0).toFixed(2),
        ((o.total_faturado ?? 0) - taxa).toFixed(2),
      ];
    });

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ml_pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório de pagamentos exportado!');
  };

  const renderSummaryCards = () => {
    const totalTaxa = orders.reduce(
      (acc, o) => acc + (o.taxa_ml ?? 0) + (o.frete_ml ?? 0),
      0,
    );

    const cards = [
      {
        title: 'Total Recebido',
        value: loading ? '...' : formatCurrency(stats.netRevenue),
        description: 'Após taxas e descontos ML',
        icon: Wallet,
        color: 'text-success',
        bg: 'bg-success/10',
      },
      {
        title: 'Faturamento Bruto',
        value: loading ? '...' : formatCurrency(stats.grossRevenue),
        description: 'Antes das taxas',
        icon: DollarSign,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        title: 'Total de Taxas',
        value: loading ? '...' : formatCurrency(totalTaxa),
        description: 'Comissão + frete ML',
        icon: CreditCard,
        color: 'text-warning',
        bg: 'bg-warning/10',
      },
      {
        title: 'Pedidos',
        value: loading ? '...' : stats.totalOrders.toString(),
        description: 'Pagos e entregues',
        icon: CheckCircle2,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={CARD}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold font-mono">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
                <div className={cn('p-3 rounded-full', card.bg)}>
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderStatusSummary = () => {
    if (summary.length === 0) return null;

    return (
      <Card className={CARD}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Resumo por Status de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map(({ status, count, valor_total, taxa, liquido }) => {
              const info = getStatusInfo(status);
              const StatusIcon = info.icon;
              return (
                <div
                  key={status}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border',
                    info.bg,
                  )}
                >
                  <div className={cn('p-2 rounded-full bg-background/70 shrink-0')}>
                    <StatusIcon className={cn('h-4 w-4', info.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={info.variant} className="text-xs">
                        {info.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{count} pedido(s)</span>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(liquido)}</p>
                    <p className="text-xs text-muted-foreground">
                      Bruto: {formatCurrency(valor_total)} · Taxa: {formatCurrency(taxa)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPaymentsTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <EmptyState
          title="Nenhum pagamento encontrado"
          description="Sincronize seus pedidos do Mercado Livre para visualizar os pagamentos."
        />
      );
    }

    return (
      <Card className={CARD}>
        <CardHeader>
          <CardTitle>Detalhamento de Pagamentos</CardTitle>
          <CardDescription>
            {orders.length} pedidos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[130px]">ID Pedido</TableHead>
                  <TableHead className="min-w-[200px]">Produto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Bruto</TableHead>
                  <TableHead className="text-right">Taxa ML</TableHead>
                  <TableHead className="text-right">Frete ML</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, index) => {
                  const info = getStatusInfo(order.status_pedido ?? '');
                  const taxa = order.taxa_ml ?? 0;
                  const frete = order.frete_ml ?? 0;
                  const liquido = (order.total_faturado ?? 0) - taxa - frete;

                  return (
                    <TableRow key={order.order_id ?? index}>
                      <TableCell className="font-mono text-xs">
                        {order.order_id ?? '-'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={order.nome_produto ?? ''}>
                        {order.nome_produto ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.data_pedido
                          ? new Date(order.data_pedido).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={info.variant} className="text-xs">
                          {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.total_faturado ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(taxa)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(frete)}
                      </TableCell>
                      <TableCell className={cn('text-right font-medium', liquido >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatCurrency(liquido)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <FiltersCard>
        {orders.length > 0 && (
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </FiltersCard>

      {renderSummaryCards()}
      {renderStatusSummary()}
      {renderPaymentsTable()}
    </div>
  );
}

