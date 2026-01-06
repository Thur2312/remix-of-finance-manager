import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupedResult } from '@/lib/calculations';
import { formatCurrency } from '@/lib/calculations';

interface ResultsChartsProps {
  data: GroupedResult[];
  type: 'produto' | 'variacao';
}

const COLORS = [
  'hsl(11, 85%, 56%)',   // Primary orange
  'hsl(142, 76%, 36%)',  // Green
  'hsl(217, 91%, 60%)',  // Blue
  'hsl(280, 65%, 60%)',  // Purple
  'hsl(45, 93%, 47%)',   // Yellow
  'hsl(340, 75%, 55%)',  // Pink
  'hsl(180, 65%, 45%)',  // Teal
  'hsl(30, 80%, 55%)',   // Orange
  'hsl(260, 60%, 55%)',  // Violet
  'hsl(160, 60%, 45%)',  // Emerald
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{payload[0]?.payload?.nome || label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
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
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{data.nome}</p>
        <p className="text-muted-foreground">Lucro: {formatCurrency(data.value)}</p>
        <p className="text-muted-foreground">Participação: {data.percent.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export function ResultsCharts({ data, type }: ResultsChartsProps) {
  // Prepare data for pie chart (top 8 by profit + others)
  const sortedByProfit = [...data].sort((a, b) => b.lucro_reais - a.lucro_reais);
  const topItems = sortedByProfit.slice(0, 8);
  const otherItems = sortedByProfit.slice(8);
  
  const totalProfit = data.reduce((sum, d) => sum + Math.max(0, d.lucro_reais), 0);
  
  const pieData = topItems
    .filter(item => item.lucro_reais > 0)
    .map(item => ({
      nome: type === 'variacao' 
        ? `${item.nome_produto.slice(0, 20)}... (${item.variacao || 'Sem var.'})` 
        : item.nome_produto.slice(0, 25) + (item.nome_produto.length > 25 ? '...' : ''),
      value: item.lucro_reais,
      percent: totalProfit > 0 ? (item.lucro_reais / totalProfit) * 100 : 0,
    }));

  if (otherItems.length > 0) {
    const othersProfit = otherItems.reduce((sum, d) => sum + Math.max(0, d.lucro_reais), 0);
    if (othersProfit > 0) {
      pieData.push({
        nome: `Outros (${otherItems.length})`,
        value: othersProfit,
        percent: totalProfit > 0 ? (othersProfit / totalProfit) * 100 : 0,
      });
    }
  }

  // Prepare data for bar chart (top 10 by revenue)
  const barData = [...data]
    .sort((a, b) => b.total_faturado - a.total_faturado)
    .slice(0, 10)
    .map(item => ({
      nome: type === 'variacao'
        ? `${item.sku || item.nome_produto.slice(0, 10)} (${(item.variacao || '').slice(0, 8)})`
        : item.sku || item.nome_produto.slice(0, 15),
      faturado: item.total_faturado,
      lucro: item.lucro_reais,
      receber: item.total_a_receber,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise Visual</CardTitle>
        <CardDescription>
          Gráficos de desempenho por {type === 'variacao' ? 'variação' : 'produto'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="pie">Distribuição de Lucro</TabsTrigger>
            <TabsTrigger value="bar">Faturamento x Lucro</TabsTrigger>
          </TabsList>

          <TabsContent value="pie" className="h-[350px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ nome, percent }) => percent > 5 ? `${percent.toFixed(0)}%` : ''}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum produto com lucro positivo para exibir
              </div>
            )}
          </TabsContent>

          <TabsContent value="bar" className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="nome" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  className="fill-muted-foreground"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="faturado" name="Faturado" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="receber" name="A Receber" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
