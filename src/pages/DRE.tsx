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
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDREForDisplay, formatCurrency } from '@/lib/dre-calculations';
import { FileSpreadsheet, RefreshCw, Download, Calendar, TrendingUp, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

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
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </motion.div>
        <motion.div variants={fadeInUp} className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </motion.div>
        <motion.div variants={fadeInUp}>
          <Skeleton className="h-96" />
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <Alert variant="destructive" className="border border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  if (!dreData) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
      >
        <EmptyState
          icon={FileSpreadsheet}
          title="Nenhum dado disponível"
          description="Importe dados de vendas para visualizar o DRE da sua empresa."
        />
      </motion.div>
    );
  }

  const dreSections = formatDREForDisplay(dreData);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp}>
        <PageHeader
          title="Demonstração do Resultado (DRE)"
          description="Visão consolidada do resultado financeiro da empresa"
          icon={TrendingUp}
        >
          <Select value={selectedPeriod.label} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48 shadow-sm border-blue-200">
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

          <Button variant="outline" size="icon" onClick={refetch} className="shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleExportCSV} className="shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </PageHeader>
      </motion.div>

      {/* Period Info */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 shadow-lg">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Período: <span className="font-medium text-gray-900">
                  {format(selectedPeriod.start, "dd 'de' MMMM", { locale: ptBR })} a {format(selectedPeriod.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-gray-600">Resultado do período:</span>
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
      </motion.div>

      {/* Alerts */}
      {dreData.alertas && dreData.alertas.length > 0 && (
        <motion.div variants={fadeInUp}>
          <DREAlerts alertas={dreData.alertas} />
        </motion.div>
      )}

      {/* Summary Cards */}
      <motion.div variants={fadeInUp}>
        <DRESummaryCards data={dreData} />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeInUp} className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-blue-50 p-1 border border-blue-200">
            <TabsTrigger value="resumo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-900">
              Resumo Visual
            </TabsTrigger>
            <TabsTrigger value="demonstrativo" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-gray-900">
              Demonstrativo Completo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-6">
            <DRECharts data={dreData} />
          </TabsContent>

          <TabsContent value="demonstrativo">
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="pb-4 bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-lg font-semibold text-gray-900">Demonstrativo de Resultado do Exercício</CardTitle>
                <CardDescription className="text-gray-600">
                  Formato contábil padrão com todas as linhas detalhadas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DRETable sections={dreSections} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
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