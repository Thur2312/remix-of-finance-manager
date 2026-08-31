import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProtectedRoute } from './ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TrialGuard } from './TrialGuard';
import { AppLayout } from './AppLayout';

// Transição leve entre páginas (fade), respeitando prefers-reduced-motion.
// Fica escopada aqui dentro — e não em torno de todo o <Routes> em App.tsx —
// porque animar a árvore inteira trocaria a key do InternalLayout a cada
// navegação e remontaria a sidebar/topbar (o bug que este arquivo existe
// pra resolver). Só o conteúdo de <Outlet /> anima; o shell fica parado.
const routeTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
};

function AnimatedOutlet() {
  const location = useLocation();
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) return <Outlet />;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} {...routeTransition}>
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

// Casca persistente de toda a área interna (pós-login) — antes cada página
// montava sua própria cópia de <AppLayout> (sidebar + topbar inclusas), o
// que fazia a sidebar inteira recarregar a cada navegação e piscar pro
// spinner genérico do Suspense enquanto o chunk da página seguinte
// carregava. Com isso como rota de layout (ver App.tsx), a sidebar/topbar
// montam uma vez só; só o conteúdo de <Outlet /> troca.
export function InternalLayout() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <TrialGuard>
          <AppLayout>
            <AnimatedOutlet />
          </AppLayout>
        </TrialGuard>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}

// Variante sem TrialGuard — pro passo de configurar pagamento (logo após o
// cadastro) e pra tela de Planos (que não pode ficar bloqueada pelo próprio
// paywall que ela existe pra resolver).
export function InternalLayoutNoGuard() {
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <AppLayout>
          <AnimatedOutlet />
        </AppLayout>
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
