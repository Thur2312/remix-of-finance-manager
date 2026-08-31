import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { IconBadge, type IconBadgeVariant } from './IconBadge';
import { InPageNav, type NavTab } from './InPageNav';

interface PageHeaderProps {
  icon?: LucideIcon;
  iconVariant?: IconBadgeVariant;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  tabs?: NavTab[];
}

// Substitui o bloco "ícone + título + subtítulo + ação" que antes era
// copiado à mão em cada página (e divergia um pouco em cada uma). Todos os
// campos são opcionais pra cobrir os 3 padrões reais encontrados no app:
// header completo (Fluxo de Caixa), só título (Lançamentos/Categorias), e
// só abas sem header nenhum (Resultados/Variações por marketplace).
//
// Ritmo vertical (bloco→tabs) fica no `space-y-4` daqui; o respiro
// header→conteúdo da página é responsabilidade do <PageShell> que envolve
// este componente (space-y-8). Sem margens externas próprias.
export function PageHeader({ icon, iconVariant, title, subtitle, action, tabs }: PageHeaderProps) {
  const hasHeader = Boolean(icon || title || action);

  return (
    <div className="space-y-4">
      {hasHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && <IconBadge icon={icon} variant={iconVariant} />}
            {title && (
              <div>
                <h1 className="font-display text-[1.65rem] font-semibold leading-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {tabs && <InPageNav tabs={tabs} />}
    </div>
  );
}
