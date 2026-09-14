// Adapter concreto da porta OrderSource pra TikTok Shop.
//
// ████ TODO CRÍTICO — NADA aqui foi exercitado contra a API real ████
// Paths de endpoint, nomes de campo da resposta e formato de paginação
// seguem a convenção mais comumente documentada da TikTok Shop Partner API
// v2 (categoria/versão/recurso, ex. "/order/202309/orders/search"), mas o
// app nunca teve acesso liberado pra confirmar contra uma chamada real.
// Cada `TODO` abaixo marca um ponto específico que PRECISA ser conferido
// contra uma resposta de sandbox antes de confiar nisto em produção. O
// design ao redor (paginação, normalização, mapeamento de erro) não muda
// quando os paths forem corrigidos — são só strings e nomes de campo.
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts"
import { TikTokClient } from "../tiktok/client.ts"
import type {
  OrderSource,
  FetchPage,
  NormalizedOrder,
  NormalizedProduct,
  NormalizedSettlement,
} from "./types.ts"

// TODO: confirmar os nomes de campo exatos (a doc pública mistura
// snake_case e variações entre endpoints/versões).
const tiktokOrderItemSchema = z.object({
  id: z.string(),
  sku_id: z.string().optional(),
  product_name: z.string().optional(),
  sale_price: z.string().optional(), // TikTok costuma mandar valores monetários como STRING decimal, não número
  quantity: z.number().optional(),
})

const tiktokOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  payment: z
    .object({
      total_amount: z.string().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  buyer_email: z.string().optional(),
  create_time: z.number().optional(), // epoch seconds — padrão TikTok
  update_time: z.number().optional(),
  paid_time: z.number().optional(),
  line_items: z.array(tiktokOrderItemSchema).optional(),
})

const tiktokOrdersResponseSchema = z.object({
  orders: z.array(tiktokOrderSchema).default([]),
  next_page_token: z.string().optional(),
})

const tiktokProductSchema = z.object({
  id: z.string(),
  skus: z
    .array(z.object({ id: z.string(), seller_sku: z.string().optional(), price: z.object({ tax_exclusive_price: z.string().optional() }).optional() }))
    .optional(),
  title: z.string().optional(),
})

const tiktokProductsResponseSchema = z.object({
  products: z.array(tiktokProductSchema).default([]),
  next_page_token: z.string().optional(),
})

const tiktokSettlementSchema = z.object({
  id: z.string(),
  order_id: z.string().optional(),
  amount: z.string().optional(),
  settlement_amount: z.string().optional(),
  status: z.string().optional(),
  settled_time: z.number().optional(),
})

const tiktokSettlementsResponseSchema = z.object({
  statements: z.array(tiktokSettlementSchema).default([]),
  next_page_token: z.string().optional(),
})

// TikTok manda dinheiro como STRING decimal (ex.: "129.90"), não como
// número — converte pra centavos SEM passar por float: separa a parte
// inteira da decimal manualmente, em vez de `Math.round(parseFloat(v)*100)`
// (que herda a imprecisão do float na multiplicação).
export function decimalStringToCents(value: string | undefined): number {
  if (!value) return 0
  const [intPart, decPart = ""] = value.trim().split(".")
  const cents = decPart.padEnd(2, "0").slice(0, 2)
  const sign = intPart.startsWith("-") ? -1 : 1
  const intAbs = intPart.replace("-", "") || "0"
  return sign * (Number(intAbs) * 100 + Number(cents))
}

export function epochSecondsToIso(seconds: number | undefined): string {
  return seconds ? new Date(seconds * 1000).toISOString() : new Date(0).toISOString()
}

export class TikTokOfficialSource implements OrderSource {
  readonly name = "tiktok"

  constructor(private readonly client: TikTokClient) {}

  async fetchOrdersPage({
    sinceIso,
    cursor,
  }: {
    sinceIso: string
    cursor: string | null
  }): Promise<FetchPage<NormalizedOrder>> {
    // TODO: path/versão não confirmados.
    const data = await this.client.request("/order/202309/orders/search", {
      method: "POST",
      query: { page_size: "50", ...(cursor ? { page_token: cursor } : {}) },
      body: { create_time_ge: Math.floor(Date.parse(sinceIso) / 1000) },
      dataSchema: tiktokOrdersResponseSchema,
    })

    return {
      items: data.orders.map((o) => this.normalizeOrder(o)),
      nextCursor: data.next_page_token || null,
    }
  }

  async fetchProductsPage({ cursor }: { cursor: string | null }): Promise<FetchPage<NormalizedProduct>> {
    // TODO: path/versão não confirmados.
    const data = await this.client.request("/product/202309/products/search", {
      method: "POST",
      query: { page_size: "50", ...(cursor ? { page_token: cursor } : {}) },
      dataSchema: tiktokProductsResponseSchema,
    })

    return {
      items: data.products.map((p) => this.normalizeProduct(p)),
      nextCursor: data.next_page_token || null,
    }
  }

  async fetchSettlementsPage({
    sinceIso,
    cursor,
  }: {
    sinceIso: string
    cursor: string | null
  }): Promise<FetchPage<NormalizedSettlement>> {
    // TODO: path/versão não confirmados — settlements costumam ficar sob
    // uma categoria "finance" na TikTok Shop Partner API, mas o nome exato
    // ("statements" vs "settlements" vs "payments") varia entre versões da
    // doc que encontrei.
    const data = await this.client.request("/finance/202309/orders/statements", {
      method: "GET",
      query: {
        page_size: "50",
        sort_field: "settled_time",
        ...(cursor ? { page_token: cursor } : {}),
      },
      dataSchema: tiktokSettlementsResponseSchema,
    })

    return {
      items: data.statements.map((s) => this.normalizeSettlement(s)),
      nextCursor: data.next_page_token || null,
    }
  }

  private normalizeOrder(raw: z.infer<typeof tiktokOrderSchema>): NormalizedOrder {
    return {
      source: this.name,
      externalOrderId: raw.id,
      status: raw.status,
      totalAmountCents: decimalStringToCents(raw.payment?.total_amount),
      currency: raw.payment?.currency ?? "BRL",
      buyerUsername: raw.buyer_email ?? null,
      orderCreatedAt: epochSecondsToIso(raw.create_time),
      orderUpdatedAt: epochSecondsToIso(raw.update_time ?? raw.create_time),
      paidAt: raw.paid_time ? epochSecondsToIso(raw.paid_time) : null,
      items: (raw.line_items ?? []).map((it) => ({
        externalItemId: it.id,
        sku: it.sku_id ?? null,
        itemName: it.product_name ?? "Sem nome",
        quantity: it.quantity ?? 1,
        totalPriceCents: decimalStringToCents(it.sale_price),
      })),
    }
  }

  private normalizeProduct(raw: z.infer<typeof tiktokProductSchema>): NormalizedProduct {
    const firstSku = raw.skus?.[0]
    return {
      source: this.name,
      externalProductId: raw.id,
      sku: firstSku?.seller_sku ?? null,
      title: raw.title ?? "Sem título",
      priceCents: firstSku?.price?.tax_exclusive_price
        ? decimalStringToCents(firstSku.price.tax_exclusive_price)
        : null,
      // TODO: TikTok separa estoque por warehouse/SKU numa chamada própria
      // de inventory, não vem junto do product search — não dá pra
      // preencher sem confirmar esse endpoint separado.
      stockQuantity: null,
    }
  }

  private normalizeSettlement(raw: z.infer<typeof tiktokSettlementSchema>): NormalizedSettlement {
    const gross = decimalStringToCents(raw.amount)
    const net = decimalStringToCents(raw.settlement_amount)
    return {
      source: this.name,
      externalSettlementId: raw.id,
      orderExternalId: raw.order_id ?? null,
      grossAmountCents: gross,
      feeAmountCents: gross - net,
      netAmountCents: net,
      settledAt: raw.settled_time ? epochSecondsToIso(raw.settled_time) : null,
      status: raw.status ?? "unknown",
    }
  }
}
