import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ValidateInputRequest {
  sourceImages?: unknown;
  nomeProduto?: string;
  categoria?: string | null;
  coresDisponiveis?: string | null;
  materiais?: string | null;
  marketplaceTarget?: string;
}

function validateInput(body: ValidateInputRequest) {
  if (!body.sourceImages || !Array.isArray(body.sourceImages) || body.sourceImages.length === 0) {
    return { valid: false as const, error: 'Pelo menos uma imagem é necessária' };
  }
  if (body.sourceImages.length > 5) {
    return { valid: false as const, error: 'Máximo de 5 imagens' };
  }
  if (!body.nomeProduto || typeof body.nomeProduto !== 'string' || body.nomeProduto.trim().length === 0) {
    return { valid: false as const, error: 'Nome do produto é obrigatório' };
  }
  const marketplaceTarget = body.marketplaceTarget === 'TikTok_Shop' ? 'TikTok_Shop' : 'Shopee';
  return {
    valid: true as const,
    data: {
      sourceImages: body.sourceImages as string[],
      nomeProduto: body.nomeProduto,
      categoria: body.categoria || null,
      coresDisponiveis: body.coresDisponiveis || null,
      materiais: body.materiais || null,
      marketplaceTarget,
    }
  };
}

function buildImagePrompt(
  index: number,
  totalImages: number,
  nomeProduto: string,
  categoria: string | null,
  coresDisponiveis: string | null,
  materiais: string | null,
  marketplaceTarget: string,
): string {
  const compositions = [
    'Front angle view, clean studio white background, product centered, professional e-commerce photography',
    'Side angle view, clean studio white background, showing product profile and proportions',
    '45-degree angle view, professional lighting, showing depth and dimension',
    'Detail close-up shot focusing on texture, stitching, material quality',
    'In-context usage shot, product being used naturally in its intended environment',
    'Lifestyle composition, product in a stylish real-world scenario, aspirational feel',
    'Clean studio shot, minimalist setup, pure white background, product centered',
    'Minimalist aesthetic, elegant negative space, artistic product placement',
    'Dynamic natural scene, outdoor or real-world environment, natural lighting',
  ];

  const composition = compositions[index % compositions.length];

  const categoryMap: Record<string, string> = {
    'Moda Feminina': 'Fashion', 'Moda Masculina': 'Fashion', 'Moda Infantil': 'Fashion',
    'Acessórios': 'Accessories', 'Beleza & Cuidados': 'Beauty', 'Casa & Decoração': 'Home',
    'Eletrônicos': 'Electronics', 'Esportes': 'Fashion', 'Brinquedos': 'Other', 'Outros': 'Other',
  };

  const productCategory = categoria ? (categoryMap[categoria] || 'Other') : 'Other';

  let categoryInstructions = '';
  if (productCategory === 'Fashion') {
    categoryInstructions = 'Show a professional model wearing this exact product. Natural catalog-style posing.';
  } else if (productCategory === 'Electronics') {
    categoryInstructions = 'Place the product on a modern desk or workspace setup.';
  } else if (productCategory === 'Home') {
    categoryInstructions = 'Integrate the product into a stylish living space.';
  }

  return `Generate a photorealistic, commercial product image for ${marketplaceTarget === 'TikTok_Shop' ? 'TikTok Shop' : 'Shopee'} marketplace. No text, watermarks, or logos.

PRODUCT: ${nomeProduto}
${categoria ? `CATEGORY: ${categoria}` : ''}
${materiais ? `MATERIALS: ${materiais}` : ''}
${coresDisponiveis ? `COLORS: ${coresDisponiveis}` : ''}

COMPOSITION (${index + 1}/${totalImages}): ${composition}
${categoryInstructions}

Ultra-realistic photography, clean premium aesthetic, balanced lighting, realistic shadows. The product must be the visual focus.`;
}

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

    const rawBody = await req.json();
    const validation = validateInput(rawBody);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sourceImages, nomeProduto, categoria, coresDisponiveis, materiais, marketplaceTarget } = validation.data!;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Chave da API Gemini não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  const totalImages = 1;
  const compositionLabels = ['Frontal'];

    console.log(`Generating ${totalImages} images via gemini-2.5-flash-image for: ${nomeProduto} | Marketplace: ${marketplaceTarget}`);

    const generatedImages: Array<{ url: string; prompt: string; composition: string }> = [];

    for (let i = 0; i < totalImages; i++) {
      console.log(`Generating image ${i + 1}/${totalImages}...`);

      const prompt = buildImagePrompt(i, totalImages, nomeProduto, categoria, coresDisponiveis, materiais, marketplaceTarget);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
              },
            }),
          }
        );

       if (response.status === 429) {
  const errBody = await response.text(); // ✅ adiciona isso
  console.error(`Rate limited at image ${i + 1}. Body: ${errBody}`); // ✅ loga o body
  await new Promise(resolve => setTimeout(resolve, 60000));

          const retryResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  responseModalities: ['TEXT', 'IMAGE'],
                },
              }),
            }
          );

          if (retryResp.ok) {
            const retryData = await retryResp.json();
            const parts = retryData.candidates?.[0]?.content?.parts || [];
            const imgPart = parts.find((p: { inlineData?: { mimeType: string } }) => p.inlineData?.mimeType?.startsWith('image/'));
            if (imgPart) {
              generatedImages.push({
                url: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
                prompt: prompt.slice(0, 200),
                composition: compositionLabels[i] || `Variação ${i + 1}`,
              });
              console.log(`Image ${i + 1} generated (after retry)`);
            }
          } else {
            console.error(`Retry failed for image ${i + 1}: ${retryResp.status}`);
          }
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Error image ${i + 1}: ${response.status} - ${errText}`);
          continue;
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: { inlineData?: { mimeType: string } }) => p.inlineData?.mimeType?.startsWith('image/'));

        if (imgPart) {
          generatedImages.push({
            url: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
            prompt: prompt.slice(0, 200),
            composition: compositionLabels[i] || `Variação ${i + 1}`,
          });
          console.log(`Image ${i + 1} generated successfully`);
        } else {
          console.error(`No image returned for image ${i + 1}`, JSON.stringify(data).slice(0, 300));
        }

        if (i < totalImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 60000));
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
        count: generatedImages.length,
        marketplace: marketplaceTarget,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-product-images:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar imagens' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 