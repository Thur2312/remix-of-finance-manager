import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PlanProtectedRouteProps {
  children: ReactNode;
  requiredPermission: string;
  fallbackPath?: string;
}

/** 
 * Namoral eu sabo muito ainda pedi pro manus comentar -  Aspira 1   x   0 Codigo  
 * Componente que protege rotas baseado em permissões do plano do usuário
 * 
 * @param children - Componente a ser renderizado se o usuário tiver permissão
 * @param requiredPermission - Nome da permissão necessária
 * @param fallbackPath - Caminho para redirecionar se o usuário não tiver permissão (padrão: /upgrade)
 * 
 * @example
 * <Route 
 *   path="/fluxo-caixa" 
 *   element={
 *     <PlanProtectedRoute requiredPermission="fluxo_caixa">
 *       <FluxoCaixaDashboard />
 *     </PlanProtectedRoute>
 *   } 
 * />
 */
export function PlanProtectedRoute({
  children,
  requiredPermission,
  fallbackPath = '/upgrade'
}: PlanProtectedRouteProps) {
  const { loading, user, hasPermission } = useAuth();

  // Enquanto carrega, mostra um loader (foda ta?)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não está autenticado, redireciona para login (o homi pensa em tudo)
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Se não tem permissão, redireciona para upgrade (quero money!)
  if (!hasPermission(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Se tem permissão, renderiza o componente obviamente
  return <>{children}</>;
}
