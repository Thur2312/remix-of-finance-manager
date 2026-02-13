import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from '@/components/ui/separator';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

// Animações (alinhadas com Landing Page)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-100 to-blue-200">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-blue-200 bg-white/80 backdrop-blur-sm px-4 sticky top-0 z-40">
            <SidebarTrigger className="-ml-1 hover:bg-blue-50" />
            <Separator orientation="vertical" className="mr-2 h-5" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-300">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
            </div>
          </header>
          <main className="flex-1 p-6 bg-gradient-to-br from-blue-100 to-blue-200">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              {children}
            </motion.div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}