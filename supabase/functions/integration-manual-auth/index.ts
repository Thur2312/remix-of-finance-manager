import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"
import { encryptToken } from "../_shared/token-crypto.ts"

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { provider, shop_id, access_token, refresh_token } = await req.json()

    if (!provider || !shop_id || !access_token) {
      return new Response(JSON.stringify({ error: "provider, shop_id e access_token são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const VALID_PROVIDERS = ["shopee", "tiktok", "mercadolivre"]
    if (!VALID_PROVIDERS.includes(provider)) {
      return new Response(JSON.stringify({ error: "provider inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { error } = await supabase
      .from("integration_connections")
      .upsert({
        user_id: user.id,
        provider,
        status: "connected",
        external_shop_id: shop_id,
        access_token: await encryptToken(access_token),
        refresh_token: await encryptToken(refresh_token || null),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" })

    if (error) throw error

    return new Response(
      JSON.stringify({ message: `${provider} conectado com sucesso!` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    // Nunca repassar error.message pro client: pode ser um PostgrestError
    // vazando nome de coluna/constraint interna do banco.
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})