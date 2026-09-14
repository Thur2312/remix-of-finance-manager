// Porta hexagonal — o "contrato" que qualquer fonte de pedidos precisa
// cumprir, independente de ser TikTok, Shopee, ou uma planilha CSV
// importada manualmente (fallback quando a API de um marketplace está fora
// do ar, ou pra marketplace que ainda não tem integração oficial). O resto
// do sistema (sync engine, item 5) só conhece ESTA interface — trocar
// TikTokOfficialSource por CsvImportSource não muda uma linha do motor de
// sync.
//
// Dinheiro sempre em CENTAVOS, inteiro — nunca float. Mesma convenção que
// `orders.total_amount_cents`/`order_items.total_price_cents` já usam no
// banco: 100 = R$1,00. Float pra dinheiro acumula erro de arredondamento
// (0.1 + 0.2 !== 0.3 em ponto flutuante) — centavos como inteiro não tem
// esse problema porque toda operação é sobre números inteiros exatos.

export interface NormalizedOrderItem {
  externalItemId: string
  sku: string | null
  itemName: string
  quantity: number
  totalPriceCents: number
}

export interface NormalizedOrder {
  source: string // 'tiktok' | 'shopee' | 'csv_import' | ...
  externalOrderId: string
  /** status CRU do provedor — de propósito não normalizado. Cada
   *  marketplace tem um conjunto de status diferente e mapear pra um enum
   *  comum sem confirmar os valores reais é exatamente o tipo de "enum
   *  numérico/string não confirmado" que não dá pra hardcodar. Quem
   *  consome decide o que "concluído"/"cancelado" significa por source. */
  status: string
  totalAmountCents: number
  currency: string
  buyerUsername: string | null
  orderCreatedAt: string // ISO
  orderUpdatedAt: string // ISO
  paidAt: string | null
  items: NormalizedOrderItem[]
}

export interface NormalizedProduct {
  source: string
  externalProductId: string
  sku: string | null
  title: string
  priceCents: number | null
  stockQuantity: number | null
}

export interface NormalizedSettlement {
  source: string
  externalSettlementId: string
  orderExternalId: string | null
  grossAmountCents: number
  feeAmountCents: number
  netAmountCents: number
  /** null = ainda não liquidado */
  settledAt: string | null
  status: string
}

export interface FetchPage<T> {
  items: T[]
  /** null = não tem mais página */
  nextCursor: string | null
}

// Cada método busca UMA página. Contrato simples de propósito — fácil de
// implementar até pra uma fonte sem paginação real (CsvImportSource: lê o
// arquivo inteiro, devolve tudo numa página só, nextCursor sempre null). A
// PAGINAÇÃO (percorrer todas as páginas) é responsabilidade de quem chama
// (ver paginate() abaixo, e o motor de sync no item 5) — não da fonte.
export interface OrderSource {
  readonly name: string
  fetchOrdersPage(opts: { sinceIso: string; cursor: string | null }): Promise<FetchPage<NormalizedOrder>>
  fetchProductsPage(opts: { cursor: string | null }): Promise<FetchPage<NormalizedProduct>>
  fetchSettlementsPage(opts: { sinceIso: string; cursor: string | null }): Promise<FetchPage<NormalizedSettlement>>
}

// ── Paginação por cursor com ASYNC GENERATOR ─────────────────────────────
//
// Um async generator é uma função que pode "pausar" no meio (`yield`) e
// retomar de onde parou na PRÓXIMA chamada — ao contrário de uma função
// normal, que roda do início ao fim de uma vez. `function*` declara um
// generator; `yield valor` entrega um valor pra quem está iterando E pausa
// a execução ali, esperando o próximo `.next()` (implícito no `for await`).
//
// Por que isso encaixa bem em paginação: em vez de escrever um `while`
// manual toda vez que alguém precisa varrer todas as páginas (repetindo a
// lógica de "busca, olha o cursor, decide se continua" em cada lugar que
// consome uma fonte), a paginação vira um DETALHE ESCONDIDO atrás de
// `for await (const lote of paginate(...))`. Quem consome nem sabe que tem
// cursor por trás — só recebe lotes de itens, um de cada vez, e o gerador
// busca a PRÓXIMA página só quando (e se) o loop pedir a próxima iteração —
// "lazy": se o consumidor der um `break` na 3ª página, a 4ª nunca é buscada.
export interface PaginationStep<T> {
  items: T[]
  /** cursor pra RETOMAR depois deste lote (null = não tem mais nada). O
   *  motor de sync (item 5) persiste isto a cada lote — se a invocação
   *  morrer no meio, a próxima retoma exatamente daqui, não do zero. */
  cursor: string | null
}

export async function* paginate<T>(
  fetchPage: (cursor: string | null) => Promise<FetchPage<T>>,
  startCursor: string | null = null,
): AsyncGenerator<PaginationStep<T>> {
  let cursor = startCursor
  do {
    const page = await fetchPage(cursor)
    cursor = page.nextCursor
    yield { items: page.items, cursor }
  } while (cursor !== null)
}
