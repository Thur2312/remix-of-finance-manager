import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { hasActivePlanAccess } from '../_shared/plan-guard.ts';
import { computeForecast } from '../_shared/finance/cashflow-forecast.ts';
import { buildReplenishmentPlan, type ReplenishmentSku } from '../_shared/finance/replenishment.ts';

const assistantSchema = z.object({
  pergunta: z.string().min(1).max(1000),
});

// Finn 2.0 (Aposta F) — antes: despejava um JSON fixo de 60 dias no prompt toda
// mensagem, sem enxergar previsão de caixa nem reposição. Agora: loop de
// function-calling. O modelo tem ferramentas e puxa só o que a pergunta pede;
// as contas pesadas rodam nas libs puras (cópias em _shared/finance), não no
// modelo. Continua no Gemini (tier gratuito).

const systemPrompt = `Você é o Finn, assistente financeiro do Seller Finance — plataforma de gestão pra vendedores de marketplace no Brasil (Shopee, TikTok Shop, Mercado Livre).

COMO RESPONDER
- Direto e curto. O vendedor quer resposta rápida.
- Use SEMPRE as ferramentas pra buscar número real. Nunca invente valor.
- Escolha a ferramenta pela pergunta: "como estou / quanto faturei / que produto rende" → resumo_financeiro; "quando o caixa aperta / tenho como pagar" → previsao_caixa; "o que pedir / vou ficar sem estoque" → plano_reposicao. Pode chamar mais de uma.
- Valores em R$ (ex.: R$ 1.234). Português do Brasil, natural. No máximo um emoji.
- Se a ferramenta disser que falta um dado, explique em linguagem simples o que o vendedor precisa fazer — nunca cite nome de tabela/coluna.
- Se a pergunta não for sobre o negócio, redirecione com gentileza.

MAPA DA PLATAFORMA (só cite estas seções ao orientar)
Dashboard · Meta do mês · Previsão de caixa · Reposição de estoque · Vendas · Gestão · Fluxo de Caixa · Precificação · Custos Fixos · DRE · Simulador · Integrações · Planos`;

// ─── Ferramentas ─────────────────────────────────────────────────────────────

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'resumo_financeiro',
      description: 'Resultado dos últimos 60 dias: faturamento, taxas do marketplace, margem, pedidos por status, os produtos que mais faturam e os anúncios cadastrados. Use pra "como estou indo", "quanto faturei", "qual produto rende mais".',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'previsao_caixa',
      description: 'Projeta o saldo em conta pelos próximos 30 dias contando só o dinheiro garantido (saldo confirmado + recebíveis do Mercado Livre com data + contas lançadas + pedidos ao fornecedor). Diz o primeiro dia em que fica negativo. Use pra "quando o caixa aperta", "tenho como pagar X".',
      parameters: { type: 'object', properties: {} },
    },
    {
      name: 'plano_reposicao',
      description: 'Quais SKUs estão no ponto de reposição, quanto pedir de cada um, o custo total e o quanto disso cabe no caixa projetado. Use pra "o que preciso comprar", "vou ficar sem estoque de quê".',
      parameters: { type: 'object', properties: {} },
    },
  ],
}];

const brl = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDaysIso = (iso: string, n: number) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const centsOf = (reais: unknown, cents: unknown) => {
  const c = Number(cents);
  if (Number.isFinite(c) && c !== 0) return Math.round(c);
  return Math.round((Number(reais) || 0) * 100);
};
const EXCLUIDOS = ['cancel', 'nao pago', 'unpaid', 'devolu', 'reembols', 'refund', 'return'];
const statusExcluido = (s: string | null | undefined) =>
  !!s && EXCLUIDOS.some((k) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(k));
const skuKey = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[\s\-_./\\]+/g, '');

// ── previsao_caixa ──────────────────────────────────────────────────────────
async function toolPrevisaoCaixa(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: settings } = await supabase
    .from('cash_flow_settings').select('opening_balance_cents, opening_balance_date')
    .eq('user_id', userId).maybeSingle();

  const hoje = isoDay(new Date());
  const horizonte = 30;
  const limite = addDaysIso(hoje, horizonte);

  const { data: conns } = await supabase
    .from('integration_connections').select('id')
    .eq('user_id', userId).eq('provider', 'mercadolivre').eq('status', 'connected');
  const mlIds = (conns ?? []).map((c) => c.id);

  const receivables: { dateIso: string; amountCents: number; source: 'ml' }[] = [];
  if (mlIds.length) {
    const { data: recs } = await supabase
      .from('payments').select('net_amount, net_amount_cents, release_date')
      .in('integration_id', mlIds).not('release_date', 'is', null)
      .gte('release_date', hoje).lte('release_date', limite);
    for (const p of recs ?? []) {
      const c = Math.max(0, centsOf(p.net_amount, p.net_amount_cents));
      if (c > 0) receivables.push({ dateIso: String(p.release_date).slice(0, 10), amountCents: c, source: 'ml' });
    }
  }

  const { data: entries } = await supabase
    .from('cash_flow_entries')
    .select('type, status, amount, amount_cents, date, due_date')
    .eq('user_id', userId);
  const payables: { dateIso: string; amountCents: number; label: string }[] = [];
  for (const e of entries ?? []) {
    const venc = (e.due_date ?? e.date ?? '').slice(0, 10);
    if (!venc || venc > limite) continue;
    if (e.type === 'income' && e.status === 'pending') {
      receivables.push({ dateIso: venc < hoje ? hoje : venc, amountCents: Math.max(0, centsOf(e.amount, e.amount_cents)), source: 'ml' });
    } else if (e.type === 'expense' && e.status !== 'paid') {
      payables.push({ dateIso: venc < hoje ? hoje : venc, amountCents: Math.max(0, centsOf(e.amount, e.amount_cents)), label: e.description ?? 'Conta' });
    }
  }

  const { data: pos } = await supabase
    .from('purchase_orders').select('sku, item_name, qty_units, unit_cost_cents, expected_at, payment_due_at')
    .eq('user_id', userId).is('received_at', null);
  for (const p of pos ?? []) {
    const venc = (p.payment_due_at ?? p.expected_at ?? '').slice(0, 10);
    const c = Math.round((Number(p.qty_units) || 0) * (Number(p.unit_cost_cents) || 0));
    if (venc && venc <= limite && c > 0) {
      payables.push({ dateIso: venc < hoje ? hoje : venc, amountCents: c, label: `Fornecedor · ${p.item_name || p.sku}` });
    }
  }

  const suggested = suggestedOpeningFromEntries(entries ?? [], hoje);
  const openingBalanceCents = settings ? Number(settings.opening_balance_cents) : suggested;

  const r = computeForecast({
    openingBalanceCents, todayIso: hoje, horizonDays: horizonte,
    receivables, payables, ritmoLiquidoDiaCents: 0, tendenciaComecaEmDias: horizonte,
  });

  return {
    saldo_inicial: brl(openingBalanceCents),
    saldo_inicial_confirmado: !!settings,
    primeiro_dia_negativo: r.primeiroNegativo
      ? { data: r.primeiroNegativo.dateIso, dias_a_frente: r.primeiroNegativo.offset, saldo: brl(r.primeiroNegativo.saldoCents) }
      : null,
    pior_saldo: { data: r.saldoMinimo.dateIso, saldo: brl(r.saldoMinimo.saldoCents) },
    entra_garantido_30d: brl(r.totalEntradasCents),
    sai_30d: brl(r.totalSaidasCents),
    saldo_em_30d: brl(r.saldoFinalCents),
    aviso: settings ? null : 'O vendedor não confirmou o saldo real da conta na Previsão de caixa, então o ponto de partida é uma estimativa pelo Fluxo de Caixa. Sugira confirmar pra ficar preciso.',
    so_mercado_livre: 'Recebíveis de Shopee/TikTok não entram nesta projeção do Finn — para o quadro completo, a tela Previsão de caixa.',
  };
}

function suggestedOpeningFromEntries(entries: Record<string, unknown>[], hoje: string): number {
  let acc = 0;
  for (const e of entries) {
    const d = String(e.date ?? '').slice(0, 10);
    if (d && d <= hoje && (e.status === 'received' || e.status === 'paid')) {
      const c = Math.max(0, centsOf(e.amount, e.amount_cents));
      acc += e.type === 'income' ? c : -c;
    }
  }
  return acc;
}

// ── plano_reposicao ────────────────────────────────────────────────────────
async function toolPlanoReposicao(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: conns } = await supabase.from('integration_connections').select('id').eq('user_id', userId);
  const connIds = (conns ?? []).map((c) => c.id);
  const desde = addDaysIso(isoDay(new Date()), -60);

  const [shopeeRes, mlRes, tiktokRes, costRes, invRes, stockRes, poRes] = await Promise.all([
    connIds.length
      ? supabase.from('orders').select('status, order_created_at, order_items(sku, quantity, total_price_cents)').in('integration_id', connIds).gte('order_created_at', desde)
      : Promise.resolve({ data: [] }),
    supabase.from('ml_orders').select('sku, nome_produto, quantidade, total_faturado_cents, taxa_ml_cents, frete_ml_cents, custo_unitario_cents, status_pedido, data_pedido').eq('user_id', userId).gte('data_pedido', desde),
    supabase.from('tiktok_orders').select('sku, nome_produto, quantidade, total_faturado_cents, custo_unitario_cents, status_pedido, data_pedido').eq('user_id', userId).gte('data_pedido', desde),
    supabase.from('product_costs').select('sku, cost, packaging_cost, other_costs').eq('user_id', userId),
    supabase.from('inventory_settings').select('sku, item_name, stock_units, stock_updated_at, lead_time_days, safety_days, moq_units').eq('user_id', userId),
    supabase.from('product_stock').select('sku, item_name, stock_units, synced_at').eq('user_id', userId),
    supabase.from('purchase_orders').select('sku, qty_units').eq('user_id', userId).is('received_at', null),
  ]);

  interface Acc { sku: string; nome: string; units: number; grossCents: number; netCents: number; mpCostSum: number; mpCostUnits: number }
  const acc = new Map<string, Acc>();
  const bump = (rawSku: string | null | undefined, nome: string | null | undefined, units: number, gross: number, net: number, mpCost?: number) => {
    const key = skuKey(rawSku);
    if (!key || units <= 0) return;
    const cur = acc.get(key) ?? { sku: (rawSku ?? '').trim(), nome: (nome ?? rawSku ?? '').trim(), units: 0, grossCents: 0, netCents: 0, mpCostSum: 0, mpCostUnits: 0 };
    cur.units += units; cur.grossCents += Math.max(0, gross); cur.netCents += Math.max(0, net);
    if (mpCost && mpCost > 0) { cur.mpCostSum += mpCost * units; cur.mpCostUnits += units; }
    acc.set(key, cur);
  };
  for (const o of (shopeeRes.data as { status: string | null; order_items?: { sku: string | null; quantity: number | null; total_price_cents: number | null }[] }[]) ?? []) {
    if (statusExcluido(o.status)) continue;
    for (const it of o.order_items ?? []) {
      const g = Math.round(Number(it.total_price_cents) || 0);
      bump(it.sku, it.sku, Number(it.quantity) || 0, g, Math.round(g * 0.82));
    }
  }
  for (const r of mlRes.data ?? []) {
    if (statusExcluido(r.status_pedido)) continue;
    const g = Math.round(Number(r.total_faturado_cents) || 0);
    const net = Math.max(0, g - Math.round(Number(r.taxa_ml_cents) || 0) - Math.round(Number(r.frete_ml_cents) || 0));
    bump(r.sku, r.nome_produto, Number(r.quantidade) || 0, g, net, Math.round(Number(r.custo_unitario_cents) || 0));
  }
  for (const r of tiktokRes.data ?? []) {
    if (statusExcluido(r.status_pedido)) continue;
    const g = Math.round(Number(r.total_faturado_cents) || 0);
    bump(r.sku, r.nome_produto, Number(r.quantidade) || 0, g, Math.round(g * 0.85), Math.round(Number(r.custo_unitario_cents) || 0));
  }
  if (acc.size === 0) return { aviso: 'Sem histórico de vendas por SKU nos últimos 60 dias. O vendedor precisa sincronizar um marketplace.' };

  const costByKey = new Map<string, number>();
  for (const c of costRes.data ?? []) {
    const k = skuKey(c.sku);
    if (k && !costByKey.has(k)) costByKey.set(k, Math.round(((Number(c.cost) || 0) + (Number(c.packaging_cost) || 0) + (Number(c.other_costs) || 0)) * 100));
  }
  const invByKey = new Map((invRes.data ?? []).map((r) => [skuKey(r.sku), r]));
  const stockByKey = new Map((stockRes.data ?? []).map((r) => [skuKey(r.sku), r]));
  const transitByKey = new Map<string, number>();
  for (const p of poRes.data ?? []) { const k = skuKey(p.sku); transitByKey.set(k, (transitByKey.get(k) ?? 0) + (Number(p.qty_units) || 0)); }

  const skus: ReplenishmentSku[] = [];
  for (const [key, a] of acc) {
    const settings = invByKey.get(key);
    const synced = stockByKey.get(key);
    const manualAt = settings?.stock_updated_at ? new Date(settings.stock_updated_at).getTime() : 0;
    const syncedAt = synced?.synced_at ? new Date(synced.synced_at).getTime() : 0;
    const temManual = manualAt > 0 && settings?.stock_units != null;
    const usaSync = !!synced && (!temManual || syncedAt >= manualAt);
    const stock = usaSync ? Number(synced!.stock_units) || 0 : Number(settings?.stock_units) || 0;
    const cadastrado = costByKey.get(key);
    const mpCost = a.mpCostUnits > 0 ? Math.round(a.mpCostSum / a.mpCostUnits) : null;
    const landed = cadastrado ?? mpCost;
    const netUnit = a.units > 0 ? Math.round(a.netCents / a.units) : 0;
    skus.push({
      sku: (a.sku || key).toUpperCase(), itemName: settings?.item_name || a.nome || key,
      unitsSold: a.units, windowDays: 60, daysOutOfStock: 0,
      contributionMarginCents: landed == null ? null : netUnit - landed,
      purchaseUnitCostCents: landed,
      stockUnits: stock, stockSource: usaSync ? 'sync' : temManual ? 'manual' : 'nenhum',
      stockUpdatedDaysAgo: 0,
      inTransitUnits: transitByKey.get(key) ?? 0,
      leadTimeDays: Number(settings?.lead_time_days) || 14,
      safetyDays: Number(settings?.safety_days) || 7,
      moqUnits: settings?.moq_units ?? null,
    });
  }

  const plan = buildReplenishmentPlan(skus, { todayIso: isoDay(new Date()), reviewCycleDays: 14, stockStaleDays: 10, minWindowDays: 7 });
  const pedir = plan.pedidos.slice(0, 12).map((r) => ({
    produto: r.itemName, urgencia: r.urgencia,
    cobertura_dias: Number.isFinite(r.coberturaDias) ? Math.round(r.coberturaDias) : null,
    ruptura: r.rupturaIso, pedir_unidades: r.sugestaoUnidades,
    custo: r.custoCompraCents == null ? 'custo não cadastrado' : brl(r.custoCompraCents),
  }));

  return {
    skus_no_ponto_de_reposicao: plan.pedidos.length,
    custo_total: brl(plan.custoTotalCents),
    pedidos_sem_custo_cadastrado: plan.pedidosSemCusto.length,
    lista: pedir,
    aviso: skus.every((s) => s.stockSource === 'nenhum')
      ? 'Nenhum SKU tem estoque informado (nem sincronizado nem digitado), então a cobertura assume estoque 0. Sugira sincronizar ou informar o estoque na tela Reposição de estoque.'
      : null,
  };
}

// ─── Dados p/ resumo_financeiro (mantido do Finn 1.0, enxugado) ──────────────
async function buscarResumoFinanceiro(supabase: ReturnType<typeof createClient>, userId: string) {
  const hoje = new Date();
  const dataInicio = addDaysIso(isoDay(hoje), -60);

  const { data: integracoes } = await supabase
    .from('integration_connections').select('id, provider, shop_name, status')
    .eq('user_id', userId).eq('status', 'connected');
  const integracaoIds = (integracoes ?? []).map((i: { id: string }) => i.id);

  const [anunciosRes, custosFixosRes, produtoCostosRes] = await Promise.all([
    supabase.from('anuncios').select('nome_anuncio, custo, valor_venda, comissao_taxa, antecipado, afiliados, imposto_pct, custo_var, taxafixa, marketplace').eq('user_id', userId).order('atualizado_em', { ascending: false }).limit(100),
    supabase.from('fixed_costs').select('name, amount, category, is_recurring').eq('user_id', userId),
    supabase.from('product_costs').select('sku, item_name, cost, packaging_cost, other_costs').eq('user_id', userId).limit(100),
  ]);
  const anuncios = processarAnuncios(anunciosRes.data ?? []);
  const totalCustosFixos = (custosFixosRes.data ?? []).filter((c: { is_recurring: boolean }) => c.is_recurring).reduce((s: number, c: { amount: number }) => s + Number(c.amount), 0);

  if (integracaoIds.length === 0) {
    return { periodo: `${dataInicio} até hoje`, aviso: 'Nenhum marketplace conectado — sem dados de venda. O vendedor pode conectar em Integrações.', custos_fixos_mensais: Number(totalCustosFixos.toFixed(2)), anuncios_cadastrados: anuncios };
  }

  const { data: pedidos } = await supabase
    .from('orders').select('id, status, total_amount, order_created_at, integration_id')
    .in('integration_id', integracaoIds).gte('order_created_at', dataInicio)
    .order('order_created_at', { ascending: false }).limit(1000);
  const pedidoIds = (pedidos ?? []).map((p: { id: string }) => p.id);
  const filtro = pedidoIds.length ? pedidoIds : ['00000000-0000-0000-0000-000000000000'];

  const [itensRes, pagamentosRes] = await Promise.all([
    supabase.from('order_items').select('order_id, item_name, sku, quantity, total_price').in('order_id', filtro).limit(4000),
    supabase.from('payments').select('order_id, amount, net_amount, marketplace_fee').in('order_id', filtro).limit(2000),
  ]);
  const itens = itensRes.data ?? [];
  const pagamentos = pagamentosRes.data ?? [];

  const pagPorPedido: Record<string, { net: number; fee: number }> = {};
  for (const p of pagamentos) {
    if (!p.order_id) continue;
    pagPorPedido[p.order_id] = { net: Number(p.net_amount) || 0, fee: Number(p.marketplace_fee) || 0 };
  }
  const itensPorPedido: Record<string, typeof itens> = {};
  for (const it of itens) { if (!it.order_id) continue; (itensPorPedido[it.order_id] ??= []).push(it); }

  const porStatus: Record<string, number> = {};
  const porProduto: Record<string, { qtd: number; bruto: number; liquido: number }> = {};
  let fatBruto = 0, liquido = 0, taxas = 0;
  for (const pd of pedidos ?? []) {
    porStatus[pd.status || 'UNKNOWN'] = (porStatus[pd.status || 'UNKNOWN'] || 0) + 1;
    if (statusExcluido(pd.status)) continue;
    fatBruto += Number(pd.total_amount) || 0;
    const pag = pagPorPedido[pd.id];
    if (pag) { liquido += pag.net; taxas += pag.fee; }
    const its = itensPorPedido[pd.id] ?? [];
    const brutoPedido = its.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
    for (const it of its) {
      const nome = it.item_name || it.sku || 'Sem nome';
      const rec = (porProduto[nome] ??= { qtd: 0, bruto: 0, liquido: 0 });
      const b = Number(it.total_price) || 0;
      rec.qtd += Number(it.quantity) || 0; rec.bruto += b;
      if (pag && brutoPedido > 0) rec.liquido += pag.net * (b / brutoPedido);
    }
  }
  const topProdutos = Object.entries(porProduto).sort((a, b) => b[1].bruto - a[1].bruto).slice(0, 12).map(([nome, d]) => ({
    nome, unidades: d.qtd, faturamento_bruto: Number(d.bruto.toFixed(2)),
    receita_liquida_apos_taxas: Number(d.liquido.toFixed(2)),
    margem_apos_marketplace_pct: d.bruto > 0 ? Number(((d.liquido / d.bruto) * 100).toFixed(1)) : 0,
  }));

  return {
    periodo: `${dataInicio} até hoje`,
    lojas: (integracoes ?? []).map((i: { provider: string; shop_name: string }) => ({ canal: i.provider, loja: i.shop_name })),
    faturamento_bruto: Number(fatBruto.toFixed(2)),
    receita_liquida_apos_taxas: Number(liquido.toFixed(2)),
    total_taxas_marketplace: Number(taxas.toFixed(2)),
    margem_apos_marketplace_pct: fatBruto > 0 ? Number(((liquido / fatBruto) * 100).toFixed(1)) : 0,
    custos_fixos_mensais: Number(totalCustosFixos.toFixed(2)),
    pedidos_por_status: porStatus,
    top_produtos: topProdutos,
    custos_por_produto_cadastrados: (produtoCostosRes.data ?? []).length,
    anuncios_cadastrados: anuncios,
    nota: 'Margem "após marketplace" já desconta comissão/taxa/frete do marketplace, mas NÃO o custo de compra do produto. Para lucro final, o vendedor precisa do custo cadastrado (Custos de produto) ou informar na conversa.',
  };
}

function processarAnuncios(data: {
  nome_anuncio: string; custo: number; valor_venda: number; comissao_taxa: string;
  antecipado: number; afiliados: number; imposto_pct: number; custo_var: number;
  taxafixa: number | null; marketplace: string | null;
}[]) {
  const lista = data.map((a) => {
    const comissao = parseFloat(String(a.comissao_taxa || '0')) || 0;
    const imposto = a.valor_venda * (a.imposto_pct / 100);
    const lucro = a.valor_venda - a.custo - a.custo_var - comissao - (a.taxafixa || 0) - a.antecipado - a.afiliados - imposto;
    return {
      nome: a.nome_anuncio, marketplace: a.marketplace || '—',
      valor_venda: a.valor_venda, custo_produto: a.custo,
      lucro_estimado_unidade: Number(lucro.toFixed(2)),
      margem_pct: a.valor_venda > 0 ? Number(((lucro / a.valor_venda) * 100).toFixed(1)) : 0,
      no_prejuizo: lucro < 0,
    };
  });
  return {
    total: lista.length,
    no_prejuizo: lista.filter((a) => a.no_prejuizo).map((a) => a.nome),
    lista: lista.slice(0, 40),
  };
}

// ─── Loop de function-calling ────────────────────────────────────────────────
async function executarFerramenta(nome: string, supabase: ReturnType<typeof createClient>, userId: string) {
  try {
    if (nome === 'resumo_financeiro') return await buscarResumoFinanceiro(supabase, userId);
    if (nome === 'previsao_caixa') return await toolPrevisaoCaixa(supabase, userId);
    if (nome === 'plano_reposicao') return await toolPlanoReposicao(supabase, userId);
    return { erro: `ferramenta desconhecida: ${nome}` };
  } catch (e) {
    console.error(`Ferramenta ${nome} falhou:`, e);
    return { erro: 'não consegui buscar esse dado agora' };
  }
}

const MODEL = 'gemini-2.5-flash';
const MAX_TOOL_ROUNDS = 4;

// deno-lint-ignore no-explicit-any
async function geminiCall(apiKey: string, body: any): Promise<any> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) },
    );
    if (res.ok) return res.json();
    const txt = await res.text();
    console.error(`Gemini ${attempt}/3 status ${res.status}:`, txt);
    if (![429, 503].includes(res.status) || attempt === 3) {
      const err = new Error('gemini_failed') as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    await new Promise((r) => setTimeout(r, 2 ** (attempt - 1) * 1000));
  }
}

serve(async (req: Request) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autorizado.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: 'Token inválido ou expirado.' }, 401);
    const userId = user.id;

    if (!(await hasActivePlanAccess(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, userId))) {
      return json({ error: 'Recurso disponível apenas para contas com plano ativo.' }, 402);
    }

    const rawBody = await req.json();
    if (rawBody.action === 'clear') {
      await supabase.from('assistant_conversations').delete().eq('user_id', userId);
      return json({ ok: true });
    }

    const parsed = assistantSchema.safeParse(rawBody);
    if (!parsed.success) return json({ error: 'Dados inválidos' }, 400);
    const { pergunta } = parsed.data;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return json({ error: 'API de IA não configurada.' }, 500);

    const { data: convRow } = await supabase
      .from('assistant_conversations').select('messages').eq('user_id', userId).maybeSingle();
    const historico: { role: 'user' | 'assistant'; content: string }[] =
      (convRow?.messages as { role: 'user' | 'assistant'; content: string }[]) ?? [];

    // deno-lint-ignore no-explicit-any
    const contents: any[] = [
      ...historico.slice(-16).map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: pergunta }] },
    ];

    let resposta = '';
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const data = await geminiCall(GEMINI_API_KEY, {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: TOOLS,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
      });
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const calls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);

      if (calls.length === 0 || round === MAX_TOOL_ROUNDS) {
        resposta = parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text).join('\n').trim();
        break;
      }

      contents.push({ role: 'model', parts });
      const responses = [];
      for (const c of calls) {
        const out = await executarFerramenta(c.functionCall.name, supabase, userId);
        responses.push({ functionResponse: { name: c.functionCall.name, response: { resultado: out } } });
      }
      contents.push({ role: 'user', parts: responses });
    }

    if (!resposta) return json({ error: 'Resposta vazia da IA.' }, 500);

    const novoHistorico = [
      ...historico,
      { role: 'user' as const, content: pergunta },
      { role: 'assistant' as const, content: resposta },
    ].slice(-40);
    await supabase.from('assistant_conversations').upsert(
      { user_id: userId, messages: novoHistorico, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

    return json({ resposta });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    console.error('financial-assistant erro:', error);
    if (status === 503) return json({ error: 'O assistente está com alta demanda. Tente de novo em alguns segundos.' }, 503);
    if (status === 429) return json({ error: 'Muitas perguntas em pouco tempo. Aguarde um momento.' }, 429);
    return json({ error: 'Erro ao gerar resposta do assistente' }, 500);
  }
});
