// Núcleo de cálculo da Calculadora de Precificação (Tela B).
//
// docs/DIAGNOSTICO-FINANCEIRO.md seção 3.1: a fórmula resolvida em "Por Margem" é
//   preço = custos_que_não_escalam / (1 − margem% − Σ taxas%)
// Essa fórmula está CORRETA e não deve ser alterada — este módulo só a isola do
// componente React pra ficar testável (critério de aceite da seção 10: "zero
// cálculo financeiro inline em componente React").
//
// Módulo puro, em reais (a padronização em centavos da seção 6 excluiu a
// Calculadora de propósito — tela protegida, fórmula validada).

export interface PricingInputs {
  /** custo do produto já somado aos custos adicionais, em R$ */
  custo: number;
  /** custo variável (embalagem/etiqueta), em R$ */
  custoVar: number;
  /** taxa fixa por venda, em R$ */
  taxaFixa: number;
  /** comissão da plataforma, em % */
  comissaoPct: number;
  /** imposto, em % */
  impostoPct: number;
  /** comissão de afiliados, em % */
  afiliadosPct: number;
}

/** Σ dos percentuais que incidem sobre o preço de venda, como fração (0–1+). */
export const somaTaxasPct = (i: PricingInputs): number =>
  (i.comissaoPct + i.impostoPct + i.afiliadosPct) / 100;

/** Custo unitário que NÃO escala com o preço: produto + variável + taxa fixa. */
export const custoFixoUnitario = (i: PricingInputs): number =>
  i.custo + i.custoVar + i.taxaFixa;

/**
 * Margem máxima teoricamente alcançável (%): o que sobra do preço depois das
 * taxas percentuais, antes de qualquer custo. Pedir margem ≥ isso faz o
 * denominador do "Por Margem" ir a zero/negativo — preço impossível (BUG-07).
 */
export const margemMaxViavelPct = (i: PricingInputs): number =>
  Math.max(0, (1 - somaTaxasPct(i)) * 100);

export interface PrecoSugerido {
  preco: number;
  /** true quando taxas + alvo tornam o preço impossível (denominador ≤ 0) */
  inviavel: boolean;
}

/** Preço que entrega a margem desejada (% sobre o preço de venda). */
export function precoPorMargem(i: PricingInputs, margemDesejadaPct: number): PrecoSugerido {
  const denom = 1 - somaTaxasPct(i) - margemDesejadaPct / 100;
  if (denom <= 0) return { preco: 0, inviavel: true };
  return { preco: custoFixoUnitario(i) / denom, inviavel: false };
}

/** Preço que entrega o lucro-alvo em R$ por venda. */
export function precoPorLucro(i: PricingInputs, lucroAlvo: number): PrecoSugerido {
  const denom = 1 - somaTaxasPct(i);
  if (denom <= 0) return { preco: 0, inviavel: true };
  return { preco: (custoFixoUnitario(i) + lucroAlvo) / denom, inviavel: false };
}

export interface Apuracao {
  precoCheio: number;
  comissaoVal: number;
  impostoVal: number;
  afiliadosVal: number;
  taxaFixaVal: number;
  /** custo total variável da venda (= "totalCustosVar" no componente) */
  custoTotal: number;
  lucro: number;
  margemPct: number;
}

/**
 * Apura o resultado real de um preço de venda já definido (modo "Por Preço", e a
 * base de verdade dos modos "Por Margem"/"Por Lucro" depois que o preço sugerido
 * vira o preço promocional).
 */
export function apurar(i: PricingInputs, preco: number, descontoPct = 0): Apuracao {
  const precoCheio = descontoPct > 0 ? preco / (1 - descontoPct / 100) : preco;
  const comissaoVal = preco * (i.comissaoPct / 100);
  const impostoVal = preco * (i.impostoPct / 100);
  const afiliadosVal = preco * (i.afiliadosPct / 100);
  const custoTotal =
    i.custo + i.custoVar + comissaoVal + i.taxaFixa + impostoVal + afiliadosVal;
  const lucro = preco - custoTotal;
  const margemPct = preco > 0 ? (lucro / preco) * 100 : 0;
  return {
    precoCheio,
    comissaoVal,
    impostoVal,
    afiliadosVal,
    taxaFixaVal: i.taxaFixa,
    custoTotal,
    lucro,
    margemPct,
  };
}

// ─── Anúncio salvo ───────────────────────────────────────────────────────────
// A apuração de um anúncio já cadastrado tem forma diferente da calculadora ao
// vivo: comissão + taxa fixa vêm juntas já em R$, existe o campo "antecipado" e
// não há desconto. Usada na tabela de anúncios e na média do portfólio.

export interface AnuncioApuravel {
  valorVenda: number;
  /** custo base do produto (kit já resolvido), em R$ */
  custo: number;
  /** custos adicionais já convertidos pra R$ */
  custosAdicionaisReais: number;
  custoVar: number;
  /** comissão + taxa fixa, já em R$ */
  comissaoTaxaReais: number;
  antecipado: number;
  afiliadosPct: number;
  impostoPct: number;
}

export function apurarAnuncio(a: AnuncioApuravel): {
  custoTotal: number;
  lucro: number;
  margemPct: number;
} {
  const impostoVal = a.valorVenda * (a.impostoPct / 100);
  const afiliadosVal = a.valorVenda * (a.afiliadosPct / 100);
  const custoTotal =
    a.custo + a.custosAdicionaisReais + a.custoVar + a.comissaoTaxaReais + a.antecipado + afiliadosVal + impostoVal;
  const lucro = a.valorVenda - custoTotal;
  const margemPct = a.valorVenda > 0 ? (lucro / a.valorVenda) * 100 : 0;
  return { custoTotal, lucro, margemPct };
}
