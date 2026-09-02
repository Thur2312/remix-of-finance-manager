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
  type ForecastPayable,
  type ForecastReceivable,
  type ForecastResult,
} from '@/lib/cashflow-forecast';
import {
  useCashFlowEntries,
  expandRecurringEntries,
  computeAccumulatedBalance,
} from '@/hooks/useCashFlow';

// Compõe a Previsão de Caixa (Aposta B, Fase 1). Só Mercado Livre no lado dos
// recebíveis: o ML entrega `release_date` (money_release_date) pronto. Shopee e
// TikTok entram nas próximas fases. As saídas e os recebíveis manuais vêm do
// Fluxo de Caixa que o vendedor já mantém.

const HORIZON_DAYS = 30;
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
  /** há pelo menos uma conta ML conectada (define o empty state) */
  hasMercadoLivre: boolean;

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

    const payables: ForecastPayable[] = expanded
      .filter(e => e.type === 'expense' && e.status !== 'paid' && !!e.due_date)
      .map(e => ({ dateIso: e.due_date!.slice(0, 10), amountCents: toCents(Number(e.amount)), label: e.description }))
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso));

    const manualReceivables: ForecastReceivable[] = expanded
      .filter(e => e.type === 'income' && e.status === 'pending')
      .map(e => ({ dateIso: (e.due_date ?? e.date).slice(0, 10), amountCents: toCents(Number(e.amount)), source: 'manual' as const }));

    const mlReceivables = mlQuery.data?.receivables ?? [];
    const receivables = [...mlReceivables, ...manualReceivables].sort((a, b) => a.dateIso.localeCompare(b.dateIso));

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
      payables,
      ritmoLiquidoDiaCents,
    };
  }, [entries, now, settingsQuery.data, mlQuery.data, todayIso]);

  return {
    ...composed,
    isLoading: entriesLoading || settingsQuery.isLoading || mlQuery.isLoading,
    hasMercadoLivre: mlQuery.data?.hasMercadoLivre ?? false,
    saveAnchor,
  };
}
