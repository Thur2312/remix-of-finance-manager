// Rodar com: deno test supabase/functions/_shared/tiktok/client.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
//
// fetchImpl/sleepImpl injetados (ver client.ts) — sem isso, testar retry
// exigiria mockar o `fetch` global (frágil, vaza entre testes) ou esperar
// segundos de backoff real a cada teste.
import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { TikTokClient } from "./client.ts"
import { TikTokApiError } from "./errors.ts"

const noopSleep = () => Promise.resolve()

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers })
}

function baseConfig(fetchImpl: typeof fetch) {
  return { appKey: "k", appSecret: "s", accessToken: "t", fetchImpl, sleepImpl: noopSleep }
}

Deno.test("request — sucesso retorna `data` do envelope", async () => {
  const fetchImpl = () => Promise.resolve(jsonResponse({ code: 0, message: "ok", data: { foo: "bar" } }))
  const client = new TikTokClient(baseConfig(fetchImpl))
  const data = await client.request<{ foo: string }>("/x")
  assertEquals(data.foo, "bar")
})

Deno.test("request — 401 vira TikTokApiError kind=auth, sem retry", async () => {
  let calls = 0
  const fetchImpl = () => {
    calls++
    return Promise.resolve(jsonResponse({ code: 1, message: "invalid token" }, 401))
  }
  const client = new TikTokClient(baseConfig(fetchImpl))

  const err = await assertRejects(() => client.request("/x"), TikTokApiError)
  assertEquals(err.kind, "auth")
  assertEquals(err.retryable, false)
  assertEquals(calls, 1) // não tentou de novo
})

Deno.test("request — code de negócio != 0 (HTTP 200) vira kind=business, sem retry", async () => {
  let calls = 0
  const fetchImpl = () => {
    calls++
    return Promise.resolve(jsonResponse({ code: 12345, message: "parâmetro inválido", data: null }))
  }
  const client = new TikTokClient(baseConfig(fetchImpl))

  const err = await assertRejects(() => client.request("/x"), TikTokApiError)
  assertEquals(err.kind, "business")
  assertEquals(err.businessCode, 12345)
  assertEquals(calls, 1)
})

Deno.test("request — 429 seguido de sucesso: tenta de novo e retorna o resultado", async () => {
  let calls = 0
  const fetchImpl = () => {
    calls++
    if (calls === 1) return Promise.resolve(jsonResponse({}, 429, { "Retry-After": "1" }))
    return Promise.resolve(jsonResponse({ code: 0, message: "ok", data: { ok: true } }))
  }
  const client = new TikTokClient(baseConfig(fetchImpl))

  const data = await client.request<{ ok: boolean }>("/x")
  assertEquals(data.ok, true)
  assertEquals(calls, 2)
})

Deno.test("request — timeout (AbortError) é retryable e esgota as tentativas", async () => {
  let calls = 0
  const fetchImpl = () => {
    calls++
    return Promise.reject(new DOMException("aborted", "AbortError"))
  }
  const client = new TikTokClient(baseConfig(fetchImpl))

  const err = await assertRejects(() => client.request("/x"), TikTokApiError)
  assertEquals(err.kind, "timeout")
  assertEquals(calls, 4) // tentativa inicial + 3 retries (MAX_RETRIES = 3)
})

Deno.test("request — HTTP 5xx é retryable, 4xx (que não 401/429) não é", async () => {
  const fetchImpl500 = () => Promise.resolve(new Response("erro", { status: 503 }))
  const client500 = new TikTokClient(baseConfig(fetchImpl500))
  const err500 = await assertRejects(() => client500.request("/x"), TikTokApiError)
  assertEquals(err500.retryable, true)

  const fetchImpl400 = () => Promise.resolve(new Response("erro", { status: 400 }))
  const client400 = new TikTokClient(baseConfig(fetchImpl400))
  const err400 = await assertRejects(() => client400.request("/x"), TikTokApiError)
  assertEquals(err400.retryable, false)
})
