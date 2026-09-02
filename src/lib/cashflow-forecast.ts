// Previsão de caixa (Aposta B, Fase 1) — a versão "quando o dinheiro entra e
// sai" da operação. O resto do app fala competência (a venda conta quando o
// pedido conclui); aqui é caixa puro: em que dia o saldo em conta sobe ou
// desce. Puro e testável de propósito, no espírito de goal.ts / scenario.ts —
// nenhuma query, nenhum hook.
//
// Três baldes, com regras diferentes (ver revisão adversarial no roadmap):
//   - CONFIRMADO: recebível com data de liberação conhecida (ML: money_release_
//     date) + contas a pagar já lançadas. Vira a LINHA sólida e é o único que
//     dispara o alerta de saldo negativo. "Mesmo contando só o que já está
//     travado, você fica no vermelho dia X."
//   - PROVÁVEL: recebível estimado — pedido Shopee em trânsito com a liberação
//     do escrow projetada por D+N. Tem data, mas o valor e o dia são estimativa.
//     Entra numa linha tracejada / na banda, nunca no alerta.
//   - TENDÊNCIA: projeção do ritmo de recebimento atual pros dias mais à frente,
//     onde ainda não há recebível confirmado. Vira uma BANDA sombreada; nunca
//     entra no saldo conservador nem no primeiro-negativo.

export interface ForecastReceivable {
  /** data de liberação (YYYY-MM-DD ou ISO completo) */
  dateIso: string;
  amountCents: number;
  source: 'ml' | 'manual' | 'shopee';
}

export interface ForecastPayable {
  /** vencimento (YYYY-MM-DD ou ISO completo) */
  dateIso: string;
  amountCents: number;
  label: string;
}

export interface ForecastInputs {
  /** saldo real em conta na data-âncora (a que o vendedor confirmou) */
  openingBalanceCents: number;
  /** data-âncora — o dia 0 da projeção (YYYY-MM-DD) */
  todayIso: string;
  /** quantos dias projetar pra frente (ex.: 30) */
  horizonDays: number;
  /** recebíveis CONFIRMADOS — entram na linha conservadora e no alerta */
  receivables: ForecastReceivable[];
  /** recebíveis PROVÁVEIS (Shopee estimado) — entram só na linha tracejada /
   *  na banda, nunca no alerta */
  probableReceivables?: ForecastReceivable[];
  payables: ForecastPayable[];
  /** média diária de recebimento líquido observada (ex.: últimos 30d) */
  ritmoLiquidoDiaCents: number;
  /** a partir de quantos dias a tendência passa a somar (antes disso, só o
   *  que está confirmado). Mantém a banda longe da janela onde os recebíveis
   *  de marketplace já aprovados ainda estão caindo. */
  tendenciaComecaEmDias: number;
}

export interface ForecastDay {
  dateIso: string;
  /** dia relativo à âncora (0 = hoje) */
  offset: number;
  /** entrada confirmada do dia */
  entradaCents: number;
  /** entrada provável (Shopee estimado) do dia */
  entradaProvavelCents: number;
  saidaCents: number;
  /** linha conservadora: âncora + Σ(confirmado − saídas) até este dia */
  saldoCents: number;
  /** saldoCents + Σ(provável) até este dia — inclui a estimativa Shopee, sem ritmo */
  saldoComProvavelCents: number;
  /** saldoComProvavelCents + a tendência acumulada até este dia */
  saldoComTendenciaCents: number;
}

export interface ForecastResult {
  dias: ForecastDay[];
  /** primeiro dia em que a linha conservadora fica < 0 (null se nunca fica) */
  primeiroNegativo: { dateIso: string; saldoCents: number; offset: number } | null;
  /** menor saldo conservador da janela e o dia em que acontece */
  saldoMinimo: { dateIso: string; saldoCents: number; offset: number };
  totalEntradasCents: number;
  /** total dos recebíveis prováveis (Shopee estimado) na janela */
  totalProvavelCents: number;
  totalSaidasCents: number;
  /** saldo conservador no fim da janela */
  saldoFinalCents: number;
  /** menor saldo da janela contando também os prováveis, e o dia */
  saldoMinimoComProvavel: { dateIso: string; saldoCents: number; offset: number };
}

// ── Datas: aritmética simples em UTC sobre o "dia civil", sem dependência ─────
function isoToUtcDays(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

function addDaysIso(iso: string, n: number): string {
  const ms = (isoToUtcDays(iso) + n) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ── Calibração da estimativa Shopee pelo histórico do vendedor ────────────────
// A Shopee não informa a data de liberação futura, então a previsão estima:
// liberação = pagamento + N dias, líquido = bruto × razão. N e a razão vêm do
// próprio histórico de repasses do vendedor quando há amostra suficiente — no
// mesmo espírito do `ritmo` observado do ML. Sem amostra, cai nos padrões.

export interface ShopeeReleaseSample {
  /** dias entre o pagamento do pedido e a liberação do escrow */
  lagDias: number;
  /** valor bruto pago pelo comprador, em centavos */
  grossCents: number;
  /** valor líquido liberado pro vendedor (escrow), em centavos */
  netCents: number;
}

export interface ShopeeCalibration {
  /** dias pra estimar a liberação a partir do pagamento */
  lagDias: number;
  /** fração do bruto que sobra pro vendedor (net / gross) */
  netRatio: number;
  /** true = calibrado pelo histórico; false = usando os padrões */
  observado: boolean;
  /** quantos repasses liberados entraram na observação */
  amostras: number;
}

export const SHOPEE_LAG_PADRAO_DIAS = 18;
export const SHOPEE_NET_RATIO_PADRAO = 0.82;
const SHOPEE_MIN_AMOSTRAS = 5;

export function calibrarShopee(
  samples: ShopeeReleaseSample[],
  padrao: { lagDias?: number; netRatio?: number } = {},
): ShopeeCalibration {
  const lagPadrao = padrao.lagDias ?? SHOPEE_LAG_PADRAO_DIAS;
  const ratioPadrao = padrao.netRatio ?? SHOPEE_NET_RATIO_PADRAO;

  // Descarta o que não faz sentido: lag fora de 1..60d, bruto/líquido não
  // positivos, líquido maior que o bruto (estorno, ajuste manual).
  const validos = samples.filter(
    s =>
      s.lagDias >= 1 && s.lagDias <= 60 &&
      s.grossCents > 0 && s.netCents > 0 && s.netCents <= s.grossCents,
  );

  if (validos.length < SHOPEE_MIN_AMOSTRAS) {
    return { lagDias: lagPadrao, netRatio: ratioPadrao, observado: false, amostras: validos.length };
  }

  const lags = validos.map(s => s.lagDias).sort((a, b) => a - b);
  const mid = Math.floor(lags.length / 2);
  const lagDias = lags.length % 2
    ? lags[mid]
    : Math.round((lags[mid - 1] + lags[mid]) / 2);

  const grossTotal = validos.reduce((s, v) => s + v.grossCents, 0);
  const netTotal = validos.reduce((s, v) => s + v.netCents, 0);

  return { lagDias, netRatio: netTotal / grossTotal, observado: true, amostras: validos.length };
}

/**
 * Offset (dias a partir da âncora) a partir do qual a TENDÊNCIA deve começar a
 * somar: o primeiro dia em que `fraction` (padrão 0,75) do valor dos recebíveis
 * já confirmados acumulou. Antes disso, somar o ritmo médio em cima contaria o
 * mesmo dinheiro duas vezes — os recebíveis de marketplace já aprovados ainda
 * estão caindo nessa janela. `piso`/`teto` contêm o resultado quando há poucos
 * (ou nenhum) recebível confirmado. Só recebíveis futuros com valor positivo
 * entram na conta.
 */
export function tendenciaStartOffset(
  receivables: ForecastReceivable[],
  todayIso: string,
  opts: { piso: number; teto: number; fraction?: number },
): number {
  const { piso, teto, fraction = 0.75 } = opts;
  const clamp = (n: number) => Math.min(teto, Math.max(piso, n));

  const anchor = isoToUtcDays(todayIso);
  const items = receivables
    .map(r => ({ off: isoToUtcDays(r.dateIso) - anchor, amt: Math.max(0, r.amountCents) }))
    .filter(r => r.off >= 0 && r.amt > 0)
    .sort((a, b) => a.off - b.off);

  const total = items.reduce((s, r) => s + r.amt, 0);
  if (total <= 0) return clamp(piso);

  let acc = 0;
  for (const r of items) {
    acc += r.amt;
    if (acc >= total * fraction) return clamp(r.off + 1);
  }
  return clamp(piso);
}

export function computeForecast(i: ForecastInputs): ForecastResult {
  const anchorDay = isoToUtcDays(i.todayIso);
  const horizon = Math.max(0, Math.floor(i.horizonDays));

  // Agrega entradas/saídas por offset de dia. Itens vencidos/atrasados (offset
  // negativo) caem no dia 0 — o dinheiro que você já devia sair hoje. Itens
  // além do horizonte são ignorados.
  const entradaPorDia = new Array(horizon + 1).fill(0);
  const provavelPorDia = new Array(horizon + 1).fill(0);
  const saidaPorDia = new Array(horizon + 1).fill(0);

  for (const r of i.receivables) {
    const off = Math.max(0, isoToUtcDays(r.dateIso) - anchorDay);
    if (off > horizon) continue;
    entradaPorDia[off] += r.amountCents;
  }
  for (const r of i.probableReceivables ?? []) {
    const off = Math.max(0, isoToUtcDays(r.dateIso) - anchorDay);
    if (off > horizon) continue;
    provavelPorDia[off] += r.amountCents;
  }
  for (const p of i.payables) {
    const off = Math.max(0, isoToUtcDays(p.dateIso) - anchorDay);
    if (off > horizon) continue;
    saidaPorDia[off] += p.amountCents;
  }

  const ritmo = Math.max(0, Math.round(i.ritmoLiquidoDiaCents));
  const tendDesde = Math.max(0, Math.floor(i.tendenciaComecaEmDias));

  const dias: ForecastDay[] = [];
  let saldo = i.openingBalanceCents;
  let provavelAcum = 0;
  let tendenciaAcum = 0;
  let totalEntradas = 0;
  let totalProvavel = 0;
  let totalSaidas = 0;

  for (let off = 0; off <= horizon; off++) {
    saldo += entradaPorDia[off] - saidaPorDia[off];
    provavelAcum += provavelPorDia[off];
    totalEntradas += entradaPorDia[off];
    totalProvavel += provavelPorDia[off];
    totalSaidas += saidaPorDia[off];
    if (off >= tendDesde) tendenciaAcum += ritmo;

    dias.push({
      dateIso: addDaysIso(i.todayIso, off),
      offset: off,
      entradaCents: entradaPorDia[off],
      entradaProvavelCents: provavelPorDia[off],
      saidaCents: saidaPorDia[off],
      saldoCents: saldo,
      saldoComProvavelCents: saldo + provavelAcum,
      saldoComTendenciaCents: saldo + provavelAcum + tendenciaAcum,
    });
  }

  const primeiroNegativoDia = dias.find(d => d.saldoCents < 0) ?? null;
  const saldoMinimoDia = dias.reduce((min, d) => (d.saldoCents < min.saldoCents ? d : min), dias[0]);
  const saldoMinimoProvavelDia = dias.reduce(
    (min, d) => (d.saldoComProvavelCents < min.saldoComProvavelCents ? d : min),
    dias[0],
  );

  return {
    dias,
    primeiroNegativo: primeiroNegativoDia
      ? {
          dateIso: primeiroNegativoDia.dateIso,
          saldoCents: primeiroNegativoDia.saldoCents,
          offset: primeiroNegativoDia.offset,
        }
      : null,
    saldoMinimo: {
      dateIso: saldoMinimoDia.dateIso,
      saldoCents: saldoMinimoDia.saldoCents,
      offset: saldoMinimoDia.offset,
    },
    saldoMinimoComProvavel: {
      dateIso: saldoMinimoProvavelDia.dateIso,
      saldoCents: saldoMinimoProvavelDia.saldoComProvavelCents,
      offset: saldoMinimoProvavelDia.offset,
    },
    totalEntradasCents: totalEntradas,
    totalProvavelCents: totalProvavel,
    totalSaidasCents: totalSaidas,
    saldoFinalCents: saldo,
  };
}
