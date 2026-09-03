// Simulador "E se" — cenários de decisão sobre um produto que já vende.
// Puro; reusa a fórmula validada do pricing.ts e as tabelas de taxa por faixa
// do marketplace-fees.ts. Ver docs (commit que introduziu) e src/pages/Simulador.tsx.
//
// Corte 1: só o cenário "mudar o preço". A resposta central NÃO é "o novo
// lucro" — é o PONTO DE EQUILÍBRIO de volume: quanto o vendedor precisa vender
// no novo preço pra manter o lucro total de hoje. Isso decide; um número novo
// isolado não decide.

import { apurar, type PricingInputs } from './pricing';
import {
  getShopeeRates, getTiktokRates, getMercadoLivreRates,
  type Marketplace, type MLTipoAnuncio,
} from './marketplace-fees';

export interface PriceScenarioBaseline {
  nome: string;
  /** '' = marketplace sem tabela de faixa → usa comissaoPctManual/taxaFixaManual */
  marketplace: Marketplace | '';
  mlTipo?: MLTipoAnuncio;
  /** custo do produto + adicionais + antecipação, em R$ (não escala com o preço) */
  custo: number;
  /** custo variável por venda (embalagem/etiqueta), em R$ */
  custoVar: number;
  /** outros custos por venda que NÃO escalam com o preço — frete que você paga,
   *  ads rateado por unidade, etc. Some ao `custo`. */
  custoExtraPorVenda?: number;
  impostoPct: number;
  afiliadosPct: number;
  // ── Item 15: despesas ligadas à venda que o vendedor quer testar isoladas ──
  /** frete que o vendedor banca pra oferecer "frete grátis", R$ por venda */
  freteSubsidiadoPorVenda?: number;
  /** cupom do vendedor (não o da plataforma), R$ por venda */
  cupomPorVenda?: number;
  /** investimento em mídia/ads como % da receita (ACOS) */
  midiaPct?: number;
  /** desconto sobre o preço anunciado, % — informativo (o "de/por"); o preço
   *  que entra no cálculo já é o promocional */
  descontoPct?: number;
  /** usados só quando marketplace === '' */
  comissaoPctManual?: number;
  taxaFixaManual?: number;
  precoAtual: number;
  /** volume mensal do produto — informado pelo vendedor */
  unidadesMes: number;
}

function ratesAt(base: PriceScenarioBaseline, preco: number): { comissaoPct: number; taxaFixa: number } {
  switch (base.marketplace) {
    case 'Shopee': {
      const r = getShopeeRates(preco);
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    case 'TiktokShop': {
      const r = getTiktokRates(preco);
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    case 'MercadoLivre': {
      const r = getMercadoLivreRates(preco, base.mlTipo ?? 'classico');
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    default:
      return { comissaoPct: base.comissaoPctManual ?? 0, taxaFixa: base.taxaFixaManual ?? 0 };
  }
}

function inputsAt(base: PriceScenarioBaseline, preco: number): PricingInputs {
  const { comissaoPct, taxaFixa } = ratesAt(base, preco);
  return {
    custo: base.custo + (base.custoExtraPorVenda ?? 0),
    custoVar: base.custoVar,
    taxaFixa,
    comissaoPct,
    impostoPct: base.impostoPct,
    afiliadosPct: base.afiliadosPct,
  };
}

// Despesas do item 15 que não passam pelo apurar (pra não mexer na fórmula
// validada do pricing.ts): frete subsidiado + cupom do vendedor (R$ fixos por
// venda) e mídia (% da receita, escala com o preço).
function despesasVendaExtras(base: PriceScenarioBaseline, preco: number): number {
  const frete = Math.max(0, base.freteSubsidiadoPorVenda ?? 0);
  const cupom = Math.max(0, base.cupomPorVenda ?? 0);
  const midia = preco * (Math.max(0, base.midiaPct ?? 0) / 100);
  return frete + cupom + midia;
}

export interface PriceScenarioPoint {
  preco: number;
  lucroUnit: number;
  margemPct: number;
  comissaoPct: number;
  taxaFixa: number;
  /** frete subsidiado + cupom + mídia nesse preço, R$ por venda (item 15) */
  extrasVendaReais: number;
  /** lucro total do mês mantendo o volume atual */
  lucroMesVolumeConstante: number;
  /** delta vs o lucro total de hoje, volume constante */
  deltaLucroVolumeConstante: number;
  /** unidades/mês nesse preço pra igualar o lucro total de hoje. null se lucroUnit ≤ 0 */
  volumeBreakEven: number | null;
  /** variação % de volume que o break-even exige vs hoje. null se inviável */
  deltaVolumePct: number | null;
  viavel: boolean;
}

export interface PriceScenario {
  baseline: PriceScenarioPoint;
  simulado: PriceScenarioPoint;
  lucroMesAtual: number;
  /** veredito curto pra UI */
  veredito: 'melhora' | 'plausivel' | 'dificil' | 'inviavel';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// lucro unitário num preço, já descontadas as despesas do item 15.
function lucroUnitAt(base: PriceScenarioBaseline, preco: number): number {
  return apurar(inputsAt(base, preco), preco).lucro - despesasVendaExtras(base, preco);
}

export function simulatePrice(base: PriceScenarioBaseline, novoPreco: number): PriceScenario {
  const lucroUnitAtual = lucroUnitAt(base, base.precoAtual);
  const lucroMesAtual = lucroUnitAtual * base.unidadesMes;

  const evalAt = (preco: number): PriceScenarioPoint => {
    const inputs = inputsAt(base, preco);
    const ap = apurar(inputs, preco);
    const extras = despesasVendaExtras(base, preco);
    const lucro = ap.lucro - extras;
    const margemPct = preco > 0 ? (lucro / preco) * 100 : 0;
    const viavel = lucro > 0;
    const volumeBreakEven = viavel && lucroMesAtual > 0 ? lucroMesAtual / lucro : null;
    const deltaVolumePct =
      volumeBreakEven != null && base.unidadesMes > 0
        ? ((volumeBreakEven - base.unidadesMes) / base.unidadesMes) * 100
        : null;
    return {
      preco: round2(preco),
      lucroUnit: round2(lucro),
      margemPct: round2(margemPct),
      comissaoPct: inputs.comissaoPct,
      taxaFixa: inputs.taxaFixa,
      extrasVendaReais: round2(extras),
      lucroMesVolumeConstante: round2(lucro * base.unidadesMes),
      deltaLucroVolumeConstante: round2(lucro * base.unidadesMes - lucroMesAtual),
      volumeBreakEven: volumeBreakEven != null ? Math.ceil(volumeBreakEven) : null,
      deltaVolumePct: deltaVolumePct != null ? round2(deltaVolumePct) : null,
      viavel,
    };
  };

  const simulado = evalAt(novoPreco);

  // deltaVolumePct: quanto o volume precisa MUDAR pra manter o lucro de hoje.
  //   subiu o preço → negativo (pode vender menos). desceu → positivo (precisa vender mais).
  const dv = simulado.deltaVolumePct ?? Infinity;
  let veredito: PriceScenario['veredito'];
  if (!simulado.viavel) veredito = 'inviavel';
  else if (simulado.deltaLucroVolumeConstante >= 0 && dv <= -5) veredito = 'melhora';   // dá folga de volume
  else if (dv <= 25) veredito = 'plausivel';                                            // precisa vender só um pouco mais
  else veredito = 'dificil';

  return { baseline: evalAt(base.precoAtual), simulado, lucroMesAtual: round2(lucroMesAtual), veredito };
}

export interface VolumeProjection {
  unidades: number;
  lucroMes: number;
  deltaVsHoje: number;
  /** o volume esperado cobre (ou passa) o break-even? */
  cobreBreakEven: boolean;
}

// Projeção com um volume que o vendedor ESPERA atingir no novo preço — a outra
// metade do modelo mental. O break-even diz "precisa de X"; isto diz "se você
// acha que consegue Y, o resultado é este".
export function projectVolume(
  base: PriceScenarioBaseline,
  novoPreco: number,
  unidadesEsperadas: number,
): VolumeProjection {
  const s = simulatePrice(base, novoPreco);
  const lucroMes = round2(s.simulado.lucroUnit * unidadesEsperadas);
  return {
    unidades: Math.round(unidadesEsperadas),
    lucroMes,
    deltaVsHoje: round2(lucroMes - s.lucroMesAtual),
    cobreBreakEven: s.simulado.volumeBreakEven != null && unidadesEsperadas >= s.simulado.volumeBreakEven,
  };
}

export interface PriceCurvePoint {
  preco: number;
  lucroMes: number;
  margemPct: number;
}

// Curva lucro-total × preço a VOLUME CONSTANTE. Mostra onde está o preço que
// maximiza o lucro se nada mais mudasse — quase sempre o vendedor está à
// esquerda desse pico (subprecificado).
export function priceCurve(
  base: PriceScenarioBaseline,
  opts: { minPct?: number; maxPct?: number; steps?: number } = {},
): PriceCurvePoint[] {
  const minPct = opts.minPct ?? 0.7;
  const maxPct = opts.maxPct ?? 1.35;
  const steps = opts.steps ?? 48;
  const lo = base.precoAtual * minPct;
  const hi = base.precoAtual * maxPct;
  const out: PriceCurvePoint[] = [];
  for (let k = 0; k <= steps; k++) {
    const preco = lo + ((hi - lo) * k) / steps;
    const lucro = lucroUnitAt(base, preco);
    out.push({
      preco: round2(preco),
      lucroMes: round2(lucro * base.unidadesMes),
      margemPct: round2(preco > 0 ? (lucro / preco) * 100 : 0),
    });
  }
  return out;
}
