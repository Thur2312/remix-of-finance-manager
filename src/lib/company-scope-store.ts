// Bloco D — Fase 2. Store único e global da "empresa selecionada".
//
// Antes existiam três noções desconexas de empresa selecionada: o `useState`
// interno do useDREData (chave `dre:companyId`, só imposto), o `useSelectedCompany`
// (chave `scope:companyId`, mas cada instância tinha seu próprio `useState` e não
// sincronizava entre telas) e o `useState` cru dos 4 dashboards (perdido na
// navegação). Aqui o valor mora num só lugar.
//
// Padrão: external store consumível via `useSyncExternalStore`. Não é React
// Context porque o valor é um escalar lido por hooks em subárvores distintas
// (DRE, dashboards, Precificação) — um provider comum obrigaria a subir o estado
// até a raiz e re-renderizaria a árvore inteira a cada troca.
//
// `null` = "Todas as empresas" (consolidado) — estado válido e default.

const STORAGE_KEY = 'scope:companyId';
/** Chave legada do useDREData — herdada uma vez na primeira leitura. */
const LEGACY_DRE_KEY = 'dre:companyId';

type Listener = () => void;

const listeners = new Set<Listener>();

function safeGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null; // private mode / storage desabilitado
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value) globalThis.localStorage?.setItem(key, value);
    else globalThis.localStorage?.removeItem(key);
  } catch {
    /* quota / private mode — segue com o valor em memória */
  }
}

function readInitial(): string | null {
  const saved = safeGet(STORAGE_KEY);
  if (saved) return saved;
  // Migração única: se o usuário já tinha uma empresa fixada na DRE, herda.
  const legacy = safeGet(LEGACY_DRE_KEY);
  if (legacy) {
    safeSet(STORAGE_KEY, legacy);
    return legacy;
  }
  return null;
}

let current: string | null = readInitial();

export function getCompanyId(): string | null {
  return current;
}

export function setCompanyId(id: string | null): void {
  if (id === current) return;
  current = id;
  safeSet(STORAGE_KEY, id);
  for (const l of listeners) l();
}

export function subscribeCompanyId(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Sincroniza entre abas: outra aba grava no localStorage → este `storage` event
// dispara aqui (não dispara na aba que escreveu).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = e.newValue;
    if (next === current) return;
    current = next;
    for (const l of listeners) l();
  });
}

/** Só para testes — reseta o estado em memória (não toca no storage). */
export function __resetCompanyScopeForTests(value: string | null = null): void {
  current = value;
  listeners.clear();
}
