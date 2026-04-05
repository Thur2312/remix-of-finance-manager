import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, Package, TrendingUp as LucideTP } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { ShopeeSyncStats } from '@/hooks/useShopeeSync';

interface Props {
  current: ShopeeSyncStats;
  previous: ShopeeSyncStats;
  days: number;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-muted-foreground">—</span>
  
  const pct = ((current - previous) / previous) * 100
  const positive = pct >= 0
  
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-emerald-500' : 'text-destructive'}`}>
      {pct === 0 
        ? <Minus className="h-3 w-3" />
        : positive 
          ? <TrendingUp className="h-3 w-3" /> 
          : <TrendingDown className="h-3 w-3" />
      }
      <span>{positive ? '+' : ''}{pct.toFixed(1)}%</span>
    </div>
  )
}

export function PeriodComparison({ current, previous, days }: Props) {
  const COMPLETED_STATUSES = ['COMPLETED', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'READY_TO_SHIP']
  
  const items = [
    {
      label: 'Pedidos',
      current: current.totalOrders,
      previous: previous.totalOrders,
      format: (v: number) => v.toString(),
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Faturamento',
      current: current.totalRevenue,
      previous: previous.totalRevenue,
      format: formatCurrency,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Taxas Shopee',
      current: current.totalFees,
      previous: previous.totalFees,
      format: formatCurrency,
      icon: Package,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      invertDelta: true, // taxa maior = ruim
    },
    {
      label: 'Valor Líquido',
      current: current.totalNetAmount,
      previous: previous.totalNetAmount,
      format: formatCurrency,
      icon: LucideTP,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Comparativo com Período Anterior</CardTitle>
        <CardDescription>
          Últimos {days} dias vs {days} dias anteriores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => {
            const pct = item.previous > 0
              ? ((item.current - item.previous) / item.previous) * 100
              : 0
            const positive = item.invertDelta ? pct <= 0 : pct >= 0

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                </div>

                <div>
                  <p className="text-lg font-bold tabular-nums">{item.format(item.current)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.previous > 0 ? (
                      <>
                        <div className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-500' : 'text-destructive'}`}>
                          {pct === 0
                            ? <Minus className="h-3 w-3" />
                            : positive
                              ? <TrendingUp className="h-3 w-3" />
                              : <TrendingDown className="h-3 w-3" />
                          }
                          <span>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          vs {item.format(item.previous)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem dados anteriores</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}