import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface TopbarTitleValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const TopbarTitleContext = createContext<TopbarTitleValue | null>(null);

export function TopbarTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <TopbarTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </TopbarTitleContext.Provider>
  );
}

// Só usar quando o título do topbar depende de estado do próprio componente
// (ex.: qual marketplace está selecionado em Gestao.tsx) — a grande maioria
// das páginas não precisa disso, o título já vem automático do mapa de
// rotas em pageTitles.ts.
export function useTopbarTitle(title: string | null) {
  const ctx = useContext(TopbarTitleContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setTitle(title);
    return () => ctx.setTitle(null);
  }, [ctx, title]);
}

// Usado só pelo AppLayout, pra ler o override atual (se houver).
export function useTopbarTitleOverride(): string | null {
  const ctx = useContext(TopbarTitleContext);
  return ctx?.title ?? null;
}
