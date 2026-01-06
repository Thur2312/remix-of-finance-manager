import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Calendar,
  DollarSign,
  Tag,
  Truck,
  Receipt,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface Settlement {
  order_id: string;
  status: string | null;
  type: string | null;
  nome_produto: string | null;
  variacao: string | null;
  sku_id: string | null;
  quantidade: number;
  data_criacao_pedido: string | null;
  data_entrega: string | null;
  statement_date: string | null;
  subtotal_before_discounts: number;
  customer_payment: number;
  customer_refund: number;
  seller_discounts: number;
  seller_cofunded_discount: number;
  seller_cofunded_discount_refund?: number;
  platform_discounts: number;
  platform_cofunded_discount: number;
  platform_discounts_refund?: number;
  shipping_total?: number;
  tiktok_shipping_fee: number;
  customer_shipping_fee: number;
  refunded_shipping: number;
  shipping_incentive: number;
  shipping_incentive_refund?: number;
  shipping_subsidy?: number;
  actual_return_shipping_fee?: number;
  total_fees: number;
  tiktok_commission_fee: number;
  sfp_service_fee: number;
  affiliate_commission: number;
  affiliate_partner_commission?: number;
  affiliate_shop_ads_commission?: number;
  fee_per_item: number;
  live_specials_fee: number;
  voucher_xtra_fee: number;
  bonus_cashback_fee?: number;
  icms_difal: number;
  icms_penalty?: number;
  total_settlement_amount: number;
  delivery_option: string | null;
  collection_method: string | null;
  adjustment_amount: number;
  adjustment_reason: string | null;
}

interface SettlementDetailModalProps {
  settlement: Settlement | null;
  unitCost: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettlementDetailModal({
  settlement,
  unitCost,
  open,
  onOpenChange,
}: SettlementDetailModalProps) {
  if (!settlement) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  // Calculate totals
  const totalSellerDiscounts = Math.abs(settlement.seller_discounts || 0) + 
                                Math.abs(settlement.seller_cofunded_discount || 0) +
                                Math.abs(settlement.seller_cofunded_discount_refund || 0);
  const totalPlatformDiscounts = Math.abs(settlement.platform_discounts || 0) + 
                                  Math.abs(settlement.platform_cofunded_discount || 0) +
                                  Math.abs(settlement.platform_discounts_refund || 0);
  const totalDiscounts = totalSellerDiscounts + totalPlatformDiscounts;
  
  const shippingBalance = (settlement.customer_shipping_fee || 0) - 
                          Math.abs(settlement.tiktok_shipping_fee || 0) + 
                          (settlement.shipping_incentive || 0) -
                          Math.abs(settlement.refunded_shipping || 0) +
                          (settlement.shipping_subsidy || 0) -
                          Math.abs(settlement.shipping_incentive_refund || 0) -
                          Math.abs(settlement.actual_return_shipping_fee || 0);
  
  const totalFees = Math.abs(settlement.total_fees || 0);
  
  // Calculate real profit
  const totalCost = unitCost * (settlement.quantidade || 1);
  const realProfit = (settlement.total_settlement_amount || 0) - totalCost;
  const profitMargin = settlement.total_settlement_amount > 0 
    ? (realProfit / settlement.total_settlement_amount) * 100 
    : 0;

  const getStatusBadge = () => {
    const status = settlement.status?.toLowerCase();
    if (status === 'completed' || status === 'paid') {
      return <Badge className="bg-emerald-500">Pago</Badge>;
    } else if (status === 'pending') {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    return <Badge variant="outline">{settlement.status || '-'}</Badge>;
  };

  const getTypeBadge = () => {
    const type = settlement.type?.toLowerCase();
    if (type === 'order') {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Venda</Badge>;
    } else if (type === 'refund') {
      return <Badge variant="outline" className="border-rose-500 text-rose-600">Reembolso</Badge>;
    } else if (type === 'adjustment') {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Ajuste</Badge>;
    }
    return <Badge variant="outline">{settlement.type || '-'}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedido #{settlement.order_id.slice(0, 15)}...
            {getStatusBadge()}
            {getTypeBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produto
            </h4>
            <p className="text-sm font-medium">{settlement.nome_produto || '-'}</p>
            {settlement.variacao && (
              <p className="text-sm text-muted-foreground">Variação: {settlement.variacao}</p>
            )}
            {settlement.sku_id && (
              <p className="text-xs text-muted-foreground font-mono">SKU: {settlement.sku_id}</p>
            )}
            <p className="text-sm mt-1">Quantidade: <span className="font-medium">{settlement.quantidade}</span></p>
          </div>

          {/* Dates */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Datas
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Criado</p>
                <p className="font-medium">{formatDate(settlement.data_criacao_pedido)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entregue</p>
                <p className="font-medium">{formatDate(settlement.data_entrega)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pago</p>
                <p className="font-medium">{formatDate(settlement.statement_date)}</p>
              </div>
            </div>
            {settlement.delivery_option && (
              <p className="text-xs text-muted-foreground mt-2">
                Entrega: {settlement.delivery_option} | {settlement.collection_method || '-'}
              </p>
            )}
          </div>

          {/* Values */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valores
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Preço Original</p>
                <p className="font-medium">{formatCurrency(settlement.subtotal_before_discounts || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pago pelo Cliente</p>
                <p className="font-medium text-blue-600">{formatCurrency(settlement.customer_payment || 0)}</p>
              </div>
            </div>
          </div>

          {/* Discounts */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Descontos Aplicados
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto Vendedor:</span>
                <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.seller_discounts || 0))}</span>
              </div>
              {(settlement.seller_cofunded_discount || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cupom Co-financiado Vendedor:</span>
                  <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.seller_cofunded_discount))}</span>
                </div>
              )}
              {(settlement.seller_cofunded_discount_refund || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reembolso Cupom Vendedor:</span>
                  <span className="text-emerald-600">+{formatCurrency(Math.abs(settlement.seller_cofunded_discount_refund || 0))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto Plataforma:</span>
                <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.platform_discounts || 0))}</span>
              </div>
              {(settlement.platform_cofunded_discount || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cupom Co-financiado Plataforma:</span>
                  <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.platform_cofunded_discount))}</span>
                </div>
              )}
              {(settlement.platform_discounts_refund || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reembolso Cupom Plataforma:</span>
                  <span className="text-emerald-600">+{formatCurrency(Math.abs(settlement.platform_discounts_refund || 0))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Descontos:</span>
                <span className="text-rose-600">-{formatCurrency(totalDiscounts)}</span>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Frete
            </h4>
            <div className="space-y-2 text-sm">
              {(settlement.shipping_total || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete Total (consolidado):</span>
                  <span className={settlement.shipping_total! >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(settlement.shipping_total || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete TikTok:</span>
                <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.tiktok_shipping_fee || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete Cliente:</span>
                <span className="text-emerald-600">+{formatCurrency(settlement.customer_shipping_fee || 0)}</span>
              </div>
              {(settlement.shipping_incentive || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incentivo Frete:</span>
                  <span className="text-emerald-600">+{formatCurrency(settlement.shipping_incentive)}</span>
                </div>
              )}
              {(settlement.shipping_incentive_refund || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reembolso Incentivo Frete:</span>
                  <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.shipping_incentive_refund || 0))}</span>
                </div>
              )}
              {(settlement.shipping_subsidy || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subsídio Frete:</span>
                  <span className="text-emerald-600">+{formatCurrency(settlement.shipping_subsidy || 0)}</span>
                </div>
              )}
              {(settlement.refunded_shipping || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete Reembolsado:</span>
                  <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.refunded_shipping))}</span>
                </div>
              )}
              {(settlement.actual_return_shipping_fee || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete Devolução Real:</span>
                  <span className="text-rose-600">-{formatCurrency(Math.abs(settlement.actual_return_shipping_fee || 0))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Saldo Frete:</span>
                <span className={shippingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {shippingBalance >= 0 ? '+' : ''}{formatCurrency(shippingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Fees */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Taxas Cobradas
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão TikTok:</span>
                <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.tiktok_commission_fee || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SFP Service Fee:</span>
                <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.sfp_service_fee || 0))}</span>
              </div>
              {(settlement.affiliate_commission || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão Afiliado:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.affiliate_commission))}</span>
                </div>
              )}
              {(settlement.affiliate_partner_commission || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão Parceiro Afiliado:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.affiliate_partner_commission || 0))}</span>
                </div>
              )}
              {(settlement.affiliate_shop_ads_commission || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comissão Afiliado Shop Ads:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.affiliate_shop_ads_commission || 0))}</span>
                </div>
              )}
              {(settlement.fee_per_item || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa por Item:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.fee_per_item))}</span>
                </div>
              )}
              {(settlement.live_specials_fee || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LIVE Specials Fee:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.live_specials_fee))}</span>
                </div>
              )}
              {(settlement.voucher_xtra_fee || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voucher Xtra Fee:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.voucher_xtra_fee))}</span>
                </div>
              )}
              {(settlement.bonus_cashback_fee || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bonus Cashback Fee:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.bonus_cashback_fee || 0))}</span>
                </div>
              )}
              {(settlement.icms_difal || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ICMS DIFAL:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.icms_difal))}</span>
                </div>
              )}
              {(settlement.icms_penalty || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ICMS Penalty:</span>
                  <span className="text-amber-600">-{formatCurrency(Math.abs(settlement.icms_penalty || 0))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Taxas:</span>
                <span className="text-amber-600">-{formatCurrency(totalFees)}</span>
              </div>
            </div>
          </div>

          {/* Adjustment if any */}
          {(settlement.adjustment_amount || 0) !== 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Ajuste
              </h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{settlement.adjustment_reason || 'Ajuste'}</span>
                <span className={settlement.adjustment_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {settlement.adjustment_amount >= 0 ? '+' : ''}{formatCurrency(settlement.adjustment_amount)}
                </span>
              </div>
            </div>
          )}

          {/* Final Amount */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                VALOR RECEBIDO
              </h4>
              <span className="text-2xl font-bold text-emerald-600">
                {formatCurrency(settlement.total_settlement_amount || 0)}
              </span>
            </div>
          </div>

          {/* Real Profit Section */}
          <div className={`rounded-lg p-4 ${realProfit >= 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-rose-50 dark:bg-rose-950/20'}`}>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análise de Lucro
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Unitário:</span>
                <span className={unitCost > 0 ? '' : 'text-amber-600'}>
                  {unitCost > 0 ? formatCurrency(unitCost) : 'Não informado'}
                </span>
              </div>
              {unitCost > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custo Total ({settlement.quantidade} un):</span>
                    <span className="text-rose-600">-{formatCurrency(totalCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Lucro Real:</span>
                    <span className={realProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {formatCurrency(realProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem de Lucro:</span>
                    <span className={profitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
              {unitCost === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Para calcular o lucro real, informe o custo unitário do produto na tela de Resultados
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
