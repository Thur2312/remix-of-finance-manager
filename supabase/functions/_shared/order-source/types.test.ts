// Rodar com: deno test supabase/functions/_shared/order-source/types.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { paginate, type FetchPage } from "./types.ts"

Deno.test("paginate — percorre todas as páginas até cursor null, expondo o cursor de cada lote", async () => {
  const pages: Record<string, FetchPage<number>> = {
    start: { items: [1, 2], nextCursor: "p2" },
    p2: { items: [3, 4], nextCursor: "p3" },
    p3: { items: [5], nextCursor: null },
  }
  const fetchPage = (cursor: string | null) => Promise.resolve(pages[cursor ?? "start"])

  const collected: number[] = []
  const cursorsVistos: (string | null)[] = []
  for await (const step of paginate(fetchPage)) {
    collected.push(...step.items)
    cursorsVistos.push(step.cursor)
  }
  assertEquals(collected, [1, 2, 3, 4, 5])
  assertEquals(cursorsVistos, ["p2", "p3", null])
})

Deno.test("paginate — página única (nextCursor já null de cara) não busca de novo", async () => {
  let calls = 0
  const fetchPage = () => {
    calls++
    return Promise.resolve({ items: ["a"], nextCursor: null })
  }
  const collected: string[] = []
  for await (const step of paginate(fetchPage)) collected.push(...step.items)
  assertEquals(collected, ["a"])
  assertEquals(calls, 1)
})

Deno.test("paginate — é lazy: break antes do fim não busca as páginas seguintes", async () => {
  let calls = 0
  const fetchPage = (cursor: string | null) => {
    calls++
    return Promise.resolve({ items: [cursor ?? "start"], nextCursor: "sempre-tem-mais" })
  }
  for await (const _step of paginate(fetchPage)) {
    break // sai na primeira página
  }
  assertEquals(calls, 1) // não buscou a 2ª página que nunca foi pedida
})

Deno.test("paginate — respeita um cursor inicial (retomada de sync interrompido)", async () => {
  const pages: Record<string, FetchPage<number>> = {
    "cursor-salvo": { items: [99], nextCursor: null },
  }
  const fetchPage = (cursor: string | null) => Promise.resolve(pages[cursor ?? "nao-devia-cair-aqui"])
  const collected: number[] = []
  for await (const step of paginate(fetchPage, "cursor-salvo")) collected.push(...step.items)
  assertEquals(collected, [99])
})
