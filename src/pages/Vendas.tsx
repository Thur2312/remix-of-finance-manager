import { useEffect, useState } from 'react';
import { Zap, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/calculations';
import { useSaleEvents, useMarkSaleEventsSeen, SaleEventProvider } from '@/hooks/useSaleEvents';

type ProviderFilter = SaleEventProvider | 'all';

const PROVIDER_LABEL: Record<SaleEventProvider, string> = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Concluído', SHIPPED: 'Enviado', TO_CONFIRM_RECEIVE: 'A caminho',
  PROCESSED: 'Processando', UNPAID: 'Aguardando pagamento', TO_RETURN: 'Devolução',
  CANCELLED: 'Cancelado', paid: 'Pago', payment_required: 'Aguardando pagamento',
  payment_in_process: 'Pagamento em processamento', partially_paid: 'Parcialmente pago',
  confirmed: 'Confirmado', invalid: 'Inválido',
};

const CANCELLED_STATUSES = ['CANCELLED', 'TO_RETURN', 'invalid'];

function orderExternalLink(provider: SaleEventProvider, externalOrderId: string) {
  if (provider === 'shopee') return `https://seller.shopee.com.br/portal/sale/order/${externalOrderId}`;
  return `https://www.mercadolivre.com.br/vendas/${externalOrderId}/detalhe`;
}

const PAGE_SIZE = 20;

export default function Vendas() {
  const [provider, setProvider] = useState<ProviderFilter>('all');
  const [days, setDays] = useState('15');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useSaleEvents({
    provider: provider === 'all' ? undefined : provider,
    days: Number(days),
    page,
    pageSize: PAGE_SIZE,
  });

  const markSeen = useMarkSaleEventsSeen();

  // Marca como vista só a lista atualmente carregada (filtro/página aplicados)
  // — não a tabela inteira, pra não marcar como vista uma venda de um
  // marketplace que o usuário nem estava olhando.
  useEffect(() => {
    if (!data?.events?.length) return;
    const unseenIds = data.events.filter(e => !e.seen_at).map(e => e.id);
    if (unseenIds.length > 0) markSeen.mutate(unseenIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.events]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell
      icon={Zap}
      title="Vendas"
      subtitle="Atividade de vendas da Shopee e do Mercado Livre em tempo real"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={provider} onValueChange={(v) => { setProvider(v as ProviderFilter); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os marketplaces</SelectItem>
            <SelectItem value="shopee">Shopee</SelectItem>
            <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
          </SelectContent>
        </Select>

        <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['7', '15', '30', '60'].map(v => <SelectItem key={v} value={v}>{v} dias</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : !data?.events?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma venda no período selecionado.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map(ev => (
                    <TableRow key={ev.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(ev.order_created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{PROVIDER_LABEL[ev.provider]}</TableCell>
                      <TableCell className="text-sm font-mono">{ev.external_order_id}</TableCell>
                      <TableCell className="text-sm">{ev.buyer_username || '-'}</TableCell>
                      <TableCell className="text-sm max-w-[240px] truncate">{ev.product_name || '-'}</TableCell>
                      <TableCell className="text-sm font-semibold tabular-nums">{formatCurrency(ev.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={CANCELLED_STATUSES.includes(ev.status) ? 'destructive' : 'secondary'}>
                          {STATUS_LABEL[ev.status] || ev.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={orderExternalLink(ev.provider, ev.external_order_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                          title="Ver no marketplace"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {total} venda{total === 1 ? '' : 's'} encontrada{total === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
