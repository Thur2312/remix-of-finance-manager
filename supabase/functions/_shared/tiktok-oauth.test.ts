// Rodar com: deno test supabase/functions/_shared/tiktok-oauth.test.ts
// (não executado nesta sessão — sem Deno CLI instalado no ambiente local).
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { isStateValid, resolveRefreshedTokens, type OAuthStateRow } from "./tiktok-oauth.ts"

const TTL = 30 * 60 * 1000

Deno.test("isStateValid — state ausente (busca não achou nada) é inválido", () => {
  assertEquals(isStateValid(null, TTL, Date.now()), false)
})

Deno.test("isStateValid — dentro do TTL é válido", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const row: OAuthStateRow = { user_id: "u1", created_at: "2026-09-10T11:45:00Z" } // 15 min atrás
  assertEquals(isStateValid(row, TTL, now), true)
})

Deno.test("isStateValid — exatamente no limite do TTL ainda é válido (inclusivo)", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const row: OAuthStateRow = { user_id: "u1", created_at: "2026-09-10T11:30:00Z" } // exatos 30 min
  assertEquals(isStateValid(row, TTL, now), true)
})

Deno.test("isStateValid — 1s depois do TTL já é inválido", () => {
  const now = Date.parse("2026-09-10T12:00:01Z")
  const row: OAuthStateRow = { user_id: "u1", created_at: "2026-09-10T11:30:00Z" }
  assertEquals(isStateValid(row, TTL, now), false)
})

Deno.test("isStateValid — created_at no futuro (relógio ou dado corrompido) é inválido", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const row: OAuthStateRow = { user_id: "u1", created_at: "2026-09-10T12:05:00Z" }
  assertEquals(isStateValid(row, TTL, now), false)
})

Deno.test("resolveRefreshedTokens — usa o refresh_token novo quando a resposta traz um", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const resolved = resolveRefreshedTokens(
    "token-antigo",
    {
      access_token: "access-novo",
      refresh_token: "refresh-novo",
      access_token_expire_in: 3600,
      refresh_token_expire_in: 86400 * 30,
    },
    now,
  )
  assertEquals(resolved.accessToken, "access-novo")
  assertEquals(resolved.refreshToken, "refresh-novo")
  assertEquals(resolved.tokenExpiresAtIso, new Date(now + 3600 * 1000).toISOString())
  assertEquals(resolved.refreshTokenExpiresAtIso, new Date(now + 86400 * 30 * 1000).toISOString())
})

Deno.test("resolveRefreshedTokens — mantém o refresh_token antigo quando a resposta não traz um novo", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const resolved = resolveRefreshedTokens(
    "token-antigo",
    { access_token: "access-novo", access_token_expire_in: 3600, refresh_token_expire_in: 2592000 },
    now,
  )
  assertEquals(resolved.refreshToken, "token-antigo")
})

Deno.test("resolveRefreshedTokens — refresh_token vazio também cai no fallback pro antigo", () => {
  const now = Date.parse("2026-09-10T12:00:00Z")
  const resolved = resolveRefreshedTokens(
    "token-antigo",
    {
      access_token: "access-novo",
      refresh_token: "",
      access_token_expire_in: 3600,
      refresh_token_expire_in: 2592000,
    },
    now,
  )
  assertEquals(resolved.refreshToken, "token-antigo")
})
