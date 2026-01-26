import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { parseBankStatementSchema, createValidationErrorResponse } from '../_shared/validation.ts';

serve(async (req : Request ) => {
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
    const validationResult = parseBankStatementSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error, corsHeaders);
    }
    
    const { pdfBase64, fileName } = validationResult.data;
    // ========== FIM INPUT VALIDATION ==========

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing PDF: ${fileName || 'unknown'} for user: ${userId}`);

    const prompt = `Analise este extrato bancário PDF e extraia TODAS as transações financeiras.

Para cada transação encontrada, retorne os seguintes campos:
- date: Data da transação no formato YYYY-MM-DD
- description: Descrição completa da transação
- amount: Valor numérico (positivo para entradas/créditos, negativo para saídas/débitos)
- counterpart: Nome do pagador ou beneficiário (se identificável na descrição)
- balance: Saldo após a transação (se disponível)

IMPORTANTE:
- Ignore cabeçalhos, rodapés, informações da conta e textos não relacionados a transações
- Mantenha a ordem cronológica das transações
- Para valores, use ponto como separador decimal (ex: 1234.56)
- Se não conseguir identificar a contraparte, use null
- Se não houver saldo disponível, use null

Retorne APENAS um JSON válido no seguinte formato (sem markdown, sem explicações):
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "PIX RECEBIDO - JOAO SILVA",
      "amount": 150.00,
      "counterpart": "JOAO SILVA",
      "balance": 1500.00
    }
  ],
  "bankName": "Nome do banco (se identificável)",
  "accountNumber": "Número da conta (se identificável)",
  "startDate": "Data inicial do extrato",
  "endDate": "Data final do extrato"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdfBase64.startsWith('data:') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process PDF with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received, parsing JSON...');

    // Tentar extrair JSON da resposta
    let parsedResult;
    try {
      // Remover possíveis marcadores de código markdown
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse AI response',
          rawContent: content.substring(0, 500),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar e formatar transações
    const transactions = (parsedResult.transactions || []).map((t: any, index: number) => ({
      id: `pdf_${Date.now()}_${index}`,
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Transação',
      amount: Math.abs(parseFloat(t.amount) || 0),
      type: (parseFloat(t.amount) || 0) >= 0 ? 'income' : 'expense',
      counterpart: t.counterpart || null,
      balance: t.balance !== null && t.balance !== undefined ? parseFloat(t.balance) : null,
      fitid: null,
    }));

    console.log(`Extracted ${transactions.length} transactions from PDF for user: ${userId}`);

    return new Response(
      JSON.stringify({
        transactions,
        bankName: parsedResult.bankName || null,
        accountNumber: parsedResult.accountNumber || null,
        startDate: parsedResult.startDate || null,
        endDate: parsedResult.endDate || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing bank statement:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
