import { useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Filter,
  Download,
  Layers,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableFooter,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { InPageNav, mercadolivreNavTabs } from '@/components/layout/InPageNav';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';

function VariacoesContent() {
  const { orders, stats, loading } = useMercadolivreData();

  // Group orders by produto + variação
  const groupedVariacoes = useCallback(() => {
    const map = new Map<string, {
      nome_produto: string;
      sku: string;
      variacao: string;
      itens_vendidos: number;
      total_faturado: number;
      taxa_ml: number;
      total_a_receber: number;
      lucro_reais: number;
      lucro_percentual: number;
    }>();

    orders.forEach((order) => {
      const variacao = order.variacao ?? 'Sem variação';
      const key = `${order.sku ?? order.nome_produto}__${variacao}`;
      const existing = map.get(key);
      const taxa = (order.taxa_ml ?? 0) + (order.frete_ml ?? 0);
      const receber = (order.total_faturado ?? 0) - taxa;

      if (existing) {
        existing.itens_vendidos += order.quantidade ?? 1;
        existing.total_faturado += order.total_faturado ?? 0;
        existing.taxa_ml += taxa;
        existing.total_a_receber += receber;
      } else {
        map.set(key, {
          nome_produto: order.nome_produto ?? 'Produto sem nome',
          sku: order.sku ?? '-',
          variacao,
          itens_vendidos: order.quantidade ?? 1,
          total_faturado: order.total_faturado ?? 0,
          taxa_ml: taxa,
          total_a_receber: receber,
          lucro_reais: receber,
          lucro_percentual: order.total_faturado ? (receber / order.total_faturado) * 100 : 0,
        });
      }
    });

    map.forEach((v) => {
      v.lucro_reais = v.total_a_receber;
      v.lucro_percentual = v.total_faturado > 0
        ? (v.total_a_receber / v.total_faturado) * 100
        : 0;
    });

    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [orders]);

  const groups = groupedVariacoes();

  const handleExport = () => {
    if (groups.length === 0) return;

    const headers = [
      'Produto', 'SKU', 'Variação', 'Qtd Vendida',
      'Total Faturado', 'Taxa ML', 'Total a Receber', 'Lucro R$', 'Margem %',
    ];

    const rows = groups.map((r) => [
      r.nome_produto, r.sku, r.variacao, r.itens_vendidos,
      r.total_faturado.toFixed(2), r.taxa_ml.toFixed(2),
      r.total_a_receber.toFixed(2), r.lucro_reais.toFixed(2),
      r.lucro_percentual.toFixed(1),
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ml_variacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  const renderSummaryCards = () => {
    const cards = [
      {
        title: 'Total Faturado',
        value: formatCurrency(stats.grossRevenue),
        icon: DollarSign,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
      },
      {
        title: 'Valor Líquido',
        value: formatCurrency(stats.netRevenue),
        icon: DollarSign,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
      },
      {
        title: 'Taxas ML',
        value: formatCurrency(stats.fees),
        icon: TrendingDown,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
      },
      {
        title: 'Variações Analisadas',
        value: groups.length.toString(),
        icon: Layers,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
    ];

    return (
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
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

  const renderResultsTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (groups.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground mt-2">
              Sincronize seus pedidos do Mercado Livre para visualizar as variações.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Resultados por Produto + Variação
          </CardTitle>
          <CardDescription>
            {groups.length} variações • {stats.totalOrders} pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[180px]">Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[120px]">Variação</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Taxa ML</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">Lucro R$</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="max-w-[200px] truncate" title={row.nome_produto}>
                      {row.nome_produto}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.sku}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs">
                        {row.variacao}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{row.itens_vendidos}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_faturado)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.taxa_ml)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_a_receber)}</TableCell>
                    <TableCell className={cn('text-right font-medium', row.lucro_reais >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(row.lucro_reais)}
                    </TableCell>
                    <TableCell className={cn('text-right', row.lucro_percentual >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatPercent(row.lucro_percentual)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted font-semibold">
                  <TableCell className="font-bold">TOTAL GERAL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right font-bold">{stats.totalOrders}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(stats.grossRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(stats.fees)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(stats.netRevenue)}</TableCell>
                  <TableCell className={cn('text-right font-bold', stats.netRevenue >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(stats.netRevenue)}
                  </TableCell>
                  <TableCell className={cn('text-right font-bold', stats.netRevenue >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatPercent(stats.grossRevenue > 0 ? (stats.netRevenue / stats.grossRevenue) * 100 : 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {groups.length > 0 && (
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {renderSummaryCards()}
      {renderResultsTable()}
    </div>
  );
}

export default function MercadoLivreVariacoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Gestão Mercado Livre">
        <InPageNav tabs={mercadolivreNavTabs} />
        <VariacoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}