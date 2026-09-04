// Antecipação inteligente — "vale a pena antecipar, e quanto?"
//
// Os marketplaces empurram "antecipe tudo!" com uma taxa por dia antecipado.
// Ninguém calcula o valor MÍNIMO pra cobrir um buraco de caixa real. Aqui a
// entrada é o resultado da Previsão de Caixa (cashflow-forecast.ts) — o gap no
// pior dia da janela — e a saída é um plano: quais recebíveis CONFIRMADOS
// antecipar (o mais barato primeiro — menos dias, menos taxa), quanto custa,
// e se cobre o buraco. Antecipação parcial de um recebível é permitida, pra
// não sugerir antecipar R$500 quando faltam R$50.
//
// Puro. Trabalha em CENTAVOS (mesma convenção de cashflow-forecast.ts) — é
// uma extensão dela, não da família fee-detail/repasse-audit (essas são R$).

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { ForecastDay } from './cashflow-forecast';

export interface AntecipacaoCandidato {
  /** data em que o recebível cairia sem antecipar (YYYY-MM-DD) */
  dateIso: string;
  amountCents: number;
  source: string;
}

export interface AntecipacaoRates {
  /** taxa cobrada por dia antecipado, em % (ex.: 0,15 = 0,15% ao dia) */
  taxaDiariaPct: number;
}

export interface AntecipacaoItem {
  dateIso: string;
  source: string;
  diasAntecipados: number;
  /** fração do recebível original usada (1 = inteiro, <1 = antecipação parcial) */
  fracaoUsada: number;
  valorBrutoCents: number;
  custoCents: number;
  valorLiquidoCents: number;
}

export interface AntecipacaoPlano {
  /** false quando o gap já é ≤ 0 — não tem o que cobrir */
  necessario: boolean;
  gapCents: number;
  /** do mais barato (menos dias) pro mais caro — só entram enquanto não cobre o gap */
  itens: AntecipacaoItem[];
  totalBrutoCents: number;
  totalCustoCents: number;
  totalLiquidoCents: number;
  /** true = o líquido antecipado cobre o gap inteiro */
  cobre: boolean;
  /** custo / bruto do plano inteiro, em % */
  taxaMediaEfetivaPct: number;
}

export function planejarAntecipacao(
  gapCents: number,
  hojeIso: string,
  candidatos: AntecipacaoCandidato[],
  rates: AntecipacaoRates,
): AntecipacaoPlano {
  if (gapCents <= 0) {
    return {
      necessario: false, gapCents: 0, itens: [],
      totalBrutoCents: 0, totalCustoCents: 0, totalLiquidoCents: 0,
      cobre: true, taxaMediaEfetivaPct: 0,
    };
  }

  const hoje = parseISO(hojeIso);
  // mais perto primeiro = menos dias antecipados = mais barato
  const ordenados = [...candidatos]
    .filter(c => c.amountCents > 0 && c.dateIso > hojeIso)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const itens: AntecipacaoItem[] = [];
  let liquidoAcumulado = 0;

  for (const c of ordenados) {
    if (liquidoAcumulado >= gapCents) break;

    const dias = Math.max(1, differenceInCalendarDays(parseISO(c.dateIso), hoje));
    const taxaPct = rates.taxaDiariaPct * dias;
    const fatorLiquido = Math.max(0, 1 - taxaPct / 100);
    if (fatorLiquido <= 0) continue; // taxa comeria o recebível inteiro — não vale

    const restante = gapCents - liquidoAcumulado;
    const liquidoMaximoDoItem = c.amountCents * fatorLiquido;
    const liquidoUsar = Math.min(restante, liquidoMaximoDoItem);
    const brutoUsar = Math.min(c.amountCents, Math.round(liquidoUsar / fatorLiquido));
    const custoCents = Math.round(brutoUsar * (taxaPct / 100));
    const valorLiquidoCents = brutoUsar - custoCents;

    itens.push({
      dateIso: c.dateIso,
      source: c.source,
      diasAntecipados: dias,
      fracaoUsada: c.amountCents > 0 ? brutoUsar / c.amountCents : 0,
      valorBrutoCents: brutoUsar,
      custoCents,
      valorLiquidoCents,
    });
    liquidoAcumulado += valorLiquidoCents;
  }

  const totalBrutoCents = itens.reduce((s, i) => s + i.valorBrutoCents, 0);
  const totalCustoCents = itens.reduce((s, i) => s + i.custoCents, 0);
  const totalLiquidoCents = itens.reduce((s, i) => s + i.valorLiquidoCents, 0);

  return {
    necessario: true,
    gapCents,
    itens,
    totalBrutoCents,
    totalCustoCents,
    totalLiquidoCents,
    cobre: totalLiquidoCents >= gapCents - 1, // tolerância de 1 centavo de arredondamento
    taxaMediaEfetivaPct: totalBrutoCents > 0 ? (totalCustoCents / totalBrutoCents) * 100 : 0,
  };
}

/**
 * Se você não antecipar nada, em quantos dias (a partir do pior dia da
 * janela) o saldo conservador volta a ficar ≥ 0 sozinho? null = não recupera
 * dentro do horizonte já calculado.
 */
export function diasParaRecuperar(dias: ForecastDay[], apartirDeOffset: number): number | null {
  const recuperado = dias.find(d => d.offset > apartirDeOffset && d.saldoCents >= 0);
  return recuperado ? recuperado.offset - apartirDeOffset : null;
}
