import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, parseISO, subDays, subYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { toCents } from '@/lib/money';
import {
  computeForecast,
  tendenciaStartOffset,
  calibrarShopee,
  type ForecastPayable,
  type ForecastReceivable,
  type ForecastResult,
  type ShopeeCalibration,
  type ShopeeReleaseSample,
} from '@/lib/cashflow-forecast';
import {
  useCashFlowEntries,
  expandRecurringEntries,
  computeAccumulatedBalance,
} from '@/hooks/useCashFlow';

// Compõe a Previsão de Caixa (Aposta B). Recebíveis vêm de três lados:
//   - CONFIRMADO — Mercado Livre: o ML entrega `release_date` (money_release_
//     date) pronto. Vira a linha sólida e dispara o alerta.
//   - PROVÁVEL — Shopee: a API só devolve escrow JÁ liberado, então estimamos a
//     liberação futura por D+N a partir do pagamento do pedido em trânsito,
//     com haircut da taxa Shopee.
//   - PROVÁVEL — TikTok (upload manual): repasses com status Pending e
//     `statement_date` na janela à frente, do último arquivo importado.
// Os prováveis viram linha tracejada / banda, nunca o alerta. As saídas e os
// recebíveis manuais vêm do Fluxo de Caixa.

const HORIZON_DAYS = 30;
// Status de pedido Shopee que ainda vão liberar escrow: pago, não cancelado e
// não concluído (concluído já caiu, ou está pra cair, no get_escrow_list —
// contá-lo aqui duplicaria).
const SHOPEE_EM_TRANSITO = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'TO_CONFIRM_RECEIVE'];
// Status de repasse TikTok que já caiu — o resto ('Pending', 'FUNDS_PROCESSING'
// etc.) é dinheiro a receber.
const TIKTOK_PAGO = ['paid', 'settled'];
// Piso pro início da tendência: mesmo sem nenhum recebível confirmado mapeado,
// não somamos o ritmo antes disso — cobre o ciclo típico entrega + liberação
// do ML de uma venda feita hoje. O valor real sai de `tendenciaStartOffset`,
// que empurra a marca pra frente quando há recebíveis confirmados mais longos.
const TENDENCIA_PISO_DIAS = 10;
const RITMO_JANELA_DIAS = 30;
// Abaixo disto não há histórico suficiente pra estimar um ritmo diário —
// a conexão é recente demais e dividir pela janela cheia subestimaria.
const RITMO_MIN_DIAS = 7;

interface PaymentRow {
  net_amount: number | null;
  net_amount_cents: number | null;
  release_date: string | null;
  transaction_date: string | null;
}

function centsOf(p: PaymentRow): number {
  const c = Number(p.net_amount_cents);
  if (Number.isFinite(c) && c !== 0) return Math.round(c);
  return Math.round((Number(p.net_amount) || 0) * 100);
}

export interface CashFlowForecast {
  result: ForecastResult;
  isLoading: boolean;
  /** há pelo menos uma conta ML conectada */
  hasMercadoLivre: boolean;
  /** há pelo menos uma conta Shopee conectada */
  hasShopee: boolean;
  /** há repasses TikTok importados (upload manual) */
  hasTiktok: boolean;

  /** âncora em uso na projeção */
  openingBalanceCents: number;
  openingDateIso: string;
  /** true = veio de `cash_flow_settings` (o vendedor confirmou);
   *  false = sugestão automática pelo acumulado do Fluxo de Caixa */
  openingIsConfirmed: boolean;
  /** dias desde que a âncora foi confirmada (null se nunca foi) */
  openingAgeDays: number | null;
  /** sugestão automática — o acumulado do Fluxo de Caixa hoje */
  suggestedOpeningCents: number;

  /** entradas e saídas que entram na projeção, já ordenadas por data */
  receivables: ForecastReceivable[];
  /** recebíveis prováveis (Shopee estimado), ordenados por data */
  probableReceivables: ForecastReceivable[];
  /** como a estimativa Shopee foi calibrada (null se não há Shopee) */
  shopeeCalib: ShopeeCalibration | null;
  payables: ForecastPayable[];
  ritmoLiquidoDiaCents: number;

  saveAnchor: ReturnType<typeof useMutation<void, Error, number>>;
}

export function useCashFlowForecast(): CashFlowForecast {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { entries, isLoading: entriesLoading } = useCashFlowEntries();

  const now = useMemo(() => new Date(), []);
  const todayIso = format(now, 'yyyy-MM-dd');
  const horizonIso = format(addDays(now, HORIZON_DAYS), 'yyyy-MM-dd');
  const ritmoDesdeIso = format(subDays(now, RITMO_JANELA_DIAS), 'yyyy-MM-dd');

  // ── Âncora de saldo (cash_flow_settings) ───────────────────────────────────
  const settingsQuery = useQuery({
    queryKey: ['cash-flow-settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_flow_settings')
        .select('opening_balance_cents, opening_balance_date, updated_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ── Recebíveis ML + ritmo observado ───────────────────────────────────────
  const mlQuery = useQuery({
    queryKey: ['cash-flow-forecast-ml', user?.id, todayIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: conns, error: connErr } = await supabase
        .from('integration_connections')
        .select('id')
        .eq('user_id', user!.id)
        .eq('provider', 'mercadolivre')
        .eq('status', 'connected');
      if (connErr) throw connErr;

      const mlIds = (conns ?? []).map(c => c.id);
      if (mlIds.length === 0) {
        return { receivables: [] as ForecastReceivable[], ritmoLiquidoDiaCents: 0, hasMercadoLivre: false };
      }

      const [recRes, ritmoRes] = await Promise.all([
        supabase
          .from('payments')
          .select('net_amount, net_amount_cents, release_date, transaction_date')
          .in('integration_id', mlIds)
          .not('release_date', 'is', null)
          .gte('release_date', todayIso)
          .lte('release_date', horizonIso),
        supabase
          .from('payments')
          .select('net_amount, net_amount_cents, release_date, transaction_date')
          .in('integration_id', mlIds)
          .gte('transaction_date', ritmoDesdeIso),
      ]);
      if (recRes.error) throw recRes.error;
      if (ritmoRes.error) throw ritmoRes.error;

      const receivables: ForecastReceivable[] = (recRes.data ?? [])
        .map(p => ({ dateIso: p.release_date!.slice(0, 10), amountCents: centsOf(p), source: 'ml' as const }))
        .filter(r => r.amountCents > 0);

      const ritmoRows = ritmoRes.data ?? [];
      const ritmoTotal = ritmoRows.reduce((s, p) => s + Math.max(0, centsOf(p)), 0);

      // Denominador = dias realmente observados, não a janela nominal. Conexão
      // nova (ex.: 10 dias de histórico) dividida por 30 subestimaria o ritmo
      // em 3x. Abaixo de RITMO_MIN_DIAS a estimativa não se sustenta → sem
      // tendência (a linha conservadora continua valendo).
      const oldestIso = ritmoRows.reduce<string | null>((min, p) => {
        const d = (p.transaction_date ?? '').slice(0, 10);
        return d && (!min || d < min) ? d : min;
      }, null);
      const spanDias = oldestIso
        ? Math.min(RITMO_JANELA_DIAS, differenceInCalendarDays(now, parseISO(oldestIso)))
        : 0;
      const ritmoLiquidoDiaCents =
        spanDias >= RITMO_MIN_DIAS ? Math.round(ritmoTotal / spanDias) : 0;

      return { receivables, ritmoLiquidoDiaCents, hasMercadoLivre: true };
    },
  });

  // ── Recebíveis PROVÁVEIS Shopee (escrow estimado por D+N) ──────────────────
  const shopeeQuery = useQuery({
    queryKey: ['cash-flow-forecast-shopee', user?.id, todayIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: conns, error: connErr } = await supabase
        .from('integration_connections')
        .select('id')
        .eq('user_id', user!.id)
        .eq('provider', 'shopee')
        .eq('status', 'connected');
      if (connErr) throw connErr;

      const ids = (conns ?? []).map(c => c.id);
      if (ids.length === 0) {
        return { probables: [] as ForecastReceivable[], hasShopee: false, calib: null as ShopeeCalibration | null };
      }

      // Pedido pago há mais de 45 dias e ainda "em trânsito" está travado
      // (extravio, disputa) — não é caixa previsível, fica de fora.
      const pagoDesdeIso = format(subDays(now, 45), 'yyyy-MM-dd');
      // Escrow já liberado nos últimos 120d → calibra o lag e o haircut pelo
      // histórico real do vendedor.
      const calibDesdeIso = format(subDays(now, 120), 'yyyy-MM-dd');

      const [transitRes, escrowRes] = await Promise.all([
        supabase
          .from('orders')
          .select('paid_at, total_amount_cents, status')
          .in('integration_id', ids)
          .in('status', SHOPEE_EM_TRANSITO)
          .not('paid_at', 'is', null)
          .gte('paid_at', pagoDesdeIso),
        supabase
          .from('payments')
          .select('amount_cents, net_amount_cents, release_date, order_id')
          .in('integration_id', ids)
          .eq('payment_method', 'escrow')
          .not('release_date', 'is', null)
          .gte('release_date', calibDesdeIso),
      ]);
      if (transitRes.error) throw transitRes.error;
      if (escrowRes.error) throw escrowRes.error;

      // ── Calibração: lag pagamento→liberação e razão líquido/bruto ───────────
      const escrowRows = escrowRes.data ?? [];
      const paidOrderIds = [...new Set(escrowRows.map(r => r.order_id).filter((x): x is string => !!x))];
      const paidById = new Map<string, string>();
      if (paidOrderIds.length > 0) {
        const { data: paidRows } = await supabase
          .from('orders')
          .select('id, paid_at')
          .in('id', paidOrderIds)
          .not('paid_at', 'is', null);
        for (const o of paidRows ?? []) if (o.paid_at) paidById.set(o.id, o.paid_at);
      }
      const samples: ShopeeReleaseSample[] = escrowRows.flatMap(r => {
        const paid = r.order_id ? paidById.get(r.order_id) : undefined;
        if (!paid || !r.release_date) return [];
        return [{
          lagDias: differenceInCalendarDays(parseISO(r.release_date.slice(0, 10)), parseISO(paid.slice(0, 10))),
          grossCents: Math.round(Number(r.amount_cents) || 0),
          netCents: Math.round(Number(r.net_amount_cents) || 0),
        }];
      });
      const calib = calibrarShopee(samples);

      // ── Recebíveis prováveis dos pedidos em trânsito ───────────────────────
      // Estimativa é sempre no futuro (pedido preso não some, mas o dinheiro
      // não cai amanhã) e nunca além do horizonte.
      const loIso = format(addDays(now, 2), 'yyyy-MM-dd');
      const probables: ForecastReceivable[] = (transitRes.data ?? [])
        .map(o => {
          const grossCents = Math.round(Number(o.total_amount_cents) || 0);
          if (grossCents <= 0) return null;
          const netCents = Math.round(grossCents * calib.netRatio);
          if (netCents <= 0) return null;
          const est = format(
            addDays(parseISO(o.paid_at!.slice(0, 10)), calib.lagDias),
            'yyyy-MM-dd',
          );
          const dateIso = est < loIso ? loIso : est > horizonIso ? horizonIso : est;
          return { dateIso, amountCents: netCents, source: 'shopee' as const };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

      return { probables, hasShopee: true, calib };
    },
  });

  // ── Recebíveis PROVÁVEIS TikTok (repasses pendentes do último upload) ──────
  const tiktokQuery = useQuery({
    queryKey: ['cash-flow-forecast-tiktok', user?.id, todayIso],
    enabled: !!user?.id,
    queryFn: async () => {
      // Só a janela à frente: repasse pendente com statement_date fora dela
      // (arquivo velho) não é caixa previsível.
      const desdeIso = format(subDays(now, 3), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('tiktok_settlements')
        .select('total_settlement_amount_cents, statement_date, status')
        .eq('user_id', user!.id)
        .not('statement_date', 'is', null)
        .gte('statement_date', desdeIso)
        .lte('statement_date', horizonIso);
      if (error) throw error;

      const rows = data ?? [];
      // hasTiktok: existe algum settlement importado (mesmo fora da janela)?
      // Uma 2ª query mínima só pra decidir o empty-state / banner.
      const { count } = await supabase
        .from('tiktok_settlements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      const loIso = format(now, 'yyyy-MM-dd');
      const probables: ForecastReceivable[] = rows
        .filter(s => !TIKTOK_PAGO.includes((s.status ?? '').trim().toLowerCase()))
        .map(s => {
          const amountCents = Math.round(Number(s.total_settlement_amount_cents) || 0);
          if (amountCents <= 0) return null;
          const d = s.statement_date!.slice(0, 10);
          return { dateIso: d < loIso ? loIso : d, amountCents, source: 'tiktok' as const };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

      return { probables, hasTiktok: (count ?? 0) > 0 };
    },
  });

  // ── Saídas: pedidos de compra ao fornecedor em aberto ─────────────────────
  // Um pedido não recebido com vencimento na janela é uma saída certa de caixa.
  const purchaseQuery = useQuery({
    queryKey: ['cash-flow-forecast-po', user?.id, todayIso],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('sku, item_name, qty_units, unit_cost_cents, expected_at, payment_due_at')
        .eq('user_id', user!.id)
        .is('received_at', null);
      if (error) throw error;
      return (data ?? [])
        .map(p => {
          const due = (p.payment_due_at ?? p.expected_at ?? '').slice(0, 10);
          const cents = Math.round((Number(p.qty_units) || 0) * (Number(p.unit_cost_cents) || 0));
          if (!due || cents <= 0) return null;
          return { dateIso: due, amountCents: cents, label: `Fornecedor · ${p.item_name || p.sku}` };
        })
        .filter((x): x is ForecastPayable => x !== null);
    },
  });

  const saveAnchor = useMutation<void, Error, number>({
    mutationFn: async (balanceCents: number) => {
      const { error } = await supabase
        .from('cash_flow_settings')
        .upsert(
          {
            user_id: user!.id,
            opening_balance_cents: Math.round(balanceCents),
            opening_balance_date: todayIso,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-settings', user?.id] });
      toast({ title: 'Saldo atualizado', description: 'A projeção usa esse valor como ponto de partida.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o saldo.', variant: 'destructive' });
    },
  });

  // ── Composição ────────────────────────────────────────────────────────────
  const composed = useMemo(() => {
    // Janela larga pra trás: pega conta vencida ainda em aberto (o forecast
    // joga no dia 0) e casa com o acumulado que o Dashboard do Fluxo de Caixa
    // calcula (subYears(now, 2)). Pra frente, só o horizonte + folga.
    const expanded = expandRecurringEntries(entries, subYears(now, 2), addDays(now, HORIZON_DAYS + 2));

    const suggestedOpeningCents = toCents(computeAccumulatedBalance(expanded, now));

    const settings = settingsQuery.data;
    const openingIsConfirmed = !!settings;
    const openingBalanceCents = settings ? Number(settings.opening_balance_cents) : suggestedOpeningCents;
    const openingDateIso = settings ? settings.opening_balance_date.slice(0, 10) : todayIso;
    const openingAgeDays = settings
      ? Math.max(0, Math.round((now.getTime() - new Date(settings.opening_balance_date).getTime()) / 86_400_000))
      : null;

    const payables: ForecastPayable[] = [
      ...expanded
        .filter(e => e.type === 'expense' && e.status !== 'paid' && !!e.due_date)
        .map(e => ({ dateIso: e.due_date!.slice(0, 10), amountCents: toCents(Number(e.amount)), label: e.description })),
      ...(purchaseQuery.data ?? []),
    ].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const manualReceivables: ForecastReceivable[] = expanded
      .filter(e => e.type === 'income' && e.status === 'pending')
      .map(e => ({ dateIso: (e.due_date ?? e.date).slice(0, 10), amountCents: toCents(Number(e.amount)), source: 'manual' as const }));

    const mlReceivables = mlQuery.data?.receivables ?? [];
    const receivables = [...mlReceivables, ...manualReceivables].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const probableReceivables = [
      ...(shopeeQuery.data?.probables ?? []),
      ...(tiktokQuery.data?.probables ?? []),
    ].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const ritmoLiquidoDiaCents = mlQuery.data?.ritmoLiquidoDiaCents ?? 0;

    // A tendência (ML) só passa a somar depois que o grosso dos recebíveis ML
    // já confirmados caiu — evita contar o mesmo dinheiro na linha e na banda.
    const tendenciaComecaEmDias = tendenciaStartOffset(mlReceivables, todayIso, {
      piso: TENDENCIA_PISO_DIAS,
      teto: HORIZON_DAYS,
    });

    const result = computeForecast({
      openingBalanceCents,
      todayIso,
      horizonDays: HORIZON_DAYS,
      receivables,
      probableReceivables,
      payables,
      ritmoLiquidoDiaCents,
      tendenciaComecaEmDias,
    });

    return {
      result,
      openingBalanceCents,
      openingDateIso,
      openingIsConfirmed,
      openingAgeDays,
      suggestedOpeningCents,
      receivables,
      probableReceivables,
      shopeeCalib: shopeeQuery.data?.calib ?? null,
      payables,
      ritmoLiquidoDiaCents,
    };
  }, [entries, now, settingsQuery.data, mlQuery.data, shopeeQuery.data, tiktokQuery.data, purchaseQuery.data, todayIso]);

  return {
    ...composed,
    isLoading:
      entriesLoading || settingsQuery.isLoading || mlQuery.isLoading ||
      shopeeQuery.isLoading || tiktokQuery.isLoading || purchaseQuery.isLoading,
    hasMercadoLivre: mlQuery.data?.hasMercadoLivre ?? false,
    hasShopee: shopeeQuery.data?.hasShopee ?? false,
    hasTiktok: tiktokQuery.data?.hasTiktok ?? false,
    saveAnchor,
  };
}
