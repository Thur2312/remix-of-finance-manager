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

// ============= SYSTEM PROMPT - PROFISSIONAL SEM EMOJIS =============
const systemPrompt = `Você é um copywriter especialista em marketplaces brasileiros como Shopee e TikTok Shop, com profundo conhecimento em psicologia do consumidor e técnicas de conversão.

ENTRADAS:
- Dados do produto em JSON
- Imagens do produto (se fornecidas) para análise visual

SUA TAREFA:

1. ANÁLISE DO PRODUTO:
   - Entenda profundamente o produto — o que ele resolve, quem vai usar, em qual momento
   - Se houver imagens, analise detalhes visuais que o usuário pode ter esquecido de mencionar
   - Identifique o diferencial real do produto, não invente características

2. PALAVRAS-CHAVE:
   - Identifique 5 a 10 termos que compradores reais usam para buscar esse produto
   - Misture termos técnicos e populares
   - Considere variações de nomenclatura regionais do Brasil

3. TÍTULOS (gere 3 a 5):
   - Estrutura: [tipo de produto] + [característica principal] + [benefício ou público]
   - Máximo 100 caracteres
   - Sem emojis, sem CAPS LOCK excessivo, sem promessas exageradas
   - Cada título deve ter uma abordagem diferente — um mais técnico, um mais emocional, um mais direto

4. DESCRIÇÃO AUTÊNTICA:
   Escreva uma descrição que equilibre emoção e informação, seguindo essa lógica:

   A) GANCHO (1-2 frases):
      - Conecte com uma situação real que o comprador vive
      - Seja específico ao produto — evite frases genéricas como "qualidade incomparável"
      - Exemplo para uma mochila: "Quantas vezes você já ficou sem espaço na bolsa na hora que mais precisava?"
      - Exemplo para um vestido: "Aquela peça que serve para o jantar e para o café da manhã seguinte."

   B) O QUE É E O QUE FAZ:
      - Explique o produto de forma clara e honesta
      - Use bullet points com traço (-)
      - Cada ponto deve trazer uma informação nova e relevante
      - Misture características técnicas com benefícios práticos
      - Exemplo ruim: "- Material de alta qualidade"
      - Exemplo bom: "- Tecido dupla face que não amassa na mala — chega impecável em qualquer destino"

   C) PARA QUEM É:
      - Descreva o perfil de quem vai amar esse produto
      - Mencione ocasiões de uso reais e específicas
      - Seja inclusivo e autêntico

   D) MEDIDAS (apenas se fornecidas pelo usuário):
      - Apresente em formato de tabela textual clara
      - Inclua orientação de como medir

   E) CUIDADOS (apenas se material/tecido for informado):
      - Instruções específicas para o material informado
      - Formato direto e prático

   F) FECHAMENTO:
      - Uma frase que reforce a confiança na compra
      - SEMPRE terminar com: "Ficou com alguma dúvida? Não deixe de nos contactar através do chat."

REGRAS:
- Português do Brasil natural e fluente — escreva como um humano, não como um robô
- PROIBIDO emojis em qualquer parte
- PROIBIDO frases genéricas como "qualidade incomparável", "produto incrível", "o melhor do mercado"
- Cada descrição deve parecer escrita especificamente para aquele produto
- Retorne APENAS o JSON válido, sem markdown ou texto adicional

FORMATO DE RESPOSTA:
{
  "titles": ["Título 1", "Título 2", "Título 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "description": "Descrição completa seguindo a estrutura A-F acima."
}`

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('JWT validation failed:', userError)
        return new Response(
          JSON.stringify({ error: 'Token inválido ou expirado. Faça login novamente.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = user.id
      console.log(`Request authenticated for user: ${userId}`)

    // ========== INPUT VALIDATION ==========
    const rawBody = await req.json();
    const validationResult = generateAdSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error);
    }
    
    const { nomeProduto, categoria, marca, faixaPreco, publicoAlvo, materiais, coresDisponiveis, images, medidas } = validationResult.data;

    // ========== GOOGLE GEMINI API ==========
const GOOGLE_GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY não configurada');
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

    // Build parts for Gemini API
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    
    // Add system + user text
    parts.push({
      text: `${systemPrompt}\n\nDados do produto:\n${JSON.stringify(inputData, null, 2)}`
    });

    // Add images if provided (convert base64 data URLs to inlineData)
    if (images && images.length > 0) {
      console.log(`Adding ${images.length} images to request`);
      for (const img of images) {
        if (img.startsWith('data:')) {
          const match = img.match(/^data:(.+?);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: { mimeType: match[1], data: match[2] }
            });
          }
        } else {
          // For URLs, add as text reference
          parts.push({ text: `[Imagem de referência: ${img}]` });
        }
      }
    }

    console.log('Calling Google Gemini API...');
    
    const geminiModel = 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da Google Gemini API:', response.status, errorText);

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
    console.log('Google Gemini response received');
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('Resposta vazia do modelo:', JSON.stringify(data));
      const finishReason = data.candidates?.[0]?.finishReason;
      
      if (finishReason === 'MAX_TOKENS') {
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

    console.log('Resposta bruta do modelo:', content.substring(0, 300));

    // Parse do JSON da resposta
    let parsedResult;
    try {
      
      const cleanContent = content
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      parsedResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError, 'Content length:', content.length, 'Content:', content.substring(0, 500));
      
      // Check if truncated
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'MAX_TOKENS') {
        console.error('Response was truncated by token limit');
      }
      
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
