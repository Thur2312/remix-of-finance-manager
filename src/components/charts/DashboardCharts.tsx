import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, GroupedResult } from '@/lib/calculations';
import { motion } from 'framer-motion';

interface DashboardChartsProps {
  data: GroupedResult[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-blue-200 bg-white p-2 shadow-lg">
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-sm text-blue-600">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Helper to get display name - use SKU only if it's valid, otherwise use product name
  const getDisplayName = (sku: string | null | undefined, nomeProduto: string | null | undefined): string => {
    if (sku && sku !== '-' && sku.trim() !== '') {
      return sku;
    }
    return nomeProduto || 'Sem nome';
  };

  // TOP 5 por Faturamento
  const topFaturamento = [...data]
    .sort((a, b) => b.total_faturado - a.total_faturado)
    .slice(0, 5)
    .map(item => ({
      nome: getDisplayName(item.sku, item.nome_produto).slice(0, 25),
      valor: item.total_faturado,
    }));

  // TOP 5 por Lucro
  const topLucro = [...data]
    .filter(item => item.lucro_reais > 0)
    .sort((a, b) => b.lucro_reais - a.lucro_reais)
    .slice(0, 5)
    .map(item => ({
      nome: getDisplayName(item.sku, item.nome_produto).slice(0, 25),
      valor: item.lucro_reais,
    }));

  if (topFaturamento.length === 0 && topLucro.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h3 className="text-lg font-semibold text-gray-900">TOP Anúncios</h3>
      <p className="text-sm text-gray-600 -mt-2">Compare seus produtos com melhor desempenho</p>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* TOP 5 Faturamento */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="pb-2 bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                TOP 5 por Faturamento
              </CardTitle>
              <CardDescription className="text-gray-600">Produtos com maior receita</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topFaturamento}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 10 }}
                      className="fill-gray-600"
                    />
                    <YAxis 
                      dataKey="nome" 
                      type="category" 
                      width={120}
                      tick={{ fontSize: 11 }}
                      className="fill-gray-600"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="valor" 
                      fill="hsl(217, 91%, 60%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* TOP 5 Lucro */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="pb-2 bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                <span className="h-3 w-3 rounded-full bg-green-500" />
                TOP 5 por Lucro
              </CardTitle>
              <CardDescription className="text-gray-600">Produtos mais lucrativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topLucro}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-blue-200" horizontal={false} />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => formatCurrency(value)}
                      tick={{ fontSize: 10 }}
                      className="fill-gray-600"
                    />
                    <YAxis 
                      dataKey="nome" 
                      type="category" 
                      width={120}
                      tick={{ fontSize: 11 }}
                      className="fill-gray-600"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="valor" 
                      fill="hsl(142, 76%, 36%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}