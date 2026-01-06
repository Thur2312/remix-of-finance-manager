import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { parseBatchCostInput } from '@/lib/numeric-validation';
import {
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  AlertCircle,
  Filter,
  Edit,
  X,
  Megaphone,
} from 'lucide-react';
import { TikTokSettingsData, TikTokOrder, calculateTikTokResults, formatCurrency, formatPercent } from '@/lib/tiktok-calculations';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { EditableCostCell } from '@/components/EditableCostCell';
import { ResultsCharts } from '@/components/charts/ResultsCharts';

function TikTokVariacoesContent() {
  const { user } = useAuth();
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<TikTokOrder[]>([]);
  const [settings, setSettings] = useState<TikTokSettingsData | null>(null);
  const [allSettings, setAllSettings] = useState<TikTokSettingsData[]>([]);
  const [selectedSettingsId, setSelectedSettingsId] = useState<string>('');
  
  // Selection for batch editing
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchCostValue, setBatchCostValue] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);
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

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tiktok_settings')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar configurações');
        return;
      }

      setAllSettings(data || []);
      
      if (data && data.length > 0) {
        const defaultSettings = data.find(s => s.is_default) || data[0];
        setSettings(defaultSettings as TikTokSettingsData);
        setSelectedSettingsId(defaultSettings.id);
      }
    } finally {
      setIsSettingsLoaded(true);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    setIsOrdersLoading(true);
    
    try {
      const data = await fetchAllTikTokOrders(user.id);
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
      setSettings(selected as TikTokSettingsData);
      setSelectedSettingsId(settingsId);
    }
  };

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateTikTokResults(orders, settings, 'variacao');
  }, [orders, settings]);

  const handleCostSave = useCallback(async (sku: string, nomeProduto: string, variacao: string, newCost: number) => {
    if (!user) return;
    
    let query = supabase
      .from('tiktok_orders')
      .update({ custo_unitario: newCost })
      .eq('user_id', user.id)
      .eq('variacao', variacao);

    if (sku && sku !== '-') {
      query = query.eq('sku', sku);
    } else {
      query = query.eq('nome_produto', nomeProduto);
    }

    const { error } = await query;

    if (error) {
      toast.error('Erro ao salvar custo');
      console.error(error);
      throw error;
    }

    setOrders(prev => {
      const updated = prev.map(order => {
        const matches = sku && sku !== '-' 
          ? order.sku === sku && order.variacao === variacao
          : order.nome_produto === nomeProduto && order.variacao === variacao;
        return matches ? { ...order, custo_unitario: newCost } : order;
      });
      return [...updated];
    });
  }, [user]);

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
    if (checked && calculatedResults) {
      setSelectedProducts(new Set(calculatedResults.groups.map(g => g.key)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleBatchSave = async () => {
    if (selectedProducts.size === 0 || !user) return;
    
    const parseResult = parseBatchCostInput(batchCostValue);
    if (!parseResult.isValid) {
      toast.error(parseResult.error || 'Digite um valor válido maior que zero');
      return;
    }
    const numValue = parseResult.value;

    setIsBatchSaving(true);
    
    try {
      const selectedGroups = calculatedResults?.groups.filter(g => selectedProducts.has(g.key)) || [];
      
      for (const group of selectedGroups) {
        await handleCostSave(group.sku, group.nome_produto, group.variacao || '', numValue);
      }

      toast.success(`Custo atualizado para ${selectedGroups.length} variação(ões)`);
      setSelectedProducts(new Set());
      setBatchCostValue('');
      setShowBatchInput(false);
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleExport = () => {
    if (!calculatedResults) return;

    const headers = [
      'Produto',
      'SKU',
      'Variação',
      'Itens Vendidos',
      'Total Faturado',
      'Taxa TikTok',
      'Taxa Adicional',
      'Total a Receber',
      'Custo Produtos',
      'Imposto',
      'NF Entrada',
      'Lucro R$',
      'Lucro %',
    ];

    const rows = calculatedResults.groups.map(r => [
      r.nome_produto,
      r.sku,
      r.variacao || '-',
      r.itens_vendidos,
      r.total_faturado.toFixed(2),
      r.taxa_tiktok_reais.toFixed(2),
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
    link.download = `tiktok_variacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  const renderSummaryCards = () => {
    if (!calculatedResults) return null;
    const { totals } = calculatedResults;

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
        title: 'Variações Analisadas',
        value: calculatedResults.groups.length.toString(),
        icon: Layers,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
    ];

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

          {calculatedResults && calculatedResults.groups.length > 0 && (
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
          {selectedProducts.size} variação(ões) selecionada(s)
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
    if (!calculatedResults || calculatedResults.groups.length === 0) {
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

    const { groups, totals } = calculatedResults;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Resultados por Produto + Variação
          </CardTitle>
          <CardDescription>
            {groups.length} variações • {totals.itens_vendidos} itens vendidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderBatchActions()}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedProducts.size === groups.length && groups.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead className="min-w-[180px]">Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[120px]">Variação</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Taxa TikTok</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">Lucro R$</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((row) => (
                  <TableRow 
                    key={row.key}
                    className={cn(
                      row.custo_unitario_medio === 0 && 'bg-warning/10'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(row.key)}
                        onCheckedChange={(checked) => handleSelectProduct(row.key, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.nome_produto}>
                      {row.nome_produto}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.sku || '-'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent text-accent-foreground text-xs">
                        {row.variacao || 'Sem variação'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCostCell
                        initialCost={row.custo_unitario_medio}
                        onCostSave={(sku, nomeProduto, cost) => handleCostSave(sku, nomeProduto, row.variacao || '', cost)}
                        sku={row.sku}
                        nomeProduto={row.nome_produto}
                      />
                    </TableCell>
                    <TableCell className="text-right">{row.itens_vendidos}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_faturado)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.taxa_tiktok_reais)}</TableCell>
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
                <TableRow className="bg-primary/10 font-semibold">
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">TOTAL GERAL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right font-bold">{totals.itens_vendidos}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_faturado)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.taxa_tiktok_reais)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_a_receber)}</TableCell>
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
            <a href="/tiktok/configuracoes">Ir para Configurações</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {renderFilters()}
      {renderSummaryCards()}
      {calculatedResults && calculatedResults.groups.length > 0 && (
        <ResultsCharts data={calculatedResults.groups.map(g => ({ ...g, rebates_shopee: 0, taxa_shopee_reais: g.taxa_tiktok_reais }))} type="variacao" />
      )}
      {renderResultsTable()}
    </div>
  );
}

export default function TikTokVariacoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Variações TikTok">
        <TikTokVariacoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
