import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ✅ HELPER: Data segura (resolve TODOS os erros de timestamp)
function safeShopeeDate(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null
  
  const date = new Date(timestamp * 1000)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

function sign(partnerId: number, path: string, timestamp: number, partnerKey: string, accessToken?: string, shopId?: number): string {
  const base = accessToken && shopId
    ? `${partnerId}${path}${timestamp}${accessToken}${shopId}`
    : `${partnerId}${path}${timestamp}`
  return createHmac("sha256", partnerKey).update(base).digest("hex")
}

function ts(): number {
  return Math.floor(Date.now() / 1000)
}

// ✅ REFRESH TOKEN SEGURO
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

    const data = await res.json()
    if (data.error && data.error !== "") {
      console.error("Token refresh error:", data.message)
      return null
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
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
  const query = new URLSearchParams({
    partner_id: String(partnerId),
    shop_id: String(shopId),
    access_token: accessToken,
    timestamp: String(timestamp),
    sign: s,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })
  
  const res = await fetch(`${baseUrl}${path}?${query.toString()}`)
  const data = await res.json()
  if (data.error && data.error !== "") {
    throw new Error(`Shopee API error: ${data.message} (${data.error})`)
  }
  return data.response as T
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

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

    const { connection_id } = await req.json()
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from("integration_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", user.id)
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

    const PARTNER_ID = parseInt(Deno.env.get("SHOPEE_PARTNER_ID")!, 10)
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY")!
    const BASE_URL = Deno.env.get("SHOPEE_BASE_URL")!
    const shopId = parseInt(connection.external_shop_id, 10)

    let accessToken = connection.access_token

    // ✅ REFRESH TOKEN SEGURO (com safeDate)
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
    const oneHourFromNow = Date.now() + 60 * 60 * 1000

    if (tokenExpiresAt < oneHourFromNow || tokenExpiresAt === 0) {
      console.log("Token expiring soon, refreshing...")
      const refreshed = await refreshShopeeToken(
        BASE_URL, PARTNER_ID, PARTNER_KEY,
        connection.refresh_token!, shopId
      )

      if (refreshed) {
        const now = new Date()
        await supabaseAdmin
          .from("integration_connections")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: safeShopeeDate(refreshed.expire_in),
            refresh_token_expires_at: safeShopeeDate(refreshed.refresh_token_expire_in),
            updated_at: now.toISOString(),
          })
          .eq("id", connection_id)

        accessToken = refreshed.access_token
        console.log("Token refreshed successfully")
      } else {
        await supabaseAdmin
          .from("integration_connections")
          .update({ status: "expired", updated_at: new Date().toISOString() })
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
    let paymentsCount = 0

    // ✅ SYNC ORDERS COM PAGINAÇÃO
    try {
      let page = 1
      let hasMore = true

      while (hasMore && page <= 10) { // Max 10 páginas (500 pedidos)
        const orderList = await shopeeGet<{ order_list: { order_sn: string }[], more: boolean }>(
          BASE_URL, "/api/v2/order/get_order_list", {
            time_range_field: "create_time",
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 50,
            page_no: page,
          },
          PARTNER_ID, PARTNER_KEY, accessToken, shopId
        )

        if (orderList.order_list?.length) {
          const orderSns = orderList.order_list.map(o => o.order_sn).join(",")

          // ✅ DELAY anti-rate-limit
          await new Promise(r => setTimeout(r, 1000))

          const orderDetails = await shopeeGet<{ order_list: { order_sn: string }[] }>(
            BASE_URL, "/api/v2/order/get_order_detail", {
              order_sn_list: orderSns,
              response_optional_fields: "buyer_username,pay_time,tracking_no,shipping_carrier",
            },
            PARTNER_ID, PARTNER_KEY, accessToken, shopId
          )

          for (const order of orderDetails.order_list) {
            await supabaseAdmin.from("orders").upsert({
              integration_id: connection_id,
              external_order_id: order.order_sn,
              status: order.order_status,
              total_amount: Number(order.total_amount) || 0,
              currency: order.currency || "BRL",
              buyer_username: order.buyer_username ?? "",
              shipping_carrier: order.shipping_carrier ?? "",
              tracking_number: order.tracking_no ?? "",
              // ✅ DATAS SEGUras
              paid_at: safeShopeeDate(order.pay_time),
              order_created_at: safeShopeeDate(order.create_time),
              order_updated_at: safeShopeeDate(order.update_time),
              synced_at: now.toISOString(),
            }, { onConflict: "integration_id,external_order_id" })
            ordersCount++
          }
        }

        hasMore = orderList.more
        page++
        
        // ✅ DELAY entre páginas
        if (hasMore) await new Promise(r => setTimeout(r, 2000))
      }
    } catch (orderError) {
      console.error("Error syncing orders:", orderError)
    }

    // ✅ SYNC PAYMENTS (com tratamento KYC)
try {
  console.log("🔄 Tentando sync pagamentos...")
  const transactions = await shopeeGet<{ transactions:[], more: boolean }>(
    BASE_URL, "/api/v2/payment/get_wallet_transaction_list", {
      wallet_type: 1,  // Saldo disponível
      page_no: 1,
      page_size: 50,
      create_time_from: timeFrom,
      create_time_to: timeTo,
    },
    PARTNER_ID, PARTNER_KEY, accessToken, shopId
  )

  console.log(`✅ ${transactions.transactions?.length || 0} pagamentos encontrados`)
  
  if (transactions.transactions?.length) {
    for (const tx of transactions.transactions) {
      const marketplaceFee = (Number(tx.service_fee) || 0) + (Number(tx.paid_channel_fee) || 0)
      
      await supabaseAdmin.from("payments").upsert({
        integration_id: connection_id,
        external_transaction_id: String(tx.transaction_id),
        amount: Number(tx.amount),
        currency: tx.currency || "BRL",
        payment_method: tx.withdrawal_type || "shopee_wallet",
        marketplace_fee: marketplaceFee,
        net_amount: Number(tx.amount) - marketplaceFee,
        status: tx.status === "COMPLETED" ? "completed" : "pending",
        transaction_date: safeShopeeDate(tx.transaction_date),
        description: tx.description ?? tx.transaction_type ?? "Pagamento Shopee",
        synced_at: now.toISOString(),
      }, { onConflict: "integration_id,external_transaction_id" })
      paymentsCount++
    }
  }
} catch (paymentError) {
  console.log("💡 Payments:", paymentError.message)
  
  // ✅ TRATAMENTO ESPECÍFICO KYC
  if (paymentError.message?.includes("error_kyc_auth") || 
      paymentError.message?.includes("No permission") ||
      paymentError.message?.includes("KYC") ||
      paymentError.message?.includes("complete the Seller Registration")) {
    
    console.log("✅ KYC pendente - PEDIDOS funcionam normal!")
    await supabaseAdmin.from("integration_sync_logs").insert({
      connection_id,
      user_id: user.id,
      type: "kyc_required",
      status: "warning",
      message: "Complete KYC no Seller Center para liberar PAGAMENTOS",
    })
  } else {
    console.error("❌ Payments error real:", paymentError)
  }
}

    // Atualiza conexão
    const nextSync = new Date(now.getTime() + (connection.auto_sync_frequency_minutes || 60) * 60 * 1000)
    await supabaseAdmin
      .from("integration_connections")
      .update({
        last_sync_at: now.toISOString(),
        next_sync_at: nextSync.toISOString(),
        last_error_code: null,
        last_error_message: null,
        updated_at: now.toISOString(),
      })
      .eq("id", connection_id)

    // ✅ Log detalhado
    await supabaseAdmin.from("integration_sync_logs").insert({
      connection_id,
      user_id: user.id,
      type: "sync",
      status: ordersCount > 0 || paymentsCount > 0 ? "success" : "empty",
      message: `${ordersCount} pedidos + ${paymentsCount} pagamentos`,
      metadata: { orders_synced: ordersCount, payments_synced: paymentsCount },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ ${ordersCount} pedidos + ${paymentsCount} pagamentos sincronizados`,
        stats: { orders: ordersCount, payments: paymentsCount }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Sync error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})