import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { CompanySelector } from '@/components/workspace/CompanySelector';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showCompanySelector?: boolean;
}

export function AppLayout({
  children,
  title,
  showCompanySelector = true
}: AppLayoutProps) {
  const { loading, isInitialized } = useCompany();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
            
            {/* Company Selector - right side */}
            {showCompanySelector && (
              <div className="ml-auto">
                {loading && !isInitialized ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : (
                  <CompanySelector variant="dropdown" />
                )}
              </div>
            )}
          </header>
          <main className="flex-1 p-8 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}