// Backoff exponencial COM jitter.
//
// Por que jitter: backoff puro (1s, 2s, 4s, 8s...) faz TODOS os clientes que
// falharam no mesmo instante (ex.: durante um pico/instabilidade da TikTok)
// tentarem de novo nos MESMOS instantes daí pra frente — a "estampida"
// (thundering herd) bate na API de novo, junta, e derruba de novo. Jitter
// sorteia o atraso dentro de uma faixa em vez de usar um valor fixo,
// desincronizando os clientes entre si.
//
// Esta é a variante "full jitter" (AWS Architecture Blog, "Timeouts,
// Retries and Backoff with Jitter"): sorteia qualquer valor entre 0 e o
// teto exponencial da tentativa, em vez de só somar um pouco de ruído em
// cima de um valor fixo (isso reduziria a estampida, mas não elimina).
export function computeBackoffMs(
  attempt: number,
  opts: { baseMs?: number; maxMs?: number } = {},
): number {
  const baseMs = opts.baseMs ?? 500
  const maxMs = opts.maxMs ?? 30_000
  const ceiling = Math.min(maxMs, baseMs * 2 ** attempt)
  return Math.floor(Math.random() * ceiling)
}
