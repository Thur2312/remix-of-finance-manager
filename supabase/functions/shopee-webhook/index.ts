import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"
import { safeShopeeDate, shopeeGet, ensureValidShopeeToken, verifyShopeePushSignature } from "../_shared/shopee.ts"

// Shopee Open Platform v2 Push Mechanism: o "code" identifica o tipo de
// evento. 3 = order status update (o único que este webhook trata por
// enquanto). Outros codes (item, tracking number, etc.) são reconhecidos e
// ignorados com 200 — não travam o endpoint, só ainda não fazem nada.
// ⚠️ Confirmar esses valores contra um payload de teste real do Partner
// Center antes de ligar o push de verdade — a doc pública consultada não
// trouxe o schema completo.
const ORDER_STATUS_PUSH_CODE = 3

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight

  const corsHeaders = getCorsHeaders(req)

  // Precisa do corpo cru (antes de qualquer JSON.parse) pra validar a
  // assinatura HMAC — reserializar o JSON pode mudar espaçamento/ordem das
  // chaves e invalidar um hash que bateria com o body original.
  const rawBody = await req.text()

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const PARTNER_ID = parseInt(Deno.env.get("SHOPEE_PARTNER_ID") || "0", 10)
    const PARTNER_KEY = Deno.env.get("SHOPEE_PARTNER_KEY") || ""
    const BASE_URL = Deno.env.get("SHOPEE_BASE_URL") || ""
    const PUSH_URL = `${Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", ".functions.supabase.co")}/shopee-webhook`

    if (!PARTNER_ID || !PARTNER_KEY || !BASE_URL) {
      console.error("❌ Shopee webhook: configurações da Shopee ausentes")
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const receivedSignature = req.headers.get("authorization") || req.headers.get("x-shopee-signature") || ""
    const signatureValid = verifyShopeePushSignature(PUSH_URL, rawBody, receivedSignature, PARTNER_KEY)

    if (!signatureValid) {
      console.warn("⚠️ Shopee webhook: assinatura inválida ou ausente")
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    let payload: {
      code?: number
      shop_id?: number
      data?: {
        ordersn?: string
        order_sn?: string
        status?: string
      }
    }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error("❌ Shopee webhook: JSON inválido:", rawBody.slice(0, 500))
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    console.log("📩 Shopee webhook recebido:", JSON.stringify(payload))

    if (payload.code !== ORDER_STATUS_PUSH_CODE) {
      console.log(`ℹ️ Shopee webhook: code ${payload.code} ainda não tratado, ignorando`)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const orderSn = payload.data?.ordersn || payload.data?.order_sn
    const shopId = payload.shop_id

    if (!orderSn || !shopId) {
      console.warn("⚠️ Shopee webhook: payload sem ordersn/shop_id:", JSON.stringify(payload))
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: connection, error: connError } = await supabaseAdmin
      .from("integration_connections")
      .select("id, user_id, access_token, refresh_token, token_expires_at, status")
      .eq("provider", "shopee")
      .eq("external_shop_id", String(shopId))
      .maybeSingle()

    if (connError || !connection) {
      console.warn("⚠️ Shopee webhook: nenhuma conexão encontrada pro shop_id", shopId)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    if (connection.status !== "connected") {
      console.log("ℹ️ Shopee webhook: conexão", connection.id, "não está 'connected' (status:", connection.status, "), ignorando")
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const accessToken = await ensureValidShopeeToken(supabaseAdmin, connection, BASE_URL, PARTNER_ID, PARTNER_KEY, shopId)
    if (!accessToken) {
      console.error("❌ Shopee webhook: falha ao renovar token da conexão", connection.id)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Nunca confia no payload do push além de "algo mudou nesse order_sn" —
    // sempre rebusca o pedido completo via API autenticada (mesmo padrão do
    // mercadolivre-webhook).
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
        item_list?: {
          item_id: number
          item_name: string
          item_sku: string
          model_name: string
          model_sku: string
          model_quantity_purchased: number
          model_original_price: number
          model_discounted_price: number
        }[]
      }[]
    }>(BASE_URL, "/api/v2/order/get_order_detail", {
      order_sn_list: orderSn,
      response_optional_fields: "buyer_username,pay_time,tracking_no,shipping_carrier,total_amount,currency,create_time,update_time,item_list",
    }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

    const order = orderDetails.order_list?.[0]
    if (!order) {
      console.warn("⚠️ Shopee webhook: get_order_detail não retornou o pedido", orderSn)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const now = new Date()
    const { data: savedOrder, error: upsertError } = await supabaseAdmin
      .from("orders")
      .upsert({
        integration_id: connection.id,
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
      .select("id")
      .single()

    if (upsertError || !savedOrder) {
      console.error("❌ Shopee webhook: erro ao salvar pedido", orderSn, upsertError)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const items = order.item_list ?? []
    if (items.length > 0) {
      const itemsToUpsert = items.map(item => ({
        order_id: savedOrder.id,
        external_item_id: String(item.item_id),
        item_name: item.item_name || item.model_name || "Produto sem nome",
        sku: item.model_sku || item.item_sku || "",
        quantity: item.model_quantity_purchased || 1,
        unit_price: Number(item.model_discounted_price) || Number(item.model_original_price) || 0,
        total_price: (Number(item.model_discounted_price) || Number(item.model_original_price) || 0) * (item.model_quantity_purchased || 1),
      }))

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .upsert(itemsToUpsert, { onConflict: "order_id,external_item_id" })
      if (itemsError) console.error("❌ Shopee webhook: erro ao salvar itens do pedido", orderSn, itemsError)
    }

    await supabaseAdmin.from("integration_sync_logs").insert({
      connection_id: connection.id,
      user_id: connection.user_id,
      type: "webhook",
      status: "success",
      message: `Pedido ${orderSn} atualizado via webhook (status: ${order.order_status})`,
      metadata: { order_sn: orderSn, status: order.order_status },
    })

    console.log(`✅ Shopee webhook: pedido ${orderSn} salvo (status: ${order.order_status})`)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error) {
    console.error("❌ Shopee webhook: erro inesperado:", error)
    // 200 mesmo em erro interno, pra Shopee não ficar retentando em loop —
    // o cron de reconciliação pega esse pedido na próxima passada de qualquer forma.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
