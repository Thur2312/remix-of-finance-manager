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
  // Map categories to prompt category types
  const categoryMap: Record<string, string> = {
    'Moda Feminina': 'Fashion',
    'Moda Masculina': 'Fashion',
    'Moda Infantil': 'Fashion',
    'Acessórios': 'Accessories',
    'Beleza & Cuidados': 'Beauty',
    'Casa & Decoração': 'Home',
    'Eletrônicos': 'Electronics',
    'Esportes': 'Fashion',
    'Brinquedos': 'Other',
    'Outros': 'Other',
  };

  const productCategory = categoria ? (categoryMap[categoria] || 'Other') : 'Other';

  // Define the 9 required angle/composition variations
  const compositions = [
    'Front angle view, clean studio white background, product as main focus, professional e-commerce photography',
    'Side angle view, clean studio white background, showing product profile and proportions',
    '45-degree angle view, professional lighting, showing depth and dimension of the product',
    'Detail close-up shot focusing on texture, stitching, material quality, and key features of the product',
    'In-context usage shot, showing the product being used naturally in its intended environment',
    'Lifestyle composition, product placed in a stylish real-world scenario, aspirational feel',
    'Clean studio background image, minimalist setup, pure white background, product centered',
    'Minimalist aesthetic composition, elegant negative space, artistic product placement',
    'Dynamic natural scenario image, outdoor or real-world environment, natural lighting',
  ];

  const composition = compositions[index % compositions.length];

  // Category-specific environment instructions
  let categoryInstructions = '';
  if (productCategory === 'Fashion') {
    categoryInstructions = `
FASHION CATEGORY RULES:
- Completely discard any original model from the reference image.
- Generate a NEW professional, realistic, diverse model from scratch.
- The new model must wear EXACTLY the same product from the reference image.
- Fabric behavior, fit, drape, and proportions must look natural and realistic.
- Model must have professional, natural, catalog-style posing.
- Commercial, premium marketplace appearance.
- No exaggerated poses or cartoonish features.`;
  } else if (productCategory === 'Electronics') {
    categoryInstructions = `
ELECTRONICS CATEGORY RULES:
- Place the product in realistic, relevant environments of use.
- Examples: modern office desk, next to a laptop or monitor, professional workspace or gaming setup.
- Show close-up of key features and design details.`;
  } else if (productCategory === 'Home') {
    categoryInstructions = `
HOME/DECORATION CATEGORY RULES:
- Integrate the product into natural, stylish environments consistent with its use.
- Show the product in a real living space context (kitchen, living room, bedroom as appropriate).`;
  }

  // Color variation instructions
  let colorInstructions = '';
  if (coresDisponiveis && coresDisponiveis.trim()) {
    colorInstructions = `
COLOR RULES: The product may come in these colors: ${coresDisponiveis}. 
Show the product in its natural/original color as seen in the reference image. The product design, texture, material, shape, and proportions must match the reference exactly.`;
  }

  return `You are a professional AI image generation engine specialized in creating ultra-realistic, commercial, marketplace-ready product images.

MANDATE: Generate ONLY the image. No text, watermarks, graphics, logos, or promotional elements. The image must be photorealistic, commercially polished, and suitable for ${marketplaceTarget === 'TikTok_Shop' ? 'TikTok Shop' : 'Shopee'}.

PRODUCT: ${nomeProduto}
${categoria ? `CATEGORY: ${categoria} (${productCategory})` : ''}
${materiais ? `MATERIALS: ${materiais}` : ''}
${coresDisponiveis ? `AVAILABLE COLORS: ${coresDisponiveis}` : ''}

COMPOSITION FOR THIS IMAGE (${index + 1} of ${totalImages}):
${composition}
${categoryInstructions}
${colorInstructions}

PRODUCT FIDELITY RULES (NON-NEGOTIABLE):
1. The product MUST be visually identical to the reference image: same color, texture, material, shape, proportions, stitching, patterns, and finish.
2. Do NOT stylize, redesign, smooth, enhance, or "improve" the product unless the composition requires a different angle.
3. The product must always be the visual focus of the image.
4. Backgrounds must be realistic, coherent with the category, and non-distracting.
5. No text, labels, or branding overlays of any kind.

AESTHETIC GUIDELINES:
- Clean, premium aesthetic
- Harmonious color palette
- Balanced lighting with soft, realistic shadows
- No visual clutter in the background
- Ultra-realistic photography-level rendering
- Natural or professional studio lighting
- Clean composition with proper depth of field
- No AI artifacts, distortions, or unrealistic textures

Based on the reference image provided, create this specific composition while maintaining perfect product fidelity.`;
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

    // ========== HUGGING FACE INFERENCE API ==========
    const HF_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HF_API_KEY) {
      console.error('HUGGINGFACE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Chave da API Hugging Face não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalImages = 9;
    const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
    console.log(`Gerando ${totalImages} imagens via Hugging Face (${HF_MODEL}) para: ${nomeProduto} | Marketplace: ${marketplaceTarget} | Refs: ${sourceImages.length}`);

    const generatedImages: Array<{ url: string; prompt: string; composition: string }> = [];
    
    const compositionLabels = [
      'Frontal', 'Lateral', '45 graus', 'Close-up detalhe',
      'Em uso', 'Lifestyle', 'Studio', 'Minimalista', 'Cenário dinâmico'
    ];

    for (let i = 0; i < totalImages; i++) {
      console.log(`Generating image ${i + 1}/${totalImages}...`);
      
      const prompt = buildImagePrompt(i, totalImages, nomeProduto, categoria, coresDisponiveis, materiais, marketplaceTarget);

      try {
        const response = await fetch(`https://router.huggingface.co/models/${HF_MODEL}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt.slice(0, 500),
            parameters: {
              width: marketplaceTarget === 'TikTok_Shop' ? 512 : 1024,
              height: marketplaceTarget === 'TikTok_Shop' ? 512 : 1024,
              num_inference_steps: 30,
              seed: Date.now() + i,
            },
          }),
        });

        if (response.status === 503) {
          console.log(`Model loading, waiting 20s for image ${i + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 20000));
          // Retry once
          const retryResponse = await fetch(`https://router.huggingface.co/models/${HF_MODEL}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt.slice(0, 500),
              parameters: {
                width: marketplaceTarget === 'TikTok_Shop' ? 512 : 1024,
                height: marketplaceTarget === 'TikTok_Shop' ? 512 : 1024,
                num_inference_steps: 30,
                seed: Date.now() + i + 100,
              },
            }),
          });
          if (!retryResponse.ok) {
            console.error(`Retry failed for image ${i + 1}: ${retryResponse.status}`);
            continue;
          }
          const buffer = await retryResponse.arrayBuffer();
          const uint8 = new Uint8Array(buffer);
          let bin = '';
          for (let j = 0; j < uint8.length; j++) bin += String.fromCharCode(uint8[j]);
          generatedImages.push({
            url: `data:image/jpeg;base64,${btoa(bin)}`,
            prompt: prompt.slice(0, 200),
            composition: compositionLabels[i] || `Variação ${i + 1}`,
          });
          console.log(`Image ${i + 1} generated (after retry)`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Erro imagem ${i + 1}: ${response.status} - ${errText}`);
          continue;
        }

        const imageBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(imageBuffer);
        let binary = '';
        for (let j = 0; j < uint8Array.length; j++) {
          binary += String.fromCharCode(uint8Array[j]);
        }
        const base64 = btoa(binary);

        generatedImages.push({
          url: `data:image/jpeg;base64,${base64}`,
          prompt: prompt.slice(0, 200),
          composition: compositionLabels[i] || `Variação ${i + 1}`,
        });
        console.log(`Image ${i + 1} generated successfully`);

        // Rate limit delay
        if (i < totalImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
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
