import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { useCashFlowCategories, useCashFlowEntries } from '@/hooks/useCashFlow';
import { CashFlowCharts } from '@/components/fluxo-caixa/CashFlowCharts';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertTriangle, Plus, ArrowRight, CalendarClock, History, Receipt } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      initializeDefaultCategories.mutate();
    }
  }, [categoriesLoading, categories.length]);

  const isLoading = categoriesLoading || entriesLoading;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
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

  return (
    <AppLayout title="Fluxo de Caixa">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Fluxo de Caixa"
            description={`Visão geral de ${format(now, 'MMMM yyyy', { locale: ptBR })}`}
            icon={Wallet}
          />
          <Button 
            onClick={() => navigate('/fluxo-caixa/lancamentos')} 
            className="gap-2 shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Saldo Atual"
            value={isLoading ? "..." : formatCurrency(currentBalance)}
            subtitle="Este mês"
            icon={Wallet}
            trend={getBalanceTrend()}
            className="animate-fade-in"
          />
          
          <StatCard
            title="Entradas"
            value={isLoading ? "..." : formatCurrency(totalIncome)}
            subtitle="Recebido este mês"
            icon={TrendingUp}
            trend="up"
            className="animate-fade-in [animation-delay:50ms]"
          />
          
          <StatCard
            title="Saídas"
            value={isLoading ? "..." : formatCurrency(totalExpense)}
            subtitle="Pago este mês"
            icon={TrendingDown}
            trend="down"
            className="animate-fade-in [animation-delay:100ms]"
          />
          
          <div className="animate-fade-in [animation-delay:150ms]">
            <div className="relative overflow-hidden rounded-xl border-0 shadow-md bg-gradient-to-br from-info/10 via-card to-card p-6 h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                  <p className="text-2xl font-bold tracking-tight text-info">
                    {isLoading ? "..." : formatCurrency(pendingReceivables)}
                  </p>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info/15">
                  <Clock className="h-5 w-5 text-info" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="animate-fade-in [animation-delay:200ms]">
            <div className={cn(
              "relative overflow-hidden rounded-xl border-0 shadow-md p-6 h-full transition-all",
              overdueTotal > 0 
                ? "bg-gradient-to-br from-warning/20 via-card to-card ring-1 ring-warning/30" 
                : "bg-gradient-to-br from-muted/50 via-card to-card"
            )}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Vencido</p>
                  <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    overdueTotal > 0 ? "text-warning" : "text-muted-foreground"
                  )}>
                    {isLoading ? "..." : formatCurrency(overdueTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overduePayables.length} {overduePayables.length === 1 ? 'conta' : 'contas'}
                  </p>
                </div>
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  overdueTotal > 0 ? "bg-warning/15" : "bg-muted"
                )}>
                  <AlertTriangle className={cn(
                    "h-5 w-5",
                    overdueTotal > 0 ? "text-warning" : "text-muted-foreground"
                  )} />
                </div>
              </div>
              {overdueTotal > 0 && (
                <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-warning/10 blur-2xl" />
              )}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="animate-fade-in [animation-delay:250ms]">
          <CashFlowCharts entries={entries} categories={categories} isLoading={isLoading} />
        </div>

        {/* Quick Access Lists */}
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in [animation-delay:300ms]">
          {/* Upcoming Entries */}
          <SectionCard
            title="Próximos Vencimentos"
            icon={CalendarClock}
            headerClassName="pb-2"
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">
                {upcomingEntries.length} pendente{upcomingEntries.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/fluxo-caixa/lancamentos')}
                className="text-xs h-7 px-2"
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
                  <div 
                    key={entry.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all",
                      "bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background",
                        entry.type === 'income' 
                          ? 'bg-success ring-success/30' 
                          : 'bg-destructive ring-destructive/30'
                      )} />
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{entry.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {entry.due_date && format(parseISO(entry.due_date), 'dd/MM/yyyy')}
                          </p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {entry.type === 'income' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      entry.type === 'income' 
                        ? 'text-success' 
                        : 'text-destructive'
                    )}>
                      {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Entries */}
          <SectionCard
            title="Últimos Lançamentos"
            icon={History}
            headerClassName="pb-2"
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">
                {entries.length} total
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/fluxo-caixa/lancamentos')}
                className="text-xs h-7 px-2"
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
                  <div 
                    key={entry.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-all",
                      "bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50",
                      "animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background",
                        entry.type === 'income' 
                          ? 'bg-success ring-success/30' 
                          : 'bg-destructive ring-destructive/30'
                      )} />
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{entry.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), 'dd/MM/yyyy')}
                          </p>
                          <Badge 
                            variant={entry.status === 'paid' || entry.status === 'received' ? 'default' : 'secondary'}
                            className="text-[10px] h-4 px-1"
                          >
                            {entry.status === 'paid' || entry.status === 'received' ? 'Confirmado' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      entry.type === 'income' 
                        ? 'text-success' 
                        : 'text-destructive'
                    )}>
                      {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
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
