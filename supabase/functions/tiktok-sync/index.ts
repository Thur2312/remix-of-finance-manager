import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { decryptToken } from "../_shared/token-crypto.ts"
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts"
import { TikTokClient } from "../_shared/tiktok/client.ts"
import { TikTokOfficialSource } from "../_shared/order-source/tiktok-source.ts"
import { paginate } from "../_shared/order-source/types.ts"
import type { NormalizedOrder } from "../_shared/order-source/types.ts"

// Item 5 do pedido: sync RESUMÍVEL. Cada invocação processa no máximo
// MAX_PAGES_PER_INVOCATION páginas e devolve — nunca tenta varrer tudo de
// uma vez (Edge Function é trabalho curto e sem estado, não um worker de
// longa duração). Se sobrou cursor, fica salvo em tiktok_sync_state; a
// PRÓXIMA batida do cron (não um auto-reagendamento) continua de onde
// parou.
//
// ⚠️ Só "orders" é de fato persistido nesta leva. Settlements/products têm
// a porta (fetchSettlementsPage/fetchProductsPage) pronta, mas a
// persistência fica pra depois — ver nota grande no fim do arquivo.
const MAX_PAGES_PER_INVOCATION = 5
const STALE_LOCK_MINUTES = 10 // espelha o intervalo do claim_tiktok_sync

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  let body: { connection_id?: string; cron_secret?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 })
  }

  const CRON_SECRET = Deno.env.get("INTEGRATION_SYNC_CRON_SECRET") ?? ""
  const isCronCall =
    Boolean(CRON_SECRET) &&
    typeof body.cron_secret === "string" &&
    timingSafeEqual(body.cron_secret, CRON_SECRET)

  if (!isCronCall) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 })
  }

  const connectionId = body.connection_id
  if (!connectionId) {
    return new Response(JSON.stringify({ error: "connection_id ausente" }), { status: 400 })
  }

  const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")
  const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")
  if (!CLIENT_KEY || !CLIENT_SECRET) {
    console.error("tiktok-sync: env vars ausentes")
    return new Response(JSON.stringify({ error: "Config ausente" }), { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: conn, error: connError } = await supabase
    .from("integration_connections")
    .select("id, status, access_token, token_expires_at")
    .eq("id", connectionId)
    .eq("provider", "tiktok")
    .maybeSingle()

  if (connError || !conn) {
    return new Response(JSON.stringify({ error: "Conexão não encontrada" }), { status: 404 })
  }
  if (conn.status !== "connected") {
    return new Response(JSON.stringify({ skipped: true, reason: "not_connected" }), { status: 200 })
  }
  if (conn.token_expires_at && new Date(conn.token_expires_at).getTime() <= Date.now()) {
    // Token venceu e o refresh proativo (item 2) ainda não passou por aqui
    // (ou falhou — nesse caso já virou status 'expired', que o `if` acima
    // já barrou). Não é um erro DESTE sync: tenta de novo no próximo tick,
    // quando o refresh já deve ter rodado.
    return new Response(JSON.stringify({ skipped: true, reason: "token_stale" }), { status: 200 })
  }

  const accessToken = await decryptToken(conn.access_token)
  if (!accessToken) {
    return new Response(JSON.stringify({ skipped: true, reason: "no_access_token" }), { status: 200 })
  }

  const client = new TikTokClient({ appKey: CLIENT_KEY, appSecret: CLIENT_SECRET, accessToken })
  const source = new TikTokOfficialSource(client)

  try {
    const result = await syncOrders(supabase, connectionId, source)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (error) {
    console.error("tiktok-sync error:", error)
    return new Response(JSON.stringify({ error: "Erro interno no sync" }), { status: 500 })
  }
})

async function syncOrders(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  connectionId: string,
  source: TikTokOfficialSource,
): Promise<{ skipped: true; reason: string } | { pagesProcessed: number; reachedEnd: boolean }> {
  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_tiktok_sync", { p_connection_id: connectionId, p_resource: "orders" })
    .maybeSingle()

  if (claimError) throw claimError
  // Vazio = ou já está 'running' há menos de STALE_LOCK_MINUTES (outra
  // invocação cuidando), ou a linha de estado ainda nem existe pra essa
  // conexão (ver seedTiktokSyncState em tiktok-oauth-callback).
  if (!claimed) return { skipped: true, reason: "not_claimable" }

  let pagesProcessed = 0
  let lastCursor: string | null = claimed.cursor
  let reachedEnd = false

  try {
    for await (const step of paginate<NormalizedOrder>(
      (cursor) => source.fetchOrdersPage({ sinceIso: claimed.window_since, cursor }),
      claimed.cursor,
    )) {
      await upsertOrders(supabase, connectionId, step.items)
      lastCursor = step.cursor
      pagesProcessed++

      // Heartbeat + checkpoint a CADA página — se a invocação morrer logo
      // depois (timeout da plataforma, crash), a próxima retoma exatamente
      // daqui. `status` continua 'running' até o fim da invocação inteira
      // (não a cada página) — senão outra invocação concorrente poderia
      // reivindicar o meio do trabalho que ESTA ainda está fazendo.
      await supabase
        .from("tiktok_sync_state")
        .update({ cursor: lastCursor, updated_at: new Date().toISOString() })
        .eq("id", claimed.id)

      if (lastCursor === null) {
        reachedEnd = true
        break
      }
      if (pagesProcessed >= MAX_PAGES_PER_INVOCATION) break
    }
  } catch (err) {
    await supabase
      .from("tiktok_sync_state")
      .update({
        status: "error",
        attempts: claimed.attempts + 1,
        last_error: err instanceof Error ? err.message : String(err),
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
    throw err
  }

  if (reachedEnd) {
    // Passada completa: avança a janela pra AGORA e zera o cursor — a
    // PRÓXIMA passada só busca o que mudou depois disso (incremental, não
    // varre tudo nas próximas rodadas).
    await supabase
      .from("tiktok_sync_state")
      .update({
        window_since: new Date().toISOString(),
        cursor: null,
        status: "idle",
        attempts: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
  } else {
    // Ainda tem cursor (bateu o teto de páginas desta invocação) — libera o
    // "running" pra próxima batida do cron poder continuar.
    await supabase
      .from("tiktok_sync_state")
      .update({ status: "idle", updated_at: new Date().toISOString() })
      .eq("id", claimed.id)
  }

  return { pagesProcessed, reachedEnd }
}

// ── Upsert idempotente por (integration_id, external_order_id) ───────────
// Esse é o unique constraint REAL de `orders`
// (orders_integration_external_id_unique, migration baseline) — reprocessar
// a mesma página duas vezes (retry, cron duplicado, reconciliação
// periódica varrendo os últimos 48h de novo) grava por cima da mesma linha
// em vez de duplicar. `order_items` idem, por (order_id, external_item_id).
// deno-lint-ignore no-explicit-any
async function upsertOrders(supabase: any, connectionId: string, orders: NormalizedOrder[]): Promise<void> {
  for (const order of orders) {
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .upsert(
        {
          integration_id: connectionId,
          external_order_id: order.externalOrderId,
          status: order.status,
          total_amount: order.totalAmountCents / 100,
          total_amount_cents: order.totalAmountCents,
          currency: order.currency,
          buyer_username: order.buyerUsername ?? "",
          order_created_at: order.orderCreatedAt,
          order_updated_at: order.orderUpdatedAt,
          paid_at: order.paidAt,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "integration_id,external_order_id" },
      )
      .select("id")
      .single()

    if (orderError) {
      console.error("upsertOrders order error:", orderError, order.externalOrderId)
      continue // um pedido ruim não deve derrubar o lote inteiro
    }

    for (const item of order.items) {
      const unitPriceCents = item.quantity > 0 ? Math.round(item.totalPriceCents / item.quantity) : 0
      const { error: itemError } = await supabase.from("order_items").upsert(
        {
          order_id: orderRow.id,
          external_item_id: item.externalItemId,
          sku: item.sku ?? "",
          item_name: item.itemName,
          quantity: item.quantity,
          total_price: item.totalPriceCents / 100,
          total_price_cents: item.totalPriceCents,
          unit_price: unitPriceCents / 100,
          unit_price_cents: unitPriceCents,
        },
        { onConflict: "order_id,external_item_id" },
      )
      if (itemError) console.error("upsertOrders item error:", itemError, item.externalItemId)
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// NOTA — settlements e products não são persistidos ainda
// ════════════════════════════════════════════════════════════════════════
// `TikTokOfficialSource.fetchSettlementsPage` já existe e a porta tá pronta,
// mas a tabela existente pra settlement do TikTok (`tiktok_settlements`, do
// fluxo de upload manual de planilha) é chaveada por
// `unique(user_id, order_id, sku_id)` — granularidade POR SKU dentro do
// pedido, moldada exatamente no formato do CSV que a Central do Vendedor
// exporta. `NormalizedSettlement` (item 4) não tem `sku_id` nenhum — não
// sei se a API de settlement da TikTok devolve nesse nível de detalhe ou só
// por pedido/transação inteira, porque nunca vi uma resposta real. Escrever
// um mapeamento agora seria inventar uma correspondência de campos sem
// nenhuma confirmação — exatamente o tipo de risco que a instrução de "não
// hardcodar sem confirmar" existe pra evitar. Fica pra quando houver acesso
// de sandbox pra ver o formato real.
