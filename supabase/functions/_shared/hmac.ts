// HMAC-SHA256 em hex, via Web Crypto (crypto.subtle) — não node:crypto.
// Compartilhado entre a assinatura de request (tiktok/sign.ts) e a
// verificação de assinatura de webhook (tiktok-webhook) — mesma primitiva
// criptográfica, dois usos diferentes (assinar saída vs. verificar entrada).
export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message))
  return Array.from(new Uint8Array(sigBuf), (b) => b.toString(16).padStart(2, "0")).join("")
}
