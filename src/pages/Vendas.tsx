import { useEffect, useState } from 'react';
import { Zap, ChevronLeft, ChevronRight, ExternalLink, Bell, BellOff, Loader2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';
import { useSaleEvents, useMarkSaleEventsSeen, SaleEventProvider } from '@/hooks/useSaleEvents';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function SalePushNotificationCard() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Notificações de venda desativadas.');
      return;
    }
    const ok = await subscribe();
    if (ok) {
      toast.success('Notificações de venda ativadas!');
    } else if (Notification.permission === 'denied') {
      toast.error('Você bloqueou as notificações. Habilite manualmente nas configurações do navegador.');
    }
  };

  return (
    <Card className={isSubscribed ? 'border-emerald-500/30 bg-emerald-500/5' : undefined}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isSubscribed ? 'bg-emerald-500/15' : 'bg-primary/10'}`}>
              <Bell className={`h-4 w-4 ${isSubscribed ? 'text-emerald-600' : 'text-primary'}`} />
            </div>
            <div>
              <p className="font-medium">Notificações de venda</p>
              <p className="text-sm text-muted-foreground">
                Ative para receber um aviso instantâneo — mesmo com o app fechado — sempre que uma
                venda for confirmada na conta conectada ao Seller Finance.
              </p>
            </div>
          </div>
          <Button
            onClick={handleToggle}
            disabled={!isSupported || isLoading}
            variant={isSubscribed ? 'outline' : 'default'}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isSubscribed ? (
              <BellOff className="h-4 w-4 mr-2" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {isSubscribed ? 'Desativar notificações' : 'Ativar notificações'}
          </Button>
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-destructive mt-3">
            Notificações bloqueadas pelo navegador. Habilite manualmente nas configurações do site
            pra poder ativar.
          </p>
        )}
        {!isSupported && (
          <p className="text-xs text-muted-foreground mt-3">
            Seu navegador não suporta notificações push.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type ProviderFilter = SaleEventProvider | 'all';

const PROVIDER_LABEL: Record<SaleEventProvider, string> = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
};

const STATUS_LABEL: Record<string, string> = {
  // Shopee (Open Platform v2)
  UNPAID: 'Aguardando pagamento',
  READY_TO_SHIP: 'A enviar',
  RETRY_SHIP: 'Reenvio pendente',
  PROCESSED: 'Preparando envio',
  SHIPPED: 'Enviado',
  TO_CONFIRM_RECEIVE: 'A caminho',
  IN_CANCEL: 'Cancelamento em andamento',
  CANCELLED: 'Cancelado',
  TO_RETURN: 'Devolução',
  COMPLETED: 'Concluído',
  // Mercado Livre
  confirmed: 'Confirmado',
  payment_required: 'Aguardando pagamento',
  payment_in_process: 'Processando pagamento',
  partially_paid: 'Parcialmente pago',
  paid: 'Pago',
  cancelled: 'Cancelado',
  invalid: 'Inválido',
};

// Fallback pra status não mapeado (raro): tira o SNAKE_CASE e capitaliza —
// "SOME_NEW_STATUS" → "Some new status". Melhor que gritar em inglês.
function statusLabel(status: string): string {
  return STATUS_LABEL[status]
    ?? (status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()).replace(/_/g, ' ');
}

const CANCELLED_STATUSES = ['CANCELLED', 'IN_CANCEL', 'TO_RETURN', 'cancelled', 'invalid'];

// `external_order_id` guardado pelo sync/webhook:
//  - Shopee: `order_sn` (integration-sync/index.ts) — é o mesmo id que a rota
//    do Seller Center espera em /portal/sale/order/<order_sn>.
//  - Mercado Livre: `String(order.id)` (mercadolivre-sync/-webhook) — id numérico
//    do pedido; a rota /vendas/<id>/detalhe resolve o pack no lado do ML.
function orderExternalLink(provider: SaleEventProvider, externalOrderId: string | null | undefined): string | null {
  const id = externalOrderId?.trim();
  if (!id) return null;
  if (provider === 'shopee') return `https://seller.shopee.com.br/portal/sale/order/${encodeURIComponent(id)}`;
  return `https://www.mercadolivre.com.br/vendas/${encodeURIComponent(id)}/detalhe`;
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
      <SalePushNotificationCard />

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
                          {statusLabel(ev.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const href = orderExternalLink(ev.provider, ev.external_order_id);
                          if (!href) return null;
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              title={`Ver pedido no ${PROVIDER_LABEL[ev.provider]}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          );
                        })()}
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
