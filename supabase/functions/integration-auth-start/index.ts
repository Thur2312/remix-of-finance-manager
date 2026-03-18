import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req ) => {
  // Lidar com o Preflight (OPTIONS request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider } = await req.json()
    let authorization_url = ""

    switch (provider) {
      case 'shopee':
        { const SHOPEE_PARTNER_ID = Deno.env.get('SHOPEE_PARTNER_ID');
        const SHOPEE_PARTNER_KEY = Deno.env.get('SHOPEE_PARTNER_KEY');
        const SHOPEE_REDIRECT_URI = Deno.env.get('SHOPEE_REDIRECT_URI');
        const SHOPEE_BASE_URL = Deno.env.get('SHOPEE_BASE_URL');

        if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY || !SHOPEE_REDIRECT_URI || !SHOPEE_BASE_URL) {
          throw new Error('Variáveis de ambiente da Shopee não configuradas corretamente.');
        }

        // Gerar timestamp e signature para a Shopee
        const timestamp = Math.floor(Date.now() / 1000);
        const path = '/api/v2/auth/token'; // Exemplo, ajuste conforme a API da Shopee
        const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
        const signature = createHmac('sha256', SHOPEE_PARTNER_KEY).update(baseString).digest('hex');

        // Construir a URL de autorização da Shopee
        authorization_url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${signature}&redirect_url=${SHOPEE_REDIRECT_URI}`;
        break; }
      case 'tiktok':
        {
        const TIKTOK_CLIENT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY');
        const TIKTOK_CLIENT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET');
        const TIKTOK_REDIRECT_URI = Deno.env.get('TIKTOK_REDIRECT_URI');

        if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
          throw new Error('Variáveis de ambiente do TikTok não configuradas corretamente.');
        }

        // Construir a URL de autorização do TikTok Shop
        // Adapte os 'state' e 'scope' conforme a sua necessidade
        authorization_url = `https://auth.tiktok-shops.com/oauth/authorize?app_key=${TIKTOK_CLIENT_KEY}&redirect_uri=${TIKTOK_REDIRECT_URI}&state=random_state_string&scope=user_info,order_read`;
        break;
        }
      default:
        throw new Error('Provedor de integração não suportado.' );
    }

    return new Response(
      JSON.stringify({ authorization_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
