// Meta do mês — a versão pra-frente da operação inteira (o Simulador é por
// produto). Duas perguntas: (1) quanto preciso faturar este mês pra cobrir os
// custos fixos + ter X% de margem? (2) no ritmo atual, onde o mês fecha?
//
// Puro; alimentado pelo DRE do mês corrente (custos fixos, % de margem de
// contribuição, faturamento até agora).

export interface GoalInputs {
  /** custos fixos do mês, mensal (não prorrateado) */
  custosFixosMes: number;
  /** % de margem de contribuição sobre a receita — quanto de cada R$ sobra
   *  depois dos custos variáveis (comissão, frete, imposto, COGS...) */
  margemContribuicaoPct: number;
  /** faturamento acumulado do mês até hoje */
  faturamentoAteAgora: number;
  /** dia do mês hoje (1..31) */
  diaDoMes: number;
  /** total de dias no mês */
  diasNoMes: number;
}

export type GoalVeredito = 'meta' | 'breakeven' | 'aperto' | 'vermelho';

export interface GoalResult {
  /** faturamento do mês que zera o resultado (cobre exatamente os custos fixos) */
  faturamentoBreakEven: number;
  /** faturamento do mês pra ter a margem alvo. null se a margem de contribuição
   *  não comporta esse alvo (denominador ≤ 0) */
  faturamentoMeta: number | null;
  /** projeção linear do faturamento no fim do mês, no ritmo atual */
  projecaoFimDoMes: number;
  /** lucro projetado no fim do mês (proj × mc% − custos fixos) */
  lucroProjetado: number;
  /** quanto ainda falta faturar até o fim do mês pra bater cada alvo */
  faltaBreakEven: number;
  faltaMeta: number | null;
  /** ritmo de faturamento por dia — atual e o necessário pra bater a meta */
  ritmoDiarioAtual: number;
  ritmoDiarioNecessarioMeta: number | null;
  diasRestantes: number;
  veredito: GoalVeredito;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Meta em R$ (item 8 das diretrizes) ─────────────────────────────────────
// O vendedor define uma meta de faturamento do mês em reais; aqui respondemos
// quanto já foi, quanto falta, e se o ritmo atual leva lá. É a forma direta —
// `computeGoal` acima parte de uma % de margem alvo.

export interface RevenueGoalInputs {
  /** meta de faturamento bruto do mês, em R$ */
  metaFaturamentoMes: number;
  /** faturamento bruto acumulado do mês até hoje */
  faturamentoAteAgora: number;
  /** dia do mês hoje (1..31) */
  diaDoMes: number;
  /** total de dias no mês */
  diasNoMes: number;
  /** custos fixos mensais — só pro lucro projetado */
  custosFixosMes: number;
  /** % de margem de contribuição — só pro lucro projetado */
  margemContribuicaoPct: number;
}

export type RevenueGoalVeredito = 'batida' | 'no_ritmo' | 'aperto' | 'longe';

export interface RevenueGoalResult {
  pctRealizado: number;           // faturado / meta, em % (pode passar de 100)
  pctRestante: number;            // 100 − pctRealizado, travado em [0, 100]
  faltaMeta: number;              // R$ que ainda falta (≥ 0)
  projecaoFimDoMes: number;       // ritmo atual × dias no mês
  ritmoDiarioAtual: number;
  ritmoDiarioNecessario: number | null; // pra bater no que falta do mês; null se já bateu
  diasRestantes: number;
  lucroProjetado: number;
  veredito: RevenueGoalVeredito;
}

export function computeRevenueGoal(i: RevenueGoalInputs): RevenueGoalResult {
  const dia = Math.min(Math.max(1, i.diaDoMes), i.diasNoMes);
  const diasRestantes = Math.max(0, i.diasNoMes - dia);
  const meta = Math.max(0, i.metaFaturamentoMes);

  const pctRealizado = meta > 0 ? (i.faturamentoAteAgora / meta) * 100 : 0;
  const pctRestante = Math.min(100, Math.max(0, 100 - pctRealizado));
  const faltaMeta = Math.max(0, meta - i.faturamentoAteAgora);

  const ritmoDiarioAtual = i.faturamentoAteAgora / dia;
  const projecaoFimDoMes = ritmoDiarioAtual * i.diasNoMes;
  const ritmoDiarioNecessario = faltaMeta > 0 && diasRestantes > 0 ? faltaMeta / diasRestantes : null;

  const mc = i.margemContribuicaoPct / 100;
  const lucroProjetado = projecaoFimDoMes * mc - i.custosFixosMes;

  let veredito: RevenueGoalVeredito;
  if (i.faturamentoAteAgora >= meta && meta > 0) veredito = 'batida';
  else if (meta > 0 && projecaoFimDoMes >= meta) veredito = 'no_ritmo';
  else if (meta > 0 && projecaoFimDoMes >= meta * 0.9) veredito = 'aperto';
  else veredito = 'longe';

  return {
    pctRealizado: round2(pctRealizado),
    pctRestante: round2(pctRestante),
    faltaMeta: round2(faltaMeta),
    projecaoFimDoMes: round2(projecaoFimDoMes),
    ritmoDiarioAtual: round2(ritmoDiarioAtual),
    ritmoDiarioNecessario: ritmoDiarioNecessario != null ? round2(ritmoDiarioNecessario) : null,
    diasRestantes,
    lucroProjetado: round2(lucroProjetado),
    veredito,
  };
}

export function computeGoal(i: GoalInputs, alvoMargemPct: number): GoalResult {
  const mc = i.margemContribuicaoPct / 100;
  const dia = Math.min(Math.max(1, i.diaDoMes), i.diasNoMes);
  const diasRestantes = Math.max(0, i.diasNoMes - dia);

  const faturamentoBreakEven = mc > 0 ? i.custosFixosMes / mc : Infinity;
  const denomMeta = mc - alvoMargemPct / 100;
  const faturamentoMeta = denomMeta > 0 ? i.custosFixosMes / denomMeta : null;

  const ritmoDiarioAtual = i.faturamentoAteAgora / dia;
  const projecaoFimDoMes = ritmoDiarioAtual * i.diasNoMes;
  const lucroProjetado = projecaoFimDoMes * mc - i.custosFixosMes;

  const faltaBreakEven = Math.max(0, faturamentoBreakEven - i.faturamentoAteAgora);
  const faltaMeta = faturamentoMeta != null ? Math.max(0, faturamentoMeta - i.faturamentoAteAgora) : null;
  const ritmoDiarioNecessarioMeta =
    faturamentoMeta != null && diasRestantes > 0 ? (faltaMeta ?? 0) / diasRestantes : null;

  let veredito: GoalVeredito;
  if (faturamentoMeta != null && projecaoFimDoMes >= faturamentoMeta) veredito = 'meta';
  else if (projecaoFimDoMes >= faturamentoBreakEven * 1.05) veredito = 'breakeven';
  else if (projecaoFimDoMes >= faturamentoBreakEven * 0.95) veredito = 'aperto';
  else veredito = 'vermelho';

  return {
    faturamentoBreakEven: round2(faturamentoBreakEven),
    faturamentoMeta: faturamentoMeta != null ? round2(faturamentoMeta) : null,
    projecaoFimDoMes: round2(projecaoFimDoMes),
    lucroProjetado: round2(lucroProjetado),
    faltaBreakEven: round2(faltaBreakEven),
    faltaMeta: faltaMeta != null ? round2(faltaMeta) : null,
    ritmoDiarioAtual: round2(ritmoDiarioAtual),
    ritmoDiarioNecessarioMeta: ritmoDiarioNecessarioMeta != null ? round2(ritmoDiarioNecessarioMeta) : null,
    diasRestantes,
    veredito,
  };
}
