import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Upload,
  Search,
  Download,
  FileSpreadsheet,
  Receipt,
  Truck,
  Eye,
  RefreshCw,
  Package,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAllTikTokSettlements, fetchAllTikTokStatements, fetchTikTokOrdersCosts } from '@/lib/tiktok-settlement-helpers';
import { SettlementDetailModal } from '@/components/tiktok/SettlementDetailModal';
import { PaymentCharts } from '@/components/tiktok/PaymentCharts';
import { FeatureGate } from '@/components/FeatureGate';


const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

interface SettlementSummary {
  totalReceived: number;
  grossSales: number;
  customerPayment: number;
  netSales: number;
  totalFees: number;
  totalRefunds: number;
  totalSellerDiscounts: number;
  totalPlatformDiscounts: number;
  shippingBalance: number;
  recordCount: number;
  orderCount: number;
  refundCount: number;
}

interface Statement {
  id?: string;
  statement_id: string;
  payment_id: string;
  statement_date: string;
  status: string;
  total_settlement_amount: number;
  net_sales: number;
  fees_total?: number;
  shipping_total: number;
  adjustments?: number;
}

interface Settlement {
  id?: string;
  order_id: string;
  payment_id: string;
  statement_id: string;
  status: string;
  type: string;
  quantidade: number;
  nome_produto: string;
  variacao: string;
  sku_id: string;
  data_criacao_pedido: string;
  data_entrega: string;
  statement_date: string;
  total_settlement_amount: number;
  net_sales: number;
  subtotal_before_discounts: number;
  customer_payment: number;
  total_fees: number;
  refund_subtotal: number;
  customer_refund: number;
  seller_discounts: number;
  seller_cofunded_discount: number;
  platform_discounts: number;
  platform_cofunded_discount: number;
  customer_shipping_fee: number;
  tiktok_shipping_fee: number;
  shipping_incentive: number;
  refunded_shipping: number;
  affiliate_commission: number;
  tiktok_commission_fee: number;
  sfp_service_fee: number;
  icms_difal: number;
  fee_per_item: number;
  live_specials_fee: number;
  voucher_xtra_fee: number;
  delivery_option: string | null;
  collection_method: string | null;
  adjustment_amount: number;
  adjustment_reason: string | null;
}

function TikTokPagamentosContent() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [orderCosts, setOrderCosts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      
      setLoading(true);
      const [settlementsData, statementsData, costsData] = await Promise.all([
        fetchAllTikTokSettlements(user.id),
        fetchAllTikTokStatements(user.id),
        fetchTikTokOrdersCosts(user.id),
      ]);
      setSettlements(settlementsData);
      setStatements(statementsData);
      setOrderCosts(costsData);
      setLoading(false);
    }

    loadData();
  }, [user?.id]);

  // Calculate summary from STATEMENTS table (accurate totals)
  const statementsSummary = useMemo(() => {
    return statements.reduce(
      (acc, s) => ({
        totalReceived: acc.totalReceived + (s.total_settlement_amount || 0),
        netSales: acc.netSales + (s.net_sales || 0),
        totalFees: acc.totalFees + Math.abs(s.fees_total || 0),
        shippingTotal: acc.shippingTotal + (s.shipping_total || 0),
        adjustments: acc.adjustments + (s.adjustments || 0),
        statementCount: acc.statementCount + 1,
      }),
      { totalReceived: 0, netSales: 0, totalFees: 0, shippingTotal: 0, adjustments: 0, statementCount: 0 }
    );
  }, [statements]);

  // Calculate period covered by imported data
  const periodInfo = useMemo(() => {
    const dates = statements
      .map(s => s.statement_date)
      .filter(Boolean)
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) return null;
    
    return {
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      totalStatements: statements.length,
    };
  }, [statements]);

  // Check if we have limited order details (partial data)
  const hasLimitedData = statements.length > 0 && settlements.length < statements.length * 3;

  const summary: SettlementSummary = useMemo(() => {
    return settlements.reduce(
      (acc, s) => {
        const isOrder = s.type?.toLowerCase() === 'order';
        const isRefund = s.type?.toLowerCase() === 'refund';
        
        return {
          totalReceived: acc.totalReceived + (s.total_settlement_amount || 0),
          grossSales: acc.grossSales + (s.subtotal_before_discounts || 0),
          customerPayment: acc.customerPayment + (s.customer_payment || 0),
          netSales: acc.netSales + (s.net_sales || 0),
          totalFees: acc.totalFees + Math.abs(s.total_fees || 0),
          totalRefunds: acc.totalRefunds + Math.abs(s.refund_subtotal || 0) + Math.abs(s.customer_refund || 0),
          totalSellerDiscounts: acc.totalSellerDiscounts + Math.abs(s.seller_discounts || 0) + Math.abs(s.seller_cofunded_discount || 0),
          totalPlatformDiscounts: acc.totalPlatformDiscounts + Math.abs(s.platform_discounts || 0) + Math.abs(s.platform_cofunded_discount || 0),
          shippingBalance: acc.shippingBalance + 
            (s.customer_shipping_fee || 0) - 
            Math.abs(s.tiktok_shipping_fee || 0) + 
            (s.shipping_incentive || 0) -
            Math.abs(s.refunded_shipping || 0),
          recordCount: acc.recordCount + 1,
          orderCount: acc.orderCount + (isOrder ? 1 : 0),
          refundCount: acc.refundCount + (isRefund ? 1 : 0),
        };
      },
      { 
        totalReceived: 0, grossSales: 0, customerPayment: 0, netSales: 0, 
        totalFees: 0, totalRefunds: 0, totalSellerDiscounts: 0, 
        totalPlatformDiscounts: 0, shippingBalance: 0, recordCount: 0,
        orderCount: 0, refundCount: 0
      }
    );
  }, [settlements]);

  const filteredSettlements = useMemo(() => {
    let filtered = settlements;
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => s.type?.toLowerCase() === typeFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.order_id?.toLowerCase().includes(term) ||
          s.nome_produto?.toLowerCase().includes(term) ||
          s.variacao?.toLowerCase().includes(term) ||
          s.sku_id?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [settlements, searchTerm, typeFilter]);

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

  const exportToCSV = () => {
    const headers = [
      'ID do Pedido',
      'ID do Pagamento',
      'Status do Pagamento',
      'Quantidade',
      'Nome do Produto',
      'Variação SKU',
      'Data da Venda',
      'Data da Entrega',
      'Data do Pagamento',
      'Total Recebido',
      'Valor Líquido',
      'Comissão Afiliado',
    ];

    const rows = filteredSettlements.map(s => [
      s.order_id || '-',
      s.payment_id || '-',
      s.status || '-',
      s.quantidade || 0,
      s.nome_produto || '-',
      s.variacao || '-',
      s.data_criacao_pedido ? new Date(s.data_criacao_pedido).toLocaleDateString('pt-BR') : '-',
      s.data_entrega ? new Date(s.data_entrega).toLocaleDateString('pt-BR') : '-',
      s.statement_date ? new Date(s.statement_date).toLocaleDateString('pt-BR') : '-',
      s.total_settlement_amount || 0,
      s.net_sales || 0,
      Math.abs(s.affiliate_commission || 0),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos-tiktok-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleRowClick = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setModalOpen(true);
  };

  const getUnitCost = (orderId: string) => {
    return orderCosts.get(orderId) || 0;
  };

  if (loading) {
    return (
      <AppLayout>
        <FeatureGate permission="payments_access" requiredPlanName="Essencial">
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <Skeleton className="h-8 w-64" />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Skeleton className="h-96" />
          </motion.div>
        </motion.div>
        </FeatureGate>
      </AppLayout>
    );
  }

  if (settlements.length === 0 && statements.length === 0) {
    return (
      <AppLayout>
          <FeatureGate permission="payments_access" requiredPlanName="Essencial">
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Pagamentos TikTok Shop
            </h1>
            <p className="text-gray-600 mt-1">
              Visualize o detalhamento completo de recebimentos do TikTok Shop
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileSpreadsheet className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="font-semibold text-lg text-gray-900">Nenhum pagamento importado</h3>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                  Importe o relatório de pagamentos (Income) do TikTok Shop para visualizar o detalhamento completo de recebimentos por pedido
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                >
                  <Link to="/tiktok/pagamentos/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Pagamentos
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
        </FeatureGate>
      </AppLayout>
    );
  }

  const totalDiscounts = summary.totalSellerDiscounts + summary.totalPlatformDiscounts;

  return (
    <AppLayout>
      <FeatureGate permission="payments_access" requiredPlanName="Essencial">
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Pagamentos TikTok Shop
            </h1>
            <p className="text-gray-600 mt-1">
              {summary.recordCount} registros • {summary.orderCount} vendas • {summary.refundCount} reembolsos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
            >
              <Link to="/tiktok/pagamentos/upload">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Period Summary Card */}
        {periodInfo && (
          <motion.div variants={fadeInUp}>
            <Card className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 shadow-lg">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Período Importado</h3>
                      <p className="text-sm text-gray-600">
                        {periodInfo.startDate.toLocaleDateString('pt-BR')} até {periodInfo.endDate.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-lg text-gray-900">{periodInfo.totalStatements}</p>
                      <p className="text-gray-600">Pagamentos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-lg text-gray-900">{settlements.length}</p>
                      <p className="text-gray-600">Pedidos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-lg text-green-600">{formatCurrency(statementsSummary.totalReceived)}</p>
                      <p className="text-gray-600">Total Recebido</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Limited Data Warning */}
        {hasLimitedData && (
          <motion.div variants={fadeInUp}>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                Dados Parciais de Pedidos
              </h4>
              <p className="text-sm text-yellow-700">
                O relatório TikTok mostra <strong>detalhes de pedidos apenas do último pagamento</strong>. 
                Os totais abaixo estão corretos (baseados na aba Statements), mas a tabela de pedidos mostra apenas {settlements.length} registros.
              </p>
            </div>
          </motion.div>
        )}

             {/* Summary Cards - Row 1 (using STATEMENTS data for accurate totals) */}
        <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(statementsSummary.totalReceived)}
              </div>
              <p className="text-xs text-gray-600">
                {statementsSummary.statementCount} pagamentos no período
              </p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Vendas Líquidas</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(statementsSummary.netSales)}
              </div>
              <p className="text-xs text-gray-600">
                Net Sales (após descontos)
              </p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Total de Taxas</CardTitle>
              <Percent className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                -{formatCurrency(statementsSummary.totalFees)}
              </div>
              <p className="text-xs text-gray-600">
                Comissões e taxas TikTok
              </p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Frete</CardTitle>
              <Truck className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${statementsSummary.shippingTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {statementsSummary.shippingTotal >= 0 ? '+' : ''}{formatCurrency(statementsSummary.shippingTotal)}
              </div>
              <p className="text-xs text-gray-600">
                Saldo de frete do período
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary Cards - Row 2 (details from Order details when available) */}
        {settlements.length > 0 && (
          <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Faturamento Bruto</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.grossSales)}
                </div>
                <p className="text-xs text-gray-600">
                  Antes de descontos (pedidos disponíveis)
                </p>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Descontos Vendedor</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(summary.totalSellerDiscounts)}
                </div>
                <p className="text-xs text-gray-600">
                  Cupons e promoções do vendedor
                </p>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Descontos Plataforma</CardTitle>
                <Receipt className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  -{formatCurrency(summary.totalPlatformDiscounts)}
                </div>
                <p className="text-xs text-gray-600">
                  Cupons e promoções do TikTok
                </p>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">Reembolsos</CardTitle>
                <RefreshCw className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(summary.totalRefunds)}
                </div>
                <p className="text-xs text-gray-600">
                  Devoluções e cancelamentos
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Charts */}
        <motion.div variants={fadeInUp}>
          <PaymentCharts settlements={settlements} />
        </motion.div>

        {/* Statements Summary Table (Resumo por Pagamento) */}
        {statements.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-gray-900">Resumo por Pagamento</CardTitle>
                    <CardDescription className="text-gray-600">
                      Histórico de pagamentos (aba Statements do relatório)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-blue-200 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-gray-900">Data</TableHead>
                        <TableHead className="text-gray-900">Statement ID</TableHead>
                        <TableHead className="text-gray-900">Payment ID</TableHead>
                        <TableHead className="text-gray-900">Status</TableHead>
                        <TableHead className="text-right text-gray-900">Vendas Líquidas</TableHead>
                        <TableHead className="text-right text-gray-900">Taxas</TableHead>
                        <TableHead className="text-right text-gray-900">Frete</TableHead>
                        <TableHead className="text-right text-gray-900">Total Recebido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statements.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-gray-900">
                            {formatDate(s.statement_date)}
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {s.statement_id?.substring(0, 12)}...
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            {s.payment_id?.substring(0, 10)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={s.status === 'Paid' ? 'default' : 'secondary'} className="text-xs">
                              {s.status || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-gray-900">
                            {formatCurrency(s.net_sales || 0)}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600">
                            -{formatCurrency(Math.abs(s.fees_total || 0))}
                          </TableCell>
                          <TableCell className="text-right text-gray-900">
                            {formatCurrency(s.shipping_total || 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(s.total_settlement_amount || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Settlements Table */}
        <motion.div variants={fadeInUp}>
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-gray-900">Detalhamento por Pedido</CardTitle>
                  <CardDescription className="text-gray-600">
                    Clique em um pedido para ver todos os detalhes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px] border-blue-200 focus:border-blue-500">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="order">Vendas</SelectItem>
                      <SelectItem value="refund">Reembolsos</SelectItem>
                      <SelectItem value="adjustment">Ajustes</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                    <Input
                      placeholder="Buscar pedido, produto, SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 border-blue-200 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-blue-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="text-gray-900">ID do Pedido</TableHead>
                      <TableHead className="text-gray-900">ID Pagamento</TableHead>
                      <TableHead className="text-gray-900">Status</TableHead>
                      <TableHead className="text-gray-900">Produto / SKU</TableHead>
                      <TableHead className="text-center text-gray-900">Qtd</TableHead>
                      <TableHead className="text-center text-gray-900">Data Venda</TableHead>
                      <TableHead className="text-center text-gray-900">Data Entrega</TableHead>
                      <TableHead className="text-center text-gray-900">Data Pagamento</TableHead>
                      <TableHead className="text-right text-gray-900">Valor Líquido</TableHead>
                      <TableHead className="text-right text-gray-900">Comissão Afiliado</TableHead>
                      <TableHead className="text-right text-gray-900">Total Recebido</TableHead>
                      <TableHead className="text-center text-gray-900">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSettlements.slice(0, 100).map((s, idx) => {
                      const getStatusBadge = () => {
                        const status = s.status?.toLowerCase();
                        if (status === 'paid' || status === 'settled') {
                          return <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Pago</Badge>;
                        } else if (status === 'pending') {
                          return <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Pendente</Badge>;
                        }
                        return <Badge variant="outline" className="text-xs text-gray-900">{s.status || '-'}</Badge>;
                      };
                      
                      return (
                        <TableRow 
                          key={`${s.order_id}-${idx}`} 
                          className="cursor-pointer hover:bg-blue-25"
                          onClick={() => handleRowClick(s)}
                        >
                          <TableCell className="font-mono text-xs text-gray-900">
                            {s.order_id?.slice(0, 12)}...
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-600">
                            {s.payment_id?.slice(0, 10)}...
                          </TableCell>
                          <TableCell>
                            {getStatusBadge()}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px]">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {s.nome_produto || '-'}
                              </p>
                              {s.variacao && (
                                <p className="truncate text-xs text-gray-600">
                                  {s.variacao}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-gray-900">{s.quantidade}</TableCell>
                          <TableCell className="text-center text-xs text-gray-600">
                            {formatDate(s.data_criacao_pedido)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-600">
                            {formatDate(s.data_entrega)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-600">
                            {formatDate(s.statement_date)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            {formatCurrency(s.net_sales || 0)}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600">
                            {Math.abs(s.affiliate_commission || 0) > 0 
                              ? `-${formatCurrency(Math.abs(s.affiliate_commission || 0))}` 
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(s.total_settlement_amount || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredSettlements.length > 100 && (
                  <p className="text-sm text-gray-600 text-center mt-4">
                    Mostrando 100 de {filteredSettlements.length} registros. Exporte para ver todos.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detail Modal */}
        <SettlementDetailModal
          settlement={selectedSettlement}
          unitCost={selectedSettlement ? getUnitCost(selectedSettlement.order_id) : 0}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </motion.div>
      </FeatureGate>
    </AppLayout>
  );
}

export default function TikTokPagamentos() {
  return (
    <ProtectedRoute>
      <TikTokPagamentosContent />
    </ProtectedRoute>
  );
}