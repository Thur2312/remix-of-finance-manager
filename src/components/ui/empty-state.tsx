import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { GrowthEcho } from '@/components/brand/GrowthEcho';

interface EmptyStateProps {
  title?: string;
  description?: string;
  /** Ícone alternativo, pra estados que não são "neutro, sem dado ainda"
   *  (ex.: um erro de verdade). Sem isso, usa o GrowthEcho da marca. */
  icon?: LucideIcon;
  /** CTA opcional (ex.: botão pra Integrações) — sem isso o estado fica só
   *  informativo, pros casos em que "ajuste os filtros" já é a ação. */
  action?: ReactNode;
  className?: string;
}

// Estado vazio padrão da área interna — um card `.panel` com glyph/ícone +
// título + descrição + CTA opcional. Antes copiado quase idêntico em ~6
// telas de Resultados/Variações (era `EmptyResultsState`); agora genérico.
// O estado de onboarding ("conecte sua loja") é o <OnboardingChecklist>, que
// é uma lista de passos — coisa estruturalmente diferente.
export function EmptyState({
  title = 'Nenhum resultado encontrado',
  description = 'Ajuste os filtros ou faça upload de pedidos para visualizar os resultados.',
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={className ?? 'panel border-transparent bg-card'}>
      <CardContent className="py-12 text-center">
        {Icon ? (
          <Icon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        ) : (
          <GrowthEcho variant="glyph" className="mx-auto mb-4 h-12 w-12 opacity-80" />
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
