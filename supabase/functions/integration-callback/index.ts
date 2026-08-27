import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encryptToken } from "../_shared/token-crypto.ts"

// Permite sobrescrever via env var (ex: testar OAuth contra um preview
// deploy) sem alterar o comportamento padrão de produção.
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")?.trim() || "https://sellerfinance.com.br"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const shopId = url.searchParams.get("shop_id")
  const state = url.searchParams.get("state") ?? ""

  try {
    if (!code) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_code`, 302)
    }

    if (!state) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=missing_state`, 302)
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Resolve o usuário a partir do state opaco gerado por shopee-auth (nunca
    // mais confiamos num JWT trafegando pela URL). Uso único: apagamos a
    // entrada assim que lida, o que também barra replay do mesmo state.
    const { data: stateRow, error: stateError } = await supabase
      .from("oauth_state")
      .select("user_id, created_at")
      .eq("state", state)
      .eq("provider", "shopee")
      .maybeSingle()

    if (stateRow) {
      await supabase.from("oauth_state").delete().eq("state", state)
    }

    const stateIsExpired = stateRow &&
      Date.now() - new Date(stateRow.created_at).getTime() > 30 * 60 * 1000

    if (stateError || !stateRow || stateIsExpired) {
      return Response.redirect(`${FRONTEND_URL}/integrations?error=invalid_state`, 302)
    }

    const userId = stateRow.user_id

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
          shop_id: shopId ? Number(shopId) : 0, // ✅ Fix: valor padrão
          partner_id: partnerIdNum,
          redirect_url: REDIRECT_URI,
        }),
      }
    )

    const tokenData = await tokenRes.json()

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
    } = tokenData

    const resolvedShopId = String(responseShopId?.[0] ?? shopId ?? "")
    const now = new Date()

    // A resposta de /api/v2/auth/token/get não traz o nome da loja (o campo
    // "shope_name" que existia aqui era um typo apontando para algo que a API
    // nunca retorna) — precisa de uma segunda chamada, já autenticada, a
    // /api/v2/shop/get_shop_info. Falha aqui não deve derrubar a conexão.
    let shopName = ""
    try {
      const shopInfoPath = "/api/v2/shop/get_shop_info"
      const shopInfoTimestamp = Math.floor(Date.now() / 1000)
      const shopIdNum = Number(resolvedShopId)
      const shopInfoSign = createHmac("sha256", PARTNER_KEY)
        .update(`${partnerIdNum}${shopInfoPath}${shopInfoTimestamp}${access_token}${shopIdNum}`)
        .digest("hex")

      const shopInfoRes = await fetch(
        `${BASE_URL}${shopInfoPath}?partner_id=${partnerIdNum}&timestamp=${shopInfoTimestamp}&sign=${shopInfoSign}&access_token=${access_token}&shop_id=${shopIdNum}`
      )
      const shopInfoData = await shopInfoRes.json()
      shopName = shopInfoData?.shop_name ?? ""
    } catch (shopInfoError) {
      console.error("Erro ao buscar shop_name da Shopee:", shopInfoError)
    }

    // ✅ FIX: Função segura para datas Shopee
    const safeTokenExpiresAt = (expireSeconds: number | undefined | null): string | null => {
      if (!expireSeconds || expireSeconds <= 0) return null
      const futureDate = new Date(now.getTime() + expireSeconds * 1000)
      return isNaN(futureDate.getTime()) ? null : futureDate.toISOString()
    }

    // ✅ Salva na tabela integration_connections (100% seguro)
    const { error: dbError } = await supabase
      .from("integration_connections")
      .upsert({
        user_id: userId,
        provider: "shopee",
        status: "connected",
        external_shop_id: resolvedShopId,
        shop_name: shopName,
        access_token: await encryptToken(access_token),
        refresh_token: await encryptToken(refresh_token),
        token_expires_at: safeTokenExpiresAt(expire_in),
        refresh_token_expires_at: safeTokenExpiresAt(refresh_token_expire_in),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id,provider,external_shop_id" })

    if (dbError) {
      console.error("DB error:", dbError)
      return Response.redirect(
        `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro ao salvar integração")}`,
        302
      )
    }

    console.log("✅ Shopee integrada com sucesso!", { resolvedShopId, expire_in, refresh_token_expire_in })

    return Response.redirect(`${FRONTEND_URL}/integrations?connected=shopee`, 302)

  } catch (error) {
    console.error("Callback error:", error)
    return Response.redirect(
      `${FRONTEND_URL}/integrations?error=${encodeURIComponent("Erro interno no callback")}`,
      302
    )
  }
})