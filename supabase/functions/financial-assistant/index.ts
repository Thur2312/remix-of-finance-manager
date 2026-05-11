import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const assistantSchema = z.object({
  pergunta: z.string().min(1).max(1000),
});

const systemPrompt = `Você é o Finn, assistente financeiro inteligente do Seller Finance — uma plataforma de gestão financeira para vendedores de marketplace no Brasil (Shopee, TikTok Shop e Mercado Livre).

Você tem acesso aos dados financeiros reais do vendedor e deve usá-los para responder perguntas de forma direta, prática e personalizada.

COMO RESPONDER:
- Seja direto e objetivo. O vendedor quer respostas rápidas, não textos longos.
- Use os dados reais fornecidos no contexto. Nunca invente números.
- Quando calcular margens ou lucros, mostre o raciocínio de forma simples.
- Use R$ para valores monetários (ex: R$ 1.234,50).
- Responda sempre em português do Brasil, de forma natural e humana.
- Não use emojis em excesso — no máximo um por resposta.
- Se a pergunta não for relacionada ao negócio do vendedor, redirecione gentilmente.
- Você também pode fazer cálculos livres: projeções, simulações, comparativos entre períodos, análise de produto específico, etc.

LINGUAGEM — REGRAS ABSOLUTAS:
- NUNCA mencione nomes de tabelas, colunas, variáveis ou termos técnicos de banco de dados (ex: orders, order_items, net_amount, payments, fees, fee_type, integration_id, etc.)
- NUNCA diga que um dado "não está disponível na estrutura" ou que "não há registros na tabela"
- NUNCA invente telas, seções, menus ou funcionalidades que não existem na plataforma. Se não souber onde algo está, não chute.
- Quando faltar um dado, explique em linguagem simples o que o vendedor precisa fazer. Use os exemplos abaixo como guia.

MAPA REAL DA PLATAFORMA (use apenas essas seções ao orientar o vendedor):
- Dashboard — visão geral dos resultados
- Gestão — controle dos pedidos
- Fluxo de Caixa — entradas e saídas financeiras
- Precificação — calculadora para simular o preço de venda de um produto (não salva dados, é só uma simulação manual)
- Custos Fixos — cadastro de despesas mensais fixas da operação (aluguel, internet, funcionários, etc.)
- Assistente — você, o Finn
- DRE — demonstrativo de resultados
- Integrações — conexão com marketplaces (Shopee, TikTok Shop, Mercado Livre)
- Planos — assinatura da plataforma

ORIENTAÇÕES POR SITUAÇÃO (use linguagem humana, nunca técnica):
- Sem custo de produto cadastrado → "A plataforma ainda não tem uma seção para cadastrar o custo de aquisição por produto. Por enquanto, me informe o custo do produto aqui na conversa e eu calculo o lucro para você na hora."
- Sem integração conectada → "Para ver seus dados, você precisa conectar sua conta do marketplace na seção Integrações."
- Dado zerado ou desatualizado → "Esse valor ainda não foi sincronizado. Tente sincronizar sua loja novamente nas Integrações."
- Custo fixo não cadastrado → "Você pode cadastrar suas despesas mensais (aluguel, internet, etc.) na seção Custos Fixos para que eu considere no cálculo do seu lucro real."
- Simulação de preço → "Você pode usar a calculadora de Precificação para simular o preço ideal de venda de qualquer produto."

O QUE VOCÊ CONSEGUE CALCULAR:
- Receita bruta por produto e no total
- Receita líquida após as taxas do marketplace (comissão, taxa de serviço, frete, ajustes)
- Qual produto tem melhor e pior margem do marketplace
- Pedidos por status (completos, cancelados, a enviar, etc.)
- Projeção de receita
- Break-even de qualquer produto se o vendedor informar o custo na conversa
- Lucro líquido por produto se o vendedor informar o custo de aquisição aqui na conversa

O QUE VOCÊ NÃO CONSEGUE SEM O CUSTO DE AQUISIÇÃO:
- Lucro líquido final por produto
- Identificar produtos no prejuízo com precisão
- Nesse caso, sempre ofereça: "Me diga o custo de aquisição do produto e eu calculo agora para você."

CONTEXTO DOS DADOS:
Os dados abaixo representam a situação real do vendedor nos últimos 60 dias.`;

async function buscarDadosFinanceiros(supabase: ReturnType<typeof createClient>, userId: string) {
  const hoje = new Date();
  const inicio60Dias = new Date(hoje);
  inicio60Dias.setDate(hoje.getDate() - 60);
  const dataInicio = inicio60Dias.toISOString();

  // Busca integrações conectadas do usuário
  const { data: integracoes } = await supabase
    .from('integration_connections')
    .select('id, provider, shop_name, status')
    .eq('user_id', userId)
    .eq('status', 'connected');

  const integracaoIds = (integracoes ?? []).map((i: { id: string }) => i.id);

  if (integracaoIds.length === 0) {
    return {
      periodo: `${inicio60Dias.toISOString().split('T')[0]} até hoje`,
      integracoes: [],
      aviso: 'Nenhuma integração conectada encontrada para este usuário.',
      resumo_geral: { total_pedidos: 0, faturamento_bruto: 0, valor_liberado_escrow: 0, valor_liquido_apos_taxas: 0, total_taxas_marketplace: 0, margem_liquida_pct: 0 },
      pedidos_por_status: [],
      analise_por_produto: [],
      taxas_detalhadas: {},
      pedidos_com_margem: [],
      pagamentos_recentes: [],
      custos_fixos: { lista: [], total_mensal_recorrente: 0 },
      custos_por_produto: [],
      configuracoes: null,
    };
  }

  // ETAPA 1 — busca pedidos primeiro para ter os IDs
  const pedidosRes = await supabase
    .from('orders')
    .select('id, external_order_id, status, total_amount, order_created_at, integration_id')
    .in('integration_id', integracaoIds)
    .gte('order_created_at', dataInicio)
    .order('order_created_at', { ascending: false })
    .limit(500);

  const pedidos = pedidosRes.data ?? [];
  const pedidoIds = pedidos.map((p: { id: string }) => p.id);
  const pedidoIdsFiltro = pedidoIds.length > 0 ? pedidoIds : ['00000000-0000-0000-0000-000000000000'];

  // ETAPA 2 — busca tudo em paralelo com os IDs já disponíveis
  const [
    itensRes,
    pagamentosRes,
    taxasRes,
    custosFixosRes,
    produtoCostosRes,
    configRes,
  ] = await Promise.all([
    supabase
      .from('order_items')
      .select('order_id, item_name, sku, quantity, unit_price, total_price')
      .in('order_id', pedidoIdsFiltro)
      .limit(2000),

    supabase
      .from('payments')
      .select('order_id, amount, net_amount, marketplace_fee, status, payment_method, transaction_date, description')
      .in('order_id', pedidoIdsFiltro)
      .order('transaction_date', { ascending: false })
      .limit(1000),

    supabase
      .from('fees')
      .select('order_id, fee_type, amount, description, fee_date')
      .in('order_id', pedidoIdsFiltro)
      .limit(2000),

    supabase
      .from('fixed_costs')
      .select('name, amount, category, is_recurring')
      .eq('user_id', userId),

    supabase
      .from('product_costs')
      .select('sku, item_name, cost, packaging_cost, other_costs, tax_percent')
      .eq('user_id', userId)
      .limit(100),

    supabase
      .from('settings')
      .select('taxa_comissao_shopee, taxa_antecipacao, imposto_nf_saida, gasto_shopee_ads, taxa_afiliado')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle(),
  ]);

  const itens = itensRes.data ?? [];
  const pagamentos = pagamentosRes.data ?? [];
  const taxas = taxasRes.data ?? [];

  // Mapas por order_id para cruzamento
  const pagamentoPorPedido: Record<string, { amount: number; net_amount: number; marketplace_fee: number }> = {};
  for (const p of pagamentos) {
    if (!p.order_id) continue;
    pagamentoPorPedido[p.order_id] = {
      amount: Number(p.amount) || 0,
      net_amount: Number(p.net_amount) || 0,
      marketplace_fee: Number(p.marketplace_fee) || 0,
    };
  }

  const taxasPorPedido: Record<string, Record<string, number>> = {};
  for (const t of taxas) {
    if (!t.order_id) continue;
    if (!taxasPorPedido[t.order_id]) taxasPorPedido[t.order_id] = {};
    const tipo = t.fee_type || 'outros';
    taxasPorPedido[t.order_id][tipo] = (taxasPorPedido[t.order_id][tipo] || 0) + Number(t.amount);
  }

  const itensPorPedido: Record<string, typeof itens> = {};
  for (const item of itens) {
    if (!item.order_id) continue;
    if (!itensPorPedido[item.order_id]) itensPorPedido[item.order_id] = [];
    itensPorPedido[item.order_id].push(item);
  }

  // Resumo por status
  const porStatus: Record<string, { count: number; total: number }> = {};
  for (const p of pedidos) {
    const s = p.status || 'UNKNOWN';
    if (!porStatus[s]) porStatus[s] = { count: 0, total: 0 };
    porStatus[s].count++;
    porStatus[s].total += Number(p.total_amount) || 0;
  }

  // Análise por produto — cruza itens com net_amount proporcional do pagamento
  const porProduto: Record<string, {
    quantidade: number;
    receita_bruta: number;
    receita_liquida: number;
    taxas_marketplace: number;
    sku: string;
    pedidos: number;
  }> = {};

  for (const pedido of pedidos) {
    if (pedido.status === 'CANCELLED') continue;
    const itensDoPedido = itensPorPedido[pedido.id] ?? [];
    const pagamento = pagamentoPorPedido[pedido.id];
    const totalBrutoPedido = itensDoPedido.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);

    for (const item of itensDoPedido) {
      const nome = item.item_name || item.sku || 'Sem nome';
      if (!porProduto[nome]) {
        porProduto[nome] = { quantidade: 0, receita_bruta: 0, receita_liquida: 0, taxas_marketplace: 0, sku: item.sku || '', pedidos: 0 };
      }
      const receitaBrutaItem = Number(item.total_price) || 0;
      porProduto[nome].quantidade += Number(item.quantity) || 0;
      porProduto[nome].receita_bruta += receitaBrutaItem;
      porProduto[nome].pedidos += 1;

      if (pagamento && totalBrutoPedido > 0) {
        const proporcao = receitaBrutaItem / totalBrutoPedido;
        porProduto[nome].receita_liquida += pagamento.net_amount * proporcao;
        porProduto[nome].taxas_marketplace += pagamento.marketplace_fee * proporcao;
      }
    }
  }

  const analisePorProduto = Object.entries(porProduto)
    .sort((a, b) => b[1].receita_bruta - a[1].receita_bruta)
    .slice(0, 20)
    .map(([nome, d]) => ({
      nome,
      sku: d.sku,
      quantidade_vendida: d.quantidade,
      pedidos: d.pedidos,
      receita_bruta: Number(d.receita_bruta.toFixed(2)),
      receita_liquida_apos_marketplace: Number(d.receita_liquida.toFixed(2)),
      taxas_marketplace: Number(d.taxas_marketplace.toFixed(2)),
      margem_marketplace_pct: d.receita_bruta > 0
        ? Number(((d.receita_liquida / d.receita_bruta) * 100).toFixed(1))
        : 0,
    }));

  // Taxas totais por tipo
  const taxasPorTipo: Record<string, number> = {};
  for (const t of taxas) {
    const tipo = t.fee_type || 'outros';
    taxasPorTipo[tipo] = (taxasPorTipo[tipo] || 0) + Number(t.amount);
  }

  // Totais gerais
  const pedidosAtivos = pedidos.filter(p => p.status !== 'CANCELLED');
  const faturamentoBruto = pedidosAtivos.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const valorLiberado = pagamentos.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const valorLiquido = pagamentos.reduce((acc, p) => acc + (Number(p.net_amount) || 0), 0);
  const totalTaxas = pagamentos.reduce((acc, p) => acc + (Number(p.marketplace_fee) || 0), 0);
  const totalCustosFixos = (custosFixosRes.data ?? [])
    .filter((c: { is_recurring: boolean }) => c.is_recurring)
    .reduce((acc: number, c: { amount: number }) => acc + c.amount, 0);

  // Amostra dos 10 pedidos COMPLETED com maior valor, com margem detalhada
  const pedidosComMargem = pedidos
    .filter(p => p.status === 'COMPLETED' && pagamentoPorPedido[p.id])
    .slice(0, 10)
    .map(p => {
      const pag = pagamentoPorPedido[p.id];
      const taxasDoPedido = taxasPorPedido[p.id] ?? {};
      const itensDoPedido = (itensPorPedido[p.id] ?? []).map(i => ({
        nome: i.item_name,
        sku: i.sku,
        quantidade: i.quantity,
        total: Number(i.total_price),
      }));
      return {
        external_order_id: p.external_order_id,
        data: p.order_created_at,
        receita_bruta: Number(p.total_amount),
        valor_liberado: pag.amount,
        valor_liquido: pag.net_amount,
        taxas_marketplace: pag.marketplace_fee,
        margem_pct: Number(p.total_amount) > 0
          ? Number(((pag.net_amount / Number(p.total_amount)) * 100).toFixed(1))
          : 0,
        taxas_detalhadas: taxasDoPedido,
        itens: itensDoPedido,
      };
    });

  return {
    periodo: `${inicio60Dias.toISOString().split('T')[0]} até hoje`,
    integracoes: (integracoes ?? []).map((i: { id: string; provider: string; shop_name: string }) => ({
      canal: i.provider,
      loja: i.shop_name,
    })),
    resumo_geral: {
      total_pedidos: pedidos.length,
      pedidos_ativos: pedidosAtivos.length,
      pedidos_cancelados: pedidos.filter(p => p.status === 'CANCELLED').length,
      faturamento_bruto: Number(faturamentoBruto.toFixed(2)),
      valor_liberado_escrow: Number(valorLiberado.toFixed(2)),
      valor_liquido_apos_taxas: Number(valorLiquido.toFixed(2)),
      total_taxas_marketplace: Number(totalTaxas.toFixed(2)),
      margem_liquida_pct: faturamentoBruto > 0
        ? Number(((valorLiquido / faturamentoBruto) * 100).toFixed(1))
        : 0,
    },
    pedidos_por_status: Object.entries(porStatus).map(([status, d]) => ({
      status,
      quantidade: d.count,
      faturamento: Number(d.total.toFixed(2)),
    })),
    analise_por_produto: analisePorProduto,
    taxas_detalhadas: {
      comissao: Number((taxasPorTipo['commission'] || 0).toFixed(2)),
      taxa_servico: Number((taxasPorTipo['service_fee'] || 0).toFixed(2)),
      frete: Number((taxasPorTipo['shipping_fee'] || 0).toFixed(2)),
      ajustes: Number((taxasPorTipo['adjustment'] || 0).toFixed(2)),
      total_geral: Number(Object.values(taxasPorTipo).reduce((a, b) => a + b, 0).toFixed(2)),
    },
    pedidos_com_margem: pedidosComMargem,
    pagamentos_recentes: pagamentos.slice(0, 10).map(p => ({
      order_id: p.order_id,
      amount: Number(p.amount),
      net_amount: Number(p.net_amount),
      marketplace_fee: Number(p.marketplace_fee),
      status: p.status,
      transaction_date: p.transaction_date,
    })),
    custos_fixos: {
      lista: custosFixosRes.data ?? [],
      total_mensal_recorrente: Number(totalCustosFixos.toFixed(2)),
    },
    custos_por_produto: produtoCostosRes.data ?? [],
    configuracoes: configRes.data ?? null,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const rawBody = await req.json();

    if (rawBody.action === 'clear') {
      await supabase
        .from('assistant_conversations')
        .delete()
        .eq('user_id', userId);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = assistantSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pergunta } = validationResult.data;

    const { data: convRow } = await supabase
      .from('assistant_conversations')
      .select('messages')
      .eq('user_id', userId)
      .maybeSingle();

    const historicoSalvo: { role: 'user' | 'assistant'; content: string }[] =
      (convRow?.messages as { role: 'user' | 'assistant'; content: string }[]) ?? [];

    console.log('Buscando dados financeiros do usuário:', userId);
    const dadosFinanceiros = await buscarDadosFinanceiros(supabase, userId);
    console.log('Dados coletados:', {
      integracoes: dadosFinanceiros.integracoes.length,
      pedidos: dadosFinanceiros.resumo_geral.total_pedidos,
      faturamento: dadosFinanceiros.resumo_geral.faturamento_bruto,
      produtos: dadosFinanceiros.analise_por_produto.length,
    });

    const contents = [];

    contents.push({
      role: 'user',
      parts: [{
        text: `${systemPrompt}\n\nDADOS FINANCEIROS DO VENDEDOR (últimos 60 dias):\n${JSON.stringify(dadosFinanceiros, null, 2)}\n\n---\nAgora responda as perguntas do vendedor com base nesses dados.`
      }]
    });

    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido! Tenho acesso aos seus dados financeiros reais. Como posso te ajudar?' }]
    });

    for (const msg of historicoSalvo.slice(-20)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: pergunta }]
    });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API de IA não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Gemini:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Aguarde e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar a IA.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resposta) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const novoHistorico = [
      ...historicoSalvo,
      { role: 'user' as const, content: pergunta },
      { role: 'assistant' as const, content: resposta },
    ].slice(-40);

    await supabase
      .from('assistant_conversations')
      .upsert(
        { user_id: userId, messages: novoHistorico, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    console.log('Resposta gerada. Tamanho:', resposta.length, 'chars');

    return new Response(
      JSON.stringify({ resposta }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no financial-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});