// Calculadora de Custo — Simulador, item 16 das diretrizes do dashboard.
//
// Resolve a pergunta INVERSA da Calculadora de Precificação: dado o preço de
// venda e a margem (ou o lucro) que você quer, quanto pode pagar no MÁXIMO pelo
// produto e ainda bater o alvo?
//
//   custoMaximo = preço·(1 − Σtaxas% − margemAlvo%) − custoVar − taxaFixa − outras
//
// Serve pra negociar com fornecedor e validar produto novo antes de comprar.
// Puro; reusa as tabelas de taxa por faixa do marketplace-fees.ts (mesma fonte
// da Calculadora e do Simulador de preço).

import {
  getShopeeRates, getTiktokRates, getMercadoLivreRates,
  type Marketplace, type MLTipoAnuncio,
} from './marketplace-fees';

export interface MaxCostInputs {
  /** '' = marketplace sem tabela de faixa → usa comissaoPctManual/taxaFixaManual */
  marketplace: Marketplace | '';
  mlTipo?: MLTipoAnuncio;
  /** preço de venda que o vendedor quer praticar, R$ */
  precoVenda: number;
  /** define qual alvo o cálculo persegue */
  modo: 'margem' | 'lucro';
  /** modo 'margem': margem desejada sobre o preço de venda, % */
  margemAlvoPct?: number;
  /** modo 'lucro': lucro-alvo em R$ por unidade */
  lucroAlvo?: number;
  /** custo variável por venda (embalagem/etiqueta), R$ — não escala com o preço */
  custoVar?: number;
  impostoPct?: number;
  afiliadosPct?: number;
  /** outras despesas por venda que não escalam com o preço (frete que você paga,
   *  mídia rateada por unidade), R$ */
  outrasDespesas?: number;
  /** comissão/taxa fixa usados só quando marketplace === '' */
  comissaoPctManual?: number;
  taxaFixaManual?: number;
  /** opcional: o custo que o fornecedor está pedindo — habilita o veredito */
  custoOfertado?: number;
}

export interface MaxCostResult {
  /** comissão da plataforma aplicada (%) — resolvida da tabela ou manual */
  comissaoPct: number;
  /** taxa fixa da plataforma (R$) */
  taxaFixa: number;
  /** Σ percentuais sobre o preço: comissão + imposto + afiliados, como fração 0–1+ */
  somaTaxasPct: number;
  comissaoVal: number;
  impostoVal: number;
  afiliadosVal: number;
  /** custos por venda que não escalam com o preço: custoVar + taxaFixa + outras */
  custosFixosVenda: number;
  /** o alvo de lucro, já convertido pra R$/un */
  lucroAlvoReais: number;
  /** RESPOSTA: custo máximo do produto pra bater o alvo, R$. Pode ser ≤ 0. */
  custoMaximo: number;
  /** o preço de venda comporta algum custo de produto positivo? */
  precoViavel: boolean;
  /** margem que sobraria com custo de produto = 0 — o teto teórico desse preço */
  margemTetoPct: number;
  /** análise contra o custo ofertado pelo fornecedor, se informado */
  comCustoOfertado: {
    custoOfertado: number;
    /** custoMaximo − custoOfertado. > 0 cabe no alvo, < 0 estoura */
    folga: number;
    lucro: number;
    margemPct: number;
    veredito: 'ok' | 'aperta' | 'estoura';
  } | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function ratesFor(i: MaxCostInputs): { comissaoPct: number; taxaFixa: number } {
  const p = i.precoVenda;
  switch (i.marketplace) {
    case 'Shopee': {
      const r = getShopeeRates(p);
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    case 'TiktokShop': {
      const r = getTiktokRates(p);
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    case 'MercadoLivre': {
      const r = getMercadoLivreRates(p, i.mlTipo ?? 'classico');
      return { comissaoPct: r.comissao, taxaFixa: r.taxaFixa };
    }
    default:
      return { comissaoPct: i.comissaoPctManual ?? 0, taxaFixa: i.taxaFixaManual ?? 0 };
  }
}

export function computeMaxCost(i: MaxCostInputs): MaxCostResult {
  const preco = Math.max(0, i.precoVenda);
  const impostoPct = i.impostoPct ?? 0;
  const afiliadosPct = i.afiliadosPct ?? 0;
  const custoVar = i.custoVar ?? 0;
  const outras = i.outrasDespesas ?? 0;

  const { comissaoPct, taxaFixa } = ratesFor(i);

  const somaTaxasPct = (comissaoPct + impostoPct + afiliadosPct) / 100;
  const comissaoVal = preco * (comissaoPct / 100);
  const impostoVal = preco * (impostoPct / 100);
  const afiliadosVal = preco * (afiliadosPct / 100);
  const custosFixosVenda = custoVar + taxaFixa + outras;

  const receitaLiquida = preco * (1 - somaTaxasPct) - custosFixosVenda;

  const lucroAlvoReais =
    i.modo === 'margem'
      ? preco * ((i.margemAlvoPct ?? 0) / 100)
      : (i.lucroAlvo ?? 0);

  const custoMaximo = receitaLiquida - lucroAlvoReais;
  const margemTetoPct = preco > 0 ? (receitaLiquida / preco) * 100 : 0;

  let comCustoOfertado: MaxCostResult['comCustoOfertado'] = null;
  if (i.custoOfertado != null && i.custoOfertado > 0) {
    const lucro = receitaLiquida - i.custoOfertado;
    const margemPct = preco > 0 ? (lucro / preco) * 100 : 0;
    const folga = custoMaximo - i.custoOfertado;
    const veredito: 'ok' | 'aperta' | 'estoura' =
      lucro <= 0 ? 'estoura' : folga >= 0 ? 'ok' : 'aperta';
    comCustoOfertado = {
      custoOfertado: round2(i.custoOfertado),
      folga: round2(folga),
      lucro: round2(lucro),
      margemPct: round2(margemPct),
      veredito,
    };
  }

  return {
    comissaoPct,
    taxaFixa: round2(taxaFixa),
    somaTaxasPct,
    comissaoVal: round2(comissaoVal),
    impostoVal: round2(impostoVal),
    afiliadosVal: round2(afiliadosVal),
    custosFixosVenda: round2(custosFixosVenda),
    lucroAlvoReais: round2(lucroAlvoReais),
    custoMaximo: round2(custoMaximo),
    precoViavel: custoMaximo > 0,
    margemTetoPct: round2(margemTetoPct),
    comCustoOfertado,
  };
}
