// Rodar com: deno test supabase/functions/_shared/timing-safe-equal.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { timingSafeEqual } from "./timing-safe-equal.ts"

Deno.test("timingSafeEqual — strings iguais", () => {
  assertEquals(timingSafeEqual("segredo-123", "segredo-123"), true)
})

Deno.test("timingSafeEqual — diferentes no primeiro caractere", () => {
  assertEquals(timingSafeEqual("Xegredo-123", "segredo-123"), false)
})

Deno.test("timingSafeEqual — diferentes no último caractere", () => {
  assertEquals(timingSafeEqual("segredo-12X", "segredo-123"), false)
})

Deno.test("timingSafeEqual — comprimentos diferentes", () => {
  assertEquals(timingSafeEqual("curto", "muito-mais-longo"), false)
})

Deno.test("timingSafeEqual — strings vazias são iguais entre si", () => {
  assertEquals(timingSafeEqual("", ""), true)
})
