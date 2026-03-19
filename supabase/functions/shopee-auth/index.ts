// functions/shopee-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (_req) => {
  try {
    // Variáveis de ambiente
    const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID");
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim();
    const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI");
    const BASE_URL = "https://partner.shopeemobile.com"; // produção

    if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI) {
      return new Response("Shopee env vars não configuradas", { status: 500 });
    }

    // Timestamp atual em segundos
    const timestamp = Math.floor(Date.now() / 1000);

    // Path usado para gerar o sign
    const path = "/shop/auth_partner";

    // Base string para HMAC
    const baseString = `${PARTNER_ID}${path}${timestamp}`;

    // Criar sign SHA256
    const sign = createHmac("sha256", PARTNER_KEY)
      .update(baseString)
      .digest("hex");

    // Montar URL de autorização da Shopee
    const authorizationUrl = `${BASE_URL}/api/v2/shop/auth_partner?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT_URI)}`;

    // Redirecionar usuário
    return Response.redirect(authorizationUrl, 302);

  } catch (error) {
    console.error("Erro na Shopee Auth:", error);
    return new Response("Erro interno na Shopee Auth", { status: 500 });
  }
});