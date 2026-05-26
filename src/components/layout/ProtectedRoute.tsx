import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isCalculadoraAllowed } from '@/lib/allowlist';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/user/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Redireciona automaticamente para /calculadora ao logar com email da allowlist
  const isAllowedUser = isCalculadoraAllowed(user.email);
  const isOnRoot = location.pathname === '/' || location.pathname === '/dashboard';

  if (isAllowedUser && isOnRoot) {
    return <Navigate to="/calculadora" replace />;
  }

  return <>{children}</>;
}