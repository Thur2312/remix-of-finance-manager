// Erros tipados do client TikTok — distingue as 3 categorias que o chamador
// precisa tratar de formas diferentes:
//   - "auth": token inválido/expirado. NUNCA adianta tentar de novo sem
//     antes trocar o token (ver tiktok-token-refresh) — retryable: false.
//   - "rate_limit": estourou o limite de chamadas. Vale tentar de novo,
//     respeitando o backoff (e o `Retry-After` do servidor, se vier).
//   - "business": a chamada chegou, a TikTok processou, mas recusou por
//     regra de negócio (parâmetro inválido, recurso não existe...).
//     Tentar de novo com os MESMOS parâmetros só repete o mesmo erro.
//   - "network"/"timeout": problema de conectividade ou nossa própria
//     AbortController estourou o prazo. Geralmente vale retry.
export type TikTokErrorKind = "auth" | "rate_limit" | "business" | "network" | "timeout"

export class TikTokApiError extends Error {
  readonly kind: TikTokErrorKind
  readonly httpStatus?: number
  readonly businessCode?: number
  readonly retryable: boolean
  readonly retryAfterMs?: number

  constructor(
    kind: TikTokErrorKind,
    message: string,
    opts: {
      httpStatus?: number
      businessCode?: number
      retryable?: boolean
      retryAfterMs?: number
    } = {},
  ) {
    super(message)
    this.name = "TikTokApiError"
    this.kind = kind
    this.httpStatus = opts.httpStatus
    this.businessCode = opts.businessCode
    this.retryAfterMs = opts.retryAfterMs
    // default: só as categorias tipicamente transientes tentam de novo sozinhas
    this.retryable = opts.retryable ?? (kind === "rate_limit" || kind === "network" || kind === "timeout")
  }
}
