// Bloco D — separação Empresa → Loja → Plataforma.
//
// "Loja" = uma conexão de marketplace (integration_connections). Uma empresa
// (CNPJ) tem N lojas, uma por conexão. Plataforma = o `provider` da conexão.
// Estes helpers só resolvem os vínculos; a alocação de custo mora em
// cost-allocation.ts. Puro.

export type CostScope = 'geral' | 'empresa' | 'loja' | 'plataforma';

export const SCOPE_LABELS: Record<CostScope, string> = {
  geral: 'Geral (toda a operação)',
  empresa: 'Exclusivo de uma empresa',
  loja: 'Exclusivo de uma loja',
  plataforma: 'Exclusivo de uma plataforma',
};

export const SCOPE_SHORT: Record<CostScope, string> = {
  geral: 'Geral',
  empresa: 'Empresa',
  loja: 'Loja',
  plataforma: 'Plataforma',
};

export interface ScopedConnection {
  id: string;
  companyId: string | null;
  /** provider: 'shopee' | 'mercadolivre' | 'tiktok' */
  marketplace: string;
  /** rótulo pra UI (shop_name || external_shop_id || provider) */
  label: string;
}

/** Empresa dona de uma conexão. null = conexão não atribuída. */
export function companyIdForConnection(
  connectionId: string | null | undefined,
  connections: ScopedConnection[],
): string | null {
  if (!connectionId) return null;
  return connections.find(c => c.id === connectionId)?.companyId ?? null;
}

/** Conexões (lojas) de uma empresa. */
export function connectionsForCompany(
  companyId: string,
  connections: ScopedConnection[],
): ScopedConnection[] {
  return connections.filter(c => c.companyId === companyId);
}

/** Empresas distintas que têm pelo menos uma loja naquela plataforma. */
export function companiesOnMarketplace(
  marketplace: string,
  connections: ScopedConnection[],
): string[] {
  const set = new Set<string>();
  for (const c of connections) {
    if (c.marketplace === marketplace && c.companyId) set.add(c.companyId);
  }
  return [...set];
}

/** true se alguma conexão está sem empresa atribuída (cai no consolidado). */
export function hasUnassignedConnection(connections: ScopedConnection[]): boolean {
  return connections.some(c => !c.companyId);
}
