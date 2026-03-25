import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportDataSectionProps {
  connectionId: string;
  providerName: string;
}

type Order = {
  external_order_id: string
  status: string
  total_amount: number
  currency: string
  buyer_username: string
  shipping_carrier: string
  tracking_number: string
  paid_at: string | null
  order_created_at: string | null
  order_updated_at: string | null
}

type Payment = {
  external_transaction_id: string
  amount: number
  currency: string
  payment_method: string
  marketplace_fee: number
  net_amount: number
  status: string
  transaction_date: string | null
  description: string | null
}

export function ExportDataSection({ connectionId, providerName }: ExportDataSectionProps) {
  const { toast } = useToast();
  const [dataType, setDataType] = useState<'orders' | 'payments'>('orders');
  const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    setIsExporting(true);
    try {
      let data: Record<string, unknown>[] = [];
      let filename = '';

      if (dataType === 'orders') {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .eq('integration_id', connectionId)
          .order('order_created_at', { ascending: false })
          .returns<Order[]>()

        if (error) throw error;

        data = (orders || []).map(o => ({
          'ID Pedido': o.external_order_id,
          'Status': o.status,
          'Valor Total': o.total_amount,
          'Moeda': o.currency,
          'Comprador': o.buyer_username,
          'Transportadora': o.shipping_carrier,
          'Rastreamento': o.tracking_number,
          'Pago em': o.paid_at ? format(new Date(o.paid_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
          'Criado em': o.order_created_at ? format(new Date(o.order_created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
          'Atualizado em': o.order_updated_at ? format(new Date(o.order_updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
        }));

        filename = `pedidos_${providerName.toLowerCase()}_${format(new Date(), 'dd-MM-yyyy')}`;

      } else {
        const { data: payments, error } = await supabase
          .from('payments')
          .select('*')
          .eq('integration_id', connectionId)
          .order('transaction_date', { ascending: false })
          .returns<Payment[]>()

        if (error) throw error;

        data = (payments || []).map(p => ({
          'ID Transação': p.external_transaction_id,
          'Valor': p.amount,
          'Moeda': p.currency,
          'Método de Pagamento': p.payment_method,
          'Taxa Marketplace': p.marketplace_fee,
          'Valor Líquido': p.net_amount,
          'Status': p.status,
          'Data Transação': p.transaction_date ? format(new Date(p.transaction_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
          'Descrição': p.description,
        }));

        filename = `pagamentos_${providerName.toLowerCase()}_${format(new Date(), 'dd-MM-yyyy')}`;
      }

      if (data.length === 0) {
        toast({ title: 'Nenhum dado encontrado', description: 'Sincronize os dados antes de exportar.', variant: 'destructive' });
        return;
      }

      if (fileFormat === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, dataType === 'orders' ? 'Pedidos' : 'Pagamentos');
        const cols = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, 15) }));
        ws['!cols'] = cols;
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Exportação concluída!',
        description: `${data.length} registros exportados em ${fileFormat.toUpperCase()}.`,
      });

    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exportar Dados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de dados</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as 'orders' | 'payments')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Pedidos</SelectItem>
                <SelectItem value="payments">Pagamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={fileFormat} onValueChange={(v) => setFileFormat(v as 'xlsx' | 'csv')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={exportData} disabled={isExporting} className="w-full md:w-auto">
          {isExporting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exportando...</>
            : <><Download className="mr-2 h-4 w-4" />Exportar</>
          }
        </Button>
      </CardContent>
    </Card>
  );
}