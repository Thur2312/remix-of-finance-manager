import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("ML Webhook recebido:", JSON.stringify(body));

    // O ML envia: { resource, user_id, topic, application_id, attempts, sent, received }
    const { resource, user_id: mlUserId, topic } = body;

    if (!resource || !topic) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca a integração do usuário ML correspondente
    // O ml_user_id é salvo no shop_id da integration_connections
    const { data: connection, error: connError } = await supabase
      .from("integration_connections")
      .select("id, user_id, access_token, refresh_token, expires_at, metadata")
      .eq("provider", "mercadolivre")
      .eq("shop_id", String(mlUserId))
      .maybeSingle();

    if (connError || !connection) {
      console.warn("Integração ML não encontrada para user_id:", mlUserId);
      // Retorna 200 para o ML não retentar
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se o token precisa ser renovado
    const accessToken = await getValidToken(supabase, connection);

    // Roteamento por tópico
    if (topic === "orders_v2") {
      await handleOrderNotification(supabase, connection, accessToken, resource);
    } else if (topic === "payments") {
      await handlePaymentNotification(supabase, connection, accessToken, resource);
    } else if (topic === "items") {
      console.log("Notificação de item recebida:", resource);
      // Pode expandir aqui para sincronizar anúncios
    } else {
      console.log(`Tópico não tratado: ${topic}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no webhook ML:", error);
    // Retorna 200 para evitar retentativas infinitas do ML
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Refresh de token ────────────────────────────────────────────────────────

async function getValidToken(supabase, connection): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(connection.expires_at);
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
    return connection.access_token;
  }

  // Renova o token
  console.log("Renovando token ML...");
  const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
  const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
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
    return connection.access_token; // usa o atual mesmo expirado como fallback
  }

  const tokenData = await res.json();

  await supabase
    .from("integration_connections")
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id);

  return tokenData.access_token;
}

// ─── Handler de pedidos ──────────────────────────────────────────────────────

async function handleOrderNotification(
  supabase,
  connection,
  accessToken: string,
  resource: string
) {
  // resource vem como "/orders/123456789"
  const orderId = resource.replace("/orders/", "").split("?")[0];
  const ML_API = "https://api.mercadolibre.com";

  const res = await fetch(`${ML_API}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("Erro ao buscar pedido ML:", orderId, await res.text());
    return;
  }

  const order = await res.json();
  await upsertOrder(supabase, connection, order);
}

// ─── Handler de pagamentos ───────────────────────────────────────────────────

async function handlePaymentNotification(
  supabase,
  connection,
  accessToken: string,
  resource: string
) {
  // resource vem como "/collection/notification/123456789"
  const paymentId = resource.split("/").pop()?.split("?")[0];
  const ML_API = "https://api.mercadolibre.com";

  const res = await fetch(`${ML_API}/collections/notifications/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    console.error("Erro ao buscar pagamento ML:", paymentId, await res.text());
    return;
  }

  const payment = await res.json();
  await upsertPayment(supabase, connection, payment);
}

// ─── Upsert de pedido ────────────────────────────────────────────────────────

async function upsertOrder(supabase, connection, order) {
  const now = new Date().toISOString();

  // 1. Upsert na tabela orders (compartilhada)
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

  // 2. Upsert na tabela ml_orders (específica ML)
  const item = order.order_items?.[0];
  await supabase.from("ml_orders").upsert({
    user_id: connection.user_id,
    order_id: String(order.id),
    sku: item?.item?.seller_sku ?? null,
    nome_produto: item?.item?.title ?? null,
    variacao: item?.item?.variation_attributes?.[0]?.value_name ?? null,
    quantidade: item?.quantity ?? 1,
    total_faturado: order.total_amount ?? 0,
    desconto_plataforma: 0, // será calculado quando o pagamento chegar
    desconto_vendedor: 0,
    custo_unitario: 0,
    taxa_ml: 0,
    frete_ml: order.shipping?.cost ?? 0,
    status_pedido: order.status,
    data_pedido: order.date_created,
    updated_at: now,
  }, { onConflict: "user_id,order_id" });

  // 3. Upsert itens do pedido
  if (order.order_items?.length > 0 && orderRow?.id) {
    const items = order.order_items.map((oi) => ({
      order_id: orderRow.id,
      external_item_id: String(oi.item?.id),
      item_name: oi.item?.title ?? null,
      sku: oi.item?.seller_sku ?? null,
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      total_price: oi.full_unit_price * oi.quantity,
    }));

    await supabase
      .from("order_items")
      .upsert(items, { onConflict: "order_id,external_item_id" });
  }

  console.log(`Pedido ML ${order.id} salvo com sucesso.`);
}

// ─── Upsert de pagamento ─────────────────────────────────────────────────────

async function upsertPayment(supabase, connection, payment) {
  const now = new Date().toISOString();
  const col = payment.collection;

  // Busca o order_id interno pelo external_order_id
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

  // Atualiza a taxa na ml_orders
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

  console.log(`Pagamento ML ${col?.id} salvo com sucesso.`);
}