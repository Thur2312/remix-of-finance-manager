import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllOrders } from '@/lib/supabase-helpers';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Filter,
  Download,
  Layers,
  Megaphone,
  Settings,
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

function ResultadosVariacoesContent() {
  const { user } = useAuth();
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [allSettings, setAllSettings] = useState<SettingsData[]>([]);
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [selectedSettingsId, setSelectedSettingsId] = useState<string>('');

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
      const calculatedResults = calculateResults(orders, settings, 'variacao');
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

  const handleExport = () => {
    if (!results) return;

    const headers = [
      'Produto', 'SKU', 'Variação', 'Itens Vendidos', 'Total Faturado',
      'Rebates', 'Taxa Shopee', 'Taxa Adicional', 'Total a Receber',
      'Custo Produtos', 'Imposto', 'NF Entrada', 'Lucro R$', 'Lucro %',
    ];

    const rows = results.groups.map(r => [
      r.nome_produto, r.sku, r.variacao || '-', r.itens_vendidos,
      r.total_faturado.toFixed(2), r.rebates_shopee.toFixed(2),
      r.taxa_shopee_reais.toFixed(2), r.taxa_adicional_itens.toFixed(2),
      r.total_a_receber.toFixed(2), r.total_gasto_produtos.toFixed(2),
      r.imposto.toFixed(2), r.nf_entrada.toFixed(2),
      r.lucro_reais.toFixed(2), r.lucro_percentual.toFixed(1),
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultados_variacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
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
      <EmptyState
        icon={Settings}
        title="Configuração Necessária"
        description="Você precisa criar uma configuração financeira antes de visualizar os resultados."
        action={{ label: 'Ir para Configurações', href: '/configuracoes' }}
      />
    );
  }

  const totals = results?.totals;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resultados com Variações"
        description="Análise detalhada de lucro por produto e variação"
        icon={Layers}
      >
        {results && results.groups.length > 0 && (
          <Button onClick={handleExport} variant="outline" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <SectionCard title="Filtros" icon={Filter}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Configuração</Label>
            <Select value={selectedSettingsId} onValueChange={handleSettingsChange}>
              <SelectTrigger className="w-[220px]">
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
        </div>
      </SectionCard>

      {/* Stats */}
      {totals && (
        <div className={cn('grid gap-4', totals.gasto_ads > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4')}>
          <StatCard
            title="Total Faturado"
            value={formatCurrency(totals.total_faturado)}
            icon={DollarSign}
            trend="neutral"
          />
          <StatCard
            title="Total a Receber"
            value={formatCurrency(totals.total_a_receber)}
            icon={DollarSign}
            trend="up"
          />
          <StatCard
            title="Lucro Líquido"
            value={formatCurrency(totals.lucro_reais)}
            subtitle={totals.gasto_ads > 0 ? `Ads: -${formatCurrency(totals.gasto_ads)}` : undefined}
            icon={totals.lucro_reais >= 0 ? TrendingUp : TrendingDown}
            trend={totals.lucro_reais >= 0 ? 'up' : 'down'}
          />
          {totals.gasto_ads > 0 && (
            <StatCard
              title="Gasto com Ads"
              value={formatCurrency(totals.gasto_ads)}
              icon={Megaphone}
              trend="down"
            />
          )}
          <StatCard
            title="Variações Analisadas"
            value={results?.groups.length.toString() || '0'}
            icon={Layers}
            trend="neutral"
          />
        </div>
      )}

      {/* Charts */}
      {results && results.groups.length > 0 && (
        <ResultsCharts data={results.groups} type="variacao" />
      )}

      {/* Results Table */}
      {!results || results.groups.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Nenhum resultado encontrado"
          description="Ajuste os filtros ou faça upload de pedidos para visualizar os resultados."
        />
      ) : (
        <SectionCard
          title="Resultados por Produto + Variação"
          description={`${results.groups.length} variações • ${totals?.itens_vendidos || 0} itens vendidos`}
          icon={Layers}
          noPadding
          contentClassName="p-0"
        >
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[180px] font-semibold">Produto</TableHead>
                  <TableHead className="font-semibold">SKU</TableHead>
                  <TableHead className="min-w-[120px] font-semibold">Variação</TableHead>
                  <TableHead className="text-right font-semibold">Qtd</TableHead>
                  <TableHead className="text-right font-semibold">Faturado</TableHead>
                  <TableHead className="text-right font-semibold">Taxa Shopee</TableHead>
                  <TableHead className="text-right font-semibold">A Receber</TableHead>
                  <TableHead className="text-right font-semibold">Custo</TableHead>
                  <TableHead className="text-right font-semibold">Imposto</TableHead>
                  <TableHead className="text-right font-semibold">Lucro R$</TableHead>
                  <TableHead className="text-right font-semibold">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.groups.map((row) => (
                  <TableRow key={row.key} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="max-w-[200px] truncate font-medium" title={row.nome_produto}>
                      {row.nome_produto}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.sku}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        {row.variacao || 'Sem variação'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.itens_vendidos}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.total_faturado)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(row.taxa_shopee_reais)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(row.total_a_receber)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(row.total_gasto_produtos)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{formatCurrency(row.imposto)}</TableCell>
                    <TableCell className={cn('text-right font-semibold tabular-nums', row.lucro_reais >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {formatCurrency(row.lucro_reais)}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', row.lucro_percentual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {formatPercent(row.lucro_percentual)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-primary/5 font-semibold border-t-2 border-primary/20">
                  <TableCell className="font-bold">TOTAL GERAL</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{totals?.itens_vendidos}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals?.total_faturado || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals?.taxa_shopee_reais || 0)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals?.total_a_receber || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals?.total_gasto_produtos || 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals?.imposto || 0)}</TableCell>
                  <TableCell className={cn('text-right font-bold tabular-nums', (totals?.lucro_bruto || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {formatCurrency(totals?.lucro_bruto || 0)}
                  </TableCell>
                  <TableCell className={cn('text-right font-bold tabular-nums', (totals?.lucro_percentual_medio || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {formatPercent(totals?.lucro_percentual_medio || 0)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export default function ResultadosVariacoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Resultados com Variações">
        <ResultadosVariacoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
