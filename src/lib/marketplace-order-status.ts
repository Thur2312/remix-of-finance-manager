// Nome de status de pedido varia entre exports (idioma, versão do relatório,
// marketplace) — comparar string exata é frágil, uma variação de acentuação
// ou espaço já quebra o filtro (era o caso do TikTok: só excluía "Cancelado"
// e "Não pago" batendo char a char, sem cobrir devolução/reembolso).
// Normalizamos e comparamos por palavra-chave em vez disso.
const EXCLUDED_STATUS_KEYWORDS = [
  "cancel",
  "nao pago",
  "unpaid",
  "devolu",
  "reembols",
  "refund",
  "return",
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function isExcludedOrderStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = normalize(status);
  return EXCLUDED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export const EXCLUDED_STATUS_DESCRIPTION = "cancelados, não pagos, devolvidos ou reembolsados";
