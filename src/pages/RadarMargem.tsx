import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radar, Plug, Package, TrendingDown, AlertTriangle, PercentCircle, Tag, HelpCircle, CheckCircle2,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard, KpiRow } from '@/components/ui/stat-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useActiveShopeeConnection } from '@/hooks/useActiveShopeeConnection';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useProductCosts } from '@/hooks/useProductCosts';
import { buildMarginPoints, detectMarginErosion, type CausaErosao } from '@/lib/margin-erosion';

const PERIODOS = ['7', '14', '30'] as const;
type Periodo = (typeof PERIODOS)[number];

const pct1 = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

const CAUSA_META: Record<CausaErosao, { label: string; icon: typeof Package }> = {
  custo_subiu:   { label: 'Custo do produto subiu',    icon: Package },
  taxa_subiu:    { label: 'A plataforma reteve mais',  icon: PercentCircle },
  preco_caiu:    { label: 'Preço de venda caiu',        icon: Tag },
  indeterminado: { label: 'Causa não identificada',     icon: HelpCircle },
};

export default function RadarMargem() {
  const { activeConnection } = useActiveShopeeConnection();
  const conectado = activeConnection?.status === 'connected';
  const [periodo, setPeriodo] = useState<Periodo>('14');
  const periodDays = Number(periodo);

  // Busca uma janela DOBRADA de uma vez (metade recente + metade anterior) —
  // zero query extra, só recorta o mesmo `orders` duas vezes com sinceIso
  // diferentes (mesmo truque de useDREData.dreDataPrev / PeriodComparison).
  const { data, isLoading } = useShopeeSync(conectado ? activeConnection!.id : null, periodDays * 2);
  const { data: costs } = useProductCosts();

  const erosions = useMemo(() => {
    if (!data) return [];
    const agora = new Date();
    const cutRecente = new Date(agora.getTime() - periodDays * 86_400_000).toISOString();
    const cutAnterior = new Date(agora.getTime() - periodDays * 2 * 86_400_000).toISOString();
    const atual = buildMarginPoints(data.orders, data.payments, costs ?? [], { sinceIso: cutRecente, untilIso: agora.toISOString() });
    const anterior = buildMarginPoints(data.orders, data.payments, costs ?? [], { sinceIso: cutAnterior, untilIso: cutRecente });
    return detectMarginErosion(atual, anterior);
  }, [data, costs, periodDays]);

  const seletor = (
    <Select value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
      <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIODOS.map(p => <SelectItem key={p} value={p}>Últimos {p} dias vs os {p} antes</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const conteudo = (() => {
    if (!conectado) {
      return (
        <EmptyState
          icon={Plug}
          title="Conecte a Shopee para acompanhar a margem"
          description="Comparamos a margem real de cada SKU entre dois períodos e avisamos quando algum está piorando — e por quê. Conecte e sincronize pra começar."
          action={<Button asChild><Link to="/integrations">Ir para Integrações</Link></Button>}
        />
      );
    }
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      );
    }
    if (!data || data.orders.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Sem pedidos concluídos no período"
          description="Precisamos de vendas nos dois períodos (o atual e o anterior) pra comparar a margem. Aumente o período ou rode uma sincronização."
        />
      );
    }

    const totalImpacto = erosions.reduce((s, e) => s + e.impactoReais, 0);
    const cruzaram = erosions.filter(e => e.cruzouZero).length;

    return (
      <div className="space-y-6">
        <KpiRow>
          <StatCard
            title="Produtos em erosão"
            value={String(erosions.length)}
            description={`margem caindo nos últimos ${periodo} dias`}
            icon={TrendingDown}
            variant={erosions.length > 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Foram pro prejuízo"
            value={String(cruzaram)}
            description={cruzaram > 0 ? 'cruzaram de positivo pra negativo' : 'nenhum'}
            icon={AlertTriangle}
            variant={cruzaram > 0 ? 'danger' : 'success'}
          />
          <StatCard
            title="Impacto estimado"
            value={formatCurrency(totalImpacto)}
            description="margem perdida no faturamento do período"
            icon={PercentCircle}
            variant={totalImpacto > 0 ? 'warning' : 'success'}
          />
        </KpiRow>

        {erosions.length === 0 ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 py-6">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <p className="text-sm">
                Nenhum produto com queda relevante de margem nos últimos {periodo} dias.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold">Produtos com margem em queda</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ordenado do pior pro menos grave. Só entram SKUs com custo cadastrado e vendas nos dois períodos.
              </p>
              <div className="mt-3 divide-y divide-border/50">
                {erosions.map(e => {
                  const causa = CAUSA_META[e.causaProvavel];
                  const CausaIcon = causa.icon;
                  return (
                    <div key={e.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium" title={e.nome}>{e.nome}</p>
                          {e.cruzouZero && (
                            <Badge variant="destructive" className="shrink-0 text-[10px]">foi pro prejuízo</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CausaIcon className="size-3 shrink-0" />
                          {causa.label}
                          <span className="text-muted-foreground/60">·</span>
                          {e.sku}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {e.anterior.margemPct!.toFixed(0)}% → <span className={cn('font-semibold', e.atual.margemPct! < 0 ? 'text-destructive' : 'text-foreground')}>{e.atual.margemPct!.toFixed(0)}%</span>
                          </p>
                          <p className="text-[10px] font-medium text-destructive">{pct1(e.deltaMargemPct)} p.p.</p>
                        </div>
                        <div className="w-20">
                          <p className="font-mono text-sm font-semibold tabular-nums">−{formatCurrency(e.impactoReais)}</p>
                          <p className="text-[10px] text-muted-foreground">impacto</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Radar className="mt-0.5 size-3.5 shrink-0" />
          Compara a margem real (repasse − custo cadastrado) de cada SKU entre os últimos {periodo} dias e
          os {periodo} dias anteriores. A causa apontada é a de maior impacto em R$ entre custo, taxa da
          plataforma e preço médio — indício pra investigar, não um laudo exato. Shopee-first; só SKU com
          custo cadastrado e vendas nos dois períodos entra na comparação.
        </p>
      </div>
    );
  })();

  return (
    <PageShell
      icon={Radar}
      title="Radar de margem"
      subtitle="Quais produtos estão piorando — e por quê."
      action={conectado ? seletor : undefined}
    >
      {conteudo}
    </PageShell>
  );
}
