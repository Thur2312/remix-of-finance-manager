import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FRONTEND_URL = "https://www.sellerfinance.com.br"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const shopId = url.searchParams.get("shop_id")
  const userToken = url.searchParams.get("token") ?? ""

  try {
    if (!code) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_code`, 302)
    }

    const PARTNER_ID = Deno.env.get("SHOPEE_PARTNER_ID")?.trim()
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")?.trim()
    const REDIRECT_URI = Deno.env.get("SHOPEE_REDIRECT_URI")?.trim()
    const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")?.trim()
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!PARTNER_ID || !PARTNER_KEY || !REDIRECT_URI || !BASE_URL) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_env`, 302)
    }

    const partnerIdNum = parseInt(PARTNER_ID, 10)
    const timestamp = Math.floor(Date.now() / 1000)
    const path = "/api/v2/auth/token/get"
    const baseString = `${partnerIdNum}${path}${timestamp}`
    const sign = createHmac("sha256", PARTNER_KEY).update(baseString).digest("hex")

    // Troca o code pelo access_token
    const tokenRes = await fetch(
      `${BASE_URL}${path}?partner_id=${partnerIdNum}&timestamp=${timestamp}&sign=${sign}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          shop_id: shopId ? Number(shopId) : undefined,
          partner_id: partnerIdNum,
          redirect_url: REDIRECT_URI,
        }),
      }
    )

    const tokenData = await tokenRes.json()
    console.log("Shopee token response:", tokenData)

    if (tokenData.error && tokenData.error !== "") {
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent(tokenData.message)}`,
        302
      )
    }

    const {
      access_token,
      refresh_token,
      expire_in,
      refresh_token_expire_in,
      shop_id: responseShopId,
      shope_name,
    } = tokenData

    // Conecta ao Supabase com service role para bypassar RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Pega o usuário pelo token
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken)
    if (userError || !user) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=unauthorized`, 302)
    }

    const resolvedShopId = String(responseShopId?.[0] ?? shopId ?? "")
    const now = new Date()

    // Salva na tabela shopee_integrations
    const { error: dbError } = await supabase
      .from("shopee_integrations")
      .upsert({
        user_id: user.id,
        seller_id: resolvedShopId,
        seller_name: shope_name ?? "",
        access_token,
        refresh_token,
        access_token_expires_at: new Date(now.getTime() + expire_in * 1000).toISOString(),
        refresh_token_expires_at: new Date(now.getTime() + refresh_token_expire_in * 1000).toISOString(),
        region: "BR",
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" })

    if (dbError) {
      console.error("DB error:", dbError)
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro ao salvar integração")}`,
        302
      )
    }

    return Response.redirect(`${FRONTEND_URL}/integrations?connected=shopee`, 302)

  } catch (error) {
    console.error("Callback error:", error)
    return Response.redirect(
      `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro interno no callback")}`,
      302
    )
  }
})