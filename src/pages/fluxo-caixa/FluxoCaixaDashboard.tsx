import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowCategories, useCashFlowEntries } from '@/hooks/useCashFlow';
import { CashFlowCharts } from '@/components/fluxo-caixa/CashFlowCharts';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  // Initialize default categories if none exist
  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      initializeDefaultCategories.mutate();
    }
  }, [categoriesLoading, categories.length]);
  const isLoading = categoriesLoading || entriesLoading;

  // Calculate current month data
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonthEntries = entries.filter(entry => {
    const entryDate = parseISO(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  });

  // Calculate totals
  const totalIncome = currentMonthEntries.filter(e => e.type === 'income' && (e.status === 'received' || e.status === 'paid')).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = currentMonthEntries.filter(e => e.type === 'expense' && e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0);
  const currentBalance = totalIncome - totalExpense;
  const pendingReceivables = entries.filter(e => e.type === 'income' && e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0);
  const overduePayables = entries.filter(e => {
    if (e.type !== 'expense' || e.status === 'paid') return false;
    if (!e.due_date) return false;
    return isBefore(parseISO(e.due_date), now);
  });
  const overdueTotal = overduePayables.reduce((sum, e) => sum + Number(e.amount), 0);
  const upcomingEntries = entries.filter(e => {
    if (e.status === 'paid' || e.status === 'received') return false;
    const dueDate = e.due_date ? parseISO(e.due_date) : null;
    return dueDate && isAfter(dueDate, now);
  }).slice(0, 5);
  const recentEntries = entries.slice(0, 5);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  return <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fluxo de Caixa</h1>
            <p className="text-muted-foreground">
              Visão geral de {format(now, 'MMMM yyyy', {
              locale: ptBR
            })}
            </p>
          </div>
          <Button onClick={() => navigate('/fluxo-caixa/lancamentos')} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(currentBalance)}
                </div>}
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalIncome)}
                </div>}
              <p className="text-xs text-muted-foreground">Recebido este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpense)}
                </div>}
              <p className="text-xs text-muted-foreground">Pago este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(pendingReceivables)}
                </div>}
              <p className="text-xs text-muted-foreground">Pendente</p>
            </CardContent>
          </Card>

          <Card className={overdueTotal > 0 ? 'border-yellow-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencido</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${overdueTotal > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : <div className={`text-2xl font-bold ${overdueTotal > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                  {formatCurrency(overdueTotal)}
                </div>}
              <p className="text-xs text-muted-foreground">
                {overduePayables.length} {overduePayables.length === 1 ? 'conta' : 'contas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <CashFlowCharts entries={entries} categories={categories} isLoading={isLoading} />

        {/* Quick Access */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Entries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Próximos Vencimentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fluxo-caixa/lancamentos')}>
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div> : upcomingEntries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum vencimento próximo
                </p> : <div className="space-y-3">
                  {upcomingEntries.map(entry => <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${entry.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.due_date && format(parseISO(entry.due_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                      </span>
                    </div>)}
                </div>}
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Últimos Lançamentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fluxo-caixa/lancamentos')}>
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div> : recentEntries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum lançamento ainda
                </p> : <div className="space-y-3">
                  {recentEntries.map(entry => <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${entry.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                      </span>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>;
}

export default function FluxoCaixaDashboard() {
  return (
    <ProtectedRoute>
      <FluxoCaixaDashboardContent />
    </ProtectedRoute>
  );
}