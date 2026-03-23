import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IntegrationDashboardProps {
  connectionId: string;
}

interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  chartData: { date: string; vendas: number; liquido: number }[];
}

export function IntegrationDashboard({ connectionId }: IntegrationDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Busca pedidos
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, order_created_at')
          .eq('integration_id', connectionId)
          .order('order_created_at', { ascending: false })

        // Busca pagamentos
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, marketplace_fee, net_amount, transaction_date')
          .eq('integration_id', connectionId)
          .order('transaction_date', { ascending: false })

        const totalOrders = orders?.length ?? 0
        const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0
        const totalFees = payments?.reduce((sum, p) => sum + Number(p.marketplace_fee), 0) ?? 0
        const netRevenue = payments?.reduce((sum, p) => sum + Number(p.net_amount), 0) ?? 0

        // Gráfico dos últimos 7 dias
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i)
          const dateStr = format(date, 'yyyy-MM-dd')
          const label = format(date, 'dd/MM', { locale: ptBR })

          const dayOrders = orders?.filter(o =>
            o.order_created_at?.startsWith(dateStr)
          ) ?? []

          const dayPayments = payments?.filter(p =>
            p.transaction_date?.startsWith(dateStr)
          ) ?? []

          const vendas = dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0)
          const liquido = dayPayments.reduce((sum, p) => sum + Number(p.net_amount), 0)

          return { date: label, vendas, liquido }
        })

        setData({ totalOrders, totalRevenue, totalFees, netRevenue, chartData: last7Days })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [connectionId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <p className="text-xl font-bold">{data.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vendas</p>
                <p className="text-xl font-bold">{formatCurrency(data.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxas Marketplace</p>
                <p className="text-xl font-bold">{formatCurrency(data.totalFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Líquido</p>
                <p className="text-xl font-bold">{formatCurrency(data.netRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas dos últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          {data.chartData.every(d => d.vendas === 0 && d.liquido === 0) ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Nenhum dado disponível. Sincronize para ver os dados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Dia: ${label}`}
                />
                <Bar dataKey="vendas" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="liquido" name="Líquido" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}