import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowCategories, useCashFlowEntries, expandRecurringEntries, computeAccumulatedBalance } from '@/hooks/useCashFlow';
import { CashFlowCharts } from '@/components/fluxo-caixa/CashFlowCharts';
import { Plus, ArrowRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { fluxoCaixaNavTabs } from '@/components/layout/InPageNav';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parseISO, subYears, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HandCoins } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Money } from '@/components/ui/money';

// Superfície de cartão da área interna — mesma família visual do .glass-card
// da landing, calibrada pra densidade (ver .panel em index.css). bg-card
// (não bg-white) pra herdar o navy do tema em vez de forçar branco.
const CARD = 'panel bg-card border-transparent';

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
  }, [categoriesLoading, categories.length, initializeDefaultCategories]);
  const isLoading = categoriesLoading || entriesLoading;

  // Calculate current month data
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Recurring entries are stored as a single row; expand them in-memory so they count
  // every period they cover instead of only on the one date they were created with.
  const expandedEntries = expandRecurringEntries(entries, subYears(now, 2), addYears(now, 1));

  const currentMonthEntries = expandedEntries.filter((entry) => {
    const entryDate = parseISO(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd;
  });

  // Calculate totals
  const totalIncome = currentMonthEntries.filter((e) => e.type === 'income' && (e.status === 'received' || e.status === 'paid')).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = currentMonthEntries.filter((e) => e.type === 'expense' && e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0);
  // Saldo atual da conta: acumulado de todas as entradas e saídas já efetivadas até hoje (não reseta a cada mês)
  const currentBalance = computeAccumulatedBalance(expandedEntries, now);
  const pendingReceivables = expandedEntries.filter((e) => e.type === 'income' && e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0);
  const overduePayables = expandedEntries.filter((e) => {
    if (e.type !== 'expense' || e.status === 'paid') return false;
    if (!e.due_date) return false;
    return isBefore(parseISO(e.due_date), now);
  });
  const overdueTotal = overduePayables.reduce((sum, e) => sum + Number(e.amount), 0);
  const upcomingEntries = expandedEntries.filter((e) => {
    if (e.status === 'paid' || e.status === 'received') return false;
    const dueDate = e.due_date ? parseISO(e.due_date) : null;
    return dueDate && isAfter(dueDate, now);
  }).sort((a, b) => parseISO(a.due_date!).getTime() - parseISO(b.due_date!).getTime()).slice(0, 5);
  // "Últimos Lançamentos" mostra apenas os registros reais criados pelo usuário, nunca ocorrências virtuais.
  const recentEntries = entries.slice(0, 5);
  return <PageShell
      icon={HandCoins}
      title="Fluxo de Caixa"
      subtitle={`Visão geral de ${format(now, 'MMMM yyyy', { locale: ptBR })}`}
      action={<Button onClick={() => navigate('/fluxo-caixa/lancamentos')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>}
      tabs={fluxoCaixaNavTabs}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
              
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <Money reais={currentBalance} className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-success' : 'text-destructive'}`} />
              )}
              <p className="text-xs text-muted-foreground">Acumulado</p>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <Money reais={totalIncome} className="text-2xl font-bold text-success" />
              )}
              <p className="text-xs text-muted-foreground">Recebido este mês</p>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas</CardTitle>
              
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <Money reais={totalExpense} className="text-2xl font-bold text-destructive" />
              )}
              <p className="text-xs text-muted-foreground">Pago este mês</p>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <Money reais={pendingReceivables} className="text-2xl font-bold text-primary" />
              )}
              <p className="text-xs text-muted-foreground">Pendente</p>
            </CardContent>
          </Card>

          <Card className={`${CARD} ${overdueTotal > 0 ? 'border-warning/40' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
              
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <Money reais={overdueTotal} className={`text-2xl font-bold ${overdueTotal > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              )}
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
          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Próximos Vencimentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fluxo-caixa/lancamentos')}>
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div> : upcomingEntries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum vencimento próximo
                </p> : <div className="space-y-3">
                  {upcomingEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${entry.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.due_date && format(parseISO(entry.due_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${entry.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                      </span>
                    </div>)}
                </div>}
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card className={CARD}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Últimos Lançamentos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/fluxo-caixa/lancamentos')}>
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div> : recentEntries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum lançamento ainda
                </p> : <div className="space-y-3">
                  {recentEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${entry.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${entry.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                        {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                      </span>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>;
}

export default FluxoCaixaDashboardContent;