import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { generateAdSchema, createValidationErrorResponse } from '../_shared/validation.ts';

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
      - Exemplo de formato:
        👗 Detalhes do produto
        - Costas nuas: Detalhe marcante que transforma o vestido em sinônimo de ousadia elegante
        - Forro duplo: Possui forro duplo na área dos seios para não marcar
        - Modelagem tubinho: Valoriza as curvas de forma sofisticada, sem apertar
        - Tecido suplex premium: Macio, elástico e confortável, abraça o corpo com caimento impecável
   
   C) 📏 TAMANHO E MEDIDAS:
      - Se o usuário fornecer medidas no campo "measurements", criar seção formatada assim:
        📏 Tamanho e medidas
        Tamanho: [valor de measurements.tamanho] (veste aproximadamente...)
        - Comprimento: X cm
        - Largura: X cm (tecido com elasticidade)
        - Busto: X cm (tecido com elasticidade)
        - Ombro: X cm
        - Cintura: X cm (se aplicável)
        - Quadril: X cm (se aplicável)
      - Adicionar nota sobre elasticidade do tecido quando aplicável
      - Se não houver medidas fornecidas, NÃO incluir esta seção
   
   D) ♻️ CUIDADOS COM A PEÇA:
      - PESQUISE E FORNEÇA instruções de lavagem ESPECÍFICAS para o tipo de tecido informado
      - Para cada tecido, as instruções DEVEM ser diferentes e precisas:
        * SUPLEX: Lavável à máquina em água fria, secar à sombra, passar em temperatura baixa, não usar alvejante
        * ALGODÃO: Lavável à máquina, pode passar em temperatura média, secar ao sol ou máquina
        * VISCOSE: Lavar à mão ou máquina ciclo delicado, secar à sombra, passar em temperatura baixa do avesso
        * LINHO: Lavar à mão ou máquina ciclo delicado, secar à sombra, passar com vapor
        * SEDA: Lavar à mão com sabão neutro, não torcer, secar à sombra, passar em temperatura baixa do avesso
        * POLIÉSTER: Lavável à máquina, secar à sombra, não passar ou temperatura baixa
        * CREPE: Lavar à mão ou máquina ciclo delicado, secar à sombra, passar em temperatura baixa do avesso
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração de IA não encontrada' }),
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

    // Build user content - multimodal if images provided
    let userContent: any;
    if (images && images.length > 0) {
      userContent = [
        { type: "text", text: JSON.stringify(inputData, null, 2) },
        ...images.map((img: string) => ({
          type: "image_url",
          image_url: { url: img }
        }))
      ];
    } else {
      userContent = JSON.stringify(inputData, null, 2);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do gateway AI:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas requisições. Aguarde um momento e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos para continuar.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Erro ao gerar anúncio. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
