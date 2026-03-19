import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"

// ✅ CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ✅ validação
const bodySchema = z.object({
  provider: z.enum(["shopee", "tiktok"]),
})

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const body = await req.json()
    const { provider } = bodySchema.parse(body)

    let authorization_url = ""

    // =========================
    // 🟠 SHOPEE
    // =========================
if (provider === "shopee") {
  const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")?.trim()
  const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim()
  const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")?.trim()
  const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")?.trim()

  // validação de env
  if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
    throw new Error("Variáveis de ambiente da Shopee não configuradas corretamente")
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const path = "/shop/auth_partner"           // usado na assinatura
  const endpoint = "/api/v2/shop/auth_partner" // usado na URL final

  // ✅ base string exata que a Shopee espera
  const baseString = `${PARTNER_ID}${path}${timestamp}`

  // ✅ assinatura HMAC-SHA256 em hex lowercase
  const sign = createHmac("sha256", PARTNER_KEY)
    .update(baseString)
    .digest("hex")

  // ✅ URL final de autorização
  authorization_url =
    `${BASE_URL}${endpoint}` +
    `?partner_id=${PARTNER_ID}` +
    `&timestamp=${timestamp}` +
    `&sign=${sign}` +
    `&redirect=${encodeURIComponent(REDIRECT_URI)}`

  // opcional: log para debug (remova em produção)
  console.log({ PARTNER_ID, timestamp, baseString, sign, authorization_url })
}
    // =========================
    // 🟣 TIKTOK
    // =========================
    if (provider === "tiktok") {
      const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")
      const REDIRECT_URI = Deno.env.get("TIKTOK_REDIRECT_URI")

      if (!CLIENT_KEY || !REDIRECT_URI) {
        throw new Error("TikTok env vars não configuradas")
      }

      authorization_url =
        `https://auth.tiktok-shops.com/oauth/authorize` +
        `?app_key=${CLIENT_KEY}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&state=${crypto.randomUUID()}` +
        `&scope=user_info,order_read`
    }

    return new Response(
      JSON.stringify({ authorization_url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Erro:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})