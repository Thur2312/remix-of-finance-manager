import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ✅ HELPER: Data segura (corrigido)
function safeShopeeDate(timestamp: number | null): string | null {
  if (!timestamp || timestamp <= 0) return null
  
  const date = new Date(timestamp * 1000)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

function sign(
  partnerId: number,
  path: string,
  timestamp: number,
  partnerKey: string,
  accessToken?: string,
  shopId?: number
): string {
  const base = accessToken && shopId
    ? `${partnerId}${path}${timestamp}${accessToken}${shopId}`
    : `${partnerId}${path}${timestamp}`

  return createHmac("sha256", partnerKey)
    .update(base)
    .digest("hex")
}
function ts(): number {
  return Math.floor(Date.now() / 1000)
}

// ✅ REFRESH TOKEN SEGURO (corrigido)
async function refreshShopeeToken(
  baseUrl: string,
  partnerId: number,
  partnerKey: string,
  refreshToken: string,
  shopId: number,
): Promise<{ access_token: string; refresh_token: string; expire_in: number; refresh_token_expire_in: number } | null> {
  try {
    const timestamp = ts()
    const path = "/api/v2/auth/access_token/get"
    const s = sign(partnerId, path, timestamp, partnerKey)

    const res = await fetch(
      `${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${s}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          partner_id: partnerId,
          shop_id: shopId,
        }),
      }
    )

    if (!res.ok) {
      console.error("Refresh token HTTP error:", res.status, res.statusText)
      return null
    }

    const data = await res.json()
    if (data.error && data.error !== "") {
      console.error("Token refresh error:", data.message || data.error)
      return null
    }

    return {
      access_token: data.access_token || "",
      refresh_token: data.refresh_token || "",
      expire_in: data.expire_in || 0,
      refresh_token_expire_in: data.refresh_token_expire_in || 0,
    }
  } catch (err) {
    console.error("Token refresh exception:", err)
    return null
  }
}

async function shopeeGet<T>(
  baseUrl: string,
  path: string,
  params: Record<string, string | number | boolean>,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: number,
): Promise<T> {
  const timestamp = ts()
  const s = sign(partnerId, path, timestamp, partnerKey, accessToken, shopId)
  
  const queryParams = {
    partner_id: String(partnerId),
    shop_id: String(shopId),
    access_token: accessToken,
    timestamp: String(timestamp),
    sign: s,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  }
  
  const query = new URLSearchParams(queryParams)
  const url = `${baseUrl}${path}?${query.toString()}`
  
  console.log("🔗 Shopee API call:", url.substring(0, 200) + "...") // Log parcial
  
  const res = await fetch(url)
  
  if (!res.ok) {
    console.error("HTTP Error:", res.status, res.statusText)
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  
  const data = await res.json()
  if (data.error && data.error !== "") {
    throw new Error(`Shopee API error: ${data.message || data.error} (code: ${data.error})`)
  }
  
  return data.response as T
}

serve(async (req) => {
  // ✅ CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ✅ Parse body com validação
    let requestBody
    try {
      requestBody = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { connection_id } = requestBody
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from("integration_connections")
      .select("*, user_id")
      .eq("id", connection_id)
      .single()

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (connection.status !== "connected") {
      return new Response(JSON.stringify({ error: "Integração não está conectada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ✅ Validações de ambiente
    const PARTNER_ID = parseInt(Deno.env.get("SHOPEE_PARTNER_ID") || "0", 10)
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY") || ""
    const BASE_URL = Deno.env.get("SHOPEE_BASE_URL") || ""
    
    if (!PARTNER_ID || !PARTNER_KEY || !BASE_URL) {
      return new Response(JSON.stringify({ error: "Configurações Shopee não encontradas" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const shopId = parseInt(connection.external_shop_id || "0", 10)
    if (!shopId) {
      return new Response(JSON.stringify({ error: "Shop ID inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let accessToken = connection.access_token || ""

    // ✅ REFRESH TOKEN (corrigido safeShopeeDate)
    const tokenExpiresAt = connection.token_expires_at 
      ? new Date(connection.token_expires_at).getTime() 
      : 0
    const oneHourFromNow = Date.now() + 60 * 60 * 1000

    if (tokenExpiresAt < oneHourFromNow || tokenExpiresAt === 0) {
      console.log("🔄 Token expiring soon, refreshing...")
      const refreshed = await refreshShopeeToken(
        BASE_URL, PARTNER_ID, PARTNER_KEY,
        connection.refresh_token || "", shopId
      )

      if (refreshed && refreshed.access_token) {
        const now = new Date()
        const expireAt = refreshed.expire_in > 0 
          ? new Date(now.getTime() + refreshed.expire_in * 1000).toISOString()
          : null
        
        const refreshExpireAt = refreshed.refresh_token_expire_in > 0
          ? new Date(now.getTime() + refreshed.refresh_token_expire_in * 1000).toISOString()
          : null

        const { error: updateError } = await supabaseAdmin
          .from("integration_connections")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: expireAt,
            refresh_token_expires_at: refreshExpireAt,
            updated_at: now.toISOString(),
          })
          .eq("id", connection_id)

        if (updateError) {
          console.error("Erro ao atualizar tokens:", updateError)
        }

        accessToken = refreshed.access_token
        console.log("✅ Token refreshed successfully")
      } else {
        console.error("❌ Failed to refresh token")
        await supabaseAdmin
          .from("integration_connections")
          .update({ 
            status: "expired", 
            updated_at: new Date().toISOString() 
          })
          .eq("id", connection_id)

        return new Response(JSON.stringify({ error: "Token expirado. Reconecte." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    const now = new Date()
    const timeFrom = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000) // 30 dias
    const timeTo = Math.floor(now.getTime() / 1000)

    let ordersCount = 0
// ✅ SYNC ORDERS — substitua o bloco try/catch de orders inteiro por este
try {
  let cursor = ""
  let hasMore = true
  let safetyLimit = 0

  while (hasMore && safetyLimit < 10) {
    console.log(`📦 Sync orders cursor="${cursor}" page ${safetyLimit + 1}...`)

    const orderList = await shopeeGet<{
      order_list: { order_sn: string }[]
      more: boolean
      next_cursor: string
    }>(
      BASE_URL,
      "/api/v2/order/get_order_list",
      {
        time_range_field: "create_time",
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 50,
        ...(cursor ? { cursor } : {}), // só envia cursor se não for vazio
      },
      PARTNER_ID, PARTNER_KEY, accessToken, shopId
    )

    const orders = orderList?.order_list ?? []
    console.log(`📋 ${orders.length} pedidos encontrados nessa página`)

    if (orders.length > 0) {
      const orderSns = orders.map(o => o.order_sn).join(",")

      await new Promise(r => setTimeout(r, 500))

      const orderDetails = await shopeeGet<{
        order_list: {
          order_sn: string
          order_status: string
          total_amount: string
          currency: string
          buyer_username?: string
          shipping_carrier?: string
          tracking_no?: string
          pay_time?: number
          create_time?: number
          update_time?: number
        }[]
      }>(
        BASE_URL,
        "/api/v2/order/get_order_detail",
        {
          order_sn_list: orderSns,
          response_optional_fields: "buyer_username,pay_time,tracking_no,shipping_carrier",
        },
        PARTNER_ID, PARTNER_KEY, accessToken, shopId
      )

      for (const order of orderDetails.order_list ?? []) {
        const { error: upsertError } = await supabaseAdmin
          .from("orders")
          .upsert({
            integration_id: connection_id,
            external_order_id: order.order_sn,
            status: order.order_status || "UNKNOWN",
            total_amount: Number(order.total_amount) || 0,
            currency: order.currency || "BRL",
            buyer_username: order.buyer_username ?? "",
            shipping_carrier: order.shipping_carrier ?? "",
            tracking_number: order.tracking_no ?? "",
            paid_at: safeShopeeDate(order.pay_time ?? null),
            order_created_at: safeShopeeDate(order.create_time ?? null),
            order_updated_at: safeShopeeDate(order.update_time ?? null),
            synced_at: now.toISOString(),
          }, { onConflict: "integration_id,external_order_id" })

        if (upsertError) {
          console.error("❌ Erro ao salvar pedido:", order.order_sn, upsertError)
        } else {
          ordersCount++
        }
      }
    }

    hasMore = Boolean(orderList?.more)
    cursor = orderList?.next_cursor ?? ""
    safetyLimit++

    if (hasMore) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`✅ Total de pedidos sincronizados: ${ordersCount}`)

} catch (orderError) {
  console.error("❌ Orders sync error:", orderError)

  // Salva o erro na conexão para aparecer no dashboard
  await supabaseAdmin
    .from("integration_connections")
    .update({
      last_error_message: orderError instanceof Error ? orderError.message : String(orderError),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection_id)
}
    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ ${ordersCount} pedidos sincronizados`,
        stats: { orders: ordersCount }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error("❌ Sync error completo:", error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro interno do servidor" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    )
  }
})