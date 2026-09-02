// Aposta C (reposição de estoque), Fase 1 — "o que pedir esta semana, e em que
// ordem". Módulo puro e testável, no espírito de goal.ts / scenario.ts /
// cashflow-forecast.ts: nenhuma query, nenhum hook.
//
// O modelo é o clássico ponto de reposição, com duas camadas por cima:
//   1. urgência — quantos dias de estoque restam vs o lead time do fornecedor;
//   2. prioridade por lucro — quando o caixa não cobre repor tudo, corta pelos
//      SKUs que geram menos lucro por dia (buildReplenishmentPlan).
//
// Vieses conhecidos do v1 (documentados de propósito):
//   - velocidade = unidades / dias da janela, SEM descontar dias em que o SKU
//     esteve zerado. Se houve ruptura na janela, a velocidade sai subestimada.
//   - margem de contribuição é estimativa (o hook decide como derivar); serve
//     pra ordenar, não pra contabilidade.

export interface ReplenishmentSku {
  sku: string;
  itemName: string;
  /** unidades vendidas na janela de observação */
  unitsSold: number;
  /** tamanho da janela de observação, em dias */
  windowDays: number;
  /** margem de contribuição unitária estimada (receita líquida − custo), centavos */
  contributionMarginCents: number;
  /** custo de compra unitário pago ao fornecedor, centavos */
  purchaseUnitCostCents: number;
  /** estoque físico informado */
  stockUnits: number;
  /** há quantos dias o estoque foi informado */
  stockUpdatedDaysAgo: number;
  /** unidades já pedidas ao fornecedor e ainda não recebidas */
  inTransitUnits: number;
  leadTimeDays: number;
  /** estoque de segurança, em dias de venda */
  safetyDays: number;
  /** lote mínimo do fornecedor (null = sem restrição) */
  moqUnits: number | null;
}

export interface ReplenishmentOptions {
  /** data-âncora (YYYY-MM-DD) */
  todayIso: string;
  /** de quantos em quantos dias o vendedor revisa/faz pedido */
  reviewCycleDays: number;
  /** acima de quantos dias sem atualizar, o estoque é considerado "velho" */
  stockStaleDays: number;
}

export type Urgencia = 'ruptura' | 'critico' | 'atencao' | 'ok' | 'sem_giro';

const URGENCIA_RANK: Record<Urgencia, number> = {
  ruptura: 0, critico: 1, atencao: 2, ok: 3, sem_giro: 4,
};

export interface ReplenishmentRow {
  sku: string;
  itemName: string;
  /** unidades/dia */
  velocidadeDia: number;
  estoqueAtual: number;
  emTransito: number;
  /** (estoque + trânsito) / velocidade — Infinity se não há giro */
  coberturaDias: number;
  /** dia em que o estoque zera (null se não há giro) */
  rupturaIso: string | null;
  /** ponto de reposição: velocidade × (lead time + estoque de segurança) */
  pontoReposicao: number;
  precisaPedir: boolean;
  /** unidades sugeridas pro pedido, já ajustadas ao lote mínimo */
  sugestaoUnidades: number;
  custoCompraCents: number;
  /** lucro/dia que o SKU gera — usado pra priorizar o capital */
  lucroDiaCents: number;
  urgencia: Urgencia;
  estoqueVelho: boolean;
}

export interface ReplenishmentPlan {
  /** todas as linhas, ordenadas por urgência e depois por lucro/dia */
  rows: ReplenishmentRow[];
  /** só as que precisam de pedido agora, na mesma ordem */
  pedidos: ReplenishmentRow[];
  /** Σ custo de compra de todos os pedidos */
  custoTotalCents: number;
  /** caixa que a previsão diz haver pra comprar (null = não informado) */
  caixaDisponivelCents: number | null;
  /** Σ custo dos pedidos que cabem no caixa (prioriza maior lucro/dia) */
  custoNoCaixaCents: number;
  /** SKUs que ficaram de fora por falta de caixa */
  cortadosPorCaixa: string[];
}

// ── Datas: aritmética simples em UTC sobre o "dia civil" ─────────────────────
function isoToUtcDays(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}
function addDaysIso(iso: string, n: number): string {
  return new Date((isoToUtcDays(iso) + n) * 86_400_000).toISOString().slice(0, 10);
}

export function computeReplenishmentRow(
  s: ReplenishmentSku,
  opts: ReplenishmentOptions,
): ReplenishmentRow {
  const janela = Math.max(1, s.windowDays);
  const v = Math.max(0, s.unitsSold) / janela;

  const disponivel = Math.max(0, s.stockUnits) + Math.max(0, s.inTransitUnits);
  const cobertura = v > 0 ? disponivel / v : Infinity;
  const rupturaIso = v > 0 ? addDaysIso(opts.todayIso, Math.floor(cobertura)) : null;

  const pontoReposicao = v * (s.leadTimeDays + s.safetyDays);
  const precisaPedir = v > 0 && disponivel <= pontoReposicao;

  // Estoque-alvo pós-reposição: cobre o lead time + a segurança + um ciclo de
  // revisão inteiro (pra não pedir de novo amanhã).
  const alvo = v * (s.leadTimeDays + s.safetyDays + opts.reviewCycleDays);
  let sugestao = Math.max(0, Math.ceil(alvo - disponivel));
  if (s.moqUnits && s.moqUnits > 0) {
    sugestao = Math.ceil(sugestao / s.moqUnits) * s.moqUnits;
  }
  // Precisa pedir mas o arredondamento zerou a sugestão → pede o mínimo viável.
  if (precisaPedir && sugestao === 0) {
    sugestao = s.moqUnits && s.moqUnits > 0 ? s.moqUnits : Math.max(1, Math.ceil(v * opts.reviewCycleDays));
  }

  const custoCompraCents = sugestao * Math.max(0, s.purchaseUnitCostCents);
  const lucroDiaCents = Math.max(0, s.contributionMarginCents) * v;

  let urgencia: Urgencia;
  if (v === 0) urgencia = 'sem_giro';
  else if (cobertura <= s.leadTimeDays) urgencia = 'ruptura';
  else if (cobertura <= s.leadTimeDays + s.safetyDays) urgencia = 'critico';
  else if (cobertura <= s.leadTimeDays + s.safetyDays + opts.reviewCycleDays) urgencia = 'atencao';
  else urgencia = 'ok';

  return {
    sku: s.sku,
    itemName: s.itemName,
    velocidadeDia: v,
    estoqueAtual: Math.max(0, s.stockUnits),
    emTransito: Math.max(0, s.inTransitUnits),
    coberturaDias: cobertura,
    rupturaIso,
    pontoReposicao,
    precisaPedir,
    sugestaoUnidades: sugestao,
    custoCompraCents,
    lucroDiaCents,
    urgencia,
    estoqueVelho: s.stockUpdatedDaysAgo > opts.stockStaleDays,
  };
}

function ordenar(a: ReplenishmentRow, b: ReplenishmentRow): number {
  const r = URGENCIA_RANK[a.urgencia] - URGENCIA_RANK[b.urgencia];
  if (r !== 0) return r;
  return b.lucroDiaCents - a.lucroDiaCents;
}

export function buildReplenishmentPlan(
  skus: ReplenishmentSku[],
  opts: ReplenishmentOptions,
  caixaDisponivelCents: number | null = null,
): ReplenishmentPlan {
  const rows = skus.map(s => computeReplenishmentRow(s, opts)).sort(ordenar);
  const pedidos = rows.filter(r => r.precisaPedir);
  const custoTotalCents = pedidos.reduce((sum, r) => sum + r.custoCompraCents, 0);

  let custoNoCaixaCents = custoTotalCents;
  const cortadosPorCaixa: string[] = [];

  if (caixaDisponivelCents !== null) {
    // Capital escasso → compra primeiro quem devolve mais lucro por dia.
    const porLucro = [...pedidos].sort((a, b) => b.lucroDiaCents - a.lucroDiaCents);
    let acc = 0;
    for (const r of porLucro) {
      if (acc + r.custoCompraCents <= Math.max(0, caixaDisponivelCents)) {
        acc += r.custoCompraCents;
      } else {
        cortadosPorCaixa.push(r.sku);
      }
    }
    custoNoCaixaCents = acc;
  }

  return {
    rows,
    pedidos,
    custoTotalCents,
    caixaDisponivelCents,
    custoNoCaixaCents,
    cortadosPorCaixa,
  };
}
