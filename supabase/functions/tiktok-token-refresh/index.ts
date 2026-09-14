import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { decryptToken, encryptToken } from "../_shared/token-crypto.ts"
import { resolveRefreshedTokens } from "../_shared/tiktok-oauth.ts"
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts"

// Chamada só pelo pg_cron (trigger_tiktok_token_refresh, migration
// 20260914120000), nunca pelo frontend. Autenticação em 2 camadas, mesmo
// padrão de integration-sync:
//   1. Authorization: Bearer <anon_key> — satisfaz o gateway de JWT da
//      própria Supabase (toda function exige um JWT válido do projeto).
//   2. `cron_secret` no BODY, conferido aqui em tempo constante contra
//      TIKTOK_TOKEN_REFRESH_CRON_SECRET — é isso que realmente prova que a
//      chamada veio do nosso cron, não de qualquer um com a anon_key
//      (que é pública, vai no bundle do frontend).
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
    console.error("tiktok-token-refresh: env vars ausentes")
    return new Response(JSON.stringify({ error: "Config ausente" }), { status: 500 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  try {
    // ── Claim atômico (SELECT ... FOR UPDATE SKIP LOCKED dentro da RPC) ────
    // Trava a linha só durante esta chamada de banco (sem rede aqui dentro),
    // libera assim que o resultado volta. Se vier vazio: ou não está mais
    // no prazo de refresh (já foi renovado por outra invocação), ou outra
    // invocação está com a linha travada agora — nos dois casos, não há
    // nada a fazer aqui, e não é erro.
    const { data: claimed, error: claimError } = await supabase
      .rpc("claim_tiktok_token_refresh", { p_connection_id: connectionId, p_margin_seconds: 300 })
      .maybeSingle()

    if (claimError) {
      console.error("tiktok-token-refresh claim error:", claimError)
      return new Response(JSON.stringify({ error: "Erro ao reivindicar refresh" }), { status: 500 })
    }
    if (!claimed) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    const previousRefreshToken = await decryptToken(claimed.refresh_token)
    if (!previousRefreshToken) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_refresh_token" }), { status: 200 })
    }

    // ── Chamada pra TikTok ──────────────────────────────────────────────
    // TODO: confirmar contra a doc real (ou uma resposta de sandbox) — o
    // endpoint/shape aqui espelha token/get (mesma família de API,
    // mesmo estilo de payload), mas refresh não foi exercitado ainda porque
    // o app não tem acesso liberado. Se a TikTok usar GET com query string
    // em vez de POST+JSON pra refresh, ajusta só este bloco.
    const refreshRes = await fetch("https://auth.tiktok-shops.com/api/v2/token/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: CLIENT_KEY,
        app_secret: CLIENT_SECRET,
        refresh_token: previousRefreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!refreshRes.ok) {
      console.error("tiktok token/refresh HTTP", refreshRes.status, await refreshRes.text())
      await markFailed(supabase, connectionId, "http_error", `HTTP ${refreshRes.status}`)
      return new Response(JSON.stringify({ error: "Falha HTTP no refresh" }), { status: 502 })
    }

    const refreshData = await refreshRes.json()
    if (refreshData.code !== 0) {
      console.error("tiktok token/refresh business error", refreshData)
      // Refresh recusado quase sempre significa refresh_token morto/revogado
      // — não tem "tentar de novo mais tarde" que resolva. Marca expired pra
      // já cair no "Reconectar" que a UI de /integrations já tem pronto.
      await markFailed(supabase, connectionId, String(refreshData.code), refreshData.message)
      return new Response(JSON.stringify({ error: refreshData.message ?? "Refresh recusado" }), {
        status: 200, // não é erro NOSSO — não queremos o cron retentando igual falha transiente
      })
    }

    const resolved = resolveRefreshedTokens(previousRefreshToken, refreshData.data, Date.now())

    const { error: updateError } = await supabase
      .from("integration_connections")
      .update({
        access_token: await encryptToken(resolved.accessToken),
        refresh_token: await encryptToken(resolved.refreshToken),
        token_expires_at: resolved.tokenExpiresAtIso,
        refresh_token_expires_at: resolved.refreshTokenExpiresAtIso,
        status: "connected",
        last_error_code: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId)

    if (updateError) {
      console.error("tiktok-token-refresh update error:", updateError)
      return new Response(JSON.stringify({ error: "Erro ao salvar token renovado" }), { status: 500 })
    }

    return new Response(JSON.stringify({ refreshed: true }), { status: 200 })
  } catch (error) {
    console.error("tiktok-token-refresh error:", error)
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 })
  }
})

async function markFailed(
  supabase: ReturnType<typeof createClient>,
  connectionId: string,
  code: string,
  message: string | undefined,
): Promise<void> {
  await supabase
    .from("integration_connections")
    .update({
      status: "expired",
      last_error_code: code,
      last_error_message: message ?? "Refresh de token falhou",
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
}
