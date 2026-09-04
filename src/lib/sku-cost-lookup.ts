// Custo por SKU — fonte pro auto-preenchimento da Calculadora de Precificação.
//
// A calculadora deixa o campo Custo em branco. Se o SKU do anúncio já tem custo
// cadastrado (tabela `product_costs`, alimentada pela edição inline em /produtos
// e pelos syncs), dá pra puxar custo + embalagem/outros direto, sem redigitar.
//
// Puro. `product_costs` guarda histórico (uma linha por `effective_from`); o
// caller passa ordenado por `effective_from` desc → a primeira ocorrência de
// cada SKU é a vigente.

import { skuKey } from './sku';

export interface RawSkuCost {
  sku: string;
  item_name: string | null;
  cost: number;
  packaging_cost: number | null;
  other_costs: number | null;
  tax_percent: number | null;
}

export interface SkuCostOption {
  /** chave canônica (skuKey) — casa "CAM-P", "cam p", "cam_p" */
  key: string;
  /** sku como cadastrado (o da linha mais recente) */
  sku: string;
  nome: string | null;
  /** product_costs.cost → campo Custo do anúncio */
  custo: number;
  /** packaging_cost + other_costs → campo Custo Variável do anúncio */
  custoVar: number;
  /** product_costs.tax_percent, quando houver */
  impostoPct: number | null;
}

// Dedup por skuKey (primeira ocorrência vence). Descarta linha sem nenhum
// custo real — não faz sentido oferecer "puxar" um custo zerado.
export function buildSkuCostOptions(rows: RawSkuCost[]): SkuCostOption[] {
  const byKey = new Map<string, SkuCostOption>();
  for (const r of rows) {
    const key = skuKey(r.sku);
    if (!key || byKey.has(key)) continue;
    const custo = Number(r.cost) || 0;
    const custoVar = (Number(r.packaging_cost) || 0) + (Number(r.other_costs) || 0);
    if (custo <= 0 && custoVar <= 0) continue;
    byKey.set(key, {
      key,
      sku: r.sku,
      nome: r.item_name?.trim() || null,
      custo,
      custoVar,
      impostoPct: r.tax_percent != null && Number.isFinite(Number(r.tax_percent)) ? Number(r.tax_percent) : null,
    });
  }
  return [...byKey.values()].sort((a, b) =>
    (a.nome ?? a.sku).localeCompare(b.nome ?? b.sku, 'pt-BR'),
  );
}

/** Acha o custo cadastrado pra um SKU digitado (casa por skuKey). */
export function findSkuCost(options: SkuCostOption[], sku: string | null | undefined): SkuCostOption | null {
  const key = skuKey(sku);
  if (!key) return null;
  return options.find(o => o.key === key) ?? null;
}
