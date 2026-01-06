import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CashFlowEntry, CashFlowCategory } from '@/hooks/useCashFlow';

interface CashFlowChartsProps {
  entries: CashFlowEntry[];
  categories: CashFlowCategory[];
  isLoading: boolean;
}

const CHART_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#14B8A6', '#6366F1', '#F97316', '#6B7280'
];

export function CashFlowCharts({ entries, categories, isLoading }: CashFlowChartsProps) {
  // Calculate last 6 months data for line and bar charts
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; income: number; expense: number; balance: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR });

      const monthEntries = entries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entryDate >= monthStart && entryDate <= monthEnd && 
               (entry.status === 'paid' || entry.status === 'received');
      });

      const income = monthEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const expense = monthEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        income,
        expense,
        balance: income - expense,
      });
    }

    return months;
  }, [entries]);

  // Calculate cumulative balance for line chart
  const balanceEvolution = useMemo(() => {
    let cumulativeBalance = 0;
    return monthlyData.map(month => {
      cumulativeBalance += month.balance;
      return {
        ...month,
        cumulativeBalance,
      };
    });
  }, [monthlyData]);

  // Calculate expense distribution by category for pie chart
  const expenseByCategory = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthExpenses = entries.filter(entry => {
      const entryDate = parseISO(entry.date);
      return entry.type === 'expense' && 
             entry.status === 'paid' &&
             entryDate >= monthStart && 
             entryDate <= monthEnd;
    });

    const categoryTotals = new Map<string, { name: string; value: number; color: string }>();

    currentMonthExpenses.forEach(entry => {
      const category = categories.find(c => c.id === entry.category_id);
      const categoryName = category?.name || 'Sem Categoria';
      const categoryColor = category?.color || '#6B7280';
      const key = entry.category_id || 'uncategorized';

      if (categoryTotals.has(key)) {
        const existing = categoryTotals.get(key)!;
        existing.value += Number(entry.amount);
      } else {
        categoryTotals.set(key, {
          name: categoryName,
          value: Number(entry.amount),
          color: categoryColor,
        });
      }
    });

    return Array.from(categoryTotals.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entries, categories]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasData = entries.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Line Chart - Balance Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={balanceEvolution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="Saldo"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart - Income vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Entradas vs Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para exibir
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                />
                <Bar dataKey="income" name="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pie Chart - Expenses by Category */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {expenseByCategory.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem despesas este mês
            </div>
          ) : (
            <>
              {/* Donut Chart - Clean without labels */}
              <div className="flex justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend - Vertical list with full names */}
              <div className="mt-4 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {expenseByCategory.map((entry, index) => {
                  const total = expenseByCategory.reduce((sum, e) => sum + e.value, 0);
                  const percent = ((entry.value / total) * 100).toFixed(1);
                  return (
                    <div 
                      key={index} 
                      className="flex items-center justify-between gap-2 text-sm group hover:bg-muted/50 rounded px-1.5 py-1 -mx-1.5 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: entry.color || CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="truncate text-foreground/90">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                        <span className="font-medium text-foreground/80">{formatCurrency(entry.value)}</span>
                        <span className="text-xs w-12 text-right">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
