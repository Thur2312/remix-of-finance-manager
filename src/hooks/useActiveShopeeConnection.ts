import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIntegrations } from '@/hooks/useIntegrations';

function storageKey(userId: string) {
  return `shopee_active_connection_id:${userId}`;
}

// Loja Shopee "ativa" — compartilhada via localStorage entre rotas
// desconectadas entre si (Gestão, DRE, Unificado, Exportação) sem precisar
// de um layout pai comum nem replicar leitura de query param em cada uma.
// Self-healing: se a loja salva não existir mais entre as conexões atuais
// (foi desconectada, ou é a primeira vez), cai pra primeira conectada — com
// 1 loja só (caso majoritário hoje), o resultado é idêntico ao antigo
// getConnection('shopee'), sem mudança visual pra quem tem 1 loja.
export function useActiveShopeeConnection() {
  const { user } = useAuth();
  const { getConnectionsByProvider } = useIntegrations();
  const shopeeConnections = getConnectionsByProvider('shopee');

  const [activeConnectionId, setActiveConnectionIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(storageKey(user.id));
    const stillExists = saved && shopeeConnections.some(c => c.id === saved);
    if (stillExists) {
      setActiveConnectionIdState(saved);
    } else {
      const fallback = shopeeConnections.find(c => c.status === 'connected') || null;
      setActiveConnectionIdState(fallback?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, shopeeConnections.map(c => c.id).join(','), shopeeConnections.map(c => c.status).join(',')]);

  const setActiveConnectionId = useCallback((id: string) => {
    if (!user) return;
    localStorage.setItem(storageKey(user.id), id);
    setActiveConnectionIdState(id);
  }, [user]);

  const activeConnection = shopeeConnections.find(c => c.id === activeConnectionId) || null;

  return {
    shopeeConnections,
    activeConnection,
    activeConnectionId,
    setActiveConnectionId,
  };
}
