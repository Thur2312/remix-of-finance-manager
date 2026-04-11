import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function safeShopeeDate(timestamp: number | null): string | null {
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

async function refreshShopeeToken(baseUrl: string, partnerId: number, partnerKey: string, refreshToken: string, shopId: number): Promise<{ access_token: string; refresh_token: string; expire_in: number; refresh_token_expire_in: number } | null> {
  try {
    const timestamp = ts()
    const path = "/api/v2/auth/access_token/get"
    const s = sign(partnerId, path, timestamp, partnerKey)
    const res = await fetch(`${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${s}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, partner_id: partnerId, shop_id: shopId }),
    })
    if (!res.ok) { console.error("Refresh token HTTP error:", res.status); return null }
    const data = await res.json()
    if (data.error && data.error !== "") { console.error("Token refresh error:", data.message); return null }
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

async function shopeeGet<T>(baseUrl: string, path: string, params: Record<string, string | number | boolean>, partnerId: number, partnerKey: string, accessToken: string, shopId: number): Promise<T> {
  const timestamp = ts()
  const s = sign(partnerId, path, timestamp, partnerKey, accessToken, shopId)
  const queryParams = {
    partner_id: String(partnerId),
    shop_id: String(shopId),
    access_token: accessToken,
    timestamp: String(timestamp),
    sign: s,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }
  const query = new URLSearchParams(queryParams)
  const url = `${baseUrl}${path}?${query.toString()}`
  console.log("🔗 Shopee API call:", url.substring(0, 200) + "...")
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    console.error("❌ Shopee error body:", body)
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  const data = await res.json()
  if (data.error && data.error !== "") {
    throw new Error(`Shopee API error: ${data.message || data.error} (code: ${data.error})`)
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
      Deno.env.get("ADMIN_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            Authorization: `Bearer ${Deno.env.get("ADMIN_KEY")!}`,
          },
        },
      }
    )
    const serviceKey = Deno.env.get("ADMIN_KEY") || ""
    
    let requestBody
    try {
      requestBody = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const isCronCall = requestBody?.cron_secret === "sellerfinance-cron-2026"
    let userId: string

    if (isCronCall) {
      userId = "cron"
    } else {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
      userId = user.id
    }

    const { connection_id, time_from: customTimeFrom, time_to: customTimeTo, days, step } = requestBody

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
    const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
    const oneHourFromNow = Date.now() + 60 * 60 * 1000

    if (tokenExpiresAt < oneHourFromNow || tokenExpiresAt === 0) {
      console.log("🔄 Token expiring soon, refreshing...")
      const refreshed = await refreshShopeeToken(BASE_URL, PARTNER_ID, PARTNER_KEY, connection.refresh_token || "", shopId)
      if (refreshed && refreshed.access_token) {
        const now2 = new Date()
        const expireAt = refreshed.expire_in > 0 ? new Date(now2.getTime() + refreshed.expire_in * 1000).toISOString() : null
        const refreshExpireAt = refreshed.refresh_token_expire_in > 0 ? new Date(now2.getTime() + refreshed.refresh_token_expire_in * 1000).toISOString() : null
        const { error: updateError } = await supabaseAdmin.from("integration_connections").update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: expireAt,
          refresh_token_expires_at: refreshExpireAt,
          updated_at: now2.toISOString(),
        }).eq("id", connection_id)
        if (updateError) console.error("Erro ao atualizar tokens:", updateError)
        accessToken = refreshed.access_token
        console.log("✅ Token refreshed successfully")
      } else {
        console.error("❌ Failed to refresh token")
        await supabaseAdmin.from("integration_connections").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", connection_id)
        return new Response(JSON.stringify({ error: "Token expirado. Reconecte." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    const now = new Date()
    const daysToSync = days || 15

    const sinceDate = new Date(now.getTime() - daysToSync * 24 * 60 * 60 * 1000)
    sinceDate.setUTCHours(0, 0, 0, 0)

    const timeFrom = customTimeFrom
  ? Math.floor(new Date(customTimeFrom).getTime() / 1000)
  : Math.floor(sinceDate.getTime() / 1000)

  const timeTo = customTimeTo
  ? Math.floor(new Date(customTimeTo).getTime() / 1000)
  : Math.floor(now.getTime() / 1000)

    let ordersCount = 0
    let paymentsCount = 0
    let walletCount = 0

    // ✅ SYNC ORDERS
// ✅ SYNC ORDERS
if (!step || step === 'orders') {
  try {
    let cursor = ""
    let hasMore = true
    let safetyLimit = 0

    while (hasMore && safetyLimit < 20) {
      console.log(`📦 Sync orders cursor="${cursor}" page ${safetyLimit + 1}...`)
      const orderList = await shopeeGet<{
        order_list: { order_sn: string }[]
        more: boolean
        next_cursor: string
      }>(BASE_URL, "/api/v2/order/get_order_list", {
        time_range_field: "create_time",
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 50,
        ...(cursor ? { cursor } : {}),
      }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

      const orders = orderList?.order_list ?? []

      if (orders.length > 0) {
        const orderSns = orders.map(o => o.order_sn).join(",")
        await new Promise(r => setTimeout(r, 100))

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
              model_id: number
              model_name: string
              model_sku: string
              model_quantity_purchased: number
              model_original_price: number
              model_discounted_price: number
            }[]
          }[]
        }>(BASE_URL, "/api/v2/order/get_order_detail", {
          order_sn_list: orderSns,
          response_optional_fields: "buyer_username,pay_time,tracking_no,shipping_carrier,total_amount,currency,create_time,update_time,item_list",
        }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

        const ordersToUpsert = (orderDetails.order_list ?? []).map(order => ({
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
        }))

        const { data: insertedOrders, error: insertError } = await supabaseAdmin
          .from("orders")
          .insert(ordersToUpsert)
          .select("id, external_order_id")

        let upsertedOrders = insertedOrders
        let upsertError = insertError

        if (insertError?.code === '23505') {
          upsertedOrders = []
          upsertError = null
          for (const order of ordersToUpsert) {
            const { data, error } = await supabaseAdmin
              .from("orders")
              .upsert(order, { onConflict: "integration_id,external_order_id" })
              .select("id, external_order_id")
              .single()
            if (!error && data) upsertedOrders.push(data)
          }
        }

        if (upsertError) {
          console.error("❌ Erro ao salvar pedidos em batch:", JSON.stringify(upsertError))
        } else {
          ordersCount += upsertedOrders?.length || 0
          console.log(`✅ ${upsertedOrders?.length} pedidos salvos em batch`)

          const itemsToUpsert: {
            order_id: string
            external_item_id: string
            item_name: string
            sku: string
            quantity: number
            unit_price: number
            total_price: number
          }[] = []

          for (const order of orderDetails.order_list ?? []) {
            const savedOrder = upsertedOrders?.find(o => o.external_order_id === order.order_sn)
            if (!savedOrder?.id) continue
            const items = order.item_list ?? []
            if (items.length === 0) continue
            itemsToUpsert.push(...items.map(item => ({
              order_id: savedOrder.id,
              external_item_id: String(item.item_id),
              item_name: item.item_name || item.model_name || "Produto sem nome",
              sku: item.model_sku || item.item_sku || "",
              quantity: item.model_quantity_purchased || 1,
              unit_price: Number(item.model_discounted_price) || Number(item.model_original_price) || 0,
              total_price: (Number(item.model_discounted_price) || Number(item.model_original_price) || 0) * (item.model_quantity_purchased || 1),
            })))
          }

          const deduped = new Map()
          itemsToUpsert.forEach(item => {
            const key = `${item.order_id}_${item.external_item_id}`
            if (!deduped.has(key)) deduped.set(key, item)
          })
          const uniqueItems = Array.from(deduped.values())

          if (uniqueItems.length > 0) {
            const { error: itemsError } = await supabaseAdmin
              .from("order_items")
              .upsert(uniqueItems, { onConflict: "order_id,external_item_id" })
            if (itemsError) console.error("❌ Erro ao salvar items em batch:", JSON.stringify(itemsError))
            else console.log(`✅ ${uniqueItems.length} items salvos em batch`)
          }
        }
      }

      hasMore = Boolean(orderList?.more)
      cursor = orderList?.next_cursor ?? ""
      safetyLimit++
      console.log(`📄 hasMore: ${hasMore} | cursor: "${cursor}" | safetyLimit: ${safetyLimit}`)
      if (hasMore) await new Promise(r => setTimeout(r, 100))
    }

    console.log(`✅ Total de pedidos sincronizados: ${ordersCount}`)
  } catch (orderError) {
    console.error("❌ Orders sync error:", orderError)
  }
}
    // ✅ SYNC PAYMENTS
    if (!step || step === 'payments') {
      try {
    const escrowOrders: { order_sn: string; escrow_release_time: number; payout_amount: number }[] = []
      let escrowHasMore = true
      let escrowSafetyLimit = 0
      let escrowPage = 1

      while (escrowHasMore && escrowSafetyLimit < 20) {
        const escrowList = await shopeeGet<{
          escrow_list: { order_sn: string; escrow_release_time: number; payout_amount: number }[]
          more: boolean
        }>(BASE_URL, "/api/v2/payment/get_escrow_list", {
          release_time_from: timeFrom,
          release_time_to: timeTo,
          page_size: 50,
          page_no: escrowPage,
        }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

        const page = escrowList?.escrow_list ?? []
        escrowOrders.push(...page)
        escrowHasMore = Boolean(escrowList?.more)
        escrowPage++
        escrowSafetyLimit++
        console.log(`💰 Página ${escrowPage - 1}: ${page.length} escrows | hasMore: ${escrowHasMore}`)
        if (escrowHasMore) await new Promise(r => setTimeout(r, 100))
      }

      console.log(`💰 Total de escrows encontrados: ${escrowOrders.length}`)

        for (const escrowOrder of escrowOrders) {
          try {
            await new Promise(r => setTimeout(r, 100))
            const escrowDetail = await shopeeGet<{
              order_sn: string
              order_income: {
                buyer_total_amount: number
                commission_fee: number
                net_service_fee: number
                estimated_shipping_fee: number
                reverse_shipping_fee: number
                seller_discount: number
                shopee_discount: number
                escrow_amount: number
                voucher_from_shopee: number
                voucher_from_seller: number
                shopee_shipping_rebate: number
              }
            }>(BASE_URL, "/api/v2/payment/get_escrow_detail", { order_sn: escrowOrder.order_sn }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

            const income = escrowDetail?.order_income
            const orderSn = escrowDetail?.order_sn
            if (!income || !orderSn) continue

            const { data: orderRow } = await supabaseAdmin.from("orders").select("id").eq("integration_id", connection_id).eq("external_order_id", orderSn).single()

            const { error: paymentError } = await supabaseAdmin.from("payments").upsert({
              integration_id: connection_id,
              external_transaction_id: orderSn,
              order_id: orderRow?.id ?? null,
              amount: Number(income.buyer_total_amount) || 0,
              marketplace_fee: Number(income.commission_fee) + Number(income.net_service_fee) || 0,
              net_amount: Number(income.escrow_amount) || 0,
              currency: "BRL",
              payment_method: "escrow",
              status: "released",
              description: `Escrow liberado - Pedido ${orderSn}`,
              transaction_date: now.toISOString(),
              synced_at: now.toISOString(),
            }, { onConflict: "external_transaction_id" })

            if (paymentError) { console.error("❌ Erro ao salvar payment:", orderSn, paymentError); continue }

            const feesToInsert = [
              { type: "commission", key: "commission_fee", amount: income.commission_fee, description: "Comissão Shopee" },
              { type: "service_fee", key: "service_fee", amount: income.net_service_fee, description: "Taxa de serviço" },
              { type: "shipping_fee", key: "shipping_fee", amount: income.estimated_shipping_fee, description: "Frete estimado" },
              { type: "shipping_fee", key: "reverse_shipping_fee", amount: income.reverse_shipping_fee, description: "Frete reverso" },
              { type: "adjustment", key: "seller_discount", amount: income.seller_discount, description: "Desconto do vendedor" },
              { type: "adjustment", key: "shopee_discount", amount: income.shopee_discount, description: "Desconto Shopee" },
              { type: "adjustment", key: "shopee_shipping_rebate", amount: income.shopee_shipping_rebate, description: "Rebate frete Shopee" },
              { type: "adjustment", key: "voucher_shopee", amount: income.voucher_from_shopee, description: "Voucher Shopee" },
            ].filter(f => f.amount && Number(f.amount) !== 0)

            for (const fee of feesToInsert) {
              const { error: feeError } = await supabaseAdmin.from("fees").upsert({
                integration_id: connection_id,
                external_fee_id: `${orderSn}_${fee.key}`,
                order_id: orderRow?.id ?? null,
                fee_type: fee.type,
                amount: Number(fee.amount),
                currency: "BRL",
                description: fee.description,
                fee_date: safeShopeeDate(escrowOrder.escrow_release_time) ?? now.toISOString(),
                synced_at: now.toISOString(),
              }, { onConflict: "external_fee_id" })
              if (feeError) console.error("❌ Erro ao salvar fee:", fee.key, JSON.stringify(feeError))
              else console.log("✅ Fee salva:", fee.key, orderSn)
            }

            paymentsCount++
          } catch (detailError) {
            console.error("❌ Erro no escrow detail:", escrowOrder.order_sn, detailError)
          }
        }
      } catch (paymentError) {
        console.error("❌ Payments sync error:", paymentError)
        await supabaseAdmin.from("integration_connections").update({
          last_error_message: paymentError instanceof Error ? paymentError.message : String(paymentError),
          updated_at: new Date().toISOString(),
        }).eq("id", connection_id)
      }
    }

    // ✅ SYNC WALLET
    if (!step || step === 'wallet') {
      try {
        const walletRes = await shopeeGet<{
          transaction_list: {
            transaction_id: number
            status: string
            wallet_type: string
            transaction_type: string
            amount: number
            current_balance: number
            create_time: number
            order_sn: string
            description: string
            money_flow: string
          }[]
          more: boolean
        }>(BASE_URL, "/api/v2/payment/get_wallet_transaction_list", {
          transaction_type: 3,
          page_no: 1,
          page_size: 50,
        }, PARTNER_ID, PARTNER_KEY, accessToken, shopId)

        const transactions = walletRes?.transaction_list ?? []
        console.log(`🏦 ${transactions.length} transações de carteira encontradas`)

        for (const tx of transactions) {
          const { data: orderRow } = tx.order_sn
            ? await supabaseAdmin.from("orders").select("id").eq("integration_id", connection_id).eq("external_order_id", tx.order_sn).single()
            : { data: null }

          await supabaseAdmin.from("payments").upsert({
            integration_id: connection_id,
            external_transaction_id: String(tx.transaction_id),
            order_id: orderRow?.id ?? null,
            amount: Number(tx.amount) || 0,
            marketplace_fee: 0,
            net_amount: Number(tx.amount) || 0,
            currency: "BRL",
            payment_method: "wallet",
            status: tx.status?.toLowerCase() || "completed",
            description: tx.description || `Transação carteira #${tx.transaction_id}`,
            transaction_date: safeShopeeDate(tx.create_time) ?? now.toISOString(),
            synced_at: now.toISOString(),
          }, { onConflict: "external_transaction_id" })

          walletCount++
        }
      } catch (walletError) {
        console.error("❌ Wallet sync error:", walletError)
      }
    }

    // ✅ Atualiza conexão apenas na etapa final ou quando não há step
    if (!step || step === 'wallet') {
      if (!customTimeFrom && !customTimeTo) {
        const nextSync = new Date(now.getTime() + (connection.auto_sync_frequency_minutes || 60) * 60 * 1000)
        await supabaseAdmin.from("integration_connections").update({
          last_sync_at: now.toISOString(),
          next_sync_at: nextSync.toISOString(),
          last_error_code: null,
          last_error_message: null,
          updated_at: now.toISOString(),
        }).eq("id", connection_id)
      }

      await supabaseAdmin.from("integration_sync_logs").insert({
        connection_id,
        user_id: isCronCall ? connection.user_id : userId,
        type: "sync",
        status: ordersCount > 0 || paymentsCount > 0 || walletCount > 0 ? "success" : "empty",
        message: `${ordersCount} pedidos, ${paymentsCount} pagamentos, ${walletCount} transações sincronizados`,
        metadata: {
          orders_synced: String(ordersCount),
          payments_synced: String(paymentsCount),
          wallet_transactions_synced: String(walletCount),
          time_from: new Date(timeFrom * 1000).toISOString(),
          time_to: new Date(timeTo * 1000).toISOString(),
        },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Sync concluído (step: ${step || 'all'})`,
        period: {
          from: new Date(timeFrom * 1000).toISOString(),
          to: new Date(timeTo * 1000).toISOString(),
        },
        stats: { orders: ordersCount, payments: paymentsCount, wallet_transactions: walletCount },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("❌ Sync error completo:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno do servidor" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})