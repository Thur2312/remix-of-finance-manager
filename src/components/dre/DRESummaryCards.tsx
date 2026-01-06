import { Card, CardContent } from '@/components/ui/card';
import { DREData, formatCurrency, formatPercent } from '@/lib/dre-calculations';
import { TrendingUp, TrendingDown, DollarSign, Percent, Package, Calculator, Wallet, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DRESummaryCardsProps {
  data: DREData;
}

interface CardConfig {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  highlight?: boolean;
  isPrimary?: boolean;
  tooltip?: string;
  visible: boolean;
}

export function DRESummaryCards({ data }: DRESummaryCardsProps) {
  // Regra 1: Verificar se Lucro Líquido é igual ao Operacional
  const lucroLiquidoIgualOperacional = Math.abs(data.lucroLiquido - data.lucroOperacional) < 0.01;

  // Regra 4: Verificar diferença entre Receita Bruta e Líquida
  const diferencaReceitaPercent = data.receitaBrutaTotal > 0 
    ? ((data.receitaBrutaTotal - data.receitaLiquida) / data.receitaBrutaTotal) * 100 
    : 0;
  const receitasDiferencaPequena = diferencaReceitaPercent < 2 && diferencaReceitaPercent > 0;

  // Regra 5: Verificar se Margem de Contribuição é igual ao Lucro Bruto
  const margemIgualLucroBruto = Math.abs(data.margemContribuicao - data.lucroBruto) < 0.01 && data.custosVariaveisTotal === 0;

  // Ordem visual conforme especificação contábil:
  // 1. Receita Bruta
  // 2. Receita Líquida
  // 3. Lucro Bruto
  // 4. Margem de Contribuição
  // 5. Custos Fixos
  // 6. Lucro Operacional (PRINCIPAL - Regra 3)
  // 7. Lucro Líquido (condicional - Regra 1)

  const cards: CardConfig[] = [
    {
      title: 'Receita Bruta',
      value: formatCurrency(data.receitaBrutaTotal),
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      visible: true,
    },
    {
      title: 'Receita Líquida',
      value: formatCurrency(data.receitaLiquida),
      subtitle: receitasDiferencaPequena
        ? 'Baixa dedução de impostos/ajustes'
        : data.impostosSobreVendasTotal > 0 
          ? `(-) Impostos: ${formatCurrency(data.impostosSobreVendasTotal)}`
          : undefined,
      icon: Calculator,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      tooltip: receitasDiferencaPequena 
        ? 'Diferença pequena devido à baixa incidência de impostos e ajustes neste período.'
        : undefined,
      visible: true,
    },
    {
      title: 'Lucro Bruto',
      value: formatCurrency(data.lucroBruto),
      subtitle: `Margem: ${formatPercent(data.margemBruta)}`,
      icon: Package,
      color: data.lucroBruto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.lucroBruto >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
      visible: true,
    },
    {
      title: 'Margem Contribuição',
      value: formatCurrency(data.margemContribuicao),
      subtitle: `${formatPercent(data.percentualMargemContribuicao)} da receita`,
      icon: Target,
      color: data.margemContribuicao >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.margemContribuicao >= 0 ? 'bg-teal-50 dark:bg-teal-950/30' : 'bg-red-50 dark:bg-red-950/30',
      highlight: !margemIgualLucroBruto, // Só destaca se for diferente do Lucro Bruto
      tooltip: margemIgualLucroBruto 
        ? 'Igual ao Lucro Bruto pois não há custos variáveis operacionais neste período.'
        : undefined,
      visible: !margemIgualLucroBruto, // Regra 5: Ocultar se igual ao Lucro Bruto
    },
    {
      title: 'Custos Fixos',
      value: formatCurrency(data.custosFixosProrrateados),
      subtitle: data.diasPeriodo !== 30 
        ? `${data.diasPeriodo} dias (prorrateado)`
        : 'Mensal',
      icon: Wallet,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      visible: true,
    },
    {
      // Regra 3: Lucro Operacional é a métrica PRINCIPAL
      title: 'Lucro Operacional',
      value: formatCurrency(data.lucroOperacional),
      subtitle: lucroLiquidoIgualOperacional 
        ? 'Resultado final do período'
        : `Margem: ${formatPercent(data.margemOperacional)}`,
      icon: data.lucroOperacional >= 0 ? TrendingUp : TrendingDown,
      color: data.lucroOperacional >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.lucroOperacional >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30',
      highlight: true,
      isPrimary: true, // Regra 3: Sempre é a métrica principal
      tooltip: lucroLiquidoIgualOperacional 
        ? 'Lucro líquido igual ao operacional neste período, pois não há despesas financeiras ou impostos sobre lucro.'
        : undefined,
      visible: true,
    },
    {
      // Regra 1: Só exibe se for DIFERENTE do Lucro Operacional
      title: 'Lucro Líquido',
      value: formatCurrency(data.lucroLiquido),
      subtitle: `Margem: ${formatPercent(data.margemLiquida)}`,
      icon: data.lucroLiquido >= 0 ? TrendingUp : TrendingDown,
      color: data.lucroLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bgColor: data.lucroLiquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
      highlight: true,
      visible: !lucroLiquidoIgualOperacional, // Regra 1: Ocultar se igual ao Operacional
    },
  ];

  // Filtrar apenas cards visíveis
  const visibleCards = cards.filter(card => card.visible);
  const cardCount = visibleCards.length;

  return (
    <TooltipProvider>
      {/* Regra 5: Grid adaptativo baseado na quantidade de cards visíveis */}
      <div className={cn(
        "grid gap-4",
        cardCount <= 4 && "grid-cols-2 md:grid-cols-4",
        cardCount === 5 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
        cardCount === 6 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
        cardCount >= 7 && "grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
      )}>
        {visibleCards.map((card, index) => (
          <Card 
            key={index} 
            className={cn(
              'transition-all hover:shadow-md',
              card.highlight && 'ring-2 ring-primary/20',
              card.isPrimary && 'ring-2 ring-primary shadow-lg' // Regra 3: Destaque especial para métrica principal
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {card.title}
                  </span>
                  {/* Tooltip explicativo quando disponível */}
                  {card.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px]">
                        <p className="text-xs">{card.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className={cn('p-1.5 rounded-lg', card.bgColor)}>
                  <card.icon className={cn('h-4 w-4', card.color)} />
                </div>
              </div>
              <div className={cn(
                'font-bold font-mono',
                card.color,
                card.isPrimary ? 'text-xl' : 'text-lg' // Regra 3: Tamanho maior para métrica principal
              )}>
                {card.value}
              </div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
}
