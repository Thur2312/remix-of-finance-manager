import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { DREData, formatCurrency } from '@/lib/dre-calculations';

interface DREChartsProps {
  data: DREData;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function DRECharts({ data }: DREChartsProps) {
  // Data for the waterfall-like bar chart - NOVA ESTRUTURA
  const waterfallData = [
    { name: 'Receita Bruta', value: data.receitaBrutaTotal, fill: '#3b82f6' },
    { name: 'Impostos', value: -data.impostosSobreVendasTotal, fill: '#ef4444' },
    { name: 'Devoluções', value: -data.deducoesTotal, fill: '#f97316' },
    { name: 'COGS', value: -data.cogsTotal, fill: '#f59e0b' },
    { name: 'Lucro Bruto', value: data.lucroBruto, fill: '#10b981' },
    { name: 'Custos Var.', value: -data.custosVariaveisTotal, fill: '#ef4444' },
    { name: 'Margem Contrib.', value: data.margemContribuicao, fill: '#14b8a6' },
    { name: 'Custos Fixos', value: -data.custosFixosProrrateados, fill: '#f97316' },
    { name: 'Lucro Líquido', value: data.lucroLiquido, fill: data.lucroLiquido >= 0 ? '#10b981' : '#ef4444' },
  ];

  // Data for revenue distribution pie chart
  const revenueDistribution = [
    { name: 'Shopee', value: data.receitaBrutaShopee },
    { name: 'TikTok Shop', value: data.receitaBrutaTikTok },
  ].filter(item => item.value > 0);

  // Data for costs breakdown - NOVA ESTRUTURA CORRETA
  const costsBreakdown = [
    { name: 'COGS (Produtos + Frete)', value: data.cogsTotal },
    { name: 'Comissões Marketplace', value: data.comissoesMarketplace },
    { name: 'Comissões Afiliados', value: data.comissoesAfiliados },
    { name: 'Ads e Marketing', value: data.adsMarketing },
    { name: 'Taxas de Serviços', value: data.taxasServicos },
    { name: 'Custos Fixos', value: data.custosFixosProrrateados },
    { name: 'Impostos sobre Vendas', value: data.impostosSobreVendasTotal },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          <p className={`text-sm font-mono ${payload[0].value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nome: string; value: number } }> }) => {
    if (active && payload && payload.length) {
      const value = payload[0].payload.value;
      const percent = ((value / data.receitaBrutaTotal) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{payload[0].payload.nome}</p>
          <p className="text-sm font-mono">{formatCurrency(value)}</p>
          <p className="text-xs text-muted-foreground">{percent}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Waterfall Chart */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Composição do Resultado (Waterfall)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }} 
                angle={-45} 
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Distribution */}
      {revenueDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Receita por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={revenueDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {revenueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 w-full">
                {revenueDistribution.map((entry, index) => {
                  const total = revenueDistribution.reduce((sum, e) => sum + e.value, 0);
                  const percent = ((entry.value / total) * 100).toFixed(1);
                  return (
                    <div key={index} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-medium text-foreground/80">{formatCurrency(entry.value)}</span>
                        <span className="text-xs w-12 text-right">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Costs Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Composição dos Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={costsBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {costsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 w-full max-h-[160px] overflow-y-auto">
              {costsBreakdown.map((entry, index) => {
                const total = costsBreakdown.reduce((sum, e) => sum + e.value, 0);
                const percent = ((entry.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                      <span className="font-medium text-foreground/80">{formatCurrency(entry.value)}</span>
                      <span className="text-xs w-12 text-right">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
