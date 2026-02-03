/// <reference lib="deno.ns" />
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============= CORS FUNCTIONS (INLINE) =============
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Allow all localhost and local network IPs for development
  const isLocalDev = origin.includes('localhost') || 
                     origin.includes('127.0.0.1') ||
                     origin.match(/http:\/\/192\.168\.\d+\.\d+/) ||
                     origin.match(/http:\/\/172\.\d+\.\d+\.\d+/) ||
                     origin.match(/http:\/\/10\.\d+\.\d+\.\d+/);
  
  const allowedOrigins = [
    'https://id-preview--421daa1a-5e46-4a66-a384-f5a2f89a0cbe.lovable.app',
  ];
  
  const isAllowed = allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) || isLocalDev;
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

// ============= VALIDATION (INLINE) =============
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

function createValidationErrorResponse(
  error: z.ZodError,
  corsHeaders: Record<string, string>
): Response {
  const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  console.error('Validation error:', issues);
  
  return new Response(
    JSON.stringify({ 
      error: 'Dados inválidos', 
      details: issues 
    }),
    { 
      status: 400, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}

// ============= MAIN FUNCTION =============
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
   - "Saia Midi Feminino Social Alfaiataria Fenda Lateral"
   - "Conjunto Feminino Verão Estampado Viscose Short e Blusa"
   
   REGRAS OBRIGATÓRIAS PARA TÍTULOS:
   - SEMPRE começar com o tipo de produto (Vestido, Blusa, Calça, Saia, etc.)
   - SEMPRE incluir gênero logo após o tipo (Feminino, Masculino, Infantil, Unissex)
   - MÁXIMO 100 caracteres por título (limite da Shopee)
   - Incorporar keywords identificadas de forma natural
   - NÃO usar promessas exageradas, CAPS LOCK excessivo ou símbolos
   - NÃO usar traços, vírgulas ou pontuação desnecessária

4. GERAR DESCRIÇÃO COMPLETA seguindo ESTA ESTRUTURA OBRIGATÓRIA:

   A) ABERTURA EMOCIONAL (1-2 frases):
      - Frase envolvente que conecta com o desejo do cliente
      - Use linguagem emocional e aspiracional
      - Exemplo: "Se você gosta de entrar em qualquer lugar e ser notada sem esforço, esse é o look perfeito."
   
   B) 👗 DETALHES DO PRODUTO:
      - Liste os principais diferenciais em tópicos com bullet points (-)
      - Destaque características marcantes (costas nuas, decote, modelagem, forro, etc.)
      - Descreva o tecido e seus benefícios (macio, elástico, confortável, etc.)
      - Mencione o comprimento e ocasiões de uso
      - Use descrições que vendem (ex: "abraça o corpo com caimento impecável")
   
   C) 📏 TAMANHO E MEDIDAS:
      - Se o usuário fornecer medidas, criar seção formatada com tabela
      - Se não houver medidas fornecidas, NÃO incluir esta seção
   
   D) ♻️ CUIDADOS COM A PEÇA:
      - PESQUISE E FORNEÇA instruções de lavagem ESPECÍFICAS para o tipo de tecido informado
      - Formato obrigatório:
        ♻️ Cuidados com a peça
        - Lavagem: [instrução específica]
        - Secagem: [instrução específica]
        - Passar: [instrução específica]
        - Alvejante: [instrução específica]
   
   E) FECHAMENTO:
      - SEMPRE incluir: "⁉️ Ficou com alguma dúvida? Não deixe de nos contactar através do chat."

FORMATO DE RESPOSTA (JSON válido, sem texto extra):
{
  "titles": ["Título 1", "Título 2", "Título 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "description": "Descrição completa seguindo a estrutura A-B-C-D-E acima, com emojis e formatação."
}

REGRAS GERAIS:
- Escreva sempre em português do Brasil, tom profissional mas acessível
- Foque em moda feminina e varejo online, mas adapte para outros nichos se necessário
- Crie sempre texto original baseado nas entradas e análise visual
- Use emojis apenas nos títulos de seção (👗, 📏, ♻️, ⁉️)
- Retorne APENAS o JSON, sem markdown ou texto adicional`;

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

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
    // ========== FIM AUTENTICAÇÃO ==========

    // ========== INPUT VALIDATION ==========
    const rawBody = await req.json();
    const validationResult = generateAdSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error, corsHeaders);
    }
    
    const { nomeProduto, categoria, marca, faixaPreco, publicoAlvo, materiais, coresDisponiveis, images, medidas } = validationResult.data;
    // ========== FIM INPUT VALIDATION ==========

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API do Google Gemini não configurada. Configure GOOGLE_API_KEY nas secrets.' }),
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

    // Build Gemini request format
    const userPrompt = `${systemPrompt}\n\nDados do produto:\n${JSON.stringify(inputData, null, 2)}`;
    
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: userPrompt }
    ];

    // Add images if provided (base64 format)
    if (images && images.length > 0) {
      images.forEach((img: string) => {
        // Extract base64 data from data URL
        const matches = img.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (matches) {
          parts.push({
            inlineData: {
              mimeType: `image/${matches[1]}`,
              data: matches[2]
            }
          });
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Gemini:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições atingido. Aguarde um momento.' }),
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
        JSON.stringify({ error: 'Erro ao gerar anúncio. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('Resposta vazia do modelo:', data);
      return new Response(
        JSON.stringify({ error: 'Resposta vazia do modelo de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resposta bruta do modelo:', content);

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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
