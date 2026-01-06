import { useState } from 'react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDREData } from '@/hooks/useDREData';
import { DRETable } from '@/components/dre/DRETable';
import { DRECharts } from '@/components/dre/DRECharts';
import { DRESummaryCards } from '@/components/dre/DRESummaryCards';
import { DREAlerts } from '@/components/dre/DREAlerts';
import { formatDREForDisplay, formatCurrency, DREPeriod } from '@/lib/dre-calculations';
import { FileSpreadsheet, RefreshCw, Download, Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function DREContent() {
  const { 
    dreData, 
    isLoading, 
    error, 
    periods, 
    selectedPeriod, 
    setSelectedPeriod,
    refetch 
  } = useDREData();

  const [activeTab, setActiveTab] = useState('resumo');

  const handlePeriodChange = (periodLabel: string) => {
    const period = periods.find(p => p.label === periodLabel);
    if (period) {
      setSelectedPeriod(period);
    }
  };

  const handleExportCSV = () => {
    if (!dreData) return;

    const sections = formatDREForDisplay(dreData);
    let csvContent = 'Descrição;Valor;% Receita\n';
    
    sections.forEach(section => {
      csvContent += `\n${section.title};;;\n`;
      section.items.forEach(item => {
        csvContent += `${item.label};${item.value.toFixed(2)};${item.percentage?.toFixed(1) || ''}\n`;
      });
      if (section.total) {
        csvContent += `${section.total.label};${section.total.value.toFixed(2)};${section.total.percentage?.toFixed(1) || ''}\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${format(selectedPeriod.start, 'yyyy-MM')}_${format(selectedPeriod.end, 'yyyy-MM')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dreData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum dado disponível</h3>
          <p className="text-muted-foreground text-sm">
            Importe dados de vendas para visualizar o DRE da sua empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dreSections = formatDREForDisplay(dreData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Demonstração do Resultado (DRE)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão consolidada do resultado financeiro da empresa
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(period => (
                <SelectItem key={period.label} value={period.label}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Export */}
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Period Info - Regra 2: Resumo executivo textual (sem valor numérico duplicado) */}
      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Período: <span className="font-medium text-foreground">
                {format(selectedPeriod.start, "dd 'de' MMMM", { locale: ptBR })} a {format(selectedPeriod.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </span>
            {/* Resumo executivo textual - não repete valor numérico dos cards */}
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Resultado do período:</span>
              {dreData.lucroOperacional >= 0 ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  POSITIVO
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                  <XCircle className="h-4 w-4" />
                  NEGATIVO
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Validação */}
      {dreData.alertas && dreData.alertas.length > 0 && (
        <DREAlerts alertas={dreData.alertas} />
      )}

      {/* Summary Cards */}
      <DRESummaryCards data={dreData} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="resumo">Resumo Visual</TabsTrigger>
          <TabsTrigger value="demonstrativo">Demonstrativo Completo</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <DRECharts data={dreData} />
        </TabsContent>

        <TabsContent value="demonstrativo">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Demonstrativo de Resultado do Exercício</CardTitle>
              <CardDescription>
                Formato contábil padrão com todas as linhas detalhadas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DRETable sections={dreSections} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DRE() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <DREContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
