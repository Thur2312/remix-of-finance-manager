import { useState } from 'react';
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
import { FileSpreadsheet, RefreshCw, Download, Calendar, BarChart3, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyResultsState } from '@/components/layout/EmptyResultsState';
import { Link } from 'react-router-dom';

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
    const period = periods.find((p) => p.label === periodLabel);
    if (period) {
      setSelectedPeriod(period);
    }
  };

  const handleExportCSV = () => {
    if (!dreData) return;

    const sections = formatDREForDisplay(dreData);
    let csvContent = 'Descrição;Valor;% Receita\n';

    sections.forEach((section) => {
      csvContent += `\n${section.title};;;\n`;
      section.items.forEach((item) => {
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
          {[...Array(6)].map((_, i) =>
          <Skeleton key={i} className="h-24" />
          )}
        </div>
        <Skeleton className="h-96" />
      </div>);

  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>);

  }

  if (!dreData) {
    return (
      <EmptyResultsState
        title="Nenhum dado disponível"
        description="O DRE é calculado a partir dos seus pedidos. Conecte uma loja ou importe um relatório para começar."
        icon={FileSpreadsheet}
        action={
          <Button size="sm" asChild variant="outline">
            <Link to="/integrations">Ir para Integrações <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
          </Button>
        }
      />
    );
  }

  const dreSections = formatDREForDisplay(dreData);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Demonstração do Resultado (DRE)"
        subtitle="Visão consolidada do resultado financeiro da empresa"
        action={
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) =>
                <SelectItem key={period.label} value={period.label}>
                    {period.label}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

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
              {dreData.lucroOperacional >= 0 ?
              <span className="flex items-center gap-1.5 text-success font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  POSITIVO
                </span> :

              <span className="flex items-center gap-1.5 text-destructive font-semibold">
                  <XCircle className="h-4 w-4" />
                  NEGATIVO
                </span>
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Validação */}
      {dreData.alertas && dreData.alertas.length > 0 &&
      <DREAlerts alertas={dreData.alertas} />
      }

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
    </div>);

}

export default DREContent;