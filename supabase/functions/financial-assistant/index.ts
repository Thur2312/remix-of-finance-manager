import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============= CORS HEADERS =============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============= VALIDATION =============
const assistantSchema = z.object({
  pergunta: z.string().min(1).max(1000),
});

// ============= SYSTEM PROMPT =============
const systemPrompt = `Você é o Finn, assistente financeiro inteligente do Seller Finance — uma plataforma de gestão financeira para vendedores de marketplace no Brasil (Shopee, TikTok Shop e Mercado Livre).

Você tem acesso aos dados financeiros reais do vendedor e deve usá-los para responder perguntas de forma direta, prática e personalizada.

COMO RESPONDER:
- Seja direto e objetivo. O vendedor quer respostas rápidas, não textos longos.
- Use os dados reais fornecidos no contexto. Nunca invente números.
- Quando calcular margens ou lucros, mostre o raciocínio de forma simples.
- Se os dados estiverem incompletos, diga claramente o que falta.
- Use R$ para valores monetários (ex: R$ 1.234,50).
- Responda sempre em português do Brasil, de forma natural e humana.
- Não use emojis em excesso — no máximo um por resposta.
- Se a pergunta não for relacionada ao negócio do vendedor, redirecione gentilmente.
- Você também pode fazer cálculos livres com os dados: projeções, simulações, comparativos entre períodos, análises de produto específico, etc.

CAPACIDADES DE CÁLCULO:
- Margem real por canal (aplicando comissões, impostos, antecipação, ads e afiliados configurados)
- Lucro líquido por produto ou SKU
- Comparativo entre canais
- Projeção de receita e fluxo de caixa
- Break-even por produto
- Custo total por unidade vendida
- Qualquer outro cálculo financeiro baseado nos dados disponíveis

CONTEXTO DOS DADOS:
Os dados abaixo representam a situação real do vendedor nos últimos 60 dias. Use-os como base para todas as respostas.`;

// ============= CÁLCULO DE RESUMO POR CANAL =============
function calcularResumoCanal(pedidos: Record<string, number | string | null>[], canal: string) {
  if (!pedidos.length) {
    return { canal, total_pedidos: 0, faturamento_bruto: 0, custo_total: 0, lucro_estimado: 0, margem_estimada_pct: 0, ticket_medio: 0, top_produtos: [] };
  }

  const faturamento = pedidos.reduce((acc, p) => acc + (Number(p.total_faturado) || 0), 0);
  const custo = pedidos.reduce((acc, p) => {
    const qtd = Number(p.quantidade) || 1;
    const custoUnit = Number(p.custo_unitario) || 0;
    return acc + (custoUnit * qtd);
  }, 0);

  const porProduto: Record<string, { quantidade: number; faturamento: number; custo: number }> = {};
  for (const p of pedidos) {
    const nome = String(p.nome_produto || p.sku || 'Sem nome');
    if (!porProduto[nome]) porProduto[nome] = { quantidade: 0, faturamento: 0, custo: 0 };
    porProduto[nome].quantidade += Number(p.quantidade) || 1;
    porProduto[nome].faturamento += Number(p.total_faturado) || 0;
    porProduto[nome].custo += (Number(p.custo_unitario) || 0) * (Number(p.quantidade) || 1);
  }

  const top5 = Object.entries(porProduto)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 5)
    .map(([nome, dados]) => ({
      nome,
      quantidade: dados.quantidade,
      faturamento: Number(dados.faturamento.toFixed(2)),
      custo: Number(dados.custo.toFixed(2)),
      lucro_estimado: Number((dados.faturamento - dados.custo).toFixed(2)),
    }));

  return {
    canal,
    total_pedidos: pedidos.length,
    faturamento_bruto: Number(faturamento.toFixed(2)),
    custo_total: Number(custo.toFixed(2)),
    lucro_estimado: Number((faturamento - custo).toFixed(2)),
    margem_estimada_pct: faturamento > 0 ? Number(((faturamento - custo) / faturamento * 100).toFixed(1)) : 0,
    ticket_medio: Number((faturamento / pedidos.length).toFixed(2)),
    top_produtos: top5,
  };
}

// ============= BUSCA DE DADOS DO USUÁRIO =============
async function buscarDadosFinanceiros(supabase: ReturnType<typeof createClient>, userId: string) {
  const hoje = new Date();
  const inicio60Dias = new Date(hoje);
  inicio60Dias.setDate(hoje.getDate() - 60);
  const dataInicio = inicio60Dias.toISOString().split('T')[0];

  const [
    shopeeOrders,
    tiktokOrders,
    mlOrders,
    tiktokSettlements,
    fixedCosts,
    cashFlowEntries,
    productCosts,
    shopeeSettings,
    tiktokSettings,
    mlSettings,
    payouts,
    payments,
  ] = await Promise.all([
    supabase
      .from('raw_orders')
      .select('nome_produto, sku, quantidade, total_faturado, custo_unitario, data_pedido, rebate_shopee')
      .eq('user_id', userId)
      .gte('data_pedido', dataInicio)
      .order('data_pedido', { ascending: false })
      .limit(200),

    supabase
      .from('tiktok_orders')
      .select('nome_produto, sku, quantidade, total_faturado, custo_unitario, data_pedido, status_pedido, desconto_plataforma, desconto_vendedor')
      .eq('user_id', userId)
      .gte('data_pedido', dataInicio)
      .order('data_pedido', { ascending: false })
      .limit(200),

    supabase
      .from('ml_orders')
      .select('nome_produto, sku, quantidade, total_faturado, custo_unitario, data_pedido, status_pedido, taxa_ml, frete_ml, desconto_plataforma')
      .eq('user_id', userId)
      .gte('data_pedido', dataInicio)
      .order('data_pedido', { ascending: false })
      .limit(200),

    supabase
      .from('tiktok_settlements')
      .select('nome_produto, quantidade, net_sales, total_fees, tiktok_commission_fee, shipping_total, total_settlement_amount, statement_date, status')
      .eq('user_id', userId)
      .gte('statement_date', dataInicio)
      .order('statement_date', { ascending: false })
      .limit(100),

    supabase
      .from('fixed_costs')
      .select('name, amount, category, is_recurring')
      .eq('user_id', userId),

    supabase
      .from('cash_flow_entries')
      .select('description, amount, type, status, date, due_date')
      .eq('user_id', userId)
      .gte('date', dataInicio)
      .order('date', { ascending: false })
      .limit(100),

    supabase
      .from('product_costs')
      .select('sku, item_name, cost, packaging_cost, other_costs, tax_percent')
      .eq('user_id', userId)
      .limit(100),

    supabase
      .from('settings')
      .select('taxa_comissao_shopee, taxa_antecipacao, imposto_nf_saida, gasto_shopee_ads, taxa_afiliado, name')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle(),

    supabase
      .from('tiktok_settings')
      .select('taxa_comissao_tiktok, taxa_antecipacao, imposto_nf_saida, gasto_tiktok_ads, taxa_afiliado, name')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle(),

    supabase
      .from('ml_settings')
      .select('taxa_comissao_ml, taxa_antecipacao, imposto_nf_saida, gasto_ml_ads, taxa_afiliado, name')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle(),

    supabase
      .from('payouts')
      .select('amount, status, scheduled_at, completed_at, currency')
      .gte('scheduled_at', dataInicio)
      .order('scheduled_at', { ascending: false })
      .limit(50),

    supabase
      .from('payments')
      .select('amount, net_amount, marketplace_fee, status, transaction_date, payment_method')
      .gte('transaction_date', dataInicio)
      .order('transaction_date', { ascending: false })
      .limit(50),
  ]);

  const resumoShopee = calcularResumoCanal(shopeeOrders.data ?? [], 'shopee');
  const resumoTiktok = calcularResumoCanal(tiktokOrders.data ?? [], 'tiktok');
  const resumoML = calcularResumoCanal(mlOrders.data ?? [], 'ml');

  return {
    periodo: `${dataInicio} até hoje`,
    canais: {
      shopee: {
        resumo: resumoShopee,
        configuracoes: shopeeSettings.data ?? null,
        pedidos_recentes: (shopeeOrders.data ?? []).slice(0, 20),
      },
      tiktok: {
        resumo: resumoTiktok,
        configuracoes: tiktokSettings.data ?? null,
        pedidos_recentes: (tiktokOrders.data ?? []).slice(0, 20),
        settlements_recentes: (tiktokSettlements.data ?? []).slice(0, 20),
      },
      mercado_livre: {
        resumo: resumoML,
        configuracoes: mlSettings.data ?? null,
        pedidos_recentes: (mlOrders.data ?? []).slice(0, 20),
      },
    },
    custos_fixos: fixedCosts.data ?? [],
    total_custos_fixos_mensais: (fixedCosts.data ?? [])
      .filter((c: { is_recurring: boolean }) => c.is_recurring)
      .reduce((acc: number, c: { amount: number }) => acc + c.amount, 0),
    custos_por_produto: productCosts.data ?? [],
    fluxo_de_caixa: {
      entradas_pendentes: (cashFlowEntries.data ?? [])
        .filter((e: { type: string; status: string }) => e.type === 'income' && e.status === 'pending')
        .reduce((acc: number, e: { amount: number }) => acc + e.amount, 0),
      saidas_pendentes: (cashFlowEntries.data ?? [])
        .filter((e: { type: string; status: string }) => e.type === 'expense' && e.status === 'pending')
        .reduce((acc: number, e: { amount: number }) => acc + e.amount, 0),
      lancamentos_recentes: (cashFlowEntries.data ?? []).slice(0, 15),
    },
    repasses: {
      pendentes: (payouts.data ?? [])
        .filter((p: { status: string }) => p.status === 'pending')
        .reduce((acc: number, p: { amount: number }) => acc + p.amount, 0),
      recebidos_periodo: (payouts.data ?? [])
        .filter((p: { status: string }) => p.status === 'completed')
        .reduce((acc: number, p: { amount: number }) => acc + p.amount, 0),
      lista_recente: (payouts.data ?? []).slice(0, 10),
    },
    pagamentos_recebidos: {
      total_bruto: (payments.data ?? [])
        .reduce((acc: number, p: { amount: number }) => acc + p.amount, 0),
      total_liquido: (payments.data ?? [])
        .reduce((acc: number, p: { net_amount: number }) => acc + p.net_amount, 0),
      total_taxas: (payments.data ?? [])
        .reduce((acc: number, p: { marketplace_fee: number }) => acc + p.marketplace_fee, 0),
    },
  };
}

// ============= MAIN FUNCTION =============
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Faça login para continuar.' }),
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
        JSON.stringify({ error: 'Token inválido ou expirado. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const rawBody = await req.json();

    // ===== AÇÃO DE LIMPAR CONVERSA =====
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

    // ===== VALIDAÇÃO =====
    const validationResult = assistantSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { pergunta } = validationResult.data;

    // ===== BUSCA HISTÓRICO SALVO =====
    const { data: convRow } = await supabase
      .from('assistant_conversations')
      .select('messages')
      .eq('user_id', userId)
      .maybeSingle();

    const historicoSalvo: { role: 'user' | 'assistant'; content: string }[] =
      (convRow?.messages as { role: 'user' | 'assistant'; content: string }[]) ?? [];

    // ===== BUSCA DADOS FINANCEIROS =====
    console.log('Buscando dados financeiros do usuário...');
    const dadosFinanceiros = await buscarDadosFinanceiros(supabase, userId);
    console.log('Dados coletados:', {
      shopee: dadosFinanceiros.canais.shopee.resumo.total_pedidos,
      tiktok: dadosFinanceiros.canais.tiktok.resumo.total_pedidos,
      ml: dadosFinanceiros.canais.mercado_livre.resumo.total_pedidos,
    });

    // ===== MONTA CONTENTS GEMINI =====
    const contents = [];

    contents.push({
      role: 'user',
      parts: [{
        text: `${systemPrompt}\n\nDADOS FINANCEIROS DO VENDEDOR (últimos 60 dias):\n${JSON.stringify(dadosFinanceiros, null, 2)}\n\n---\nAgora responda as perguntas do vendedor com base nesses dados.`
      }]
    });

    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido! Tenho acesso aos seus dados financeiros. Como posso te ajudar?' }]
    });

    // Histórico persistido (últimas 20 mensagens)
    for (const msg of historicoSalvo.slice(-20)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Pergunta atual
    contents.push({
      role: 'user',
      parts: [{ text: pergunta }]
    });

    // ===== GEMINI API =====
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API de IA não configurada. Entre em contato com o suporte.' }),
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
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Gemini:', response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Aguarde um momento e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar a IA. Tente novamente em alguns instantes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resposta) {
      console.error('Resposta vazia do Gemini:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== SALVA HISTÓRICO ATUALIZADO =====
    const novoHistorico = [
      ...historicoSalvo,
      { role: 'user' as const, content: pergunta },
      { role: 'assistant' as const, content: resposta },
    ].slice(-40); // mantém as últimas 40 mensagens (20 trocas)

    await supabase
      .from('assistant_conversations')
      .upsert(
        { user_id: userId, messages: novoHistorico, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    console.log('Resposta gerada com sucesso. Tamanho:', resposta.length, 'chars');

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