import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GrowthEcho } from '@/components/brand/GrowthEcho';

interface EmptyResultsStateProps {
  title?: string;
  description?: string;
  /** Ícone alternativo, pra estados que não são "neutro, sem dado ainda"
   *  (ex.: um erro de verdade). Sem isso, usa o GrowthEcho. */
  icon?: LucideIcon;
}

// Estado vazio das telas de Resultados/Variações — antes copiado quase
// idêntico (mesmo ícone, mesmo texto) em 6 arquivos, um por marketplace.
export function EmptyResultsState({
  title = 'Nenhum resultado encontrado',
  description = 'Ajuste os filtros ou faça upload de pedidos para visualizar os resultados.',
  icon: Icon,
}: EmptyResultsStateProps) {
  return (
    <Card className="panel bg-card border-transparent">
      <CardContent className="py-12 text-center">
        {Icon ? (
          <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        ) : (
          <GrowthEcho variant="glyph" className="h-12 w-12 mx-auto mb-4 opacity-80" />
        )}
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}
