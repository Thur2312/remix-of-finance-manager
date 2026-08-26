import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"

// ✅ validação
const bodySchema = z.object({
  provider: z.enum(["shopee", "tiktok"]),
})

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

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

  if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
    throw new Error("Variáveis de ambiente da Shopee não configuradas corretamente")
  }

  const partnerIdNum = parseInt(PARTNER_ID, 10) // ✅ converte para número
  const timestamp = Math.floor(Date.now() / 1000)
  const path = "/api/v2/shop/auth_partner" // ✅ path completo nos dois lugares

  // ✅ base string com path completo
  const baseString = `${partnerIdNum}${path}${timestamp}`

  const sign = createHmac("sha256", PARTNER_KEY)
    .update(baseString)
    .digest("hex")

  authorization_url =
    `${BASE_URL}${path}` +
    `?partner_id=${partnerIdNum}` +
    `&timestamp=${timestamp}` +
    `&sign=${sign}` +
    `&redirect=${encodeURIComponent(REDIRECT_URI)}`

  // baseString e sign são material de assinatura HMAC — nunca logar, mesmo
  // que não permitam recuperar a partner_key diretamente.
  console.log({ partnerIdNum, timestamp, authorization_url })
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

      // Antes o state gerado aqui era descartado na hora — o callback não
      // validava nada, então um "code" de OAuth de outra pessoa podia ser
      // vinculado à conta de quem clicasse num link malicioso (CSRF). Agora o
      // state fica salvo e é conferido em tiktok-callback antes de aceitar o code.
      const authHeader = req.headers.get("Authorization") ?? ""
      const userToken = authHeader.replace("Bearer ", "")

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      )

      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken)
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const state = crypto.randomUUID()

      await supabaseAdmin
        .from("oauth_state")
        .delete()
        .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())

      const { error: stateError } = await supabaseAdmin
        .from("oauth_state")
        .insert({ state, user_id: user.id, provider: "tiktok" })

      if (stateError) {
        throw new Error("Erro ao salvar state do TikTok")
      }

      authorization_url =
        `https://auth.tiktok-shops.com/oauth/authorize` +
        `?app_key=${CLIENT_KEY}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&state=${state}` +
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