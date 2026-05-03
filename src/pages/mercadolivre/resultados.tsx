import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertCircle,
  Filter,
  Download,
  Edit,
  X,
  Megaphone,
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
import {
  formatCurrency,
  formatPercent,
} from '@/lib/calculations';
import { InPageNav, mercadolivreNavTabs } from '@/components/layout/InPageNav';
import { useMercadolivreData } from '@/hooks/useMercadolivreData';

function ResultadosContent() {
  const { user } = useAuth();
  const { orders, stats, loading } = useMercadolivreData();

  // Selection for batch editing
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchCostValue, setBatchCostValue] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [showBatchInput, setShowBatchInput] = useState(false);

  // Group orders by product
  const groupedProducts = useCallback(() => {
    const map = new Map<string, {
      nome_produto: string;
      sku: string;
      itens_vendidos: number;
      total_faturado: number;
      taxa_ml: number;
      total_a_receber: number;
      lucro_reais: number;
      lucro_percentual: number;
    }>();

    orders.forEach((order) => {
      const key = order.sku || order.nome_produto || 'Sem nome';
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
          itens_vendidos: order.quantidade ?? 1,
          total_faturado: order.total_faturado ?? 0,
          taxa_ml: taxa,
          total_a_receber: receber,
          lucro_reais: receber,
          lucro_percentual: order.total_faturado ? (receber / order.total_faturado) * 100 : 0,
        });
      }
    });

    // recalculate percentual after aggregation
    map.forEach((v) => {
      v.lucro_reais = v.total_a_receber;
      v.lucro_percentual = v.total_faturado > 0
        ? (v.total_a_receber / v.total_faturado) * 100
        : 0;
    });

    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [orders]);

  const groups = groupedProducts();

  const handleSelectProduct = (key: string, checked: boolean) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(key); } else { next.delete(key); }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? new Set(groups.map((g) => g.key)) : new Set());
  };

  const handleExport = () => {
    if (groups.length === 0) return;

    const headers = [
      'Produto', 'SKU', 'Qtd Vendida', 'Total Faturado',
      'Taxa ML', 'Total a Receber', 'Lucro R$', 'Margem %',
    ];

    const rows = groups.map((r) => [
      r.nome_produto, r.sku, r.itens_vendidos,
      r.total_faturado.toFixed(2), r.taxa_ml.toFixed(2),
      r.total_a_receber.toFixed(2), r.lucro_reais.toFixed(2),
      r.lucro_percentual.toFixed(1),
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ml_resultados_${new Date().toISOString().split('T')[0]}.csv`;
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
        icon: stats.fees > 0 ? TrendingDown : TrendingUp,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
      },
      {
        title: 'Produtos',
        value: groups.length.toString(),
        icon: Package,
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

  const renderFilters = () => (
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
  );

  const renderBatchActions = () => {
    if (selectedProducts.size === 0) return null;
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
        <span className="text-sm font-medium">
          {selectedProducts.size} produto(s) selecionado(s)
        </span>
        {showBatchInput ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={batchCostValue}
              onChange={(e) => setBatchCostValue(e.target.value)}
              className="w-24 h-8"
              autoFocus
            />
            <Button size="sm" disabled={isBatchSaving}>
              {isBatchSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowBatchInput(false); setBatchCostValue(''); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setShowBatchInput(true)}>
            <Edit className="h-4 w-4 mr-1" />
            Editar Custo em Massa
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setSelectedProducts(new Set())}>
          Limpar Seleção
        </Button>
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
              Sincronize seus pedidos do Mercado Livre para visualizar os resultados.
            </p>
          </CardContent>
        </Card>
      );
    }

    const allSelected = groups.length > 0 && selectedProducts.size === groups.length;
    const someSelected = selectedProducts.size > 0 && selectedProducts.size < groups.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados por Produto</CardTitle>
          <CardDescription>
            {groups.length} produtos • {stats.totalOrders} pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderBatchActions()}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                      }}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px]">Produto</TableHead>
                  <TableHead>SKU</TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(row.key)}
                        onCheckedChange={(checked) => handleSelectProduct(row.key, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate" title={row.nome_produto}>
                      {row.nome_produto}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.sku}</TableCell>
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
                  <TableCell />
                  <TableCell className="font-bold">TOTAL GERAL</TableCell>
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
      {renderFilters()}
      {renderSummaryCards()}
      {renderResultsTable()}
    </div>
  );
}

export default function MercadoLivreResultados() {
  return (
    <ProtectedRoute>
      <AppLayout title="Gestão Mercado Livre">
        <InPageNav tabs={mercadolivreNavTabs} />
        <ResultadosContent />
      </AppLayout>
    </ProtectedRoute>
  );
}