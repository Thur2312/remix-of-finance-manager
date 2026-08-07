import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

export function safeShopeeDate(timestamp: number | null | undefined): string | null {
  if (!timestamp || timestamp <= 0) return null
  const date = new Date(timestamp * 1000)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

export function ts(): number {
  return Math.floor(Date.now() / 1000)
}

export function sign(partnerId: number, path: string, timestamp: number, partnerKey: string, accessToken?: string, shopId?: number): string {
  const base = accessToken && shopId
    ? `${partnerId}${path}${timestamp}${accessToken}${shopId}`
    : `${partnerId}${path}${timestamp}`
  return createHmac("sha256", partnerKey).update(base).digest("hex")
}

// Comparação em tempo constante para evitar timing attack em segredos/assinaturas.
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

// Assinatura dos pushes da Shopee: HMAC-SHA256 sobre "<push_url>|<raw_body>"
// usando a Partner Key, no header "Authorization" (não confundir com o Bearer
// token de usuário — é o mesmo nome de header, mas aqui é a assinatura HMAC).
// Referência: Shopee Open Platform v2 Push Mechanism.
export function verifyShopeePushSignature(pushUrl: string, rawBody: string, receivedSignature: string, partnerKey: string): boolean {
  if (!receivedSignature) return false
  const expected = createHmac("sha256", partnerKey).update(`${pushUrl}|${rawBody}`).digest("hex")
  return timingSafeEqual(expected, receivedSignature)
}

export async function refreshShopeeToken(baseUrl: string, partnerId: number, partnerKey: string, refreshToken: string, shopId: number): Promise<{ access_token: string; refresh_token: string; expire_in: number; refresh_token_expire_in: number } | null> {
  try {
    const timestamp = ts()
    const path = "/api/v2/auth/access_token/get"
    const s = sign(partnerId, path, timestamp, partnerKey)
    const res = await fetch(`${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${s}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, partner_id: partnerId, shop_id: shopId }),
    })
    if (!res.ok) { console.error("Refresh token HTTP error:", res.status); return null }
    const data = await res.json()
    if (data.error && data.error !== "") { console.error("Token refresh error:", data.message); return null }
    return {
      access_token: data.access_token || "",
      refresh_token: data.refresh_token || "",
      expire_in: data.expire_in || 0,
      refresh_token_expire_in: data.refresh_token_expire_in || 0,
    }
  } catch (err) {
    console.error("Token refresh exception:", err)
    return null
  }
}

export async function shopeeGet<T>(baseUrl: string, path: string, params: Record<string, string | number | boolean>, partnerId: number, partnerKey: string, accessToken: string, shopId: number): Promise<T> {
  const timestamp = ts()
  const s = sign(partnerId, path, timestamp, partnerKey, accessToken, shopId)
  const queryParams = {
    partner_id: String(partnerId),
    shop_id: String(shopId),
    access_token: accessToken,
    timestamp: String(timestamp),
    sign: s,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  }
  const query = new URLSearchParams(queryParams)
  const url = `${baseUrl}${path}?${query.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    console.error("❌ Shopee error body:", body)
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  const data = await res.json()
  if (data.error && data.error !== "") {
    throw new Error(`Shopee API error: ${data.message || data.error} (code: ${data.error})`)
  }
  return data.response as T
}

// Garante um access_token válido pra uma conexão, renovando (e persistindo)
// se estiver perto de expirar. Retorna null se a renovação falhar — quem
// chamar deve marcar a conexão como "expired" nesse caso.
export async function ensureValidShopeeToken(
  supabaseAdmin: any,
  connection: { id: string; access_token: string; refresh_token: string; token_expires_at: string | null },
  baseUrl: string,
  partnerId: number,
  partnerKey: string,
  shopId: number,
): Promise<string | null> {
  const tokenExpiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0
  const oneHourFromNow = Date.now() + 60 * 60 * 1000

  if (tokenExpiresAt >= oneHourFromNow) {
    return connection.access_token
  }

  const refreshed = await refreshShopeeToken(baseUrl, partnerId, partnerKey, connection.refresh_token || "", shopId)
  if (!refreshed || !refreshed.access_token) {
    await supabaseAdmin.from("integration_connections").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", connection.id)
    return null
  }

  const now = new Date()
  const expireAt = refreshed.expire_in > 0 ? new Date(now.getTime() + refreshed.expire_in * 1000).toISOString() : null
  const refreshExpireAt = refreshed.refresh_token_expire_in > 0 ? new Date(now.getTime() + refreshed.refresh_token_expire_in * 1000).toISOString() : null

  await supabaseAdmin.from("integration_connections").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    token_expires_at: expireAt,
    refresh_token_expires_at: refreshExpireAt,
    updated_at: now.toISOString(),
  }).eq("id", connection.id)

  return refreshed.access_token
}
