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
- Se os dados estiverem incompletos, diga claramente o que falta.
- Use R$ para valores monetários (ex: R$ 1.234,50).
- Responda sempre em português do Brasil, de forma natural e humana.
- Não use emojis em excesso — no máximo um por resposta.
- Se a pergunta não for relacionada ao negócio do vendedor, redirecione gentilmente.
- Você também pode fazer cálculos livres com os dados: projeções, simulações, comparativos entre períodos, análises de produto específico, etc.

CAPACIDADES DE CÁLCULO:
- Margem real por canal (aplicando comissões, taxas de serviço, frete e ajustes)
- Lucro líquido por produto ou SKU
- Comparativo entre períodos
- Projeção de receita e fluxo de caixa
- Break-even por produto
- Custo total por unidade vendida
- Qualquer outro cálculo financeiro baseado nos dados disponíveis

ESTRUTURA DOS DADOS:
- pedidos: tabela "orders" com total_amount (valor cobrado do comprador)
- itens: tabela "order_items" com item_name, sku, quantity, unit_price, total_price
- pagamentos liberados (escrow): tabela "payments" com amount (bruto), net_amount (líquido após taxas), marketplace_fee
- taxas detalhadas: tabela "fees" com fee_type (commission, service_fee, shipping_fee, adjustment) e amount

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
      top_produtos: [],
      taxas_detalhadas: {},
      pagamentos_recentes: [],
      custos_fixos: { lista: [], total_mensal_recorrente: 0 },
      custos_por_produto: [],
      configuracoes_shopee: null,
    };
  }

  const [
    pedidosRes,
    itensRes,
    pagamentosRes,
    taxasRes,
    custosFixosRes,
    produtoCostosRes,
    shopeeSettingsRes,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, external_order_id, status, total_amount, order_created_at, integration_id')
      .in('integration_id', integracaoIds)
      .gte('order_created_at', dataInicio)
      .order('order_created_at', { ascending: false })
      .limit(500),

    supabase
      .from('order_items')
      .select('order_id, item_name, sku, quantity, unit_price, total_price')
      .in('order_id',
        supabase
          .from('orders')
          .select('id')
          .in('integration_id', integracaoIds)
          .gte('order_created_at', dataInicio)
      )
      .limit(1000),

    supabase
      .from('payments')
      .select('amount, net_amount, marketplace_fee, status, payment_method, transaction_date, description')
      .in('integration_id', integracaoIds)
      .gte('transaction_date', dataInicio)
      .order('transaction_date', { ascending: false })
      .limit(200),

    supabase
      .from('fees')
      .select('fee_type, amount, description, fee_date')
      .in('integration_id', integracaoIds)
      .gte('fee_date', dataInicio)
      .order('fee_date', { ascending: false })
      .limit(500),

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

  const pedidos = pedidosRes.data ?? [];
  const itens = itensRes.data ?? [];
  const pagamentos = pagamentosRes.data ?? [];
  const taxas = taxasRes.data ?? [];

  // Resumo por status
  const porStatus: Record<string, { count: number; total: number }> = {};
  for (const p of pedidos) {
    const s = p.status || 'UNKNOWN';
    if (!porStatus[s]) porStatus[s] = { count: 0, total: 0 };
    porStatus[s].count++;
    porStatus[s].total += Number(p.total_amount) || 0;
  }

  // Top 10 produtos por faturamento
  const porProduto: Record<string, { quantidade: number; faturamento: number; sku: string }> = {};
  for (const item of itens) {
    const nome = item.item_name || item.sku || 'Sem nome';
    if (!porProduto[nome]) porProduto[nome] = { quantidade: 0, faturamento: 0, sku: item.sku || '' };
    porProduto[nome].quantidade += Number(item.quantity) || 0;
    porProduto[nome].faturamento += Number(item.total_price) || 0;
  }
  const topProdutos = Object.entries(porProduto)
    .sort((a, b) => b[1].faturamento - a[1].faturamento)
    .slice(0, 10)
    .map(([nome, d]) => ({
      nome,
      sku: d.sku,
      quantidade: d.quantidade,
      faturamento: Number(d.faturamento.toFixed(2)),
    }));

  // Taxas por tipo
  const taxasPorTipo: Record<string, number> = {};
  for (const t of taxas) {
    const tipo = t.fee_type || 'outros';
    taxasPorTipo[tipo] = (taxasPorTipo[tipo] || 0) + Number(t.amount);
  }

  // Totais
  const faturamentoBruto = pedidos.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const valorLiberado = pagamentos.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const valorLiquido = pagamentos.reduce((acc, p) => acc + (Number(p.net_amount) || 0), 0);
  const totalTaxas = pagamentos.reduce((acc, p) => acc + (Number(p.marketplace_fee) || 0), 0);
  const totalCustosFixos = (custosFixosRes.data ?? [])
    .filter((c: { is_recurring: boolean }) => c.is_recurring)
    .reduce((acc: number, c: { amount: number }) => acc + c.amount, 0);

  return {
    periodo: `${inicio60Dias.toISOString().split('T')[0]} até hoje`,
    integracoes: (integracoes ?? []).map((i: { id: string; provider: string; shop_name: string }) => ({
      canal: i.provider,
      loja: i.shop_name,
    })),
    resumo_geral: {
      total_pedidos: pedidos.length,
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
    top_produtos: topProdutos,
    taxas_detalhadas: {
      comissao: Number((taxasPorTipo['commission'] || 0).toFixed(2)),
      taxa_servico: Number((taxasPorTipo['service_fee'] || 0).toFixed(2)),
      frete: Number((taxasPorTipo['shipping_fee'] || 0).toFixed(2)),
      ajustes: Number((taxasPorTipo['adjustment'] || 0).toFixed(2)),
      total_geral: Number(Object.values(taxasPorTipo).reduce((a, b) => a + b, 0).toFixed(2)),
    },
    pagamentos_recentes: pagamentos.slice(0, 20),
    custos_fixos: {
      lista: custosFixosRes.data ?? [],
      total_mensal_recorrente: Number(totalCustosFixos.toFixed(2)),
    },
    custos_por_produto: produtoCostosRes.data ?? [],
    configuracoes_shopee: shopeeSettingsRes.data ?? null,
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