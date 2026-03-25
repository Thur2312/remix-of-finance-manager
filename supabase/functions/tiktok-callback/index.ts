import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FRONTEND_URL = "https://www.sellerfinance.com.br"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const userToken = url.searchParams.get("token") ?? ""

  try {
    if (!code) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_code`, 302)
    }

    const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")?.trim()
    const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")?.trim()
    const REDIRECT_URI = Deno.env.get("TIKTOK_REDIRECT_URI")?.trim()
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_env`, 302)
    }

    // Troca o code pelo access_token
    const tokenRes = await fetch("https://auth.tiktok-shops.com/api/v2/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: CLIENT_KEY,
        app_secret: CLIENT_SECRET,
        auth_code: code,
        grant_type: "authorized_code",
      }),
    })

    const tokenData = await tokenRes.json()
    console.log("TikTok token response:", tokenData)

    if (tokenData.code !== 0) {
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent(tokenData.message || "Erro ao obter token")}`,
        302
      )
    }

    const {
      access_token,
      refresh_token,
      access_token_expire_in,
      refresh_token_expire_in,
      open_id,
      seller_name,
    } = tokenData.data

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken)
    if (userError || !user) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=unauthorized`, 302)
    }

    const now = new Date()

    // Salva na tabela integration_connections
    const { error: dbError } = await supabase
      .from("integration_connections")
      .upsert({
        user_id: user.id,
        provider: "tiktok",
        status: "connected",
        external_shop_id: open_id ?? "",
        shop_name: seller_name ?? "",
        access_token,
        refresh_token,
        token_expires_at: new Date(now.getTime() + access_token_expire_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(now.getTime() + refresh_token_expire_in * 1000).toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id,provider" })

    if (dbError) {
      console.error("DB error:", dbError)
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro ao salvar integração")}`,
        302
      )
    }

    return Response.redirect(`${FRONTEND_URL}/integrations?connected=tiktok`, 302)

  } catch (error) {
    console.error("TikTok callback error:", error)
    return Response.redirect(
      `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro interno no callback")}`,
      302
    )
  }
})