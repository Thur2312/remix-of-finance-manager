import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { FinancialAssistant } from '@/components/assistant/FinancialAssistant'; // ← adicionar
import { TrialBanner } from '../TrialBanner';
import { getPageTitle } from './pageTitles';
import { useTopbarTitleOverride } from './TopbarTitleContext';

interface AppLayoutProps {
  children: ReactNode;
  /** Só precisa passar isso pra casos fora do mapa de rotas em
   *  pageTitles.ts — a maioria das páginas não precisa mais informar
   *  título nenhum, ele já vem sozinho a partir da URL. */
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const location = useLocation();
  const dynamicTitle = useTopbarTitleOverride();
  const resolvedTitle = title ?? dynamicTitle ?? getPageTitle(location.pathname);

  return (
    // "app-shell" escopa só o raio (mais contido que o resto do site — ver
    // index.css) pro app interno, sem tocar no tema/raio global usado pela
    // landing/auth. As cores em si já vêm do :root (tema única, clara).
    <div className="app-shell">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-6 text-sidebar-foreground">
              <SidebarTrigger className="-ml-1 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
              <Separator orientation="vertical" className="mr-2 h-4 bg-sidebar-border" />
              {resolvedTitle && <h1 className="font-display text-lg font-semibold text-sidebar-foreground">{resolvedTitle}</h1>}
            </header>
            <TrialBanner />
            <main className="flex-1 p-8 bg-background">
              {children}
            </main>
          </SidebarInset>
        </div>
        <FinancialAssistant />
      </SidebarProvider>
    </div>
  );
}