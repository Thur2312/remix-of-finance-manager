import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { IconBadge } from './IconBadge';
import { InPageNav, type NavTab } from './InPageNav';

interface PageHeaderProps {
  icon?: LucideIcon;
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
export function PageHeader({ icon, title, subtitle, action, tabs }: PageHeaderProps) {
  const hasHeader = Boolean(icon || title || action);

  return (
    <>
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            {icon && <IconBadge icon={icon} />}
            {title && (
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {tabs && <InPageNav tabs={tabs} />}
    </>
  );
}
