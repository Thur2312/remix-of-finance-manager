import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { BarChart3 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-40">
            <SidebarTrigger className="-ml-1 hover:bg-muted/80" />
            <Separator orientation="vertical" className="mr-2 h-5" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
            </div>
          </header>
          <main className="flex-1 p-6 bg-gradient-to-br from-background via-background to-muted/20">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
