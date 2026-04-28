import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ML_API = "https://api.mercadolibre.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const userToken = authHeader.replace("Bearer ", "");

    let userId: string | null = null;

    if (userToken) {
      const { data: { user } } = await supabase.auth.getUser(userToken);
      userId = user?.id ?? null;
    }

    // ✅ Fix: status 'connected' em vez de 'active'
    const query = supabase
      .from("integration_connections")
      .select("*")
      .eq("provider", "mercadolivre")
      .eq("status", "connected");

    if (userId) query.eq("user_id", userId);

    const { data: connections, error } = await query;

    if (error || !connections?.length) {
      return new Response(
        JSON.stringify({ message: "Nenhuma integração ML ativa encontrada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const connection of connections) {
      try {
        const accessToken = await getValidToken(supabase, connection);
        const syncResult = await syncConnection(supabase, connection, accessToken);
        results.push({ user_id: connection.user_id, ...syncResult });
      } catch (err) {
        console.error(`Erro ao sincronizar ML para user ${connection.user_id}:`, err);
        results.push({ user_id: connection.user_id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no mercadolivre-sync:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno no sync ML" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Refresh de token ────────────────────────────────────────────────────────

async function getValidToken(supabase, connection): Promise<string> {
  const now = new Date();
  // ✅ Fix: token_expires_at em vez de expires_at
  const expiresAt = new Date(connection.token_expires_at);
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
    return connection.access_token;
  }

  console.log(`Renovando token ML para user ${connection.user_id}...`);
  const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Erro ao renovar token ML:", err);
    throw new Error("Falha ao renovar token ML");
  }

  const tokenData = await res.json();

  // ✅ Fix: token_expires_at em vez de expires_at
  await supabase
    .from("integration_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

// ─── Sync principal por conexão ───────────────────────────────────────────────

async function syncConnection(supabase, connection, accessToken: string) {
  const logStart = new Date().toISOString();
  let ordersCount = 0;
  let paymentsCount = 0;
  const feesCount = 0;

  const { data: lastLog } = await supabase
    .from("integration_sync_logs")
    .select("created_at")
    .eq("connection_id", connection.id)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since = lastLog?.created_at
    ? new Date(lastLog.created_at)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const dateFrom = since.toISOString().split(".")[0] + ".000-00:00";

  // ── 1. Sync de pedidos ──────────────────────────────────────────────────────
  try {
    ordersCount = await syncOrders(supabase, connection, accessToken, dateFrom);

    await supabase.from("integration_sync_logs").insert({
      connection_id: connection.id,
      user_id: connection.user_id,
      provider: "mercadolivre",
      event: "sync_success",
      message: `${ordersCount} pedidos sincronizados`,
      metadata: { orders_synced: String(ordersCount) },
    });
  } catch (err) {
    console.error("Erro no sync de pedidos ML:", err);
    await supabase.from("integration_sync_logs").insert({
      connection_id: connection.id,
      user_id: connection.user_id,
      provider: "mercadolivre",
      event: "sync_error",
      message: String(err),
    });
  }

  // ── 2. Sync de pagamentos ───────────────────────────────────────────────────
  try {
    paymentsCount = await syncPayments(supabase, connection, accessToken, dateFrom);

    await supabase.from("integration_sync_logs").insert({
      connection_id: connection.id,
      user_id: connection.user_id,
      provider: "mercadolivre",
      event: "sync_success",
      message: `${paymentsCount} pagamentos sincronizados`,
      metadata: { payments_synced: String(paymentsCount) },
    });
  } catch (err) {
    console.error("Erro no sync de pagamentos ML:", err);
    await supabase.from("integration_sync_logs").insert({
      connection_id: connection.id,
      user_id: connection.user_id,
      provider: "mercadolivre",
      event: "sync_error",
      message: String(err),
    });
  }

  // ✅ Atualiza last_sync_at na connection
  await supabase
    .from("integration_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return { orders: ordersCount, payments: paymentsCount, fees: feesCount };
}

// ─── Sync de pedidos ─────────────────────────────────────────────────────────

async function syncOrders(
  supabase,
  connection,
  accessToken: string,
  dateFrom: string
): Promise<number> {
  let count = 0;
  let offset = 0;
  const limit = 50;

  // ✅ Fix: external_shop_id em vez de shop_id
  const sellerId = connection.external_shop_id;

  while (true) {
    const url = `${ML_API}/orders/search?seller=${sellerId}&order.date_created.from=${encodeURIComponent(dateFrom)}&sort=date_desc&offset=${offset}&limit=${limit}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Erro ao buscar pedidos ML:", err);
      break;
    }

    const data = await res.json();
    const orders = data.results ?? [];

    if (orders.length === 0) break;

    for (const order of orders) {
      await upsertOrder(supabase, connection, order);
      count++;
    }

    if (orders.length < limit) break;
    offset += limit;
  }

  console.log(`Sincronizados ${count} pedidos ML para user ${connection.user_id}`);
  return count;
}

// ─── Sync de pagamentos ──────────────────────────────────────────────────────

async function syncPayments(
  supabase,
  connection,
  accessToken: string,
  dateFrom: string
): Promise<number> {
  let count = 0;
  let offset = 0;
  const limit = 50;

  // ✅ Fix: external_shop_id em vez de shop_id
  const sellerId = connection.external_shop_id;

  while (true) {
    const url = `${ML_API}/collections/search?seller=${sellerId}&transaction.date_approved.from=${encodeURIComponent(dateFrom)}&sort=date_desc&offset=${offset}&limit=${limit}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Erro ao buscar pagamentos ML:", err);
      break;
    }

    const data = await res.json();
    const payments = data.results ?? [];

    if (payments.length === 0) break;

    for (const payment of payments) {
      await upsertPayment(supabase, connection, payment);
      count++;
    }

    if (payments.length < limit) break;
    offset += limit;
  }

  console.log(`Sincronizados ${count} pagamentos ML para user ${connection.user_id}`);
  return count;
}

// ─── Upsert de pedido ────────────────────────────────────────────────────────

async function upsertOrder(supabase, connection, order) {
  const now = new Date().toISOString();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .upsert({
      integration_id: connection.id,
      external_order_id: String(order.id),
      status: order.status,
      total_amount: order.total_amount,
      currency: order.currency_id,
      buyer_username: order.buyer?.nickname ?? null,
      shipping_carrier: order.shipping?.id ? "ML Envios" : null,
      tracking_number: null,
      paid_at: order.date_closed ?? null,
      order_created_at: order.date_created,
      order_updated_at: order.last_updated,
      product_name: order.order_items?.[0]?.item?.title ?? null,
      product_id: order.order_items?.[0]?.item?.id ?? null,
      synced_at: now,
    }, { onConflict: "integration_id,external_order_id" })
    .select("id")
    .single();

  if (orderError) {
    console.error("Erro ao upsert order ML:", orderError);
    return;
  }

  // ml_orders (tabela específica)
  const item = order.order_items?.[0];
  // ✅ Fix: onConflict com sku para bater com a constraint da tabela
  await supabase.from("ml_orders").upsert({
    user_id: connection.user_id,
    order_id: String(order.id),
    sku: item?.item?.seller_sku ?? null,
    nome_produto: item?.item?.title ?? null,
    variacao: item?.item?.variation_attributes?.[0]?.value_name ?? null,
    quantidade: item?.quantity ?? 1,
    total_faturado: order.total_amount ?? 0,
    desconto_plataforma: 0,
    desconto_vendedor: 0,
    custo_unitario: 0,
    taxa_ml: 0,
    frete_ml: order.shipping?.cost ?? 0,
    status_pedido: order.status,
    data_pedido: order.date_created,
    updated_at: now,
  }, { onConflict: "user_id,order_id,sku" }); // ✅ Fix

  // order_items
  if (order.order_items?.length > 0 && orderRow?.id) {
    const items = order.order_items.map((oi) => ({
      order_id: orderRow.id,
      external_item_id: String(oi.item?.id),
      item_name: oi.item?.title ?? null,
      sku: oi.item?.seller_sku ?? null,
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      total_price: (oi.full_unit_price ?? oi.unit_price) * oi.quantity,
    }));

    await supabase
      .from("order_items")
      .upsert(items, { onConflict: "order_id,external_item_id" });
  }
}

// ─── Upsert de pagamento ─────────────────────────────────────────────────────

async function upsertPayment(supabase, connection, payment) {
  const now = new Date().toISOString();
  const col = payment.collection ?? payment;

  const { data: orderRow } = await supabase
    .from("orders")
    .select("id")
    .eq("integration_id", connection.id)
    .eq("external_order_id", String(col?.order_id))
    .maybeSingle();

  const marketplaceFee = Math.abs(col?.marketplace_fee ?? 0);
  const netAmount = col?.net_received_amount ?? col?.total_paid_amount ?? 0;

  await supabase.from("payments").upsert({
    integration_id: connection.id,
    order_id: orderRow?.id ?? null,
    external_transaction_id: String(col?.id),
    amount: col?.total_paid_amount ?? 0,
    currency: col?.currency_id ?? "BRL",
    payment_method: col?.payment_type ?? null,
    marketplace_fee: marketplaceFee,
    net_amount: netAmount,
    status: col?.status,
    transaction_date: col?.date_approved ?? col?.date_created,
    description: `Pagamento ML pedido ${col?.order_id}`,
    synced_at: now,
  }, { onConflict: "integration_id,external_transaction_id" });

  // Atualiza taxa na ml_orders
  if (col?.order_id) {
    await supabase
      .from("ml_orders")
      .update({ taxa_ml: marketplaceFee, updated_at: now })
      .eq("user_id", connection.user_id)
      .eq("order_id", String(col.order_id));
  }

  // Registra na tabela fees
  if (marketplaceFee > 0 && orderRow?.id) {
    await supabase.from("fees").upsert({
      integration_id: connection.id,
      order_id: orderRow.id,
      external_fee_id: `ml_fee_${col?.id}`,
      fee_type: "marketplace_fee",
      amount: marketplaceFee,
      currency: col?.currency_id ?? "BRL",
      description: "Taxa do Mercado Livre",
      fee_date: col?.date_approved ?? col?.date_created,
      synced_at: now,
    }, { onConflict: "integration_id,external_fee_id" });
  }
}