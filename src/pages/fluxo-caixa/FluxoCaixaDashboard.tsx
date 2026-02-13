import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCashFlowCategories, useCashFlowEntries } from '@/hooks/useCashFlow';
import { CashFlowCharts } from '@/components/fluxo-caixa/CashFlowCharts';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle, Plus, ArrowRight, CalendarClock, History, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isBefore, parseISO, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function FluxoCaixaDashboardContent() {
  const navigate = useNavigate();
  const {
    categories,
    isLoading: categoriesLoading,
    initializeDefaultCategories
  } = useCashFlowCategories();
  const {
    entries,
    isLoading: entriesLoading
  } = useCashFlowEntries();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(getMonth(now) + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(getYear(now));

  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      initializeDefaultCategories.mutate();
    }
  }, [categoriesLoading, categories.length]);

  const isLoading = categoriesLoading || entriesLoading;

  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const currentMonthEntries = entries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  });

  const totalIncome = currentMonthEntries
    .filter(e => e.type === 'income' && (e.status === 'received' || e.status === 'paid'))
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalExpense = currentMonthEntries
    .filter(e => e.type === 'expense' && e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const currentBalance = totalIncome - totalExpense;
  
  const pendingReceivables = entries
    .filter(e => e.type === 'income' && e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const overduePayables = entries.filter(e => {
    if (e.type !== 'expense' || e.status === 'paid') return false;
    if (!e.due_date) return false;
    return isBefore(parseISO(e.due_date), now);
  });
  
  const overdueTotal = overduePayables.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const upcomingEntries = entries
    .filter(e => {
      if (e.status === 'paid' || e.status === 'received') return false;
      const dueDate = e.due_date ? parseISO(e.due_date) : null;
      return dueDate && dueDate > now;
    })
    .sort((a, b) => {
      const dateA = a.due_date ? parseISO(a.due_date).getTime() : 0;
      const dateB = b.due_date ? parseISO(b.due_date).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 5);
  
  const recentEntries = [...entries]
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getBalanceTrend = () => {
    if (currentBalance > 0) return 'up';
    if (currentBalance < 0) return 'down';
    return 'neutral';
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 15 }, (_, i) => getYear(now) + i);

  return (
    <AppLayout title="Fluxo de Caixa">
      <motion.div 
        className="space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <PageHeader
            title="Fluxo de Caixa"
            description={`Visão geral de ${format(selectedDate, 'MMMM yyyy', { locale: ptBR })}`}
            icon={Wallet}
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-50 h-10 border-blue-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-20 h-10 border-blue-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <Button 
            onClick={() => navigate('/fluxo-caixa/lancamentos')} 
            className="gap-2 shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
          </div>
        </motion.div>

        <Separator className="my-4" />


        <Separator className="my-4" />

        {/* Summary Cards */}
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <StatCard
              title="Saldo Atual"
              value={isLoading ? "..." : formatCurrency(currentBalance)}
              subtitle="Este mês"
              icon={Wallet}
              trend={getBalanceTrend()}
              className="border border-blue-200 bg-white"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <StatCard
              title="Entradas"
              value={isLoading ? "..." : formatCurrency(totalIncome)}
              subtitle="Recebido este mês"
              icon={TrendingUp}
              trend="up"
              className="border border-blue-200 bg-white"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <StatCard
              title="Saídas"
              value={isLoading ? "..." : formatCurrency(totalExpense)}
              subtitle="Pago este mês"
              icon={TrendingDown}
              trend="down"
              className="border border-blue-200 bg-white"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <div className="relative overflow-hidden rounded-xl border border-blue-200 shadow-md bg-gradient-to-br from-blue-50 via-white to-white p-6 h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">A Receber</p>
                  <p className="text-2xl font-bold tracking-tight text-blue-600">
                    {isLoading ? "..." : formatCurrency(pendingReceivables)}
                  </p>
                  <p className="text-xs text-gray-500">Pendente</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className={cn(
              "relative overflow-hidden rounded-xl border border-blue-200 shadow-md p-6 h-full transition-all",
              overdueTotal > 0 
                ? "bg-gradient-to-br from-yellow-50 via-white to-white ring-1 ring-yellow-300" 
                : "bg-gradient-to-br from-blue-50 via-white to-white"
            )}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Vencido</p>
                  <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    overdueTotal > 0 ? "text-yellow-600" : "text-gray-500"
                  )}>
                    {isLoading ? "..." : formatCurrency(overdueTotal)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {overduePayables.length} {overduePayables.length === 1 ? 'conta' : 'contas'}
                  </p>
                </div>
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  overdueTotal > 0 ? "bg-yellow-100" : "bg-blue-100"
                )}>
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    overdueTotal > 0 ? "text-yellow-600" : "text-gray-500"
                  )} />
                </div>
              </div>
              {overdueTotal > 0 && (
                <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-yellow-100 blur-2xl" />
              )}
            </div>
          </motion.div>
        </motion.div>

        <Separator className="my-4" />

        {/* Charts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <CashFlowCharts entries={entries} categories={categories} isLoading={isLoading} />
        </motion.div>

        <Separator className="my-4" />

        {/* Quick Access Lists */}
        <motion.div 
          className="grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* Upcoming Entries */}
          <SectionCard
            title="Próximos Vencimentos"
            icon={CalendarClock}
            headerClassName="pb-2 bg-blue-50 border-b border-blue-200"
            className="overflow-hidden border border-blue-200 bg-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-600">
                {upcomingEntries.length} pendente{upcomingEntries.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/fluxo-caixa/lancamentos')}
                className="text-xs h-7 px-2 hover:bg-blue-50 text-blue-700"
              >
                Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            
            {upcomingEntries.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhum vencimento"
                description="Você não tem contas a vencer nos próximos dias"
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {upcomingEntries.map((entry, index) => (
                  <motion.div 
                    key={entry.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all",
                      "bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300",
                      "animate-fade-in"
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white",
                        entry.type === 'income' 
                          ? 'bg-green-500 ring-green-300' 
                          : 'bg-red-500 ring-red-300'
                      )} />
                      <div>
                        <p className="text-sm font-medium line-clamp-1 text-gray-900">{entry.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-600">
                            {entry.due_date && format(parseISO(entry.due_date), 'dd/MM/yyyy')}
                          </p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-200 text-blue-700">
                            {entry.type === 'income' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      entry.type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    )}>
                      {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Entries */}
          <SectionCard
            title="Últimos Lançamentos"
            icon={History}
            headerClassName="pb-2 bg-blue-50 border-b border-blue-200"
            className="overflow-hidden border border-blue-200 bg-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-600">
                {entries.length} total
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/fluxo-caixa/lancamentos')}
                className="text-xs h-7 px-2 hover:bg-blue-50 text-blue-700"
              >
              Ver todos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            
            {recentEntries.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nenhum lançamento"
                description="Comece adicionando seu primeiro lançamento"
                action={{
                  label: "Novo Lançamento",
                  onClick: () => navigate('/fluxo-caixa/lancamentos')
                }}
                className="py-6"
              />
            ) : (
              <div className="space-y-2">
                {recentEntries.map((entry, index) => (
                  <motion.div 
                    key={entry.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all",
                      "bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300",
                      "animate-fade-in"
                    )}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-white",
                        entry.type === 'income' 
                          ? 'bg-green-500 ring-green-300' 
                          : 'bg-red-500 ring-red-300'
                      )} />
                      <div>
                        <p className="text-sm font-medium line-clamp-1 text-gray-900">{entry.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-600">
                            {format(parseISO(entry.date), 'dd/MM/yyyy')}
                          </p>
                          <Badge 
                            variant={entry.status === 'paid' || entry.status === 'received' ? 'default' : 'secondary'}
                            className="text-[10px] h-4 px-1 bg-blue-100 text-blue-700 border-blue-200"
                          >
                            {entry.status === 'paid' || entry.status === 'received' ? 'Confirmado' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      entry.type === 'income' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    )}>
                      {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

export default function FluxoCaixaDashboard() {
  return (
    <ProtectedRoute>
      <FluxoCaixaDashboardContent />
    </ProtectedRoute>
  );
}