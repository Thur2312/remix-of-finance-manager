// functions/shopee-auth-test/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (_req) => {
  try {
    const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID");
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim();
    const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI");
    const BASE_URL = "https://partner.test-stable.shopeemobile.com";

    if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI) {
      return new Response("Shopee env vars não configuradas", { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/auth_partner"; // ✅ path completo

    // ✅ Base string correta para auth_partner inclui o redirect_uri
    const baseString = `${PARTNER_ID}${path}${timestamp}${REDIRECT_URI}`;

    const sign = createHmac("sha256", PARTNER_KEY)
      .update(baseString)
      .digest("hex");

    const authorizationUrl = `${BASE_URL}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT_URI)}`;

    return Response.redirect(authorizationUrl, 302);

  } catch (error) {
    console.error("Erro na Shopee Auth Test:", error);
    return new Response("Erro interno na Shopee Auth Test", { status: 500 });
  }
});