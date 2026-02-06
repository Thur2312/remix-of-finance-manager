import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

// ============= CORS HEADERS =============
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============= VALIDATION =============
interface ValidateInputRequest {
  sourceImages?: unknown;
  nomeProduto?: string;
  categoria?: string | null;
  coresDisponiveis?: string | null;
  materiais?: string | null;
  marketplaceTarget?: string;
}

interface ValidateInputResponse {
  valid: boolean;
  error?: string;
  data?: {
    sourceImages: string[];
    nomeProduto: string;
    categoria: string | null;
    coresDisponiveis: string | null;
    materiais: string | null;
    marketplaceTarget: string;
  };
}

function validateInput(body: ValidateInputRequest): ValidateInputResponse {
  if (!body.sourceImages || !Array.isArray(body.sourceImages) || body.sourceImages.length === 0) {
    return { valid: false, error: 'Pelo menos uma imagem é necessária' };
  }
  if (body.sourceImages.length > 5) {
    return { valid: false, error: 'Máximo de 5 imagens' };
  }
  if (!body.nomeProduto || typeof body.nomeProduto !== 'string' || body.nomeProduto.trim().length === 0) {
    return { valid: false, error: 'Nome do produto é obrigatório' };
  }
  const marketplaceTarget = body.marketplaceTarget === 'TikTok_Shop' ? 'TikTok_Shop' : 'Shopee';
  return {
    valid: true,
    data: {
      sourceImages: body.sourceImages,
      nomeProduto: body.nomeProduto,
      categoria: body.categoria || null,
      coresDisponiveis: body.coresDisponiveis || null,
      materiais: body.materiais || null,
      marketplaceTarget,
    }
  };
}

// ============= PROMPT BUILDER =============
function buildImagePrompt(
  index: number,
  totalImages: number,
  nomeProduto: string,
  categoria: string | null | undefined,
  coresDisponiveis: string | null | undefined,
  materiais: string | null | undefined,
  marketplaceTarget: string,
): string {
  const categoryMap: Record<string, string> = {
    'Moda Feminina': 'Fashion', 'Moda Masculina': 'Fashion', 'Moda Infantil': 'Fashion',
    'Acessórios': 'Accessories', 'Beleza & Cuidados': 'Beauty', 'Casa & Decoração': 'Home',
    'Eletrônicos': 'Electronics', 'Esportes': 'Fashion', 'Brinquedos': 'Other', 'Outros': 'Other',
  };

  const productCategory = categoria ? (categoryMap[categoria] || 'Other') : 'Other';

  const compositions = [
    'Front angle view, clean studio white background, product as main focus, professional e-commerce photography',
    'Side angle view, clean studio white background, showing product profile and proportions',
    '45-degree angle view, professional lighting, showing depth and dimension of the product',
    'Detail close-up shot focusing on texture, stitching, material quality, and key features',
    'In-context usage shot, showing the product being used naturally in its intended environment',
    'Lifestyle composition, product placed in a stylish real-world scenario, aspirational feel',
    'Clean studio background image, minimalist setup, pure white background, product centered',
    'Minimalist aesthetic composition, elegant negative space, artistic product placement',
    'Dynamic natural scenario image, outdoor or real-world environment, natural lighting',
  ];

  const composition = compositions[index % compositions.length];

  let categoryInstructions = '';
  if (productCategory === 'Fashion') {
    categoryInstructions = 'FASHION: Generate a professional, diverse model wearing EXACTLY this product. Natural catalog-style posing. No cartoonish features.';
  } else if (productCategory === 'Electronics') {
    categoryInstructions = 'ELECTRONICS: Place the product in realistic environments like modern office desk, workspace or gaming setup.';
  } else if (productCategory === 'Home') {
    categoryInstructions = 'HOME/DECORATION: Integrate the product into natural, stylish living space environments.';
  }

  let colorInstructions = '';
  if (coresDisponiveis && coresDisponiveis.trim()) {
    colorInstructions = `Available colors: ${coresDisponiveis}. Show the product in its natural/original color from the reference image.`;
  }

  return `Generate a photorealistic, commercial, marketplace-ready product image. No text, watermarks, logos, or promotional elements. Ultra-realistic photography quality suitable for ${marketplaceTarget === 'TikTok_Shop' ? 'TikTok Shop' : 'Shopee'}.

PRODUCT: ${nomeProduto}
${categoria ? `CATEGORY: ${categoria}` : ''}
${materiais ? `MATERIALS: ${materiais}` : ''}

COMPOSITION (${index + 1} of ${totalImages}): ${composition}
${categoryInstructions}
${colorInstructions}

The product must be the visual focus. Clean premium aesthetic, balanced lighting, realistic shadows, no AI artifacts. Based on the reference image, maintain perfect product fidelity.`;
}

// ============= MAIN FUNCTION =============
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ========== AUTH ==========
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
    const validationResult = validateInput(rawBody);
    
    if (!validationResult.valid) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const { sourceImages, nomeProduto, categoria, coresDisponiveis, materiais, marketplaceTarget } = validationResult.data!;

    // ========== LOVABLE AI (Nano Banana) ==========
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Chave da API Lovable AI não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalImages = 9;
    console.log(`Gerando ${totalImages} imagens via Lovable AI (Nano Banana) para: ${nomeProduto} | Marketplace: ${marketplaceTarget} | Refs: ${sourceImages.length}`);

    const generatedImages: Array<{ url: string; prompt: string; composition: string }> = [];
    
    const compositionLabels = [
      'Frontal', 'Lateral', '45 graus', 'Close-up detalhe',
      'Em uso', 'Lifestyle', 'Studio', 'Minimalista', 'Cenário dinâmico'
    ];

    for (let i = 0; i < totalImages; i++) {
      console.log(`Generating image ${i + 1}/${totalImages}...`);
      
      const prompt = buildImagePrompt(i, totalImages, nomeProduto, categoria, coresDisponiveis, materiais, marketplaceTarget);

      // Build message content with text prompt + reference image(s)
      const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: prompt },
      ];

      // Add reference images
      for (const img of sourceImages) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: img },
        });
      }

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [
              {
                role: 'user',
                content: messageContent,
              },
            ],
            modalities: ['image', 'text'],
          }),
        });

        if (response.status === 429) {
          console.error(`Rate limited at image ${i + 1}. Waiting 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          // Retry once
          const retryResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-image',
              messages: [{ role: 'user', content: messageContent }],
              modalities: ['image', 'text'],
            }),
          });
          if (retryResp.ok) {
            const retryData = await retryResp.json();
            const retryImageUrl = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (retryImageUrl) {
              generatedImages.push({
                url: retryImageUrl,
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

        if (response.status === 402) {
          console.error('Lovable AI credits exhausted (402)');
          // Return what we have so far
          if (generatedImages.length > 0) break;
          return new Response(
            JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos ao seu workspace Lovable.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Erro imagem ${i + 1}: ${response.status} - ${errText}`);
          continue;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageUrl) {
          generatedImages.push({
            url: imageUrl,
            prompt: prompt.slice(0, 200),
            composition: compositionLabels[i] || `Variação ${i + 1}`,
          });
          console.log(`Image ${i + 1} generated successfully`);
        } else {
          console.error(`No image returned for image ${i + 1}`);
        }

        // Rate limit delay between requests
        if (i < totalImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
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
    console.error('Erro na função generate-product-images:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar imagens' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
