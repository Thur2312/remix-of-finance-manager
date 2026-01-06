import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Trophy, Medal } from 'lucide-react';
import { RawOrder, formatCurrency } from '@/lib/calculations';
import { useMemo } from 'react';

interface VariationData {
  nome: string;
  itens_vendidos: number;
  faturamento: number;
}

interface ProductWithVariations {
  nome_produto: string;
  total_itens: number;
  total_faturado: number;
  variacoes: VariationData[];
}

interface TopVariationsSectionProps {
  orders: RawOrder[];
  topProducts?: number;
  topVariations?: number;
}

export function TopVariationsSection({ 
  orders, 
  topProducts = 5, 
  topVariations = 3 
}: TopVariationsSectionProps) {
  
  const productsWithVariations = useMemo(() => {
    if (orders.length === 0) return [];

    // Group orders by product
    const productGroups = new Map<string, RawOrder[]>();
    
    orders.forEach(order => {
      const productKey = order.nome_produto || 'Sem nome';
      if (!productGroups.has(productKey)) {
        productGroups.set(productKey, []);
      }
      productGroups.get(productKey)!.push(order);
    });

    // Process each product to get variations
    const results: ProductWithVariations[] = [];

    productGroups.forEach((productOrders, productName) => {
      // Calculate product totals
      const total_itens = productOrders.reduce((sum, o) => sum + (o.quantidade || 0), 0);
      const total_faturado = productOrders.reduce((sum, o) => sum + Number(o.total_faturado || 0), 0);

      // Group by variation within product
      const variationGroups = new Map<string, { itens: number; faturamento: number }>();
      
      productOrders.forEach(order => {
        const variationKey = order.variacao || 'Sem variação';
        if (!variationGroups.has(variationKey)) {
          variationGroups.set(variationKey, { itens: 0, faturamento: 0 });
        }
        const variation = variationGroups.get(variationKey)!;
        variation.itens += order.quantidade || 0;
        variation.faturamento += Number(order.total_faturado || 0);
      });

      // Convert to array and sort by items sold
      const variacoes: VariationData[] = [];
      variationGroups.forEach((data, nome) => {
        variacoes.push({
          nome,
          itens_vendidos: data.itens,
          faturamento: data.faturamento,
        });
      });

      // Sort variations by items sold (descending) and take top N
      variacoes.sort((a, b) => b.itens_vendidos - a.itens_vendidos);
      
      results.push({
        nome_produto: productName,
        total_itens,
        total_faturado,
        variacoes: variacoes.slice(0, topVariations),
      });
    });

    // Sort products by total items sold (descending) and take top N
    results.sort((a, b) => b.total_itens - a.total_itens);
    return results.slice(0, topProducts);
  }, [orders, topProducts, topVariations]);

  if (productsWithVariations.length === 0) {
    return null;
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Medal className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getMedalStyles = (position: number) => {
    switch (position) {
      case 0:
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 1:
        return 'bg-gray-500/10 border-gray-500/30';
      case 2:
        return 'bg-amber-600/10 border-amber-600/30';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Variações Mais Vendidas
        </h3>
        <p className="text-sm text-muted-foreground">
          TOP {topProducts} produtos e suas {topVariations} variações mais vendidas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {productsWithVariations.map((product, productIndex) => (
          <Card key={product.nome_produto} className="shopee-card-hover overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-medium truncate" title={product.nome_produto}>
                      {product.nome_produto.length > 35 
                        ? product.nome_produto.slice(0, 35) + '...' 
                        : product.nome_produto}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      #{productIndex + 1} em vendas
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="flex-shrink-0 text-xs">
                  {product.total_itens} un
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-3 space-y-2">
              {product.variacoes.map((variacao, variacaoIndex) => (
                <div
                  key={variacao.nome}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getMedalStyles(variacaoIndex)}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getMedalIcon(variacaoIndex)}
                    <span 
                      className="text-sm truncate" 
                      title={variacao.nome}
                    >
                      {variacao.nome.length > 25 
                        ? variacao.nome.slice(0, 25) + '...' 
                        : variacao.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs font-normal">
                      {variacao.itens_vendidos} un
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatCurrency(variacao.faturamento)}
                    </span>
                  </div>
                </div>
              ))}
              
              {product.variacoes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Sem variações registradas
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
