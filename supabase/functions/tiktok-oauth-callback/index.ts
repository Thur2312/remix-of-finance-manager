import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encryptToken } from "../_shared/token-crypto.ts"
import { OAUTH_STATE_TTL_MS, isStateValid } from "../_shared/tiktok-oauth.ts"

// Perna 2 do fluxo OAuth da TikTok Shop — chamada pelo servidor da TikTok
// via redirect do navegador do usuário, com `?code&state` na query string.
// Sem Authorization header: quem prova a identidade do usuário aqui é só o
// `state` (ver validação abaixo).
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")?.trim() || "https://sellerfinance.com.br"

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state") ?? ""

  const fail = (reason: string) =>
    Response.redirect(`${FRONTEND_URL}/integrations?error=${encodeURIComponent(reason)}`, 302)

  try {
    if (!code) return fail("missing_code")
    if (!state) return fail("missing_state")

    const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")?.trim()
    const CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")?.trim()
    const REDIRECT_URI = Deno.env.get("TIKTOK_REDIRECT_URI")?.trim()
    if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI) return fail("missing_env")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // ── Validação do state (proteção CSRF) ───────────────────────────────
    // O `code` que a TikTok manda aqui não prova, sozinho, PRA QUEM no
    // nosso sistema essa conexão deve ir — ele só prova que alguém
    // autorizou alguma coisa do lado da TikTok. Sem o `state`, um atacante
    // poderia iniciar o fluxo com a PRÓPRIA conta TikTok dele, capturar a
    // URL de callback com o `code` válido, e induzir a vítima (logada no
    // nosso sistema) a abrir esse link — a vítima acabaria com a loja do
    // atacante conectada à conta dela. `tiktok-oauth-start` gravou
    // `user_id` + `state` ANTES de mandar o usuário pra TikTok; se o state
    // que volta aqui não bate com um que nós mesmos emitimos (e ainda
    // dentro do TTL), não existe garantia nenhuma de quem é o dono do code
    // — trata como inválido.
    const { data: stateRow, error: stateError } = await supabase
      .from("oauth_state")
      .select("user_id, created_at")
      .eq("state", state)
      .eq("provider", "tiktok")
      .maybeSingle()

    // Consome o state ANTES de decidir se ele é válido — uso único mesmo
    // em cima de state expirado ou malformado, fechando reuso por replay
    // (alguém tentando reenviar a mesma URL de callback duas vezes).
    if (stateRow) {
      await supabase.from("oauth_state").delete().eq("state", state)
    }

    if (stateError || !isStateValid(stateRow, OAUTH_STATE_TTL_MS, Date.now())) {
      return fail("invalid_state")
    }

    const userId = stateRow.user_id

    // ── Troca do code pelos tokens ────────────────────────────────────────
    const tokenRes = await fetch("https://auth.tiktok-shops.com/api/v2/token/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: CLIENT_KEY,
        app_secret: CLIENT_SECRET,
        auth_code: code,
        grant_type: "authorized_code",
      }),
    })

    if (!tokenRes.ok) {
      console.error("tiktok token/get HTTP", tokenRes.status, await tokenRes.text())
      return fail("token_exchange_failed")
    }

    const tokenData = await tokenRes.json()
    if (tokenData.code !== 0) {
      console.error("tiktok token/get business error", tokenData)
      return fail(tokenData.message || "token_exchange_failed")
    }

    const {
      access_token,
      refresh_token,
      access_token_expire_in,
      refresh_token_expire_in,
      open_id,
      seller_name,
    } = tokenData.data

    if (!open_id) {
      // Sem open_id não tem como saber QUAL loja é essa — não dá pra
      // desambiguar de uma outra loja TikTok da mesma conta no futuro.
      return fail("missing_shop_id")
    }

    const now = new Date()

    // ── Persistência — upsert por (user_id, provider, external_shop_id) ───
    // Esse é o unique constraint REAL da tabela hoje
    // (integration_connections_user_provider_shop_key, migration
    // 20260826160000_integration_connections_multi_shop.sql). A versão
    // anterior deste callback fazia
    // `onConflict: "user_id,provider"` — um par de 2 colunas que NÃO
    // corresponde a nenhum constraint único de 2 colunas na tabela hoje
    // (foi dropado de propósito, justamente pra permitir múltiplas lojas
    // por provider). Isso fazia esse upsert falhar com erro do Postgres
    // ("no unique or exclusion constraint matching...") em toda tentativa
    // de conectar uma loja TikTok — bug pré-existente, não algo que esta
    // reescrita introduziu.
    const { error: dbError } = await supabase
      .from("integration_connections")
      .upsert(
        {
          user_id: userId,
          provider: "tiktok",
          status: "connected",
          external_shop_id: open_id,
          shop_name: seller_name ?? "",
          access_token: await encryptToken(access_token),
          refresh_token: await encryptToken(refresh_token),
          token_expires_at: new Date(now.getTime() + access_token_expire_in * 1000).toISOString(),
          refresh_token_expires_at: new Date(
            now.getTime() + refresh_token_expire_in * 1000,
          ).toISOString(),
          last_error_code: null,
          last_error_message: null,
          updated_at: now.toISOString(),
          // TODO: `integration_connections.scopes` já existe e o item 2 do
          // pedido lista ela — não escrevo aqui porque não confirmei o nome
          // exato do campo de escopos concedidos na resposta real do
          // token/get (a doc não deixa 100% claro se é `granted_scopes`,
          // `scope` singular, ou nem vem nessa chamada). Melhor deixar null
          // e confirmar contra uma resposta real de sandbox do que chutar
          // um path errado e gravar `undefined`/lixo silenciosamente.
        },
        { onConflict: "user_id,provider,external_shop_id" },
      )

    if (dbError) {
      console.error("tiktok-oauth-callback DB error:", dbError)
      return fail("Erro ao salvar integração")
    }

    // Semeia o estado de sync (item 5) — sem isso, tiktok-sync nunca tem o
    // que reivindicar pra essa conexão. `onConflict...ignoreDuplicates`:
    // numa reconexão (token expirado, usuário clicou "Reconectar"), NÃO
    // reseta o cursor/janela que já existiam — só cria se for conexão nova.
    const { data: connRow } = await supabase
      .from("integration_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "tiktok")
      .eq("external_shop_id", open_id)
      .single()

    if (connRow) {
      // TODO: 90 dias de backfill inicial é um palpite (mesma ordem de
      // grandeza dos syncs de Shopee/ML) — não confirmei se a API de
      // pedidos da TikTok aceita buscar tão longe no passado numa chamada
      // só, ou se tem uma janela máxima menor.
      const windowSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from("tiktok_sync_state")
        .upsert(
          { connection_id: connRow.id, resource: "orders", window_since: windowSince, status: "idle" },
          { onConflict: "connection_id,resource", ignoreDuplicates: true },
        )
    }

    return Response.redirect(`${FRONTEND_URL}/integrations?connected=tiktok`, 302)
  } catch (error) {
    console.error("tiktok-oauth-callback error:", error)
    return fail("Erro interno no callback")
  }
})
