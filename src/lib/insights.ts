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

export function dreInsights(dre: DREData, company?: DRECompanyTax | null, prev?: DREData | null): Insight[] {
  const out: Insight[] = [];
  const receita = dre.receitaBrutaTotal;
  if (receita <= 0) return out;

  // ── Comparação com o período anterior (mesma duração) ──────────────────────
  if (prev && prev.receitaBrutaTotal > 0) {
    // Lucro líquido caindo forte
    if (prev.lucroLiquido > 0 && dre.lucroLiquido < prev.lucroLiquido * 0.8) {
      const queda = ((dre.lucroLiquido - prev.lucroLiquido) / prev.lucroLiquido) * 100;
      out.push({
        id: 'dre-lucro-caindo',
        severity: 'warning',
        title: `Lucro líquido caiu ${pct0(Math.abs(queda))} vs o período anterior`,
        detail: `Foi de ${formatCurrency(prev.lucroLiquido)} para ${formatCurrency(dre.lucroLiquido)}.`,
        metric: formatCurrency(dre.lucroLiquido - prev.lucroLiquido),
        action: { label: 'Comparar na DRE', to: '/dre' },
      });
    }
    // Margem líquida comprimindo
    const dMargem = dre.margemLiquida - prev.margemLiquida;
    if (dMargem <= -3 && prev.margemLiquida > 0) {
      out.push({
        id: 'dre-margem-comprimindo',
        severity: 'warning',
        title: `Margem líquida foi de ${pct0(prev.margemLiquida)} para ${pct0(dre.margemLiquida)}`,
        detail: 'Cada real vendido está sobrando menos. Confira se subiu custo de produto, taxa de marketplace ou ads.',
        metric: `${dMargem.toFixed(0)} p.p.`,
      });
    }
    // Custos fixos subindo
    if (prev.custosFixosTotal > 0 && dre.custosFixosTotal > prev.custosFixosTotal * 1.15) {
      out.push({
        id: 'dre-custo-fixo-subindo',
        severity: 'info',
        title: `Custos fixos subiram ${formatCurrency(dre.custosFixosTotal - prev.custosFixosTotal)}`,
        detail: `De ${formatCurrency(prev.custosFixosTotal)} para ${formatCurrency(dre.custosFixosTotal)} por mês.`,
        metric: formatCurrency(dre.custosFixosTotal - prev.custosFixosTotal),
      });
    }
  }

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

// ── Produtos (telas Resultados) ──────────────────────────────────────────────

// Forma mínima compartilhada por GroupedResult (calculations.ts) e
// TikTokGroupedResult (tiktok-calculations.ts) — os dois já têm estes campos.
export interface ProductLike {
  nome_produto: string;
  sku: string;
  total_faturado: number;
  custo_unitario_medio: number;
  lucro_reais: number;
  itens_vendidos: number;
}

export function productInsights(groups: ProductLike[]): Insight[] {
  const out: Insight[] = [];
  if (groups.length === 0) return out;

  const label = (p: ProductLike) => (p.sku && p.sku !== '-' ? p.sku : p.nome_produto).slice(0, 40);

  // Produtos no prejuízo — só os que têm custo cadastrado (senão o "prejuízo"
  // é só o custo faltando, coberto pelo insight de baixo).
  const prejuizo = groups
    .filter(p => p.lucro_reais < 0 && p.custo_unitario_medio > 0)
    .sort((a, b) => a.lucro_reais - b.lucro_reais);
  if (prejuizo.length > 0) {
    const totalPerda = prejuizo.reduce((s, p) => s + p.lucro_reais, 0);
    const piores = prejuizo.slice(0, 3).map(p => `${label(p)} (${formatCurrency(p.lucro_reais)})`).join(', ');
    out.push({
      id: 'produto-prejuizo',
      severity: 'critical',
      title: prejuizo.length === 1
        ? '1 produto deu prejuízo no período'
        : `${prejuizo.length} produtos deram prejuízo no período`,
      detail: `${piores}${prejuizo.length > 3 ? ` e mais ${prejuizo.length - 3}` : ''}. Preço de venda abaixo do custo mais as taxas.`,
      metric: formatCurrency(totalPerda),
      action: { label: 'Simular um novo preço', to: '/simulador' },
    });
  }

  // Vendidos sem custo cadastrado → lucro exibido está inflado
  const semCusto = groups.filter(p => p.custo_unitario_medio === 0 && p.itens_vendidos > 0);
  if (semCusto.length > 0) {
    out.push({
      id: 'produto-sem-custo',
      severity: 'warning',
      title: semCusto.length === 1
        ? '1 produto vendido sem custo cadastrado'
        : `${semCusto.length} produtos vendidos sem custo cadastrado`,
      detail: 'O lucro desses ignora o que você pagou pela mercadoria — o número real é menor. Edite o custo na tabela abaixo.',
      metric: String(semCusto.length),
    });
  }

  // Um SKU carregando o faturamento da tela
  const totalFat = groups.reduce((s, p) => s + p.total_faturado, 0);
  if (totalFat > 0 && groups.length > 2) {
    const top = [...groups].sort((a, b) => b.total_faturado - a.total_faturado)[0];
    const share = (top.total_faturado / totalFat) * 100;
    if (share >= 40) {
      out.push({
        id: 'produto-concentracao',
        severity: 'info',
        title: `"${label(top)}" é ${pct0(share)} do faturamento por produto no período`,
        detail: 'Um produto carregando a operação é risco: ruptura de estoque ou queda de demanda derruba o resultado.',
        metric: pct0(share),
      });
    }
  }

  return out;
}

// ── Composição ───────────────────────────────────────────────────────────────

export function buildInsights(input: {
  dre?: DREData | null;
  drePrev?: DREData | null;
  company?: DRECompanyTax | null;
  shopeeFinance?: ShopeeFinance | null;
  shopeeFinancePrev?: ShopeeFinance | null;
  products?: ProductLike[] | null;
}): Insight[] {
  const all: Insight[] = [];
  if (input.dre) all.push(...dreInsights(input.dre, input.company, input.drePrev));
  if (input.shopeeFinance) all.push(...shopeeFinanceInsights(input.shopeeFinance, input.shopeeFinancePrev));
  if (input.products && input.products.length > 0) all.push(...productInsights(input.products));

  const seen = new Set<string>();
  const unique = all.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return rankInsights(unique);
}
