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
    <div className="mb-6">
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

// Nav configurations
export const shopeeNavTabs: NavTab[] = [
  {label : 'Dashboard', href: '/shopee'},
  { label: 'Resultados', href: '/shopee/resultados' },
  { label: 'Variações', href: '/shopee/variacoes' },
  { label: 'Upload', href: '/shopee/upload' },
  { label: 'Configurações', href: '/shopee/configuracoes' },
];

export const tiktokNavTabs: NavTab[] = [
  { label: 'Dashboard', href: '/tiktok' },
  { label: 'Resultados', href: '/tiktok/resultados' },
  { label: 'Variações', href: '/tiktok/variacoes' },
  { label: 'Upload', href: '/tiktok/upload' },
  { label: 'Pagamentos', href: '/tiktok/pagamentos' },
  { label: 'Upload Pgtos', href: '/tiktok/pagamentos/upload' },
  { label: 'Configurações', href: '/tiktok/configuracoes' },
];

export const fluxoCaixaNavTabs: NavTab[] = [
  { label: 'Dashboard', href: '/fluxo-caixa' },
  { label: 'Lançamentos', href: '/fluxo-caixa/lancamentos' },
  { label: 'Categorias', href: '/fluxo-caixa/categorias' },
];
