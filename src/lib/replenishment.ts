// Aposta C (reposição de estoque), Fase 1 — "o que pedir esta semana, e em que
// ordem". Módulo puro e testável, no espírito de goal.ts / scenario.ts /
// cashflow-forecast.ts: nenhuma query, nenhum hook.
//
// O modelo é o clássico ponto de reposição, com duas camadas por cima:
//   1. urgência — quantos dias de estoque restam vs o lead time do fornecedor;
//   2. prioridade por lucro — quando o caixa não cobre repor tudo, corta pelos
//      SKUs que geram menos lucro por dia (buildReplenishmentPlan).
//
// A velocidade desconta `daysOutOfStock` da janela: dia sem estoque não vendeu
// por falta de produto, não de demanda — contá-lo derrubaria a velocidade e
// mandaria pedir de menos. Custo e margem podem vir null (SKU sem custo
// cadastrado): a linha ainda mostra urgência e unidades, mas fica de fora da
// conta de R$ e da priorização por caixa.

export interface ReplenishmentSku {
  sku: string;
  itemName: string;
  /** unidades vendidas na janela de observação */
  unitsSold: number;
  /** tamanho da janela de observação, em dias */
  windowDays: number;
  /** dias da janela em que o SKU esteve sem estoque (não contam pra velocidade) */
  daysOutOfStock: number;
  /** margem de contribuição unitária (receita líquida − custo), centavos; null se o custo é desconhecido */
  contributionMarginCents: number | null;
  /** custo de compra unitário pago ao fornecedor, centavos; null se desconhecido */
  purchaseUnitCostCents: number | null;
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
  /** piso da janela efetiva depois de descontar dias sem estoque */
  minWindowDays: number;
}

export type Urgencia = 'ruptura' | 'critico' | 'atencao' | 'ok' | 'sem_giro';

const URGENCIA_RANK: Record<Urgencia, number> = {
  ruptura: 0, critico: 1, atencao: 2, ok: 3, sem_giro: 4,
};

export interface ReplenishmentRow {
  sku: string;
  itemName: string;
  /** unidades/dia (já descontando dias sem estoque da janela) */
  velocidadeDia: number;
  /** true = a janela foi encurtada por ruptura (velocidade é estimada por baixo) */
  velocidadeAjustada: boolean;
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
  /** custo do pedido sugerido; null se o custo do SKU é desconhecido */
  custoCompraCents: number | null;
  /** lucro/dia que o SKU gera; null se o custo é desconhecido */
  lucroDiaCents: number | null;
  urgencia: Urgencia;
  estoqueVelho: boolean;
}

export interface ReplenishmentPlan {
  /** todas as linhas, ordenadas por urgência e depois por lucro/dia */
  rows: ReplenishmentRow[];
  /** só as que precisam de pedido agora, na mesma ordem */
  pedidos: ReplenishmentRow[];
  /** Σ custo de compra dos pedidos com custo conhecido */
  custoTotalCents: number;
  /** SKUs que precisam de pedido mas estão sem custo cadastrado */
  pedidosSemCusto: string[];
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
  const janelaBruta = Math.max(1, s.windowDays);
  const foraDeEstoque = Math.min(Math.max(0, s.daysOutOfStock), janelaBruta - 1);
  const janela = Math.max(opts.minWindowDays, janelaBruta - foraDeEstoque);
  const velocidadeAjustada = foraDeEstoque > 0;
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

  const custoConhecido = s.purchaseUnitCostCents !== null;
  const custoCompraCents = custoConhecido
    ? sugestao * Math.max(0, s.purchaseUnitCostCents as number)
    : null;
  const lucroDiaCents = s.contributionMarginCents !== null
    ? Math.max(0, s.contributionMarginCents) * v
    : null;

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
    velocidadeAjustada,
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

// lucro/dia null (custo desconhecido) desce pro fim do bloco de urgência.
function ordenar(a: ReplenishmentRow, b: ReplenishmentRow): number {
  const r = URGENCIA_RANK[a.urgencia] - URGENCIA_RANK[b.urgencia];
  if (r !== 0) return r;
  return (b.lucroDiaCents ?? -1) - (a.lucroDiaCents ?? -1);
}

export function buildReplenishmentPlan(
  skus: ReplenishmentSku[],
  opts: ReplenishmentOptions,
  caixaDisponivelCents: number | null = null,
): ReplenishmentPlan {
  const rows = skus.map(s => computeReplenishmentRow(s, opts)).sort(ordenar);
  const pedidos = rows.filter(r => r.precisaPedir);

  const comCusto = pedidos.filter(r => r.custoCompraCents !== null);
  const custoTotalCents = comCusto.reduce((sum, r) => sum + (r.custoCompraCents as number), 0);
  const pedidosSemCusto = pedidos.filter(r => r.custoCompraCents === null).map(r => r.sku);

  let custoNoCaixaCents = custoTotalCents;
  const cortadosPorCaixa: string[] = [];

  if (caixaDisponivelCents !== null) {
    // Capital escasso → compra primeiro quem devolve mais lucro por dia.
    const porLucro = [...comCusto].sort((a, b) => (b.lucroDiaCents ?? 0) - (a.lucroDiaCents ?? 0));
    let acc = 0;
    for (const r of porLucro) {
      const custo = r.custoCompraCents as number;
      if (acc + custo <= Math.max(0, caixaDisponivelCents)) {
        acc += custo;
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
    pedidosSemCusto,
    caixaDisponivelCents,
    custoNoCaixaCents,
    cortadosPorCaixa,
  };
}
