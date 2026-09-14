// Assinatura HMAC-SHA256 das chamadas ao TikTok Shop Open API.
//
// TODO CRÍTICO — NÃO CONFIRMADO contra doc/sandbox real. O esquema abaixo
// segue o padrão publicamente documentado do TikTok Shop Partner API v2:
//   1. Pega os query params (sem `sign` nem `access_token`), ordena as
//      chaves alfabeticamente, concatena como "chave1valor1chave2valor2..."
//      (sem separador, sem URL-encode na concatenação).
//   2. Monta `path + paramString`.
//   3. HMAC-SHA256 usando o app_secret como chave, sobre a string
//      "emparedada" pelo próprio secret dos dois lados: `secret + base + secret`
//      — detalhe específico da TikTok, diferente do HMAC "cru" mais comum em
//      outras APIs (ex.: Shopee assina só `partner_id+path+timestamp`, sem
//      emparedar).
// Este app nunca teve acesso liberado pra exercitar isso contra uma chamada
// real. ANTES de confiar nisto pra qualquer coisa além de teste unitário,
// valide contra uma chamada de sandbox simples (ex.: GET numa rota de "shop
// info") e confira que não vem erro de assinatura na resposta.
import { hmacSha256Hex } from "../hmac.ts"

export interface SignParams {
  /** path da rota, ex.: "/product/202309/products/search" */
  path: string
  /** query params relevantes pra assinatura — SEM `sign` nem `access_token` */
  params: Record<string, string>
  appSecret: string
}

export async function signTikTokRequest({ path, params, appSecret }: SignParams): Promise<string> {
  const sortedKeys = Object.keys(params).sort()
  const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("")
  const base = `${path}${paramString}`
  return hmacSha256Hex(appSecret, `${appSecret}${base}${appSecret}`)
}
