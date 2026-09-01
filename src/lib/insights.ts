import type { DREData, DRECompanyTax } from './dre-calculations';
import type { ShopeeFinance } from './shopee-sync-status';
import { formatCurrency } from './format';

// Camada de insight — transforma os números que o app já calcula (DRE,
// finança Shopee) em recados acionáveis, rankeados. Puro e testável de
// propósito: nenhuma query, nenhum hook. Ver docs/DIAGNOSTICO-FINANCEIRO.md
// (não; ver o commit que introduziu isto) e src/components/insights/.
//
// Filosofia: fato antes de julgamento. Só emite "isso está errado" quando é
// inequívoco (prejuízo, margem de contribuição negativa, custo não cadastrado).
// O resto é fato decomposto ("a Shopee ficou com 34%: comissão X, frete Y").

export type InsightSeverity = 'critical' | 'warning' | 'info';

export interface Insight {
  /** estável — usado pra dedup e como key de render */
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  /** número em destaque, já formatado (ex.: "−R$ 1.240" ou "34%") */
  metric?: string;
  /** CTA opcional — rota interna */
  action?: { label: string; to: string };
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function rankInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

const pct0 = (n: number) => `${Math.round(n)}%`;

// ── DRE ──────────────────────────────────────────────────────────────────────

export function dreInsights(dre: DREData, company?: DRECompanyTax | null): Insight[] {
  const out: Insight[] = [];
  const receita = dre.receitaBrutaTotal;
  if (receita <= 0) return out;

  // Config: sem empresa / sem alíquota → a DRE não estima Simples/IRPJ
  if (company === undefined || company === null) {
    out.push({
      id: 'dre-empresa-nao-selecionada',
      severity: 'warning',
      title: 'Nenhuma empresa selecionada',
      detail: 'A DRE não estima Simples Nacional / IRPJ enquanto você não escolher a empresa no seletor acima.',
    });
  } else if (company.tax_rate === 0) {
    out.push({
      id: 'dre-empresa-sem-aliquota',
      severity: 'warning',
      title: 'A empresa está sem alíquota de imposto',
      detail: 'A DRE mostra imposto sobre vendas zerado. Ajuste em Empresas se ela recolhe Simples Nacional ou IRPJ/CSLL.',
    });
  }

  // Fechou no vermelho
  if (dre.lucroLiquido < 0) {
    out.push({
      id: 'dre-prejuizo',
      severity: 'critical',
      title: 'O resultado do período está negativo',
      detail: `Depois de taxas, custos e despesas, o resultado é ${formatCurrency(dre.lucroLiquido)} sobre ${formatCurrency(receita)} de receita bruta.`,
      metric: formatCurrency(dre.lucroLiquido),
      action: { label: 'Abrir a DRE', to: '/dre' },
    });
  }

  // Margem de contribuição negativa — cada venda tira dinheiro do bolso
  if (dre.margemContribuicao < 0) {
    out.push({
      id: 'dre-mc-negativa',
      severity: 'critical',
      title: 'Margem de contribuição negativa',
      detail: 'No agregado, cada venda custa mais do que traz — antes mesmo dos custos fixos. Revise preço de venda, comissões e custo do produto.',
      metric: formatCurrency(dre.margemContribuicao),
      action: { label: 'Ver custos variáveis', to: '/dre' },
    });
  } else if (dre.lucroOperacional < 0) {
    // Operação saudável, mas os custos fixos comem tudo
    out.push({
      id: 'dre-custos-fixos-altos',
      severity: 'warning',
      title: 'Custos fixos acima da margem de contribuição',
      detail: `A operação gera ${formatCurrency(dre.margemContribuicao)} de margem no período, mas os custos fixos prorrateados somam ${formatCurrency(dre.custosFixosProrrateados)}.`,
      metric: formatCurrency(dre.lucroOperacional),
      action: { label: 'Gerenciar custos fixos', to: '/fluxo-caixa' },
    });
  }

  // Custo do produto não cadastrado → todo lucro exibido está inflado
  if (dre.cogsTotal === 0) {
    out.push({
      id: 'dre-cogs-zero',
      severity: 'warning',
      title: 'Custo dos produtos não cadastrado',
      detail: 'Sem o custo unitário, o lucro que aparece nas telas ignora quanto você pagou pela mercadoria — o número real é menor.',
      action: { label: 'Cadastrar custos', to: '/precificacao/custos' },
    });
  }

  // Uma categoria de custo fixo pesando na margem
  const cats = Object.entries(dre.custosFixosPorCategoria);
  if (cats.length > 0 && dre.margemContribuicao > 0) {
    const [cat, valMensal] = [...cats].sort((a, b) => b[1] - a[1])[0];
    const valPeriodo = valMensal * (dre.diasPeriodo / 30);
    const share = (valPeriodo / dre.margemContribuicao) * 100;
    if (share >= 35) {
      out.push({
        id: 'dre-custo-fixo-pesado',
        severity: 'info',
        title: `"${cat}" consome ${pct0(share)} da sua margem`,
        detail: `Essa categoria de custo fixo é ${formatCurrency(valPeriodo)} dos ${formatCurrency(dre.margemContribuicao)} que a operação gera no período.`,
        metric: pct0(share),
      });
    }
  }

  // Nenhum custo fixo cadastrado → DRE incompleta
  if (dre.custosFixosTotal === 0) {
    out.push({
      id: 'dre-sem-custo-fixo',
      severity: 'info',
      title: 'Nenhum custo fixo cadastrado',
      detail: 'Aluguel, pró-labore, contador, ferramentas — sem eles a DRE mostra um lucro operacional maior do que o real.',
      action: { label: 'Cadastrar custos fixos', to: '/fluxo-caixa' },
    });
  }

  // Receita avulsa no fluxo de caixa pode ser dupla contagem
  if (dre.receitaBrutaExtra > 0 && receita - dre.receitaBrutaExtra > 0) {
    out.push({
      id: 'dre-receita-duplicada',
      severity: 'warning',
      title: 'Receita lançada à mão além das vendas dos marketplaces',
      detail: `${formatCurrency(dre.receitaBrutaExtra)} entraram pelo Fluxo de Caixa neste período. Confira se não é o mesmo repasse que a integração já contou — senão a receita dobra.`,
      action: { label: 'Revisar lançamentos', to: '/fluxo-caixa/lancamentos' },
    });
  }

  // Margem bruta apertada
  if (dre.margemBruta > 0 && dre.margemBruta < 15) {
    out.push({
      id: 'dre-margem-bruta-baixa',
      severity: 'info',
      title: `Margem bruta de ${pct0(dre.margemBruta)}`,
      detail: 'Sobra pouco depois do custo do produto e dos impostos sobre venda. Uma devolução ou alta de frete vira prejuízo rápido.',
      metric: pct0(dre.margemBruta),
    });
  }

  // Concentração de canal
  const porMp: [string, number][] = ([
    ['Shopee', dre.receitaBrutaShopee],
    ['TikTok Shop', dre.receitaBrutaTikTok],
    ['Mercado Livre', dre.receitaBrutaMercadoLivre],
  ] as [string, number][]).filter(([, v]) => v > 0);
  if (porMp.length > 1) {
    const totalMp = porMp.reduce((s, [, v]) => s + v, 0);
    const [topName, topVal] = [...porMp].sort((a, b) => b[1] - a[1])[0];
    const share = (topVal / totalMp) * 100;
    if (share >= 75) {
      out.push({
        id: 'dre-concentracao-canal',
        severity: 'info',
        title: `${pct0(share)} do faturamento vem do ${topName}`,
        detail: 'Depender de um canal só é risco de operação: mudança de regra ou suspensão de conta derruba a receita inteira.',
        metric: pct0(share),
      });
    }
  }

  return out;
}

// ── Finança Shopee (path de sincronização) ───────────────────────────────────

export function shopeeFinanceInsights(fin: ShopeeFinance, prev?: ShopeeFinance | null): Insight[] {
  const out: Insight[] = [];
  if (fin.faturamento <= 0) return out;

  // Taxa efetiva — o que a Shopee reteve, decomposto. Com período anterior,
  // sinaliza quando a mordida está crescendo (custo silencioso).
  const retido = fin.faturamento - fin.valorLiquido;
  if (retido > 0) {
    const share = (retido / fin.faturamento) * 100;
    const top3 = fin.feeBreakdown
      .filter(f => f.amount > 0)
      .slice(0, 3)
      .map(f => `${f.label} ${formatCurrency(f.amount)}`)
      .join(' · ');

    let deltaTxt = '';
    let subindo = false;
    if (prev && prev.faturamento > 0) {
      const prevShare = ((prev.faturamento - prev.valorLiquido) / prev.faturamento) * 100;
      const dpp = share - prevShare;
      if (Math.abs(dpp) >= 1) {
        deltaTxt = ` — ${dpp > 0 ? '+' : ''}${dpp.toFixed(0)} p.p. vs período anterior`;
        subindo = dpp >= 3;
      }
    }

    out.push({
      id: 'shopee-taxa-efetiva',
      severity: share >= 35 || subindo ? 'warning' : 'info',
      title: `A Shopee ficou com ${pct0(share)} do faturamento${deltaTxt}`,
      detail: `${formatCurrency(retido)} em taxas e descontos no período${top3 ? `: ${top3}` : ''}.`,
      metric: pct0(share),
    });
  }

  // Dinheiro que já é seu, mas ainda não caiu
  if (fin.pedidosSemRepasse > 0 && fin.aLiberar > 0) {
    out.push({
      id: 'shopee-a-liberar',
      severity: 'info',
      title: `${formatCurrency(fin.aLiberar)} ainda não repassados`,
      detail: `${fin.pedidosSemRepasse} pedido(s) concluído(s) sem repasse da Shopee — receita já reconhecida que ainda não virou caixa.`,
      metric: formatCurrency(fin.aLiberar),
    });
  }

  // Cancelamento alto
  const considerados = fin.pedidos + fin.cancelados;
  if (fin.cancelados >= 5 && considerados > 0) {
    const share = (fin.cancelados / considerados) * 100;
    if (share >= 15) {
      out.push({
        id: 'shopee-cancelamentos',
        severity: 'warning',
        title: `${pct0(share)} dos pedidos foram cancelados`,
        detail: `${fin.cancelados} cancelamento(s) no período. Taxa de cancelamento alta derruba o ranking de vendedor e pode gerar penalidade.`,
        metric: pct0(share),
      });
    }
  }

  return out;
}

// ── Composição ───────────────────────────────────────────────────────────────

export function buildInsights(input: {
  dre?: DREData | null;
  company?: DRECompanyTax | null;
  shopeeFinance?: ShopeeFinance | null;
  shopeeFinancePrev?: ShopeeFinance | null;
}): Insight[] {
  const all: Insight[] = [];
  if (input.dre) all.push(...dreInsights(input.dre, input.company));
  if (input.shopeeFinance) all.push(...shopeeFinanceInsights(input.shopeeFinance, input.shopeeFinancePrev));

  const seen = new Set<string>();
  const unique = all.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return rankInsights(unique);
}
