/// <reference lib="deno.ns" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
const generateAdSchema = z.object({
  nomeProduto: z.string().min(1, 'Nome do produto é obrigatório').max(500, 'Nome muito longo'),
  categoria: z.string().max(200).optional().nullable(),
  marca: z.string().max(200).optional().nullable(),
  faixaPreco: z.string().max(100).optional().nullable(),
  publicoAlvo: z.string().max(200).optional().nullable(),
  materiais: z.string().max(500).optional().nullable(),
  coresDisponiveis: z.string().max(500).optional().nullable(),
  images: z.array(z.string()).max(10, 'Máximo 10 imagens').optional().nullable(),
  medidas: z.object({
    campos: z.array(z.string()).optional(),
    linhas: z.array(z.record(z.union([z.string(), z.number()]))).optional(),
  }).optional().nullable(),
});

function createValidationErrorResponse(error: z.ZodError): Response {
  const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  console.error('Validation error:', issues);
  
  return new Response(
    JSON.stringify({ error: 'Dados inválidos', details: issues }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

// ============= SYSTEM PROMPT =============
const systemPrompt = `Você é um assistente especialista em criação de anúncios para Shopee Brasil, focado em aumentar cliques e conversões respeitando as políticas da plataforma.

ENTRADAS:
- Dados do produto em JSON (nome, categoria, marca, preço, público, materiais, cores, medidas)
- Imagens do produto (se fornecidas) para análise visual

SUA TAREFA (execute na ordem):

1. ANÁLISE VISUAL (se imagens foram fornecidas):
   - Analise as fotos do produto para identificar:
     * Tipo exato de produto (vestido, blusa, calça, saia, etc.)
     * Cor(es) e estampa(s) visíveis
     * Tecido aparente e caimento
     * Detalhes de modelagem (decote, mangas, comprimento, fendas)
     * Ocasião de uso sugerida pelo visual

2. ANÁLISE DE PALAVRAS-CHAVE:
   - Identifique os 5-10 termos mais buscados na Shopee Brasil para este tipo de produto
   - Considere variações populares de nomenclatura (ex: "vestido midi" vs "vestido médio")
   - Priorize keywords com alto volume de busca e relevância para o produto

3. GERAR 3 A 5 TÍTULOS seguindo ESTA ESTRUTURA OBRIGATÓRIA:
   [tipo de produto] + [gênero] + [característica forte] + [tipo de tecido] + [característica secundária]
   
   EXEMPLOS DE ESTRUTURA CORRETA:
   - "Vestido Longo Feminino Elegante Crepe Manga Longa"
   - "Blusa Cropped Feminino Casual Malha Ribana Decote V"
   - "Calça Wide Leg Feminino Cintura Alta Linho Bolsos Laterais"
   
   REGRAS OBRIGATÓRIAS PARA TÍTULOS:
   - SEMPRE começar com o tipo de produto (Vestido, Blusa, Calça, Saia, etc.)
   - SEMPRE incluir gênero logo após o tipo (Feminino, Masculino, Infantil, Unissex)
   - MÁXIMO 100 caracteres por título (limite da Shopee)
   - NÃO usar promessas exageradas, CAPS LOCK excessivo ou símbolos

4. GERAR DESCRIÇÃO COMPLETA seguindo ESTA ESTRUTURA OBRIGATÓRIA:

   A) ABERTURA EMOCIONAL (1-2 frases):
      - Frase envolvente que conecta com o desejo do cliente
   
   B) 👗 DETALHES DO PRODUTO:
      - Liste os principais diferenciais em tópicos com bullet points (-)
      - Destaque características marcantes
   
   C) 📏 TAMANHO E MEDIDAS:
      - Se o usuário fornecer medidas, criar seção formatada
      - Se não houver medidas fornecidas, NÃO incluir esta seção
   
   D) ♻️ CUIDADOS COM A PEÇA:
      - Instruções de lavagem ESPECÍFICAS para o tipo de tecido
   
   E) FECHAMENTO:
      - SEMPRE incluir: "⁉️ Ficou com alguma dúvida? Não deixe de nos contactar através do chat."

FORMATO DE RESPOSTA (JSON válido, sem texto extra):
{
  "titles": ["Título 1", "Título 2", "Título 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "description": "Descrição completa seguindo a estrutura A-B-C-D-E acima, com emojis e formatação."
}

REGRAS GERAIS:
- Escreva sempre em português do Brasil
- Retorne APENAS o JSON, sem markdown ou texto adicional`;

// ============= MAIN FUNCTION =============
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========== AUTENTICAÇÃO JWT ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado. Faça login novamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Request authenticated for user: ${userId}`);

    // ========== INPUT VALIDATION ==========
    const rawBody = await req.json();
    const validationResult = generateAdSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }
    
    const { nomeProduto, categoria, marca, faixaPreco, publicoAlvo, materiais, coresDisponiveis, images, medidas } = validationResult.data;

    // ========== LOVABLE AI API ==========
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API de IA não configurada. Entre em contato com o suporte.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inputData = {
      productName: nomeProduto,
      category: categoria || '',
      brand: marca || '',
      priceRange: faixaPreco || '',
      audience: publicoAlvo || '',
      materials: materiais || '',
      colors: coresDisponiveis || '',
      measurements: medidas || null,
    };

    console.log('Gerando anúncio para:', inputData, 'com', images?.length || 0, 'imagens');

    // Build messages for Lovable AI (OpenAI-compatible format)
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];
    
    // Add system message
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Build user message content
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    
    // Add text content
    userContent.push({
      type: 'text',
      text: `Dados do produto:\n${JSON.stringify(inputData, null, 2)}`
    });

    // Add images if provided (Lovable AI supports image URLs in OpenAI format)
    if (images && images.length > 0) {
      console.log(`Adding ${images.length} images to request`);
      for (const img of images) {
        userContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
    }

    messages.push({
      role: 'user',
      content: userContent
    });

    console.log('Calling Lovable AI API...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da Lovable AI API:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Aguarde um momento e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: 'Requisição inválida. Verifique os dados enviados.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao gerar anúncio. Tente novamente em alguns instantes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received:', JSON.stringify(data).substring(0, 500));
    
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Resposta vazia do modelo:', JSON.stringify(data));
      const finishReason = data.choices?.[0]?.finish_reason;
      
      if (finishReason === 'length') {
        return new Response(
          JSON.stringify({ error: 'Resposta muito longa. Tente com menos imagens ou dados mais simples.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Resposta vazia do modelo de IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resposta bruta do modelo:', content.substring(0, 500));

    // Parse do JSON da resposta (pode vir com markdown)
    let parsedResult;
    try {
      // Remove possíveis marcações de código markdown
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar estrutura da resposta
    if (!parsedResult.titles || !Array.isArray(parsedResult.titles) || !parsedResult.description) {
      console.error('Estrutura de resposta inválida:', parsedResult);
      return new Response(
        JSON.stringify({ error: 'Formato de resposta inválido. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure keywords array exists
    if (!parsedResult.keywords || !Array.isArray(parsedResult.keywords)) {
      parsedResult.keywords = [];
    }

    console.log('Anúncio gerado com sucesso:', parsedResult.titles.length, 'títulos,', parsedResult.keywords.length, 'keywords');

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função generate-ad:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar anúncio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
