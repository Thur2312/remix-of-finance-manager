// Auditoria de repasse — "a Shopee te pagou o que devia?"
//
// Ninguém no mercado (Olist/Bling/Nubimetrics/etc.) reconcilia o REPASSE
// FINANCEIRO por pedido — só o "a venda bateu?". Aqui cruzamos, pedido a
// pedido, o que a tabela de comissão diz que deveria ter sido cobrado contra
// o que foi de fato registrado, e sinaliza pedido concluído há tempo demais
// sem nenhum repasse (dinheiro que devia ter caído e não caiu).
//
// Escopo deliberadamente estreito pra não gerar falso positivo:
//   - só comissão + taxa de serviço (`commission`/`service_fee`) entram na
//     comparação de tabela — frete e descontos ficam de fora (mesma decisão
//     de src/lib/fee-detail.ts: variam demais, não são "taxa da plataforma"
//     no sentido estrito, e a tabela de frete não é confiável o bastante).
//   - só pedido com fee JÁ REGISTRADA entra na comparação de tabela (sem fee
//     ainda não é "cobrou errado", é "não sincronizou ainda").
//   - tolerância mínima (R$ e %) — a tabela por faixa de preço é uma
//     aproximação; divergência pequena é ruído, não indício de cobrança errada.
//
// Puro. Shopee-first — é o único marketplace com linha de taxa por pedido
// hoje (mesma limitação de fee-detail.ts).

import { calcComissaoTaxaReais } from './marketplace-fees';
import { isShopeeCompletedStatus } from './shopee-sync-status';

export interface AuditOrderLike {
  id: string;
  external_order_id: string;
  status: string;
  total_amount: number;
  order_updated_at: string;
}

export interface AuditFeeLike {
  order_id: string | null;
  fee_type: string;
  amount: number;
}

export interface AuditPaymentLike {
  order_id: string | null;
  payment_method: string;
  net_amount: number;
}

export type RepasseIssueType = 'taxa_acima_tabela' | 'sem_repasse_atrasado';

export interface RepasseIssue {
  orderId: string;
  externalOrderId: string;
  bruto: number;
  type: RepasseIssueType;
  /** taxa_acima_tabela: o que foi cobrado (commission + service_fee) */
  taxaCobrada?: number;
  /** taxa_acima_tabela: o que a tabela por faixa de preço prevê */
  taxaEsperada?: number;
  /** taxa_acima_tabela: taxaCobrada − taxaEsperada (> 0 = cobrou a mais) */
  diferenca?: number;
  /** sem_repasse_atrasado: dias desde a última atualização do pedido */
  diasSemRepasse?: number;
}

export interface RepasseAuditOpts {
  hojeIso?: string;
  /** dias sem nenhum repasse pra virar alerta (default 20) */
  diasAtrasoRepasse?: number;
  /** tolerância relativa sobre a taxa esperada (default 8%) */
  toleranciaPct?: number;
  /** tolerância mínima em R$, o que for maior entre as duas vale (default 2) */
  toleranciaMinReais?: number;
}

export interface RepasseAuditResult {
  issues: RepasseIssue[];
  pedidosAnalisados: number;
  pedidosComTaxaAcima: number;
  /** soma das diferenças dos pedidos com taxa acima da tabela, em R$ */
  totalDivergenciaTaxa: number;
  pedidosSemRepasseAtrasado: number;
  /** soma do bruto dos pedidos concluídos sem nenhum repasse, em R$ */
  totalSemRepasseAtrasado: number;
}

// Só estas duas entram na comparação de tabela — ver comentário do topo.
const TAXAS_AUDITAVEIS = new Set(['commission', 'service_fee']);

function diasDesde(hoje: Date, iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.floor((hoje.getTime() - t) / 86_400_000);
}

export function auditShopeeRepasses(
  orders: AuditOrderLike[],
  fees: AuditFeeLike[],
  payments: AuditPaymentLike[],
  opts: RepasseAuditOpts = {},
): RepasseAuditResult {
  const hoje = opts.hojeIso ? new Date(opts.hojeIso) : new Date();
  const diasAtraso = opts.diasAtrasoRepasse ?? 20;
  const toleranciaPct = opts.toleranciaPct ?? 0.08;
  const toleranciaMinReais = opts.toleranciaMinReais ?? 2;

  const taxaAuditavelPorPedido = new Map<string, number>();
  for (const f of fees) {
    if (!f.order_id || !TAXAS_AUDITAVEIS.has(f.fee_type)) continue;
    taxaAuditavelPorPedido.set(f.order_id, (taxaAuditavelPorPedido.get(f.order_id) ?? 0) + (Number(f.amount) || 0));
  }

  const temEscrow = new Set<string>();
  for (const p of payments) {
    if (p.payment_method === 'escrow' && p.order_id) temEscrow.add(p.order_id);
  }

  const issues: RepasseIssue[] = [];
  let pedidosAnalisados = 0;
  let totalDivergenciaTaxa = 0;
  let totalSemRepasseAtrasado = 0;

  for (const o of orders) {
    if (!isShopeeCompletedStatus(o.status)) continue;
    const bruto = Number(o.total_amount) || 0;
    if (bruto <= 0) continue;
    pedidosAnalisados++;

    const taxaCobrada = taxaAuditavelPorPedido.get(o.id);
    if (taxaCobrada != null) {
      const taxaEsperada = calcComissaoTaxaReais('Shopee', bruto);
      const diferenca = taxaCobrada - taxaEsperada;
      const limite = Math.max(toleranciaMinReais, taxaEsperada * toleranciaPct);
      if (diferenca > limite) {
        totalDivergenciaTaxa += diferenca;
        issues.push({
          orderId: o.id, externalOrderId: o.external_order_id, bruto,
          type: 'taxa_acima_tabela', taxaCobrada, taxaEsperada, diferenca,
        });
      }
    }

    if (!temEscrow.has(o.id)) {
      const dias = diasDesde(hoje, o.order_updated_at);
      if (dias >= diasAtraso) {
        totalSemRepasseAtrasado += bruto;
        issues.push({
          orderId: o.id, externalOrderId: o.external_order_id, bruto,
          type: 'sem_repasse_atrasado', diasSemRepasse: dias,
        });
      }
    }
  }

  // maior impacto financeiro primeiro, dentro de cada tipo
  issues.sort((a, b) => (b.diferenca ?? b.bruto) - (a.diferenca ?? a.bruto));

  return {
    issues,
    pedidosAnalisados,
    pedidosComTaxaAcima: issues.filter(i => i.type === 'taxa_acima_tabela').length,
    totalDivergenciaTaxa,
    pedidosSemRepasseAtrasado: issues.filter(i => i.type === 'sem_repasse_atrasado').length,
    totalSemRepasseAtrasado,
  };
}
