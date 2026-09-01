import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isExcludedOrderStatus } from '@/lib/marketplace-order-status';
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
  Package,
  AlertCircle,
  Edit,
  X,
  Megaphone,
} from 'lucide-react';
import { TikTokSettingsData, TikTokOrder, calculateTikTokResults, formatCurrency, formatPercent, normalizeTikTokSettings } from '@/lib/tiktok-calculations';
import { fetchAllTikTokOrders } from '@/lib/tiktok-helpers';
import { EditableCostCell } from '@/components/EditableCostCell';
import { ResultsCharts } from '@/components/charts/ResultsCharts';
import { FiltersCard } from '@/components/layout/FiltersCard';
import { EmptyState } from '@/components/ui/empty-state';

// Superfície de cartão da área interna — mesma família visual do .glass-card
// da landing, calibrada pra densidade (ver .panel em index.css).
const CARD = 'panel bg-card border-transparent';

export function TikTokResultadosContent() {
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

      const normalized = (data || []).map(normalizeTikTokSettings);
      setAllSettings(normalized);

      if (normalized.length > 0) {
        const defaultSettings = normalized.find(s => s.is_default) || normalized[0];
        setSettings(defaultSettings);
        setSelectedSettingsId(defaultSettings.id);
      }
    } finally {
      setIsSettingsLoaded(true);
    }
  };

  const fetchOrders = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user && settings) {
      fetchOrders();
    }
  }, [user, settings, fetchOrders]);

  const handleSettingsChange = (settingsId: string) => {
    const selected = allSettings.find(s => s.id === settingsId);
    if (selected) {
      setSettings(selected);
      setSelectedSettingsId(settingsId);
    }
  };

  const calculatedResults = useMemo(() => {
    if (!settings || orders.length === 0) return null;
    return calculateTikTokResults(orders, settings, 'produto');
  }, [orders, settings]);

  // Antes, a exclusão de status na importação só cobria "Cancelado"/"Não
  // pago" por comparação exata — devolução/reembolso passava e ficava salvo
  // em tiktok_orders. isExcludedOrderStatus (mais abrangente) detecta esses
  // pedidos já importados que hoje seriam excluídos, pra avisar que ainda
  // estão inflando a receita mostrada até o cliente reimportar a planilha.
  const hasOrdersThatShouldBeExcluded = useMemo(
    () => orders.some(o => isExcludedOrderStatus(o.status_pedido)),
    [orders]
  );

  const handleCostSave = useCallback(async (sku: string, nomeProduto: string, newCost: number) => {
    if (!user) return;
    const isEmptySku = !sku || sku === '-' || sku.trim() === '';

    // Mesma trava aplicada no Shopee: editar aqui reescrevia custo_unitario de
    // todo pedido daquele SKU, inclusive de meses já fechados. Agora só aplica
    // a partir do início do mês corrente.
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const currentMonthStartIso = currentMonthStart.toISOString();

    let historicalCountQuery = supabase
      .from('tiktok_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('data_pedido', currentMonthStartIso);
    historicalCountQuery = isEmptySku
      ? historicalCountQuery.eq('nome_produto', nomeProduto)
      : historicalCountQuery.eq('sku', sku);
    const { count: historicalCount } = await historicalCountQuery;

    let query = supabase
      .from('tiktok_orders')
      .update({ custo_unitario: newCost })
      .eq('user_id', user.id)
      .gte('data_pedido', currentMonthStartIso);

    if (isEmptySku) {
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

    if (historicalCount && historicalCount > 0) {
      toast.info(`Custo atualizado a partir deste mês. ${historicalCount} pedido(s) de meses anteriores mantiveram o custo original.`);
    }

    setOrders(prev => {
      const updated = prev.map(order => {
        const isCurrentPeriod = !order.data_pedido || order.data_pedido >= currentMonthStartIso;
        if (!isCurrentPeriod) return order;
        if (isEmptySku) {
          return order.nome_produto === nomeProduto
            ? { ...order, custo_unitario: newCost }
            : order;
        }
        return order.sku === sku ? { ...order, custo_unitario: newCost } : order;
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

      // Mesma trava do handleCostSave: custo em lote só se aplica a partir do
      // mês corrente, pra não reescrever COGS de meses já fechados.
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      const currentMonthStartIso = currentMonthStart.toISOString();
      let historicalSkipped = 0;

      for (const group of selectedGroups) {
        const isEmptySku = !group.sku || group.sku === '-' || group.sku.trim() === '';

        let historicalCountQuery = supabase
          .from('tiktok_orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lt('data_pedido', currentMonthStartIso);
        historicalCountQuery = isEmptySku
          ? historicalCountQuery.eq('nome_produto', group.nome_produto)
          : historicalCountQuery.eq('sku', group.sku);
        const { count: historicalCount } = await historicalCountQuery;
        historicalSkipped += historicalCount || 0;

        let query = supabase
          .from('tiktok_orders')
          .update({ custo_unitario: numValue })
          .eq('user_id', user.id)
          .gte('data_pedido', currentMonthStartIso);

        if (isEmptySku) {
          query = query.eq('nome_produto', group.nome_produto);
        } else {
          query = query.eq('sku', group.sku);
        }

        await query;
      }

      setOrders(prev => {
        const skuSet = new Set(selectedGroups.filter(g => g.sku && g.sku !== '-').map(g => g.sku));
        const nameSet = new Set(selectedGroups.filter(g => !g.sku || g.sku === '-').map(g => g.nome_produto));

        const updated = prev.map(order => {
          const isCurrentPeriod = !order.data_pedido || order.data_pedido >= currentMonthStartIso;
          if (!isCurrentPeriod) return order;
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

      toast.success(
        historicalSkipped > 0
          ? `Custo atualizado para ${selectedGroups.length} produto(s) a partir deste mês. ${historicalSkipped} pedido(s) de meses anteriores mantiveram o custo original.`
          : `Custo atualizado para ${selectedGroups.length} produto(s)`
      );
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
      'Custo Unitário',
      'Itens Vendidos',
      'Total Faturado',
      'Taxa TikTok',
      'Taxa Adicional',
      'Total a Receber',
      'Custo Produtos',
      'NF Entrada',
      'Lucro R$',
      'Lucro %',
    ];

    const rows = calculatedResults.groups.map(r => [
      r.nome_produto,
      r.sku,
      r.custo_unitario_medio.toFixed(2),
      r.itens_vendidos,
      r.total_faturado.toFixed(2),
      r.taxa_tiktok_reais.toFixed(2),
      r.taxa_adicional_itens.toFixed(2),
      r.total_a_receber.toFixed(2),
      r.total_gasto_produtos.toFixed(2),
      r.nf_entrada.toFixed(2),
      r.lucro_reais.toFixed(2),
      r.lucro_percentual.toFixed(1),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tiktok_resultados_${new Date().toISOString().split('T')[0]}.csv`;
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
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        title: 'Total a Receber',
        value: formatCurrency(totals.total_a_receber),
        icon: DollarSign,
        color: 'text-success',
        bg: 'bg-success/10',
      },
      {
        title: 'Lucro Operacional',
        value: formatCurrency(totals.lucro_reais),
        subtitle: totals.gasto_ads > 0
          ? `Ads: -${formatCurrency(totals.gasto_ads)} · antes do imposto`
          : 'Antes do imposto de saída',
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

    if (totals.gasto_ads > 0) {
      cards.splice(3, 0, {
        title: 'Gasto com Ads',
        value: formatCurrency(totals.gasto_ads),
        icon: Megaphone,
        color: 'text-warning',
        bg: 'bg-warning/10',
      });
    }

    return (
      <div className={cn('grid gap-4', totals.gasto_ads > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
        {cards.map((card) => (
          <Card key={card.title} className={CARD}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold font-mono">{card.value}</p>
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
    <FiltersCard>
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
    </FiltersCard>
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
    if (!calculatedResults || calculatedResults.groups.length === 0) {
      return <EmptyState />;
    }

    const { groups, totals } = calculatedResults;

    return (
      <Card className={CARD}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Resultados por Produto
          </CardTitle>
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedProducts.size === groups.length && groups.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead className="min-w-[180px]">Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Taxa TikTok</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
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
                    <TableCell className="text-right">
                      <EditableCostCell
                        initialCost={row.custo_unitario_medio}
                        onCostSave={handleCostSave}
                        sku={row.sku}
                        nomeProduto={row.nome_produto}
                      />
                    </TableCell>
                    <TableCell className="text-right">{row.itens_vendidos}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_faturado)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.taxa_tiktok_reais)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_a_receber)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(row.total_gasto_produtos)}</TableCell>
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
                  <TableCell className="text-right font-bold">{totals.itens_vendidos}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_faturado)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.taxa_tiktok_reais)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(totals.total_a_receber)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(totals.total_gasto_produtos)}</TableCell>
                  <TableCell className={cn('text-right font-bold', totals.lucro_reais >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(totals.lucro_reais)}
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
      <Card className={`${CARD} max-w-md mx-auto`}>
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
    <div className="space-y-6">
      {hasOrdersThatShouldBeExcluded && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alguns pedidos podem estar desatualizados</AlertTitle>
          <AlertDescription>
            Pedidos devolvidos/reembolsados importados antes da correção de
            status continuam contando na receita abaixo. Reimporte a planilha
            mais recente do TikTok Shop em{' '}
            <a href="/tiktok/upload" className="underline font-medium">Upload</a>{' '}
            pra atualizar esses números.
          </AlertDescription>
        </Alert>
      )}
      {renderFilters()}
      {renderSummaryCards()}
      {calculatedResults && calculatedResults.groups.length > 0 && (
        <ResultsCharts data={calculatedResults.groups.map(g => ({ ...g, rebates_shopee: 0, taxa_shopee_reais: g.taxa_tiktok_reais }))} type="produto" />
      )}
      {renderResultsTable()}
    </div>
  );
}

