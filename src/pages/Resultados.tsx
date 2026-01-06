import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllOrders } from '@/lib/supabase-helpers';
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
import { parseBatchCostInput } from '@/lib/numeric-validation';
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
  calculateResults,
  formatCurrency,
  formatPercent,
  SettingsData,
  RawOrder,
  CalculationResult,
} from '@/lib/calculations';
import { ResultsCharts } from '@/components/charts/ResultsCharts';
import { EditableCostCell } from '@/components/EditableCostCell';

function ResultadosContent() {
  const { user } = useAuth();
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [allSettings, setAllSettings] = useState<SettingsData[]>([]);
  const [results, setResults] = useState<CalculationResult | null>(null);
  
  // Filters
  const [selectedSettingsId, setSelectedSettingsId] = useState<string>('');
  
  // Selection for batch editing
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchCostValue, setBatchCostValue] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [costSyncVersion, setCostSyncVersion] = useState(0); // Increment to force EditableCostCell sync
  const [showBatchInput, setShowBatchInput] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    if (user && settings) {
      fetchOrders();
    }
  }, [user, settings]);

  useEffect(() => {
    if (orders.length > 0 && settings) {
      const calculatedResults = calculateResults(orders, settings, 'produto');
      setResults(calculatedResults);
    } else {
      setResults(null);
    }
  }, [orders, settings]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar configurações');
        return;
      }

      setAllSettings(data || []);
      
      if (data && data.length > 0) {
        const defaultSettings = data.find(s => s.is_default) || data[0];
        setSettings(defaultSettings as SettingsData);
        setSelectedSettingsId(defaultSettings.id);
      }
    } finally {
      setIsSettingsLoaded(true);
    }
  };

  const fetchOrders = async () => {
    setIsOrdersLoading(true);
    
    try {
      // Fetch ALL orders using pagination (Supabase limits to 1000 per query)
      const data = await fetchAllOrders();
      setOrders(data);
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
      console.error(error);
    }
    
    setIsOrdersLoading(false);
  };

  const handleSettingsChange = (settingsId: string) => {
    const selected = allSettings.find(s => s.id === settingsId);
    if (selected) {
      setSettings(selected as SettingsData);
      setSelectedSettingsId(settingsId);
    }
  };

  const handleCostSave = useCallback(async (sku: string, nomeProduto: string, newCost: number) => {
    // Determine if SKU is empty/invalid - use nome_produto instead
    const isEmptySku = !sku || sku === '-' || sku.trim() === '';
    
    let query = supabase.from('raw_orders').update({ custo_unitario: newCost });
    
    if (isEmptySku) {
      // Search by product name when SKU is empty
      query = query.eq('nome_produto', nomeProduto);
    } else {
      query = query.eq('sku', sku);
    }

    const { error } = await query;

    if (error) {
      toast.error(`Erro ao salvar custo: ${isEmptySku ? nomeProduto : sku}`);
      console.error(error);
      throw error;
    }

    // Update local orders state to trigger recalculation
    setOrders(prev => {
      const updated = prev.map(order => {
        if (isEmptySku) {
          return order.nome_produto === nomeProduto 
            ? { ...order, custo_unitario: newCost } 
            : order;
        }
        return order.sku === sku ? { ...order, custo_unitario: newCost } : order;
      });
      return [...updated]; // Force new array reference
    });
  }, []);

  const handleSelectProduct = (key: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && results) {
      setSelectedProducts(new Set(results.groups.map(g => g.key)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleBatchSave = async () => {
    if (selectedProducts.size === 0) return;
    
    const parseResult = parseBatchCostInput(batchCostValue);
    if (!parseResult.isValid) {
      toast.error(parseResult.error || 'Digite um valor válido maior que zero');
      return;
    }
    const numValue = parseResult.value;

    setIsBatchSaving(true);
    
    try {
      // Separate products with valid SKU from those without
      const selectedGroups = results?.groups.filter(g => selectedProducts.has(g.key)) || [];
      
      const productsWithSku = selectedGroups.filter(g => g.sku && g.sku !== '-' && g.sku.trim() !== '');
      const productsWithoutSku = selectedGroups.filter(g => !g.sku || g.sku === '-' || g.sku.trim() === '');
      
      let updatedCount = 0;
      
      // Update products with valid SKU
      if (productsWithSku.length > 0) {
        const skusToUpdate = productsWithSku.map(g => g.sku);
        const { error } = await supabase
          .from('raw_orders')
          .update({ custo_unitario: numValue })
          .in('sku', skusToUpdate);

        if (error) {
          console.error('Erro ao atualizar por SKU:', error);
        } else {
          updatedCount += productsWithSku.length;
        }
      }
      
      // Update products without SKU (by nome_produto)
      for (const product of productsWithoutSku) {
        const { error } = await supabase
          .from('raw_orders')
          .update({ custo_unitario: numValue })
          .eq('nome_produto', product.nome_produto);

        if (error) {
          console.error(`Erro ao atualizar ${product.nome_produto}:`, error);
        } else {
          updatedCount++;
        }
      }
      
      if (updatedCount === 0) {
        toast.error('Erro ao salvar custos em massa');
        return;
      }

      // Update local orders state
      const skuSet = new Set(productsWithSku.map(g => g.sku));
      const nameSet = new Set(productsWithoutSku.map(g => g.nome_produto));
      
      setOrders(prev => {
        const updated = prev.map(order => {
          const orderSku = order.sku || '';
          const isEmptySku = !orderSku || orderSku === '-' || orderSku.trim() === '';
          
          if (isEmptySku && nameSet.has(order.nome_produto || '')) {
            return { ...order, custo_unitario: numValue };
          }
          if (!isEmptySku && skuSet.has(orderSku)) {
            return { ...order, custo_unitario: numValue };
          }
          return order;
        });
        return [...updated];
      });

      toast.success(`Custo atualizado para ${updatedCount} produto(s)`);
      
      // Increment sync version to force EditableCostCell to update
      setCostSyncVersion(prev => prev + 1);
      
      setSelectedProducts(new Set());
      setBatchCostValue('');
      setShowBatchInput(false);
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const headers = [
      'Produto',
      'SKU',
      'Custo Unitário',
      'Itens Vendidos',
      'Total Faturado',
      'Rebates',
      'Taxa Shopee',
      'Taxa Adicional',
      'Total a Receber',
      'Custo Produtos',
      'Imposto',
      'NF Entrada',
      'Lucro R$',
      'Lucro %',
    ];

    const rows = results.groups.map(r => [
      r.nome_produto,
      r.sku,
      r.custo_unitario_medio.toFixed(2),
      r.itens_vendidos,
      r.total_faturado.toFixed(2),
      r.rebates_shopee.toFixed(2),
      r.taxa_shopee_reais.toFixed(2),
      r.taxa_adicional_itens.toFixed(2),
      r.total_a_receber.toFixed(2),
      r.total_gasto_produtos.toFixed(2),
      r.imposto.toFixed(2),
      r.nf_entrada.toFixed(2),
      r.lucro_reais.toFixed(2),
      r.lucro_percentual.toFixed(1),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultados_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  const renderSummaryCards = () => {
    if (!results) return null;
    const { totals } = results;

    const cards = [
      {
        title: 'Total Faturado',
        value: formatCurrency(totals.total_faturado),
        icon: DollarSign,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
      },
      {
        title: 'Total a Receber',
        value: formatCurrency(totals.total_a_receber),
        icon: DollarSign,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
      },
      {
        title: 'Lucro Líquido',
        value: formatCurrency(totals.lucro_reais),
        subtitle: totals.gasto_ads > 0 ? `Ads: -${formatCurrency(totals.gasto_ads)}` : undefined,
        icon: totals.lucro_reais >= 0 ? TrendingUp : TrendingDown,
        color: totals.lucro_reais >= 0 ? 'text-success' : 'text-destructive',
        bg: totals.lucro_reais >= 0 ? 'bg-success/10' : 'bg-destructive/10',
      },
      {
        title: 'Margem Média',
        value: formatPercent(totals.lucro_percentual_medio),
        icon: Package,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
    ];

    // Add Ads card if there's ads spending
    if (totals.gasto_ads > 0) {
      cards.splice(3, 0, {
        title: 'Gasto com Ads',
        value: formatCurrency(totals.gasto_ads),
        icon: Megaphone,
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
      });
    }

    return (
      <div className={cn('grid gap-4', totals.gasto_ads > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  {'subtitle' in card && card.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  )}
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
          {/* Settings Selection */}
          <div className="space-y-2">
            <Label>Configuração</Label>
            <Select value={selectedSettingsId} onValueChange={handleSettingsChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecionar configuração" />
              </SelectTrigger>
              <SelectContent>
                {allSettings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.is_default && '(Padrão)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {results && results.groups.length > 0 && (
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
            <Button
              size="sm"
              onClick={handleBatchSave}
              disabled={isBatchSaving}
            >
              {isBatchSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Aplicar'
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowBatchInput(false);
                setBatchCostValue('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowBatchInput(true)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar Custo em Massa
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedProducts(new Set())}
        >
          Limpar Seleção
        </Button>
      </div>
    );
  };

  const renderResultsTable = () => {
    if (!results || results.groups.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground mt-2">
              Ajuste os filtros ou faça upload de pedidos para visualizar os resultados.
            </p>
          </CardContent>
        </Card>
      );
    }

    const { groups, totals } = results;
    const allSelected = groups.length > 0 && selectedProducts.size === groups.length;
    const someSelected = selectedProducts.size > 0 && selectedProducts.size < groups.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados por Produto</CardTitle>
          <CardDescription>
            {groups.length} produtos • {totals.itens_vendidos} itens vendidos
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
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px]">Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right w-[110px]">Custo Unit.</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Taxa Shopee</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Imposto</TableHead>
                  <TableHead className="text-right">Lucro R$</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Product Rows */}
                {groups.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(row.key)}
                        onCheckedChange={(checked) => handleSelectProduct(row.key, !!checked)}
                        aria-label={`Selecionar ${row.nome_produto}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate" title={row.nome_produto}>
                      {row.nome_produto}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.sku}</TableCell>
                    <TableCell className="text-right p-1">
                      <EditableCostCell
                        sku={row.sku}
                        nomeProduto={row.nome_produto}
                        initialCost={row.custo_unitario_medio}
                        onCostSave={handleCostSave}
                        syncVersion={costSyncVersion}
                      />
                    </TableCell>
                    <TableCell className="text-right">{row.itens_vendidos}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_faturado)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.taxa_shopee_reais)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_a_receber)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.total_gasto_produtos)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.imposto)}</TableCell>
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
                <TableRow className="bg-primary/10 font-semibold">
                  <TableCell></TableCell>
                  <TableCell className="font-bold">TOTAL GERAL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-bold">{totals.itens_vendidos}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_faturado)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.taxa_shopee_reais)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_a_receber)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.total_gasto_produtos)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.imposto)}</TableCell>
                  <TableCell className={cn('text-right font-bold', totals.lucro_bruto >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(totals.lucro_bruto)}
                  </TableCell>
                  <TableCell className={cn('text-right font-bold', totals.lucro_percentual_medio >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatPercent(totals.lucro_percentual_medio)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isSettingsLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allSettings.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h3 className="font-semibold text-lg">Configuração Necessária</h3>
          <p className="text-muted-foreground mt-2">
            Você precisa criar uma configuração financeira antes de visualizar os resultados.
          </p>
          <Button asChild className="mt-4">
            <a href="/configuracoes">Ir para Configurações</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {renderFilters()}
      {renderSummaryCards()}
      {results && results.groups.length > 0 && (
        <ResultsCharts data={results.groups} type="produto" />
      )}
      {renderResultsTable()}
    </div>
  );
}

export default function Resultados() {
  return (
    <ProtectedRoute>
      <AppLayout title="Resultados Simplificados">
        <ResultadosContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
