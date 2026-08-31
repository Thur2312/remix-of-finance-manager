import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from './PageHeader';
import { type IconBadgeVariant } from './IconBadge';
import { type NavTab } from './InPageNav';

interface PageShellProps {
  icon?: LucideIcon;
  iconVariant?: IconBadgeVariant;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  tabs?: NavTab[];
  /** `narrow` centraliza a coluna em max-w-3xl (telas de formulário). */
  width?: 'default' | 'narrow';
  /** Classe extra no wrapper do conteúdo (escape hatch). */
  className?: string;
  children: ReactNode;
}

// Wrapper único de página da área interna. Resolve, num lugar só, o que antes
// cada tela montava (e divergia): o bloco de header (via <PageHeader>), a nav
// de abas, o ritmo vertical e a largura da coluna. O container de 1400px e o
// padding já vêm do <main> do AppLayout — aqui é só o ritmo interno.
//
// Dois níveis de espaçamento: space-y-8 (32px) entre o header e o conteúdo;
// o conteúdo interno de cada página mantém seu próprio space-y-6.
export function PageShell({
  icon,
  iconVariant,
  title,
  subtitle,
  action,
  tabs,
  width = 'default',
  className,
  children,
}: PageShellProps) {
  const hasHeader = Boolean(icon || title || action || tabs);

  return (
    <div className={cn('space-y-8', width === 'narrow' && 'mx-auto max-w-3xl')}>
      {hasHeader && (
        <PageHeader
          icon={icon}
          iconVariant={iconVariant}
          title={title}
          subtitle={subtitle}
          action={action}
          tabs={tabs}
        />
      )}
      <div className={className}>{children}</div>
    </div>
  );
}
