// ============================================
// COMPONENTE: PlanGuard.tsx
// ============================================
// Coloque este arquivo em: src/components/PlanGuard.tsx
// Use para envolver partes da interface que só devem ser visíveis para certos planos

import React, { useEffect, useState } from 'react';
import { usePermissions } from '../hooks/usePermissions'; // AJUSTE O CAMINHO

interface PlanGuardProps {
  /** Nome da permissão a verificar (ex: 'dre_automatizado') */
  permission: string;
  /** Conteúdo a ser exibido se o usuário tiver acesso */
  children: React.ReactNode;
  /** Conteúdo a ser exibido se o usuário NÃO tiver acesso (ex: botão de upgrade) */
  fallback?: React.ReactNode;
  /** Se true, mostra o fallback. Se false, não mostra nada quando não tiver acesso */
  showFallback?: boolean;
}

export const PlanGuard: React.FC<PlanGuardProps> = ({
  permission,
  children,
  fallback,
  showFallback = true,
}) => {
  const { hasPermission, loading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const access = await hasPermission(permission);
      setHasAccess(access);
    };

    checkAccess();
  }, [permission, hasPermission]);

  // Mostra loading enquanto verifica
  if (loading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se não tiver acesso, mostra o fallback (se configurado)
  if (!hasAccess) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  // Se tiver acesso, mostra o conteúdo
  return <>{children}</>;
};
