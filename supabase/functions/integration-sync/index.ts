import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ============= SHOPEE HELPERS =============
function sign(partnerId: number, path: string, timestamp: number, accessToken: string, shopId: number, partnerKey: string): string {
  const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`
  return createHmac("sha256", partnerKey).update(base).digest("hex")
}

function timestamp(): number {
  return Math.floor(Date.now() / 1000)
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
  const ts = timestamp()
  const s = sign(partnerId, path, ts, accessToken, shopId, partnerKey)
  const query = new URLSearchParams({
    partner_id: String(partnerId),
    shop_id: String(shopId),
    access_token: accessToken,
    timestamp: String(ts),
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

// ============= MAIN =============
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

    // Busca conexão com service role para pegar access_token
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
    const accessToken = connection.access_token
    const shopId = parseInt(connection.external_shop_id, 10)

    const now = new Date()
    const timeFrom = Math.floor((now.getTime() - 30 * 24 * 60 * 60 * 1000) / 1000) // 30 dias atrás
    const timeTo = Math.floor(now.getTime() / 1000)

    let ordersCount = 0
    let paymentsCount = 0

    // ============= SYNC ORDERS =============
    try {
      const orderList = await shopeeGet<{ order_list: { order_sn: string }[], more: boolean, next_cursor: string }>(
        BASE_URL, "/api/v2/order/get_order_list", {
          time_range_field: "create_time",
          time_from: timeFrom,
          time_to: timeTo,
          page_size: 50,
        },
        PARTNER_ID, PARTNER_KEY, accessToken, shopId
      )

      if (orderList.order_list && orderList.order_list.length > 0) {
        const orderSns = orderList.order_list.map(o => o.order_sn).join(",")

        const orderDetails = await shopeeGet<{ order_list: Array<{
          order_sn: string
          order_status: string
          total_amount: number
          currency: string
          buyer_username: string
          shipping_carrier: string
          tracking_no: string
          pay_time: number
          create_time: number
          update_time: number
        }> }>(
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
            total_amount: order.total_amount,
            currency: order.currency,
            buyer_username: order.buyer_username ?? "",
            shipping_carrier: order.shipping_carrier ?? "",
            tracking_number: order.tracking_no ?? "",
            paid_at: order.pay_time ? new Date(order.pay_time * 1000).toISOString() : null,
            order_created_at: new Date(order.create_time * 1000).toISOString(),
            order_updated_at: new Date(order.update_time * 1000).toISOString(),
            synced_at: now.toISOString(),
          }, { onConflict: "integration_id,external_order_id" })
          ordersCount++
        }
      }
    } catch (orderError) {
      console.error("Error syncing orders:", orderError)
    }

    // ============= SYNC PAYMENTS =============
    try {
      const transactions = await shopeeGet<{ transactions: Array<{
        transaction_id: string
        order_sn: string
        amount: number
        currency: string
        withdrawal_type: string
        service_fee: number
        paid_channel_fee: number
        status: string
        transaction_date: number
        description: string
        transaction_type: string
      }>, more: boolean }>(
        BASE_URL, "/api/v2/payment/get_wallet_transaction_list", {
          wallet_type: 1,
          page_no: 1,
          page_size: 50,
          create_time_from: timeFrom,
          create_time_to: timeTo,
        },
        PARTNER_ID, PARTNER_KEY, accessToken, shopId
      )

      if (transactions.transactions && transactions.transactions.length > 0) {
        for (const tx of transactions.transactions) {
          const marketplaceFee = (tx.service_fee ?? 0) + (tx.paid_channel_fee ?? 0)
          const netAmount = tx.amount - marketplaceFee

          await supabaseAdmin.from("payments").upsert({
            integration_id: connection_id,
            external_transaction_id: String(tx.transaction_id),
            amount: tx.amount,
            currency: tx.currency,
            payment_method: tx.withdrawal_type || "shopee_wallet",
            marketplace_fee: marketplaceFee,
            net_amount: netAmount,
            status: tx.status === "COMPLETED" ? "COMPLETED" : "PENDING",
            transaction_date: new Date(tx.transaction_date * 1000).toISOString(),
            description: tx.description ?? tx.transaction_type,
            synced_at: now.toISOString(),
          }, { onConflict: "integration_id,external_transaction_id" })
          paymentsCount++
        }
      }
    } catch (paymentError) {
      console.error("Error syncing payments:", paymentError)
    }

    // Atualiza last_sync_at
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

    return new Response(
      JSON.stringify({
        message: `Sincronização concluída — ${ordersCount} pedidos e ${paymentsCount} pagamentos sincronizados`,
        orders_synced: ordersCount,
        payments_synced: paymentsCount,
        last_sync_at: now.toISOString(),
        next_sync_at: nextSync.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})