import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { hmacSha256Hex } from "../_shared/hmac.ts"
import { timingSafeEqual } from "../_shared/timing-safe-equal.ts"

// Item 6 do pedido: webhook da TikTok Shop.
//
// ████ TODO CRÍTICO — não confirmado ████ Nome do header de assinatura e o
// algoritmo exato variam entre versões da doc pública da TikTok Shop —
// abaixo assumo HMAC-SHA256 do corpo CRU com o app_secret, hex, num header
// chamado "X-TikTok-Shop-Signature". O que É garantido independente disso:
// SEMPRE exigir uma assinatura válida antes de confiar em qualquer coisa do
// payload, comparando em tempo constante — e, não conseguindo confirmar o
// esquema certo, REJEITAR (fail closed) em vez de aceitar sem checar
// (fail open). Ajustar o nome do header/algoritmo aqui não muda nada do
// resto do arquivo.
const WEBHOOK_SIGNATURE_HEADER = "X-TikTok-Shop-Signature"

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const APP_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET")
  if (!APP_SECRET) {
    console.error("tiktok-webhook: TIKTOK_CLIENT_SECRET ausente")
    return new Response("Config ausente", { status: 500 })
  }

  // Lê o corpo como TEXTO cru — a assinatura é calculada sobre os bytes
  // exatos que a TikTok mandou. Se desse `req.json()` primeiro e depois
  // `JSON.stringify()` pra reconstruir, a formatação (ordem de chaves,
  // espaços) poderia mudar e a assinatura nunca bateria.
  const rawBody = await req.text()
  const receivedSignature = req.headers.get(WEBHOOK_SIGNATURE_HEADER) ?? ""
  const expectedSignature = await hmacSha256Hex(APP_SECRET, rawBody)

  // Comparação em tempo constante — mesmo motivo do cron_secret em
  // tiktok-token-refresh/tiktok-sync (ver timing-safe-equal.ts). Um webhook
  // é um endpoint público na internet; qualquer um pode tentar adivinhar a
  // assinatura certa por tentativa e erro medindo o tempo de resposta.
  const signatureValid = receivedSignature.length > 0 && timingSafeEqual(receivedSignature, expectedSignature)
  if (!signatureValid) {
    console.warn("tiktok-webhook: assinatura ausente ou inválida")
    return new Response("Assinatura inválida", { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response("JSON inválido", { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  // TODO: nomes de campo não confirmados — ajusta quando souber o payload real.
  const externalEventId = typeof payload.tts_notification_id === "string" ? payload.tts_notification_id : null
  const eventType =
    typeof payload.type === "string" ? payload.type
    : typeof payload.event_type === "string" ? payload.event_type
    : "unknown"

  // ── Enfileira e retorna — NÃO processa aqui ──────────────────────────
  // Idempotente por natureza: se a TikTok reenviar o mesmo evento (webhook
  // é "at-least-once", pode duplicar OU chegar fora de ordem), o índice
  // único parcial em external_event_id absorve a duplicata sem erro
  // (ignoreDuplicates). Este handler é só um GATILHO de baixa latência —
  // NÃO é a fonte de verdade dos dados: quem confirma de fato é o sync via
  // API (tiktok-sync, polling a cada 3 min) + a reconciliação de 48h. Se
  // este webhook nunca chegar (rede, TikTok fora do ar, o que for), o
  // pedido/settlement ainda entra pelo polling normal — só um pouco mais
  // tarde.
  const { error } = await supabase.from("tiktok_webhook_events").upsert(
    { external_event_id: externalEventId, event_type: eventType, payload, status: "pending" },
    externalEventId ? { onConflict: "external_event_id", ignoreDuplicates: true } : undefined,
  )

  if (error) {
    console.error("tiktok-webhook: erro ao enfileirar", error)
    return new Response("Erro ao enfileirar", { status: 500 })
  }

  return new Response("OK", { status: 200 })
})

// ════════════════════════════════════════════════════════════════════════
// NOTA — ninguém drena tiktok_webhook_events ainda
// ════════════════════════════════════════════════════════════════════════
// De propósito: o pedido explicitamente separa "enfileira e retorna rápido"
// de "processar" — processar teria que decidir O QUE FAZER com cada tipo de
// evento (pedido novo? status mudou? qual conexão/shop pertence isso?), e
// isso depende de nomes de campo do payload que não confirmei. Consumir a
// fila é um passo separado, natural de fazer quando o formato real do
// payload estiver confirmado — a estrutura (fila + dedup + status) já está
// pronta pra receber esse consumidor sem precisar mudar o schema.
