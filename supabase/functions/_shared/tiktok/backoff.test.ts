// Rodar com: deno test supabase/functions/_shared/tiktok/backoff.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { computeBackoffMs } from "./backoff.ts"

// Math.random é substituído temporariamente por um valor fixo — assim o
// "full jitter" (que normalmente sorteia) vira determinístico pro teste, e
// dá pra confirmar o TETO exato calculado pra cada tentativa.
function withFixedRandom<T>(value: number, fn: () => T): T {
  const original = Math.random
  Math.random = () => value
  try {
    return fn()
  } finally {
    Math.random = original
  }
}

Deno.test("computeBackoffMs — com random=0, delay é sempre 0", () => {
  withFixedRandom(0, () => {
    assertEquals(computeBackoffMs(0), 0)
    assertEquals(computeBackoffMs(5), 0)
  })
})

Deno.test("computeBackoffMs — com random≈1, delay se aproxima do teto exponencial", () => {
  withFixedRandom(0.999999, () => {
    // tentativa 0: teto = baseMs * 2^0 = 500
    assert(computeBackoffMs(0, { baseMs: 500 }) >= 499)
    // tentativa 2: teto = baseMs * 2^2 = 2000
    assert(computeBackoffMs(2, { baseMs: 500 }) >= 1999)
  })
})

Deno.test("computeBackoffMs — nunca ultrapassa maxMs, mesmo em tentativas altas", () => {
  withFixedRandom(0.999999, () => {
    const delay = computeBackoffMs(20, { baseMs: 500, maxMs: 5_000 })
    assert(delay <= 5_000)
  })
})

Deno.test("computeBackoffMs — cresce com o número da tentativa", () => {
  withFixedRandom(0.999999, () => {
    const d0 = computeBackoffMs(0, { baseMs: 100, maxMs: 100_000 })
    const d3 = computeBackoffMs(3, { baseMs: 100, maxMs: 100_000 })
    assert(d3 > d0)
  })
})
