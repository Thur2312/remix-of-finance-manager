import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts"
import { OAUTH_STATE_TTL_MS } from "../_shared/tiktok-oauth.ts"

// Perna 1 do fluxo OAuth da TikTok Shop: gera a URL de autorização + o
// `state` que amarra o retorno (tiktok-oauth-callback) a quem iniciou o
// fluxo. Reescrita de item 1 do pedido — ver conversa: a versão anterior
// (branch "tiktok" dentro de integration-auth-start) tinha essa mesma
// lógica, só que misturada com um branch morto de outro provider.
//
// Por que uma function dedicada, separada da callback?
//   - Esta aqui é chamada pelo FRONTEND autenticado — fetch com o JWT do
//     usuário logado no header Authorization. Mesmo contexto de confiança
//     de qualquer outra rota autenticada da API.
//   - A callback é chamada pelo SERVIDOR da TikTok via redirect 302 do
//     PRÓPRIO NAVEGADOR do usuário — não carrega JWT nenhum, só
//     `?code&state` na query string. É, por natureza, uma rota anônima.
// As duas pernas têm contratos HTTP e níveis de confiança diferentes;
// juntar as duas num handler só significaria ramificar a lógica de auth em
// cima de "veio com Authorization ou não" — mais frágil que dois contratos
// simples e sem ambiguidade.
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req)
  if (preflight) return preflight
  const corsHeaders = getCorsHeaders(req)

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY")
    const REDIRECT_URI = Deno.env.get("TIKTOK_REDIRECT_URI")
    if (!CLIENT_KEY || !REDIRECT_URI) {
      throw new Error("TikTok env vars não configuradas")
    }

    const authHeader = req.headers.get("Authorization") ?? ""
    const userToken = authHeader.replace("Bearer ", "")

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // 32 bytes de uma CSPRNG (Web Crypto — `crypto.getRandomValues`, não
    // Math.random) convertidos pra hex. `crypto.randomUUID()` também seria
    // seguro (usa a mesma fonte de entropia por baixo), mas aqui optei por
    // pegar os bytes crus na mão: um UUID v4 "gasta" 6 dos 128 bits em
    // campos fixos de versão/variante — pouco importa pra um `state`
    // (mesmo 122 bits imprevisíveis já são inviáveis de adivinhar), mas
    // ilustra melhor o mecanismo de baixo nível.
    const stateBytes = new Uint8Array(32)
    crypto.getRandomValues(stateBytes)
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("")

    // Housekeeping oportunista: limpa state vencido de tentativas antigas.
    // Não precisa de cron dedicado só pra isso — cada novo /start já varre.
    await supabaseAdmin
      .from("oauth_state")
      .delete()
      .lt("created_at", new Date(Date.now() - OAUTH_STATE_TTL_MS).toISOString())

    const { error: stateError } = await supabaseAdmin
      .from("oauth_state")
      .insert({ state, user_id: user.id, provider: "tiktok" })

    if (stateError) {
      throw new Error("Erro ao salvar state do TikTok")
    }

    const authorization_url =
      `https://auth.tiktok-shops.com/oauth/authorize` +
      `?app_key=${CLIENT_KEY}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&state=${state}` +
      `&scope=user_info,order_read`
      // TODO: quando o sync de settlements (item 6) entrar, provavelmente
      // precisa de escopo adicional (ex.: algo de finance/settlement) — não
      // adiciono agora sem confirmar o nome exato no Partner Center, porque
      // pedir um scope que o app não tem aprovado derruba a autorização
      // inteira do lado da TikTok. Trocar o scope também exige que todo
      // usuário já conectado reconecte pra conceder a permissão nova.

    return new Response(JSON.stringify({ authorization_url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("tiktok-oauth-start error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
