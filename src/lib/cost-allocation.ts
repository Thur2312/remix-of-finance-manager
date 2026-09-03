// Bloco D — rateio dos custos fixos entre empresas (item 13).
//
// Cada custo tem um `scope`:
//   geral      → toda a operação; rateado entre as empresas na PROPORÇÃO DO
//                FATURAMENTO do período.
//   empresa    → 100% na empresa vinculada.
//   loja       → 100% na empresa dona da loja (conexão) vinculada.
//   plataforma → rateado entre as empresas que vendem naquela plataforma,
//                proporcional ao faturamento total delas (aproximação v1 —
//                sem fatiar faturamento por plataforma×empresa).
//
// O que não casa com nenhuma empresa (loja não atribuída, empresa removida,
// rateio sem faturamento) vai pro bucket `naoAtribuido`, VISÍVEL — nunca some.
// Puro, centavos, no estilo de replenishment.ts / goal.ts.

import type { CostScope, ScopedConnection } from './company-scope';
import { companiesOnMarketplace } from './company-scope';

export interface FixedCostScoped {
  id: string;
  name: string;
  amountCents: number;
  scope: CostScope;
  companyId?: string | null;
  integrationId?: string | null;
  marketplace?: string | null;
}

export interface AllocationContext {
  companyIds: string[];
  connections: ScopedConnection[];
  /** Σ faturamento do período por empresa, centavos */
  revenueByCompanyCents: Record<string, number>;
}

export interface CompanyAllocation {
  companyId: string;
  exclusivoCents: number;
  lojaCents: number;
  plataformaCents: number;
  rateioGeralCents: number;
  totalCents: number;
}

export interface AllocationResult {
  byCompany: Record<string, CompanyAllocation>;
  /** custo que não pôde ser atribuído a nenhuma empresa */
  naoAtribuido: {
    lojaSemEmpresaCents: number;
    geralSemFaturamentoCents: number;
    plataformaSemEmpresaCents: number;
    totalCents: number;
  };
  totalCents: number;
}

const empty = (companyId: string): CompanyAllocation => ({
  companyId,
  exclusivoCents: 0,
  lojaCents: 0,
  plataformaCents: 0,
  rateioGeralCents: 0,
  totalCents: 0,
});

// Divide `amountCents` entre `weights` proporcionalmente, sem perder centavo
// (o resto vai pro maior peso). Se Σ pesos = 0, devolve null (não dá pra ratear).
function rateio(amountCents: number, weights: Record<string, number>): Record<string, number> | null {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  const out: Record<string, number> = {};
  let distributed = 0;
  let maxKey = entries[0][0];
  let maxW = -Infinity;
  for (const [k, w] of entries) {
    const share = Math.floor((amountCents * w) / total);
    out[k] = share;
    distributed += share;
    if (w > maxW) { maxW = w; maxKey = k; }
  }
  out[maxKey] += amountCents - distributed; // sobra de arredondamento
  return out;
}

export function allocateFixedCosts(
  costs: FixedCostScoped[],
  ctx: AllocationContext,
): AllocationResult {
  const byCompany: Record<string, CompanyAllocation> = {};
  for (const id of ctx.companyIds) byCompany[id] = empty(id);

  const nao = { lojaSemEmpresaCents: 0, geralSemFaturamentoCents: 0, plataformaSemEmpresaCents: 0, totalCents: 0 };
  const known = new Set(ctx.companyIds);

  const revenueWeights = (ids: string[]): Record<string, number> => {
    const w: Record<string, number> = {};
    for (const id of ids) w[id] = Math.max(0, ctx.revenueByCompanyCents[id] ?? 0);
    return w;
  };

  for (const c of costs) {
    const amt = Math.max(0, Math.round(c.amountCents));
    if (amt === 0) continue;

    switch (c.scope) {
      case 'empresa': {
        if (c.companyId && known.has(c.companyId)) {
          byCompany[c.companyId].exclusivoCents += amt;
        } else {
          nao.lojaSemEmpresaCents += amt; // empresa sumiu — trata como não atribuído
        }
        break;
      }
      case 'loja': {
        const owner = ctx.connections.find(x => x.id === c.integrationId)?.companyId ?? null;
        if (owner && known.has(owner)) {
          byCompany[owner].lojaCents += amt;
        } else {
          nao.lojaSemEmpresaCents += amt;
        }
        break;
      }
      case 'plataforma': {
        const ids = c.marketplace ? companiesOnMarketplace(c.marketplace, ctx.connections) : [];
        const split = rateio(amt, revenueWeights(ids));
        if (split) {
          for (const [id, v] of Object.entries(split)) byCompany[id].plataformaCents += v;
        } else if (ids.length > 0) {
          // empresas na plataforma mas sem faturamento → divide igual
          const each = Math.floor(amt / ids.length);
          ids.forEach((id, i) => {
            byCompany[id].plataformaCents += each + (i === 0 ? amt - each * ids.length : 0);
          });
        } else {
          nao.plataformaSemEmpresaCents += amt;
        }
        break;
      }
      case 'geral':
      default: {
        const split = rateio(amt, revenueWeights(ctx.companyIds));
        if (split) {
          for (const [id, v] of Object.entries(split)) byCompany[id].rateioGeralCents += v;
        } else {
          nao.geralSemFaturamentoCents += amt;
        }
        break;
      }
    }
  }

  for (const a of Object.values(byCompany)) {
    a.totalCents = a.exclusivoCents + a.lojaCents + a.plataformaCents + a.rateioGeralCents;
  }
  nao.totalCents = nao.lojaSemEmpresaCents + nao.geralSemFaturamentoCents + nao.plataformaSemEmpresaCents;

  const totalCents = Object.values(byCompany).reduce((s, a) => s + a.totalCents, 0) + nao.totalCents;

  return { byCompany, naoAtribuido: nao, totalCents };
}
