// Criptografia at-rest pros access_token/refresh_token de integrações
// (Shopee/TikTok/Mercado Livre) guardados em integration_connections. Antes
// iam pro banco em texto plano, protegidos só por RLS — qualquer vazamento
// de RLS ou da service_role key expunha o token OAuth ativo de todas as
// lojas conectadas.
//
// Design: AES-256-GCM com uma chave simétrica única (TOKEN_ENCRYPTION_KEY,
// 32 bytes em base64) guardada como secret da Supabase Edge Function, nunca
// exposta ao client. Cada valor cifrado carrega um IV aleatório de 12 bytes
// próprio, prefixado com "enc:v1:" pra diferenciar de token legado em texto
// plano — decryptToken faz fallback pro valor original se não reconhecer o
// prefixo, então tokens antigos continuam funcionando até o próximo refresh
// (que já grava a versão cifrada), sem precisar de um backfill de risco
// contra conexões ativas.
const PREFIX = "enc:v1:"

let cachedKey: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const raw = Deno.env.get("TOKEN_ENCRYPTION_KEY")
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY não configurado")
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
  cachedKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"])
  return cachedKey
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

export async function encryptToken(plain: string | null | undefined): Promise<string | null> {
  if (!plain) return plain ?? null
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipherBuf), iv.length)
  return PREFIX + toBase64(combined)
}

export async function decryptToken(value: string | null | undefined): Promise<string | null> {
  if (!value) return value ?? null
  if (!value.startsWith(PREFIX)) return value // token legado, ainda não passou por um refresh
  const key = await getKey()
  const combined = fromBase64(value.slice(PREFIX.length))
  const iv = combined.slice(0, 12)
  const cipherBytes = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes)
  return new TextDecoder().decode(plainBuf)
}
