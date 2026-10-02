// Busca os dados do comprador (nome, CPF/CNPJ, endereço) pra pré-preencher
// o assistente de nota fiscal — só pro Mercado Livre, que expõe isso de
// propósito via API (ao contrário da Shopee, que mascara pra apps sem
// whitelist — ver docs/shopee-static-ip-proxy-setup.md). Chamado sob
// demanda pelo frontend quando o vendedor abre o assistente pra um pedido
// específico — nunca em sync em lote, e nunca cacheamos esse PII no banco.
//
// 3 chamadas confirmadas empiricamente contra a API real (não documentação,
// que diverge entre fontes):
//   GET /orders/{id}              -> nome do comprador + shipping.id
//   GET /orders/{id}/billing_info -> CPF/CNPJ
//   GET /shipments/{shipping_id}  -> endereço completo de entrega
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"
import { decryptToken, encryptToken } from "../_shared/token-crypto.ts"

const ML_API = "https://api.mercadolibre.com"

interface MlConnection {
  id: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  external_shop_id: string | null
}

// deno-lint-ignore no-explicit-any
async function refreshIfNeeded(supabase: any, connection: MlConnection, clientId: string, clientSecret: string): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
  // Margem de 1 min pra não usar um token que expira no meio das 3 chamadas.
  if (expiresAt > Date.now() + 60_000) {
    return (await decryptToken(connection.access_token)) || ""
  }

  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: (await decryptToken(connection.refresh_token)) || "",
    }),
  })
  if (!res.ok) throw new Error("Falha ao renovar token do Mercado Livre")
  const tokenData = await res.json()

  await supabase.from("integration_connections").update({
    access_token: await encryptToken(tokenData.access_token),
    refresh_token: await encryptToken(tokenData.refresh_token),
    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", connection.id)

  return tokenData.access_token
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight
  const corsHeaders = getCorsHeaders(req)

  try {
    const authHeader = req.headers.get("Authorization") ?? ""
    const userToken = authHeader.replace("Bearer ", "")
    if (!userToken) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { connection_id, order_id } = await req.json()
    if (!connection_id || !order_id) {
      return new Response(JSON.stringify({ error: "connection_id e order_id são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const { data: connection, error: connError } = await supabase
      .from("integration_connections")
      .select("id, access_token, refresh_token, token_expires_at, external_shop_id")
      .eq("id", connection_id)
      .eq("user_id", user.id)
      .eq("provider", "mercadolivre")
      .single()
    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!
    const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!
    const accessToken = await refreshIfNeeded(supabase, connection, ML_CLIENT_ID, ML_CLIENT_SECRET)
    const authHeaders = { Authorization: `Bearer ${accessToken}` }

    const orderRes = await fetch(`${ML_API}/orders/${order_id}`, { headers: authHeaders })
    if (!orderRes.ok) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado no Mercado Livre" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const order = await orderRes.json()

    // Confere que o pedido é mesmo dessa loja -- sem isso, trocar o order_id
    // no payload deixaria ver o comprador de QUALQUER pedido do Mercado
    // Livre, de qualquer vendedor, usando o token da própria conta.
    if (String(order?.seller?.id) !== String(connection.external_shop_id)) {
      return new Response(JSON.stringify({ error: "Pedido não pertence a essa loja" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const [billingRes, shipmentRes] = await Promise.all([
      fetch(`${ML_API}/orders/${order_id}/billing_info`, { headers: authHeaders }),
      order?.shipping?.id
        ? fetch(`${ML_API}/shipments/${order.shipping.id}`, { headers: authHeaders })
        : Promise.resolve(null),
    ])

    const billing = billingRes.ok ? (await billingRes.json())?.billing_info : null
    const shipment = shipmentRes?.ok ? await shipmentRes.json() : null
    const addr = shipment?.receiver_address

    return new Response(JSON.stringify({
      comprador: {
        nome: [order?.buyer?.first_name, order?.buyer?.last_name].filter(Boolean).join(" ") || order?.buyer?.nickname || null,
        documento_tipo: billing?.doc_type ?? null,
        documento_numero: billing?.doc_number ?? null,
      },
      endereco: addr ? {
        logradouro: addr.street_name ?? null,
        numero: addr.street_number ?? null,
        complemento: addr.comment ?? null,
        bairro: addr.neighborhood?.name ?? null,
        cidade: addr.city?.name ?? null,
        // ML guarda o estado como "BR-SP" -- a nota fiscal só quer a sigla.
        uf: addr.state?.id ? String(addr.state.id).replace(/^BR-/, "") : null,
        cep: addr.zip_code ?? null,
        telefone: addr.receiver_phone ?? null,
      } : null,
      itens: (order?.order_items ?? []).map((it: { item?: { title?: string }; quantity?: number; unit_price?: number }) => ({
        titulo: it?.item?.title ?? null,
        quantidade: it?.quantity ?? null,
        preco_unitario: it?.unit_price ?? null,
      })),
      valor_total: order?.total_amount ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (e) {
    console.error("ml-billing-info erro:", e)
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
