import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// ✅ Cabeçalhos CORS para permitir chamadas do frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function generateShopeeAuthUrl() {
  const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")?.trim();
  const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim();
  const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")?.trim();
  const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")?.trim();

  if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
    throw new Error("Variáveis de ambiente da Shopee não configuradas corretamente");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/shop/auth_partner";
  const endpoint = "/api/v2/shop/auth_partner";

  const baseString = `${PARTNER_ID}${path}${timestamp}`;
  const sign = createHmac("sha256", PARTNER_KEY)
    .update(baseString)
    .digest("hex");

  return `${BASE_URL}${endpoint}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT_URI)}`;
}

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization_url = generateShopeeAuthUrl();

    // ✅ Redireciona o usuário para a Shopee (OAuth)
    return Response.redirect(authorization_url, 302);
  } catch (error) {
    console.error("Erro Shopee OAuth:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});