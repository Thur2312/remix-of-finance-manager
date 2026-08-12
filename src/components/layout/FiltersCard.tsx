import { type ReactNode } from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FiltersCardProps {
  children: ReactNode;
}

// Casca padrão do card "Filtros" (ícone + título) usado no topo das telas
// de Resultados/Variações/Pagamentos — antes cada página reescrevia esse
// mesmo cabeçalho à mão. Os campos de filtro em si continuam livres
// (cada tela tem os seus), só a moldura é compartilhada.
export function FiltersCard({ children }: FiltersCardProps) {
  return (
    <Card className="panel bg-card border-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-end">{children}</div>
      </CardContent>
    </Card>
  );
}
