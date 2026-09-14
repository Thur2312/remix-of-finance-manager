// Comparação em tempo constante — usada pra conferir segredos (cron_secret,
// assinatura de webhook) sem vazar informação pelo TEMPO de resposta.
//
// Por que `a === b` não serve aqui: a comparação padrão de string do V8/Deno
// para no primeiro byte diferente. Se o segredo certo começa com "x9k2...",
// comparar contra "x----" (1 byte certo) retorna mais rápido que comparar
// contra "a----" só quando "a" também erra de cara, mas mais devagar que
// comparar contra "xa---" (2 bytes certos). Um atacante medindo o tempo de
// resposta em MILHARES de tentativas consegue, estatisticamente, descobrir o
// segredo byte a byte — isso é o "timing attack". A defesa: percorrer TODOS
// os bytes sempre, usando XOR bit a bit (^) pra acumular a diferença, sem
// nenhum `if`/`return` antecipado que dependa do CONTEÚDO comparado.
//
// `integration-sync/index.ts` já tem uma cópia idêntica desta função,
// local ao arquivo (não extraída) — não toquei nela pra não mexer num
// caminho de sync já em produção; esta versão compartilhada é só pra quem
// escrever daqui pra frente.
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}
