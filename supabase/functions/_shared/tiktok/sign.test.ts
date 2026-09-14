// Rodar com: deno test supabase/functions/_shared/tiktok/sign.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
//
// Não testo contra um hash "esperado" fixo: eu não tenho como confirmar o
// valor correto sem rodar isto de verdade contra a doc/sandbox da TikTok
// (ver o TODO crítico em sign.ts). Testar propriedades do algoritmo
// (determinismo, sensibilidade a mudança de input, ordenação) pega bug de
// implementação sem depender de eu ter acertado o esquema exato da TikTok.
import { assertEquals, assertNotEquals, assertMatch } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { signTikTokRequest } from "./sign.ts"

Deno.test("signTikTokRequest — determinístico: mesma entrada, mesma assinatura", async () => {
  const a = await signTikTokRequest({ path: "/x", params: { app_key: "k", timestamp: "1" }, appSecret: "s" })
  const b = await signTikTokRequest({ path: "/x", params: { app_key: "k", timestamp: "1" }, appSecret: "s" })
  assertEquals(a, b)
})

Deno.test("signTikTokRequest — hex de 64 caracteres (SHA-256 = 32 bytes)", async () => {
  const sig = await signTikTokRequest({ path: "/x", params: { a: "1" }, appSecret: "s" })
  assertMatch(sig, /^[0-9a-f]{64}$/)
})

Deno.test("signTikTokRequest — ordem de inserção do objeto não muda a assinatura (ordena por chave)", async () => {
  const a = await signTikTokRequest({ path: "/x", params: { b: "2", a: "1" }, appSecret: "s" })
  const b = await signTikTokRequest({ path: "/x", params: { a: "1", b: "2" }, appSecret: "s" })
  assertEquals(a, b)
})

Deno.test("signTikTokRequest — path diferente muda a assinatura", async () => {
  const a = await signTikTokRequest({ path: "/x", params: { a: "1" }, appSecret: "s" })
  const b = await signTikTokRequest({ path: "/y", params: { a: "1" }, appSecret: "s" })
  assertNotEquals(a, b)
})

Deno.test("signTikTokRequest — secret diferente muda a assinatura", async () => {
  const a = await signTikTokRequest({ path: "/x", params: { a: "1" }, appSecret: "s1" })
  const b = await signTikTokRequest({ path: "/x", params: { a: "1" }, appSecret: "s2" })
  assertNotEquals(a, b)
})

Deno.test("signTikTokRequest — valor de um param diferente muda a assinatura", async () => {
  const a = await signTikTokRequest({ path: "/x", params: { a: "1" }, appSecret: "s" })
  const b = await signTikTokRequest({ path: "/x", params: { a: "2" }, appSecret: "s" })
  assertNotEquals(a, b)
})
