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
import { motion } from 'framer-motion';

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
      <motion.div 
        className="flex items-center justify-center h-64"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </motion.div>
    );
  }

  if (allSettings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <EmptyState
          icon={Settings}
          title="Configuração Necessária"
          description="Você precisa criar uma configuração financeira antes de visualizar os resultados."
          action={{ label: 'Ir para Configurações', href: '/configuracoes' }}
        />
      </motion.div>
    );
  }

  const totals = results?.totals;

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <PageHeader
          title="Resultados com Variações"
          description="Análise detalhada de lucro por produto e variação"
          icon={Layers}
        >
          {results && results.groups.length > 0 && (
            <Button onClick={handleExport} variant="outline" className="shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </PageHeader>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <SectionCard 
          title="Filtros" 
          icon={Filter} 
          headerClassName="bg-blue-50 border-b border-blue-200"
          className="border border-blue-200 bg-white shadow-lg"
        >
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-gray-900">Configuração</Label>
              <Select value={selectedSettingsId} onValueChange={handleSettingsChange}>
                <SelectTrigger className="w-[220px] border-blue-200 focus:border-blue-500">
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
      </motion.div>

      {/* Stats */}
      {totals && (
        <motion.div 
          className={cn('grid gap-4', totals.gasto_ads > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <StatCard
            title="Total Faturado"
            value={formatCurrency(totals.total_faturado)}
            icon={DollarSign}
            trend="neutral"
            className="border border-blue-200 bg-white"
          />
          <StatCard
            title="Total a Receber"
            value={formatCurrency(totals.total_a_receber)}
            icon={DollarSign}
            trend="up"
            className="border border-blue-200 bg-white"
          />
          <StatCard
            title="Lucro Líquido"
            value={formatCurrency(totals.lucro_reais)}
            subtitle={totals.gasto_ads > 0 ? `Ads: -${formatCurrency(totals.gasto_ads)}` : undefined}
            icon={totals.lucro_reais >= 0 ? TrendingUp : TrendingDown}
            trend={totals.lucro_reais >= 0 ? 'up' : 'down'}
            className="border border-blue-200 bg-white"
          />
          {totals.gasto_ads > 0 && (
            <StatCard
              title="Gasto com Ads"
              value={formatCurrency(totals.gasto_ads)}
              icon={Megaphone}
              trend="down"
              className="border border-blue-200 bg-white"
            />
          )}
          <StatCard
            title="Variações Analisadas"
            value={results?.groups.length.toString() || '0'}
            icon={Layers}
            trend="neutral"
            className="border border-blue-200 bg-white"
          />
        </motion.div>
      )}

      {/* Charts */}
      {results && results.groups.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ResultsCharts data={results.groups} type="variacao" />
        </motion.div>
      )}

      {/* Results Table */}
      {!results || results.groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <EmptyState
            icon={AlertCircle}
            title="Nenhum resultado encontrado"
            description="Ajuste os filtros ou faça upload de pedidos para visualizar os resultados."
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <SectionCard
            title="Resultados por Produto + Variação"
            description={`${results.groups.length} variações • ${totals?.itens_vendidos || 0} itens vendidos`}
            icon={Layers}
            noPadding
            contentClassName="p-0"
            headerClassName="bg-blue-50 border-b border-blue-200"
            className="border border-blue-200 bg-white shadow-lg"
          >
            <div className="rounded-lg border border-blue-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="min-w-[180px] font-semibold text-gray-900">Produto</TableHead>
                    <TableHead className="font-semibold text-gray-900">SKU</TableHead>
                    <TableHead className="min-w-[120px] font-semibold text-gray-900">Variação</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Qtd</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Faturado</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Taxa Shopee</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">A Receber</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Custo</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Imposto</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Lucro R$</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.groups.map((row, index) => (
                    <motion.tr 
                      key={row.key}
                      className="hover:bg-blue-25 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                    >
                      <TableCell className="max-w-[200px] truncate font-medium text-gray-900" title={row.nome_produto}>
                        {row.nome_produto}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{row.sku}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          {row.variacao || 'Sem variação'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-900">{row.itens_vendidos}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-900">{formatCurrency(row.total_faturado)}</TableCell>
                      <TableCell className="text-right text-gray-500 tabular-nums">{formatCurrency(row.taxa_shopee_reais)}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-900">{formatCurrency(row.total_a_receber)}</TableCell>
                      <TableCell className="text-right text-gray-500 tabular-nums">{formatCurrency(row.total_gasto_produtos)}</TableCell>
                      <TableCell className="text-right text-gray-500 tabular-nums">{formatCurrency(row.imposto)}</TableCell>
                      <TableCell className={cn('text-right font-semibold tabular-nums', row.lucro_reais >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(row.lucro_reais)}
                      </TableCell>
                      <TableCell className={cn('text-right tabular-nums', row.lucro_percentual >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatPercent(row.lucro_percentual)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-blue-50 font-semibold border-t-2 border-blue-200">
                    <TableCell className="font-bold text-gray-900">TOTAL GERAL</TableCell>
                    <TableCell className="text-gray-600">-</TableCell>
                    <TableCell className="text-gray-600">-</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-gray-900">{totals?.itens_vendidos}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-gray-900">{formatCurrency(totals?.total_faturado || 0)}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-600">{formatCurrency(totals?.taxa_shopee_reais || 0)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-gray-900">{formatCurrency(totals?.total_a_receber || 0)}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-600">{formatCurrency(totals?.total_gasto_produtos || 0)}</TableCell>
                    <TableCell className="text-right tabular-nums text-gray-600">{formatCurrency(totals?.imposto || 0)}</TableCell>
                    <TableCell className={cn('text-right font-bold tabular-nums', (totals?.lucro_bruto || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(totals?.lucro_bruto || 0)}
                    </TableCell>
                    <TableCell className={cn('text-right font-bold tabular-nums', (totals?.lucro_percentual_medio || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatPercent(totals?.lucro_percentual_medio || 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </SectionCard>
        </motion.div>
      )}
    </motion.div>
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