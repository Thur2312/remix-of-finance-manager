import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"

// Só TikTok. Shopee e Mercado Livre têm entry points próprios (shopee-auth /
// mercadolivre-auth) — o branch shopee que existia aqui era código morto: não
// checava JWT, não gravava oauth_state e ainda logava a authorization_url
// (Achado 6 do SUPABASE-SECURITY-AUDIT-2026-08-06.md).
const bodySchema = z.object({
  provider: z.literal("tiktok"),
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
    bodySchema.parse(body)

    // 🟣 TIKTOK
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

    const authorization_url =
      `https://auth.tiktok-shops.com/oauth/authorize` +
      `?app_key=${CLIENT_KEY}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${state}` +
      `&scope=user_info,order_read`

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