import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

serve(async (req) => {
  // ✅ CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  try {
    const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")?.trim();
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim();
    const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")?.trim();
    const BASE_URL = "https://partner.test-stable.shopeemobile.com";

    if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "Shopee env vars não configuradas" }),
        { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const partnerIdNum = parseInt(PARTNER_ID, 10);
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/auth_partner";

    const baseString = `${partnerIdNum}${path}${timestamp}`;

    const sign = createHmac("sha256", PARTNER_KEY)
      .update(baseString)
      .digest("hex");

    const authorization_url = `${BASE_URL}${path}?partner_id=${partnerIdNum}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(REDIRECT_URI)}`;

    console.log({ partnerIdNum, timestamp, baseString, sign, authorization_url });

    // ✅ Retorna JSON em vez de redirect direto
    return new Response(
      JSON.stringify({ authorization_url }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Erro na Shopee Auth:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno na Shopee Auth" }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      }
    );
  }
});