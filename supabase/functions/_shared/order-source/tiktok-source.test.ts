// Rodar com: deno test supabase/functions/_shared/order-source/tiktok-source.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { decimalStringToCents, epochSecondsToIso } from "./tiktok-source.ts"

Deno.test("decimalStringToCents — caso comum", () => {
  assertEquals(decimalStringToCents("129.90"), 12990)
})

Deno.test("decimalStringToCents — sem parte decimal", () => {
  assertEquals(decimalStringToCents("50"), 5000)
})

Deno.test("decimalStringToCents — só 1 dígito decimal (completa com zero)", () => {
  assertEquals(decimalStringToCents("10.5"), 1050)
})

Deno.test("decimalStringToCents — undefined vira 0, não NaN", () => {
  assertEquals(decimalStringToCents(undefined), 0)
})

Deno.test("decimalStringToCents — negativo (estorno/ajuste)", () => {
  assertEquals(decimalStringToCents("-15.30"), -1530)
})

Deno.test("decimalStringToCents — não herda imprecisão de float (caso clássico 0.1+0.2)", () => {
  // Se a implementação passasse por parseFloat(v) * 100 sem cuidado, valores
  // como "19.99" podem virar 1998.9999999... antes do round — aqui não tem
  // multiplicação de float na parte decimal, só concatenação de dígitos.
  assertEquals(decimalStringToCents("19.99"), 1999)
  assertEquals(decimalStringToCents("0.29"), 29)
})

Deno.test("epochSecondsToIso — converte epoch seconds pra ISO", () => {
  assertEquals(epochSecondsToIso(1_757_000_000), new Date(1_757_000_000 * 1000).toISOString())
})

Deno.test("epochSecondsToIso — undefined vira epoch 0 (não 'now', não crash)", () => {
  assertEquals(epochSecondsToIso(undefined), new Date(0).toISOString())
})
