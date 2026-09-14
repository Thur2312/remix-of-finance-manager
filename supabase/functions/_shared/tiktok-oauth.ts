// Compartilhado entre tiktok-oauth-start e tiktok-oauth-callback. TTL do
// `state` de CSRF — um só lugar pra não divergir entre quem grava (start) e
// quem valida (callback). É a mesma classe de bug que já mordeu este
// projeto antes (useTrialStatus tinha sua própria cópia de uma regra que
// devia vir de um único lugar, e as duas cópias divergiram silenciosamente).
export const OAUTH_STATE_TTL_MS = 30 * 60 * 1000 // 30 minutos

export interface OAuthStateRow {
  user_id: string
  created_at: string
}

// Extraído do callback pra virar testável sem precisar de Deno.serve nem de
// banco — puro: recebe a linha (ou null, se a busca não achou nada) e a
// hora "agora" explícita (nunca `new Date()` direto — testes determinísticos
// precisam controlar o tempo).
// `stateRow is OAuthStateRow` (não só `boolean`) — um "type predicate": além
// de retornar true/false, ensina o TypeScript a estreitar o tipo de
// `stateRow` de `OAuthStateRow | null` pra `OAuthStateRow` em qualquer lugar
// onde essa função apareça numa condição. Sem isso, o chamador precisaria
// de um segundo `if (!stateRow) ...` manual antes de ler `.user_id`, mesmo
// já tendo confirmado a validade aqui.
export function isStateValid(
  stateRow: OAuthStateRow | null,
  ttlMs: number,
  nowMs: number,
): stateRow is OAuthStateRow {
  if (!stateRow) return false
  const ageMs = nowMs - new Date(stateRow.created_at).getTime()
  return ageMs >= 0 && ageMs <= ttlMs
}

// ── Refresh de token ─────────────────────────────────────────────────────

export interface TikTokTokenRefreshResponse {
  access_token: string
  refresh_token?: string
  access_token_expire_in: number
  refresh_token_expire_in: number
}

export interface ResolvedTikTokTokens {
  accessToken: string
  refreshToken: string
  tokenExpiresAtIso: string
  refreshTokenExpiresAtIso: string
}

// TikTok pode ou não rotacionar o refresh_token numa chamada de refresh
// (varia por versão/config do app — não confirmado na doc). Se a resposta
// não trouxer um novo, mantém o que já tínhamos: ele continua válido até
// `refresh_token_expire_in`, e sobrescrever com string vazia destruiria a
// única credencial que permite o PRÓXIMO refresh.
export function resolveRefreshedTokens(
  previousRefreshToken: string,
  response: TikTokTokenRefreshResponse,
  nowMs: number,
): ResolvedTikTokTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token?.trim() ? response.refresh_token : previousRefreshToken,
    tokenExpiresAtIso: new Date(nowMs + response.access_token_expire_in * 1000).toISOString(),
    refreshTokenExpiresAtIso: new Date(
      nowMs + response.refresh_token_expire_in * 1000,
    ).toISOString(),
  }
}
