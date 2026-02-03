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
const generateImagesSchema = z.object({
  sourceImages: z.array(z.string()).min(1, 'Pelo menos uma imagem é necessária').max(5),
  nomeProduto: z.string().min(1),
  categoria: z.string().optional().nullable(),
  coresDisponiveis: z.string().optional().nullable(),
  materiais: z.string().optional().nullable(),
});

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
    const validationResult = generateImagesSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      console.error('Validation error:', issues);
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: issues }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const { sourceImages, nomeProduto, categoria, coresDisponiveis, materiais } = validationResult.data;

    // ========== LOVABLE AI API ==========
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API de IA não configurada. Entre em contato com o suporte.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gerando imagens para:', nomeProduto, 'com', sourceImages.length, 'imagens de referência');

    // Build prompt for image generation
    const imagePrompt = `Crie uma imagem promocional profissional de e-commerce para o seguinte produto:

Produto: ${nomeProduto}
${categoria ? `Categoria: ${categoria}` : ''}
${coresDisponiveis ? `Cores: ${coresDisponiveis}` : ''}
${materiais ? `Material: ${materiais}` : ''}

A imagem deve ser:
- Fundo branco ou claro, limpo e profissional
- Produto em destaque, bem iluminado
- Estilo de fotografia de e-commerce de alta qualidade
- Adequada para anúncio na Shopee Brasil
- Aspecto atraente e comercial

Baseie-se na imagem de referência fornecida para manter a identidade visual do produto.`;

    // Generate images using Lovable AI image generation model
    const generatedImages: Array<{ url: string; prompt: string }> = [];
    
    // Generate 2 variations
    for (let i = 0; i < 2; i++) {
      console.log(`Generating image ${i + 1}/2...`);
      
      try {
        const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          { type: 'text', text: imagePrompt + (i === 1 ? '\n\nCrie uma variação diferente, com outro ângulo ou composição.' : '') }
        ];

        // Add first source image as reference
        if (sourceImages[0]) {
          userContent.push({
            type: 'image_url',
            image_url: { url: sourceImages[0] }
          });
        }

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [
              {
                role: 'user',
                content: userContent
              }
            ],
            modalities: ['image', 'text'],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro ao gerar imagem ${i + 1}:`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Limite de requisições atingido. Aguarde um momento e tente novamente.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'Créditos de IA esgotados. Por favor, adicione créditos na sua conta.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          continue; // Skip this image and try next
        }

        const data = await response.json();
        console.log(`Image ${i + 1} response received`);
        
        // Extract generated image from response
        const images = data.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          const imageUrl = images[0]?.image_url?.url;
          if (imageUrl) {
            generatedImages.push({
              url: imageUrl,
              prompt: imagePrompt
            });
            console.log(`Image ${i + 1} generated successfully`);
          }
        }
      } catch (imgError) {
        console.error(`Error generating image ${i + 1}:`, imgError);
      }
    }

    if (generatedImages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar imagens. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated ${generatedImages.length} images`);

    return new Response(
      JSON.stringify({ 
        success: true,
        images: generatedImages,
        count: generatedImages.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função generate-product-images:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar imagens' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
