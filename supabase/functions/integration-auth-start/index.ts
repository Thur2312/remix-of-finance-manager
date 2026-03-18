import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"

// ✅ CORS padrão
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ✅ validação do body
const bodySchema = z.object({
  provider: z.enum(["shopee", "tiktok"]),
})

serve(async (req) => {
  // ✅ preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ✅ valida método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // ✅ parse + validação
    const body = await req.json()
    const { provider } = bodySchema.parse(body)

    let authorization_url = ""

    // =========================
    // 🟠 SHOPEE
    // =========================
    if (provider === "shopee") {
      const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")
      const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")
      const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")
      const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")

      if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
        throw new Error("Shopee env vars não configuradas")
      }

      const timestamp = Math.floor(Date.now() / 1000)
      const path = "/api/v2/auth/token"

      const baseString = `${PARTNER_ID}${path}${timestamp}`

      const signature = createHmac("sha256", PARTNER_KEY)
        .update(baseString)
        .digest("hex")

      authorization_url =
        `${BASE_URL}${path}` +
        `?partner_id=${PARTNER_ID}` +
        `&timestamp=${timestamp}` +
        `&sign=${signature}` +
        `&redirect_url=${encodeURIComponent(REDIRECT_URI)}`
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

    // ✅ resposta padrão
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