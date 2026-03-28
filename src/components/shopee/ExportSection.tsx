import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, ShoppingCart, DollarSign, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useIntegrations } from '@/hooks/useIntegrations';

type ExportType = 'raw_orders' | 'synced_orders' | 'synced_payments' | 'synced_fees';

interface ExportOption {
  value: ExportType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresSync: boolean;
}

const exportOptions: ExportOption[] = [
  {
    value: 'raw_orders',
    label: 'Pedidos (Upload Manual)',
    description: 'Dados importados via arquivo XLSX',
    icon: FileSpreadsheet,
    requiresSync: false,
  },
  {
    value: 'synced_orders',
    label: 'Pedidos (Sync Shopee)',
    description: 'Pedidos sincronizados automaticamente via API',
    icon: ShoppingCart,
    requiresSync: true,
  },
  {
    value: 'synced_payments',
    label: 'Pagamentos (Sync Shopee)',
    description: 'Escrow e transações de carteira sincronizados',
    icon: DollarSign,
    requiresSync: true,
  },
  {
    value: 'synced_fees',
    label: 'Taxas (Sync Shopee)',
    description: 'Comissões, fretes e taxas detalhadas por pedido',
    icon: DollarSign,
    requiresSync: true,
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

function formatCurrency(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function ExportSection() {
  const { user } = useAuth();
  const { getConnection } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isConnected = shopeeConnection?.status === 'connected';

  const [selectedType, setSelectedType] = useState<ExportType>('raw_orders');
  const [isExporting, setIsExporting] = useState(false);

  const fetchAndExport = async () => {
    if (!user) return;
    setIsExporting(true);

    try {
      let rows: Record<string, string | number>[] = [];
      let filename = '';

      if (selectedType === 'raw_orders') {
        // Busca todos os pedidos do upload manual
        const { data, error } = await supabase
          .from('raw_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('data_pedido', { ascending: false });

        if (error) throw error;

        rows = (data || []).map(o => ({
          'ID Pedido': o.order_id,
          'SKU': o.sku || '-',
          'Produto': o.nome_produto || '-',
          'Variação': o.variacao || '-',
          'Quantidade': o.quantidade,
          'Total Faturado (R$)': formatCurrency(Number(o.total_faturado)),
          'Rebate Shopee (R$)': formatCurrency(Number(o.rebate_shopee)),
          'Custo Unitário (R$)': formatCurrency(Number(o.custo_unitario)),
          'Data do Pedido': formatDate(o.data_pedido),
        }));
        filename = 'pedidos_upload_manual';

      } else if (selectedType === 'synced_orders') {
        if (!shopeeConnection) throw new Error('Nenhuma integração Shopee conectada');

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('integration_id', shopeeConnection.id)
          .order('order_created_at', { ascending: false });

        if (error) throw error;

        rows = (data || []).map(o => ({
          'ID Pedido': o.external_order_id,
          'Status': o.status,
          'Total (R$)': formatCurrency(Number(o.total_amount)),
          'Moeda': o.currency,
          'Comprador': o.buyer_username || '-',
          'Transportadora': o.shipping_carrier || '-',
          'Rastreio': o.tracking_number || '-',
          'Data Pagamento': formatDate(o.paid_at),
          'Data Criação': formatDate(o.order_created_at),
          'Data Atualização': formatDate(o.order_updated_at),
          'Sincronizado em': formatDate(o.synced_at),
        }));
        filename = 'pedidos_sync_shopee';

      } else if (selectedType === 'synced_payments') {
        if (!shopeeConnection) throw new Error('Nenhuma integração Shopee conectada');

        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('integration_id', shopeeConnection.id)
          .order('transaction_date', { ascending: false });

        if (error) throw error;

        rows = (data || []).map(p => ({
          'ID Transação': p.external_transaction_id,
          'Tipo': p.payment_method === 'escrow' ? 'Escrow' : 'Carteira',
          'Status': p.status,
          'Valor Bruto (R$)': formatCurrency(Number(p.amount)),
          'Taxa Marketplace (R$)': formatCurrency(Number(p.marketplace_fee)),
          'Valor Líquido (R$)': formatCurrency(Number(p.net_amount)),
          'Moeda': p.currency,
          'Descrição': p.description || '-',
          'Data Transação': formatDate(p.transaction_date),
          'Sincronizado em': formatDate(p.synced_at),
        }));
        filename = 'pagamentos_sync_shopee';

      } else if (selectedType === 'synced_fees') {
        if (!shopeeConnection) throw new Error('Nenhuma integração Shopee conectada');

        const { data, error } = await supabase
          .from('fees')
          .select('*')
          .eq('integration_id', shopeeConnection.id)
          .order('fee_date', { ascending: false });

        if (error) throw error;

        const feeLabels: Record<string, string> = {
          commission_fee: 'Comissão Shopee',
          service_fee: 'Taxa de Serviço',
          shipping_fee: 'Frete',
          reverse_shipping_fee: 'Frete Reverso',
          seller_discount: 'Desconto Vendedor',
          shopee_discount: 'Desconto Shopee',
        };

        rows = (data || []).map(f => ({
          'ID Taxa': f.external_fee_id,
          'Tipo': feeLabels[f.fee_type] || f.fee_type,
          'Valor (R$)': formatCurrency(Number(f.amount)),
          'Moeda': f.currency,
          'Descrição': f.description || '-',
          'Data': formatDate(f.fee_date),
          'Sincronizado em': formatDate(f.synced_at),
        }));
        filename = 'taxas_sync_shopee';
      }

      if (rows.length === 0) {
        toast.warning('Nenhum dado encontrado para exportar.');
        return;
      }

      // Gera o XLSX
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

      // Ajusta largura das colunas automaticamente
      const colWidths = Object.keys(rows[0]).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
      }));
      worksheet['!cols'] = colWidths;

      const dateStr = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);

      toast.success(`${rows.length} registros exportados com sucesso!`);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedOption = exportOptions.find(o => o.value === selectedType);
  const isDisabled = selectedOption?.requiresSync && !isConnected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Download className="h-5 w-5" />
          Exportar Dados
        </CardTitle>
        <CardDescription>
          Exporte seus dados em formato Excel (.xlsx)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de exportação</Label>
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as ExportType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportOptions.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.requiresSync && !isConnected}
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.requiresSync && !isConnected && (
                      <span className="text-xs text-muted-foreground">
                        (requer integração conectada)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedOption && (
            <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
          )}
        </div>

        {isDisabled && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3">
            Esta exportação requer uma integração Shopee conectada. Acesse{' '}
            <a href="/integrations" className="underline">Integrações</a> para conectar.
          </div>
        )}

        <Button
          onClick={fetchAndExport}
          disabled={isExporting || isDisabled}
          className="w-full"
        >
          {isExporting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...</>
          ) : (
            <><Download className="h-4 w-4 mr-2" /> Exportar XLSX</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}