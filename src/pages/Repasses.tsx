import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, Plug, Package, ExternalLink, PercentCircle, Clock3, CheckCircle2,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { auditShopeeRepasses, type RepasseIssue } from '@/lib/repasse-audit';
import { TAXAS_VERIFICADAS_EM } from '@/lib/marketplace-fees';

const PERIODOS = ['15', '30', '60', '90'] as const;
type Periodo = (typeof PERIODOS)[number];

function orderLink(externalOrderId: string): string {
  return `https://seller.shopee.com.br/portal/sale/order/${encodeURIComponent(externalOrderId)}`;
}

// ─── Cobrança acima da tabela ───────────────────────────────────────────────

function TaxaAcimaCard({ issues }: { issues: RepasseIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <PercentCircle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold">Cobrança acima da tabela</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Comissão + taxa de serviço registradas ficaram acima do que a tabela por faixa de preço prevê
          (tolerância de 8% ou R$2, o que for maior).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Pedido</th>
                <th className="pb-2 pr-3 text-right font-medium">Valor do pedido</th>
                <th className="pb-2 pr-3 text-right font-medium">Cobrado</th>
                <th className="pb-2 pr-3 text-right font-medium">Esperado</th>
                <th className="pb-2 pr-3 text-right font-medium">Diferença</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {issues.map(i => (
                <tr key={i.orderId}>
                  <td className="py-2 pr-3 font-mono text-xs">{i.externalOrderId}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatCurrency(i.bruto)}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-destructive">{formatCurrency(i.taxaCobrada!)}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">{formatCurrency(i.taxaEsperada!)}</td>
                  <td className="py-2 pr-3 text-right font-mono font-semibold tabular-nums text-destructive">
                    +{formatCurrency(i.diferenca!)}
                  </td>
                  <td className="py-2 text-right">
                    <a
                      href={orderLink(i.externalOrderId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Ver pedido no Seller Center"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Repasse atrasado ───────────────────────────────────────────────────────

function RepasseAtrasadoCard({ issues }: { issues: RepasseIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold">Repasse atrasado</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pedido concluído há mais de 20 dias sem nenhum repasse (escrow) registrado. Pode ser atraso da
          Shopee — vale conferir.
        </p>
        <div className="mt-3 space-y-2">
          {issues.map(i => (
            <div key={i.orderId} className="flex items-center justify-between gap-3 rounded-lg bg-warning/5 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-mono text-xs">{i.externalOrderId}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  concluído há {i.diasSemRepasse} dias
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono font-medium tabular-nums">{formatCurrency(i.bruto)}</span>
                <a
                  href={orderLink(i.externalOrderId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Ver pedido no Seller Center"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function Repasses() {
  const { activeConnection } = useActiveShopeeConnection();
  const conectado = activeConnection?.status === 'connected';
  const [periodo, setPeriodo] = useState<Periodo>('60');
  const { data, isLoading } = useShopeeSync(conectado ? activeConnection!.id : null, Number(periodo));

  const audit = useMemo(() => {
    if (!data) return null;
    return auditShopeeRepasses(data.orders, data.fees, data.payments);
  }, [data]);

  const seletor = (
    <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
      <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIODOS.map(p => <SelectItem key={p} value={p}>Últimos {p} dias</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const conteudo = (() => {
    if (!conectado) {
      return (
        <EmptyState
          icon={Plug}
          title="Conecte a Shopee para auditar os repasses"
          description="Cruzamos pedido a pedido o que foi cobrado contra a tabela oficial de comissão. Assim que a conta estiver conectada e sincronizada, a auditoria roda automaticamente."
          action={<Button asChild><Link to="/integrations">Ir para Integrações</Link></Button>}
        />
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      );
    }
    if (!audit || audit.pedidosAnalisados === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Sem pedidos concluídos no período"
          description="Nenhum pedido concluído nos últimos dias selecionados pra auditar. Aumente o período ou rode uma sincronização."
        />
      );
    }

    const semDivergencia = audit.issues.length === 0;
    const taxaIssues = audit.issues.filter(i => i.type === 'taxa_acima_tabela');
    const atrasoIssues = audit.issues.filter(i => i.type === 'sem_repasse_atrasado');

    return (
      <div className="space-y-6">
        <KpiRow>
          <StatCard
            title="Pedidos analisados"
            value={String(audit.pedidosAnalisados)}
            description={`concluídos nos últimos ${periodo} dias`}
            icon={ShieldCheck}
            variant="brand"
          />
          <StatCard
            title="Cobrança acima da tabela"
            value={String(audit.pedidosComTaxaAcima)}
            description={audit.pedidosComTaxaAcima > 0 ? `${formatCurrency(audit.totalDivergenciaTaxa)} de diferença` : 'nenhum pedido'}
            icon={PercentCircle}
            variant={audit.pedidosComTaxaAcima > 0 ? 'danger' : 'success'}
          />
          <StatCard
            title="Repasse atrasado"
            value={String(audit.pedidosSemRepasseAtrasado)}
            description={audit.pedidosSemRepasseAtrasado > 0 ? `${formatCurrency(audit.totalSemRepasseAtrasado)} sem cair ainda` : 'tudo em dia'}
            icon={Clock3}
            variant={audit.pedidosSemRepasseAtrasado > 0 ? 'warning' : 'success'}
          />
        </KpiRow>

        {semDivergencia ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <p className="text-sm">
                Nenhuma divergência encontrada nos últimos {periodo} dias — cobrança e repasse batem com o esperado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <TaxaAcimaCard issues={taxaIssues} />
            <RepasseAtrasadoCard issues={atrasoIssues} />
          </>
        )}

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          Comparação contra a tabela pública de comissão (verificada em {TAXAS_VERIFICADAS_EM}) — só
          comissão e taxa de serviço entram; frete e descontos ficam de fora por variarem demais pra
          confiar numa régua fixa. Shopee-first: ML e TikTok entram quando os syncs capturarem taxa por
          linha. Não é aviso oficial de erro da Shopee — é um indício pra você conferir.
        </p>
      </div>
    );
  })();

  return (
    <PageShell
      icon={ShieldCheck}
      title="Auditoria de repasse"
      subtitle="A Shopee te pagou o que devia? Cruza o cobrado contra a tabela oficial, pedido a pedido."
      action={conectado ? seletor : undefined}
    >
      {conteudo}
    </PageShell>
  );
}
