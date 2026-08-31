import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface NavTab {
  label: string;
  href: string;
}

interface InPageNavProps {
  tabs: NavTab[];
}

export function InPageNav({ tabs }: InPageNavProps) {
  return (
    <div>
      <nav className="flex gap-1 rounded-lg bg-muted/50 border border-border/50 p-1.5 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            end
            className={({ isActive }) =>
              cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-5 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-background text-primary font-semibold shadow-xs border-b-2 border-primary animate-scale-in'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// As abas de marketplace agora vivem no modelo da casca de Gestão
// (src/pages/gestao/marketplaceViews.tsx). Aqui fica só o Fluxo de Caixa,
// que passa `fluxoCaixaNavTabs` pro <PageShell tabs={...}>.
export const fluxoCaixaNavTabs: NavTab[] = [
  { label: 'Dashboard', href: '/fluxo-caixa' },
  { label: 'Lançamentos', href: '/fluxo-caixa/lancamentos' },
  { label: 'Categorias', href: '/fluxo-caixa/categorias' },
];