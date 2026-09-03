import { describe, it, expect, beforeEach, vi } from 'vitest';

// Fake localStorage (o ambiente de teste é 'node' — não tem Web Storage).
function makeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
}

async function freshStore(seed: Record<string, string> = {}) {
  vi.resetModules();
  const storage = makeStorage(seed);
  vi.stubGlobal('localStorage', storage);
  const mod = await import('./company-scope-store');
  return { ...mod, storage };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('company-scope-store', () => {
  it('default é null quando não há nada salvo', async () => {
    const { getCompanyId } = await freshStore();
    expect(getCompanyId()).toBeNull();
  });

  it('lê o valor persistido de scope:companyId na inicialização', async () => {
    const { getCompanyId } = await freshStore({ 'scope:companyId': 'empresa-A' });
    expect(getCompanyId()).toBe('empresa-A');
  });

  it('herda dre:companyId uma vez quando scope:companyId está vazio', async () => {
    const { getCompanyId, storage } = await freshStore({ 'dre:companyId': 'empresa-legada' });
    expect(getCompanyId()).toBe('empresa-legada');
    // e grava na chave nova, pra não depender mais da legada
    expect(storage.getItem('scope:companyId')).toBe('empresa-legada');
  });

  it('setCompanyId persiste e notifica os inscritos', async () => {
    const { getCompanyId, setCompanyId, subscribeCompanyId, storage } = await freshStore();
    const spy = vi.fn();
    subscribeCompanyId(spy);

    setCompanyId('empresa-B');
    expect(getCompanyId()).toBe('empresa-B');
    expect(storage.getItem('scope:companyId')).toBe('empresa-B');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('setCompanyId(null) volta pra "Todas" e limpa o storage', async () => {
    const { getCompanyId, setCompanyId, storage } = await freshStore({ 'scope:companyId': 'empresa-A' });
    setCompanyId(null);
    expect(getCompanyId()).toBeNull();
    expect(storage.getItem('scope:companyId')).toBeNull();
  });

  it('não notifica quando o valor não muda', async () => {
    const { setCompanyId, subscribeCompanyId } = await freshStore({ 'scope:companyId': 'empresa-A' });
    const spy = vi.fn();
    subscribeCompanyId(spy);
    setCompanyId('empresa-A');
    expect(spy).not.toHaveBeenCalled();
  });

  it('a função de unsubscribe remove o listener', async () => {
    const { setCompanyId, subscribeCompanyId } = await freshStore();
    const spy = vi.fn();
    const off = subscribeCompanyId(spy);
    off();
    setCompanyId('empresa-C');
    expect(spy).not.toHaveBeenCalled();
  });

  it('sobrevive a um localStorage que lança (private mode)', async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    });
    const { getCompanyId, setCompanyId } = await import('./company-scope-store');
    expect(getCompanyId()).toBeNull();
    expect(() => setCompanyId('x')).not.toThrow();
    expect(getCompanyId()).toBe('x'); // mantém em memória
  });
});
