import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}
export function AppLayout({
  children,
  title
}: AppLayoutProps) {
  return <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </header>
          <main className="flex-1 p-6 bg-[sidebar-accent-foreground] bg-blue-50">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>;
}