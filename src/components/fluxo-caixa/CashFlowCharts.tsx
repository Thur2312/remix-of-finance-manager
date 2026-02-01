import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
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
import { TrendingUp, BarChart3, PieChart as PieChartIcon, ChartLine } from 'lucide-react';
import type { CashFlowEntry, CashFlowCategory } from '@/hooks/useCashFlow';

interface CashFlowChartsProps {
  entries: CashFlowEntry[];
  categories: CashFlowCategory[];
  isLoading: boolean;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // emerald
  'hsl(0, 84%, 60%)',   // red
  'hsl(217, 91%, 60%)', // blue
  'hsl(262, 83%, 58%)', // violet
  'hsl(330, 81%, 60%)', // pink
  'hsl(172, 66%, 50%)', // teal
  'hsl(239, 84%, 67%)', // indigo
];

export function CashFlowCharts({ entries, categories, isLoading }: CashFlowChartsProps) {
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

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: { value: number; name: string; color: string }, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
          <p className="font-semibold text-foreground">{data.name}</p>
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
          <SectionCard key={i} title="Carregando..." className="animate-pulse">
            <Skeleton className="h-[250px] w-full rounded-lg" />
          </SectionCard>
        ))}
      </div>
    );
  }

  const hasData = entries.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Line Chart - Balance Evolution */}
      <SectionCard 
        title="Evolução do Saldo" 
        icon={ChartLine}
        className="overflow-hidden"
      >
        {!hasData ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem dados"
            description="Adicione lançamentos para ver a evolução"
            className="h-[250px]"
          />
        ) : (
          <div className="pt-2">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={balanceEvolution}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulativeBalance"
                  name="Saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* Bar Chart - Income vs Expenses */}
      <SectionCard 
        title="Entradas vs Saídas" 
        icon={BarChart3}
        className="overflow-hidden"
      >
        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="Sem dados"
            description="Adicione lançamentos para comparar"
            className="h-[250px]"
          />
        ) : (
          <div className="pt-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Bar 
                  dataKey="income" 
                  name="Entradas" 
                  fill="hsl(142, 76%, 36%)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
                <Bar 
                  dataKey="expense" 
                  name="Saídas" 
                  fill="hsl(0, 84%, 60%)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* Pie Chart - Expenses by Category */}
      <SectionCard 
        title="Despesas por Categoria" 
        icon={PieChartIcon}
        className="overflow-hidden flex flex-col"
        contentClassName="flex-1 flex flex-col"
      >
        {expenseByCategory.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="Sem despesas"
            description="Nenhuma despesa registrada este mês"
            className="h-[250px]"
          />
        ) : (
          <>
            {/* Donut Chart */}
            <div className="flex justify-center pt-2">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {expenseByCategory.map((entry, index) => {
                const total = expenseByCategory.reduce((sum, e) => sum + e.value, 0);
                const percent = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between gap-2 text-sm group hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors cursor-default"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-offset-1 ring-offset-background ring-black/5" 
                        style={{ backgroundColor: entry.color || CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="truncate text-foreground/90 text-xs">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-semibold text-foreground text-xs tabular-nums">
                        {formatCurrency(entry.value)}
                      </span>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
