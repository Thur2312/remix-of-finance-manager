import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"
import { signTikTokRequest } from "./sign.ts"
import { computeBackoffMs } from "./backoff.ts"
import { TikTokApiError } from "./errors.ts"

const API_BASE = "https://open-api.tiktokglobalshop.com"
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_RETRIES = 3

// O "envelope" é o formato que toda resposta da TikTok Shop API compartilha
// (code/message/data) — só `data` varia por rota. Validado com zod (já é
// dependência deste projeto, usado em integration-auth-start) em vez de só
// castar `as T`: `res.json()` devolve `any`; sem validar, um campo faltando
// ou com tipo trocado vira `undefined` silencioso em produção, só explode
// (ou pior, não explode) várias camadas depois de onde o problema começou.
const envelopeSchema = z.object({
  code: z.number(),
  message: z.string(),
  request_id: z.string().optional(),
  data: z.unknown(),
})

export interface TikTokClientConfig {
  appKey: string
  appSecret: string
  accessToken: string
  /** injeção de dependência pra teste — default: fetch global */
  fetchImpl?: typeof fetch
  /** injeção de dependência pra teste — default: setTimeout real. Testes de
   *  retry injetam uma versão instantânea, senão cada teste levaria
   *  segundos de espera real por causa do backoff. */
  sleepImpl?: (ms: number) => Promise<void>
}

export interface RequestOptions<T> {
  method?: "GET" | "POST"
  query?: Record<string, string>
  body?: Record<string, unknown>
  timeoutMs?: number
  /** valida e tipa `data` da resposta. Sem schema, `data` sai como `unknown`. */
  dataSchema?: z.ZodType<T>
}

export class TikTokClient {
  private readonly fetchImpl: typeof fetch
  private readonly sleepImpl: (ms: number) => Promise<void>

  constructor(private readonly config: TikTokClientConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch
    this.sleepImpl = config.sleepImpl ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  /**
   * Executa uma chamada assinada, com timeout, e RETRY automático pra erros
   * marcados como `retryable` (rate limit, rede, timeout) — auth e business
   * nunca são retentados sozinhos, porque tentar de novo com o mesmo token
   * inválido ou o mesmo parâmetro recusado só repete o mesmo erro.
   */
  async request<T = unknown>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
    let lastError: TikTokApiError | undefined

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delayMs = lastError?.retryAfterMs ?? computeBackoffMs(attempt)
        await this.sleepImpl(delayMs)
      }

      try {
        return await this.doRequest(path, opts)
      } catch (err) {
        if (!(err instanceof TikTokApiError)) throw err
        if (!err.retryable || attempt === MAX_RETRIES) throw err
        lastError = err
      }
    }

    // Inalcançável (o loop sempre `return` ou `throw`) — satisfaz o
    // compilador, que não sabe que MAX_RETRIES garante uma das duas saídas.
    throw lastError ?? new TikTokApiError("network", "Falha desconhecida no client TikTok")
  }

  private async doRequest<T>(path: string, opts: RequestOptions<T>): Promise<T> {
    const method = opts.method ?? "GET"
    const timestamp = Math.floor(Date.now() / 1000).toString()

    const signParams: Record<string, string> = {
      app_key: this.config.appKey,
      timestamp,
      ...opts.query,
      // TODO: confirmar se o BODY (POST) também entra na base da assinatura
      // — algumas versões da API da TikTok exigem isso, outras não. Sem
      // confirmar, assino só query params + app_key + timestamp.
    }
    const sign = await signTikTokRequest({ path, params: signParams, appSecret: this.config.appSecret })

    const url = new URL(API_BASE + path)
    for (const [key, value] of Object.entries(signParams)) url.searchParams.set(key, value)
    url.searchParams.set("sign", sign)
    url.searchParams.set("access_token", this.config.accessToken)

    // AbortController: timeout EXPLÍCITO em toda request. Sem isso, uma
    // chamada que a TikTok nunca responde prende a invocação da Edge
    // Function até o limite de tempo da própria plataforma (bem mais alto,
    // e sem controle nosso sobre a mensagem de erro).
    const controller = new AbortController()
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: { "Content-Type": "application/json" },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new TikTokApiError("timeout", `Timeout após ${timeoutMs}ms em ${path}`)
      }
      throw new TikTokApiError("network", err instanceof Error ? err.message : "Erro de rede desconhecido")
    } finally {
      clearTimeout(timeoutId)
    }

    if (res.status === 401) {
      throw new TikTokApiError("auth", "Token inválido ou expirado", { httpStatus: 401, retryable: false })
    }
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get("Retry-After")
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined
      throw new TikTokApiError("rate_limit", "Rate limit da TikTok Shop", {
        httpStatus: 429,
        retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
      })
    }
    if (!res.ok) {
      // 5xx da própria TikTok: vale retry. 4xx que não seja 401/429: não.
      throw new TikTokApiError("network", `HTTP ${res.status} em ${path}`, {
        httpStatus: res.status,
        retryable: res.status >= 500,
      })
    }

    const json = await res.json()
    const envelope = envelopeSchema.parse(json) // lança ZodError se o formato mudou — falha alto, não silencioso

    // TODO: confirmar os códigos de negócio específicos de rate-limit da
    // TikTok (além do HTTP 429) — nenhum hardcoded aqui até confirmar.
    if (envelope.code !== 0) {
      throw new TikTokApiError("business", envelope.message, {
        businessCode: envelope.code,
        retryable: false,
      })
    }

    return opts.dataSchema ? opts.dataSchema.parse(envelope.data) : (envelope.data as T)
  }
}
