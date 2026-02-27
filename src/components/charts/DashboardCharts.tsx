import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, TooltipProps } from 'recharts';
import { formatCurrency, GroupedResult } from '@/lib/calculations';
import { Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardChartsProps {
  data: GroupedResult[];
}

const COLORS = ['#1565C0', '#14B8A6', '#F97316', '#EC4899', '#8B5CF6'];

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-medium text-sm">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(payload[0].value)}
        </p>
      </div>);

  }
  return null;
};

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) return null;

  const getDisplayName = (sku: string | null | undefined, nomeProduto: string | null | undefined): string => {
    if (sku && sku !== '-' && sku.trim() !== '') return sku;
    return nomeProduto || 'Sem nome';
  };

  const top5 = [...data].
  sort((a, b) => b.total_faturado - a.total_faturado).
  slice(0, 5).
  map((item, i) => ({
    nome: getDisplayName(item.sku, item.nome_produto),
    sku: item.sku && item.sku !== '-' ? item.sku : null,
    nomeProduto: item.nome_produto || 'Sem nome',
    vendas: item.itens_vendidos,
    faturamento: item.total_faturado,
    color: COLORS[i]
  }));

  if (top5.length === 0) return null;

  const pieData = top5.map((item) => ({
    name: item.nome.slice(0, 25),
    value: item.faturamento
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
            {/* Donut Chart */}
            <div className="flex items-center justify-center">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}>

                      {pieData.map((_, index) =>
                      <Cell key={index} fill={COLORS[index]} />
                      )}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Produto</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top5.map((item, i) =>
                <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }} />

                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {item.nomeProduto}
                            </p>
                            {item.sku &&
                          <p className="text-xs text-muted-foreground font-semibold">
                                SKU: {item.sku}
                              </p>
                          }
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {item.vendas}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(item.faturamento)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
          <Link
            to="/resultados"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">

            Ver lista completa de produtos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardFooter>
      </Card>
    </div>);

}