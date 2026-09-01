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
  impostoPct: number;
  afiliadosPct: number;
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
    custo: base.custo,
    custoVar: base.custoVar,
    taxaFixa,
    comissaoPct,
    impostoPct: base.impostoPct,
    afiliadosPct: base.afiliadosPct,
  };
}

export interface PriceScenarioPoint {
  preco: number;
  lucroUnit: number;
  margemPct: number;
  comissaoPct: number;
  taxaFixa: number;
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

export function simulatePrice(base: PriceScenarioBaseline, novoPreco: number): PriceScenario {
  const lucroUnitAtual = apurar(inputsAt(base, base.precoAtual), base.precoAtual).lucro;
  const lucroMesAtual = lucroUnitAtual * base.unidadesMes;

  const evalAt = (preco: number): PriceScenarioPoint => {
    const inputs = inputsAt(base, preco);
    const ap = apurar(inputs, preco);
    const viavel = ap.lucro > 0;
    const volumeBreakEven = viavel && lucroMesAtual > 0 ? lucroMesAtual / ap.lucro : null;
    const deltaVolumePct =
      volumeBreakEven != null && base.unidadesMes > 0
        ? ((volumeBreakEven - base.unidadesMes) / base.unidadesMes) * 100
        : null;
    return {
      preco: round2(preco),
      lucroUnit: round2(ap.lucro),
      margemPct: round2(ap.margemPct),
      comissaoPct: inputs.comissaoPct,
      taxaFixa: inputs.taxaFixa,
      lucroMesVolumeConstante: round2(ap.lucro * base.unidadesMes),
      deltaLucroVolumeConstante: round2(ap.lucro * base.unidadesMes - lucroMesAtual),
      volumeBreakEven: volumeBreakEven != null ? Math.ceil(volumeBreakEven) : null,
      deltaVolumePct: deltaVolumePct != null ? round2(deltaVolumePct) : null,
      viavel,
    };
  };

  const simulado = evalAt(novoPreco);

  let veredito: PriceScenario['veredito'];
  if (!simulado.viavel) veredito = 'inviavel';
  else if (simulado.deltaLucroVolumeConstante >= 0) veredito = 'melhora';        // mesmo volume, lucro sobe
  else if ((simulado.deltaVolumePct ?? Infinity) <= 25) veredito = 'plausivel';   // precisa vender só um pouco mais
  else veredito = 'dificil';

  return { baseline: evalAt(base.precoAtual), simulado, lucroMesAtual: round2(lucroMesAtual), veredito };
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
  const minPct = opts.minPct ?? 0.6;
  const maxPct = opts.maxPct ?? 1.5;
  const steps = opts.steps ?? 48;
  const lo = base.precoAtual * minPct;
  const hi = base.precoAtual * maxPct;
  const out: PriceCurvePoint[] = [];
  for (let k = 0; k <= steps; k++) {
    const preco = lo + ((hi - lo) * k) / steps;
    const ap = apurar(inputsAt(base, preco), preco);
    out.push({
      preco: round2(preco),
      lucroMes: round2(ap.lucro * base.unidadesMes),
      margemPct: round2(ap.margemPct),
    });
  }
  return out;
}
