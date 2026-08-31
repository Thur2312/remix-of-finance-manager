import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { FinancialAssistant } from '@/components/assistant/FinancialAssistant';
import { TrialBanner } from '../TrialBanner';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationBell } from './NotificationBell';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    // "app-shell" escopa só o raio (mais contido que o resto do site — ver
    // index.css) pro app interno, sem tocar no tema/raio global usado pela
    // landing/auth. As cores em si já vêm do :root (tema única, clara).
    <div className="app-shell">
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset className="flex-1">
            {/* Topbar fosco e sticky: some no conteúdo (bg translúcido), só o
                blur no scroll dá profundidade. O título da página vive no
                <h1> grande do PageShell — aqui em cima é só o rastro de
                navegação (breadcrumbs). */}
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2.5 border-b border-border/60 bg-background/70 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-6">
              <SidebarTrigger className="-ml-1 size-8 shrink-0 text-muted-foreground hover:text-foreground" />
              <Breadcrumbs />
              <div className="flex-1" />
              <NotificationBell />
            </header>
            <TrialBanner />
            {/* Container único da área interna: largura máxima e respiro
                herdados por todas as páginas; padding responsivo. */}
            <main className="flex-1 bg-background">
              <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
        <FinancialAssistant />
      </SidebarProvider>
    </div>
  );
}
