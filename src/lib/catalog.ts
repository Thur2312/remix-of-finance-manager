// Catálogo de Produtos — Bloco C das diretrizes do dashboard (itens 1/2/3).
//
// Não existe entidade "Produto" no schema. Este módulo PROJETA um catálogo por
// SKU em runtime, unindo as vendas dos 3 marketplaces com o que o vendedor
// cadastrou (custo, estoque, precificação). Puro, no espírito de
// replenishment.ts / cashflow-forecast.ts: nenhuma query, nenhum hook.
//
// Chave = skuKey() (src/lib/sku.ts). product_catalog.alias_of funde dois
// skuKey num só (Fase 2 — aqui já é respeitado se vier preenchido).

import { skuKey } from './sku';
import { aggregateShopeeSkuFinance } from './shopee-sku-finance';
import { calcComissaoTaxaReais } from './marketplace-fees';

export type CatalogMarketplace = 'shopee' | 'mercadolivre' | 'tiktok';

// ── Entradas (shapes mínimos das fontes) ────────────────────────────────────

interface ShopeeOrderLike {
  id: string;
  order_items: {
    external_item_id: string; item_name: string; sku: string;
    quantity: number; total_price: number;
  }[];
}
interface ShopeePaymentLike {
  order_id: string | null; payment_method: string; net_amount: number;
}
export interface CatalogMlOrder {
  sku: string | null;
  nome_produto: string | null;
  quantidade: number | null;
  total_faturado: number | null;
  taxa_ml: number | null;
  frete_ml: number | null;
  custo_unitario: number | null;
  status_pedido: string | null;
}
export interface CatalogTiktokOrder {
  sku: string | null;
  nome_produto: string | null;
  quantidade: number | null;
  total_faturado: number | null;
  custo_unitario: number | null;
  status_pedido: string | null;
}
export interface CatalogCost {
  /** sku cru de product_costs */
  sku: string;
  /** cost + packaging_cost + other_costs, em R$ */
  custoTotal: number;
}
export interface CatalogStock {
  sku: string;
  stockUnits: number;
  /** 'shopee' | 'mercadolivre' | 'import' */
  source: string;
}
export interface CatalogInventoryOverride {
  sku: string;
  stockUnits: number;
  active: boolean;
}
export interface CatalogAnuncio {
  sku: string | null;
  valorVenda: number;
  custo: number;
}
export interface CatalogMeta {
  skuKey: string;
  displayName: string | null;
  archived: boolean;
  aliasOf: string | null;
}

export interface BuildCatalogInput {
  shopeeOrders: ShopeeOrderLike[];
  shopeePayments: ShopeePaymentLike[];
  mlOrders: CatalogMlOrder[];
  tiktokOrders: CatalogTiktokOrder[];
  costs: CatalogCost[];
  stock: CatalogStock[];
  inventoryOverrides: CatalogInventoryOverride[];
  anuncios: CatalogAnuncio[];
  meta: CatalogMeta[];
  /** tamanho da janela de vendas, em dias — base do giro/dia */
  windowDays: number;
  /** status ML/TikTok que não contam como venda (cancelado/devolvido) */
  isExcludedStatus: (status: string | null) => boolean;
}

// ── Saída ──────────────────────────────────────────────────────────────────

export interface CatalogRow {
  skuKey: string;
  /** sku cru representativo (primeiro visto) */
  sku: string;
  nome: string;
  /** false = linha agrupadora de itens sem SKU */
  temSku: boolean;
  marketplaces: CatalogMarketplace[];
  unidadesVendidas: number;
  faturamento: number;
  /** taxas + frete retidos pela plataforma, R$ */
  retidoPlataforma: number;
  /** retido / faturamento, % */
  taxaEfetivaPct: number;
  /** custo unitário resolvido, R$; null = desconhecido */
  custoUnit: number | null;
  custoOrigem: 'cadastrado' | 'marketplace' | 'nenhum';
  /** faturamento − retido − custoUnit·unidades; null se custoUnit null */
  lucro: number | null;
  margemPct: number | null;
  estoque: number | null;
  estoqueOrigem: 'override' | 'sync' | 'import' | 'nenhum';
  /** unidades/dia na janela */
  giroDia: number;
  /** estoque / giroDia; Infinity se giro 0; null se estoque desconhecido */
  diasDeCobertura: number | null;
  /** preço de venda cadastrado no anúncio (anuncios.valor_venda), se sku casar */
  precoCadastrado: number | null;
  custoCadastrado: number | null;
  archived: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Accum {
  sku: string;
  nome: string;
  temSku: boolean;
  mps: Set<CatalogMarketplace>;
  unidades: number;
  faturamento: number;
  retido: number;
  mpCustoSum: number;
  mpCustoUnid: number;
}

// Resolve alias: skuKey → skuKey "dono". Segue cadeias curtas (a→b→c), com
// guarda contra ciclo. Sem alias, devolve a própria chave.
function makeAliasResolver(meta: CatalogMeta[]): (k: string) => string {
  const direct = new Map<string, string>();
  for (const m of meta) {
    const to = m.aliasOf ? skuKey(m.aliasOf) : '';
    if (to && to !== m.skuKey) direct.set(m.skuKey, to);
  }
  return (k: string) => {
    let cur = k;
    const seen = new Set<string>();
    while (direct.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = direct.get(cur)!;
    }
    return cur;
  };
}

const SEM_SKU = '__sem_sku__';

export function buildCatalog(input: BuildCatalogInput): CatalogRow[] {
  const {
    shopeeOrders, shopeePayments, mlOrders, tiktokOrders,
    costs, stock, inventoryOverrides, anuncios, meta,
    windowDays, isExcludedStatus,
  } = input;

  const alias = makeAliasResolver(meta);
  const acc = new Map<string, Accum>();

  const bump = (
    rawSku: string | null | undefined, nome: string, mp: CatalogMarketplace,
    unidades: number, faturamento: number, retido: number,
    mpCustoUnit?: number | null,
  ) => {
    if (unidades <= 0) return;
    const k = skuKey(rawSku);
    const temSku = k.length > 0;
    const id = temSku ? alias(k) : SEM_SKU;
    let a = acc.get(id);
    if (!a) {
      a = {
        sku: (rawSku ?? '').trim() || '—',
        nome: nome || '',
        temSku,
        mps: new Set(),
        unidades: 0, faturamento: 0, retido: 0, mpCustoSum: 0, mpCustoUnid: 0,
      };
      acc.set(id, a);
    }
    a.mps.add(mp);
    a.unidades += unidades;
    a.faturamento += Math.max(0, faturamento);
    a.retido += Math.max(0, retido);
    if (mpCustoUnit && mpCustoUnit > 0) {
      a.mpCustoSum += mpCustoUnit * unidades;
      a.mpCustoUnid += unidades;
    }
    if (!a.nome && nome) a.nome = nome;
  };

  // ── Shopee: escrow por SKU (retido = faturado − repasse) ──────────────────
  // aggregateShopeeSkuFinance devolve sku '-' quando o item não tinha SKU —
  // nesse caso mandamos null pra cair na linha "sem SKU", não inventar uma
  // chave a partir do external_item_id.
  for (const r of aggregateShopeeSkuFinance(shopeeOrders, shopeePayments, [])) {
    if (r.total_faturado <= 0) continue;
    bump(r.sku === '-' ? null : r.sku, r.nome_produto, 'shopee',
      r.itens_vendidos, r.total_faturado, Math.max(0, r.total_faturado - r.net));
  }

  // ── Mercado Livre: taxa + frete reais por pedido ─────────────────────────
  for (const o of mlOrders) {
    if (isExcludedStatus(o.status_pedido)) continue;
    const un = Number(o.quantidade) || 0;
    const fat = Number(o.total_faturado) || 0;
    const retido = (Number(o.taxa_ml) || 0) + (Number(o.frete_ml) || 0);
    bump(o.sku, o.nome_produto ?? '', 'mercadolivre', un, fat, retido, Number(o.custo_unitario) || 0);
  }

  // ── TikTok: sem taxa por linha → estima pela tabela de comissão ──────────
  for (const o of tiktokOrders) {
    if (isExcludedStatus(o.status_pedido)) continue;
    const un = Number(o.quantidade) || 0;
    const fat = Number(o.total_faturado) || 0;
    const retido = un > 0 ? calcComissaoTaxaReais('TiktokShop', fat / un) * un : 0;
    bump(o.sku, o.nome_produto ?? '', 'tiktok', un, fat, retido, Number(o.custo_unitario) || 0);
  }

  // ── Lookups do que o vendedor cadastrou (chaveados pelo dono do alias) ───
  const custoByKey = new Map<string, number>();
  for (const c of costs) {
    const k = alias(skuKey(c.sku));
    if (!k || custoByKey.has(k)) continue; // caller passa o mais recente primeiro
    if (c.custoTotal > 0) custoByKey.set(k, c.custoTotal);
  }
  const overrideByKey = new Map<string, CatalogInventoryOverride>();
  for (const i of inventoryOverrides) {
    const k = alias(skuKey(i.sku));
    if (k) overrideByKey.set(k, i);
  }
  const stockByKey = new Map<string, CatalogStock>();
  for (const s of stock) {
    const k = alias(skuKey(s.sku));
    if (k) stockByKey.set(k, s);
  }
  const anuncioByKey = new Map<string, CatalogAnuncio>();
  for (const a of anuncios) {
    if (!a.sku) continue;
    const k = alias(skuKey(a.sku));
    if (k && !anuncioByKey.has(k)) anuncioByKey.set(k, a);
  }
  const metaByKey = new Map<string, CatalogMeta>();
  for (const m of meta) {
    const k = alias(m.skuKey);
    const existing = metaByKey.get(k);
    // a linha do próprio dono (skuKey === k) ganha da linha-ponteiro de alias
    if (!existing || m.skuKey === k) metaByKey.set(k, m);
  }

  // ── Materializa as linhas ──────────────────────────────────────────────
  const rows: CatalogRow[] = [];
  for (const [id, a] of acc) {
    const key = a.temSku ? id : '';
    const m = a.temSku ? metaByKey.get(key) : undefined;

    const cadastrado = a.temSku ? custoByKey.get(key) ?? null : null;
    const mpCusto = a.mpCustoUnid > 0 ? a.mpCustoSum / a.mpCustoUnid : null;
    const custoUnit = cadastrado ?? mpCusto ?? null;
    const custoOrigem: CatalogRow['custoOrigem'] =
      cadastrado != null ? 'cadastrado' : mpCusto != null ? 'marketplace' : 'nenhum';

    const lucro = custoUnit != null
      ? a.faturamento - a.retido - custoUnit * a.unidades
      : null;

    const override = a.temSku ? overrideByKey.get(key) : undefined;
    const syncStock = a.temSku ? stockByKey.get(key) : undefined;
    let estoque: number | null = null;
    let estoqueOrigem: CatalogRow['estoqueOrigem'] = 'nenhum';
    if (override && override.stockUnits >= 0 && (override.stockUnits > 0 || !syncStock)) {
      estoque = override.stockUnits;
      estoqueOrigem = 'override';
    } else if (syncStock) {
      estoque = Math.max(0, syncStock.stockUnits);
      estoqueOrigem = syncStock.source === 'import' ? 'import' : 'sync';
    }

    const giroDia = a.unidades / Math.max(1, windowDays);
    const diasDeCobertura = estoque == null
      ? null
      : giroDia > 0 ? estoque / giroDia : Infinity;

    const anuncio = a.temSku ? anuncioByKey.get(key) : undefined;

    rows.push({
      skuKey: key,
      sku: a.sku,
      nome: m?.displayName || a.nome || a.sku,
      temSku: a.temSku,
      marketplaces: [...a.mps].sort(),
      unidadesVendidas: a.unidades,
      faturamento: round2(a.faturamento),
      retidoPlataforma: round2(a.retido),
      taxaEfetivaPct: a.faturamento > 0 ? round2((a.retido / a.faturamento) * 100) : 0,
      custoUnit: custoUnit != null ? round2(custoUnit) : null,
      custoOrigem,
      lucro: lucro != null ? round2(lucro) : null,
      margemPct: lucro != null && a.faturamento > 0 ? round2((lucro / a.faturamento) * 100) : null,
      estoque,
      estoqueOrigem,
      giroDia: round2(giroDia),
      diasDeCobertura:
        diasDeCobertura == null || diasDeCobertura === Infinity
          ? diasDeCobertura
          : round2(diasDeCobertura),
      precoCadastrado: anuncio ? round2(anuncio.valorVenda) : null,
      custoCadastrado: anuncio && anuncio.custo > 0 ? round2(anuncio.custo) : null,
      archived: m?.archived ?? false,
    });
  }

  // maior faturamento primeiro; "sem SKU" sempre por último
  return rows.sort((x, y) => {
    if (x.temSku !== y.temSku) return x.temSku ? -1 : 1;
    return y.faturamento - x.faturamento;
  });
}

// ── Ranking (item 3 — Top Produtos) ────────────────────────────────────────

export type TopProdutoCriterio = 'lucro' | 'faturamento' | 'margem' | 'unidades';

export function rankTopProdutos(
  rows: CatalogRow[],
  opts: { by: TopProdutoCriterio; limit?: number } = { by: 'lucro' },
): CatalogRow[] {
  const limit = opts.limit ?? 5;
  const base = rows.filter(r => r.temSku && !r.archived);
  const val = (r: CatalogRow): number | null => {
    switch (opts.by) {
      case 'faturamento': return r.faturamento;
      case 'unidades': return r.unidadesVendidas;
      case 'margem': return r.margemPct;
      case 'lucro': return r.lucro;
    }
  };
  return base
    .filter(r => val(r) != null)
    .sort((a, b) => (val(b) as number) - (val(a) as number))
    .slice(0, limit);
}
