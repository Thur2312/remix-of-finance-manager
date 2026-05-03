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
- Você também pode fazer cálculos livres com os dados: projeções, simulações, comparativos entre períodos, análises de produto específico, etc. Use os dados do contexto como base para qualquer cálculo que o vendedor pedir.

CAPACIDADES DE CÁLCULO:
- Margem real por canal (aplicando comissões, impostos, antecipação, ads e afiliados configurados)
- Lucro líquido por produto ou SKU
- Comparativo entre canais
- Projeção de receita e fluxo de caixa
- Break-even por produto
- Custo total por unidade vendida
- Qualquer outro cálculo financeiro baseado nos dados disponíveis

CONTEXTO DOS DADOS:
Os dados abaixo representam a situação real do vendedor nos últimos 60 dias.`;

// ... [buscarDadosFinanceiros e calcularResumoCanal iguais ao original] ...

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

    // Suporte a limpar conversa
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

    // ===== BUSCA HISTÓRICO SALVO =====
    const { data: convRow } = await supabase
      .from('assistant_conversations')
      .select('messages')
      .eq('user_id', userId)
      .maybeSingle();

    const historicoSalvo: { role: 'user' | 'assistant'; content: string }[] =
      convRow?.messages ?? [];

    // ===== BUSCA DADOS FINANCEIROS =====
    const dadosFinanceiros = await buscarDadosFinanceiros(supabase, userId);

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
      parts: [{ text: 'Entendido! Tenho acesso aos seus dados. Como posso te ajudar?' }]
    });

    // Histórico persistido (últimas 20 mensagens)
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