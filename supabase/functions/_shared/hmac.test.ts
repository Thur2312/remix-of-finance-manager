// Rodar com: deno test supabase/functions/_shared/hmac.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals, assertMatch, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { hmacSha256Hex } from "./hmac.ts"

Deno.test("hmacSha256Hex — determinístico", async () => {
  const a = await hmacSha256Hex("chave", "mensagem")
  const b = await hmacSha256Hex("chave", "mensagem")
  assertEquals(a, b)
})

Deno.test("hmacSha256Hex — hex de 64 caracteres (SHA-256 = 32 bytes)", async () => {
  const sig = await hmacSha256Hex("chave", "mensagem")
  assertMatch(sig, /^[0-9a-f]{64}$/)
})

Deno.test("hmacSha256Hex — chave diferente muda o resultado", async () => {
  const a = await hmacSha256Hex("chave1", "mensagem")
  const b = await hmacSha256Hex("chave2", "mensagem")
  assertNotEquals(a, b)
})

Deno.test("hmacSha256Hex — mensagem diferente muda o resultado", async () => {
  const a = await hmacSha256Hex("chave", "mensagem-1")
  const b = await hmacSha256Hex("chave", "mensagem-2")
  assertNotEquals(a, b)
})
