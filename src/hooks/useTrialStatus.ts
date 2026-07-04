import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

export type PlanType = "sem_plano" | "trial" | "profissional" | "cancelado";

export type TrialStatus = {
  isLoading: boolean;
  plan: PlanType;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaid: boolean;
  isCanceled: boolean;
  isBlocked: boolean;
  daysRemaining: number;
  trialEndsAt: Date | null;
};

type ProfileRow = {
  plan: string | null;
  trial_ends_at: string | null;
};

// Planos que significam acesso pago ativo (incluindo cancel_at_period_end
// pois o usuário ainda tem acesso até o fim do período)
// Valores devem bater com os gravados pelo webhook do Stripe (supabase/functions/stripe-webhook)
const PAID_PLANS = ["mensal", "semestral", "anual", "cancel_at_period_end"];

// Planos que significam cancelamento efetivo (sem acesso)
const CANCELED_PLANS = ["cancelado"];

export function useTrialStatus(): TrialStatus {
  const { pathname, search } = useLocation();
  const [status, setStatus] = useState<TrialStatus>({
    isLoading: true,
    plan: "sem_plano",
    isTrialActive: false,
    isTrialExpired: false,
    isPaid: false,
    isCanceled: false,
    isBlocked: false,
    daysRemaining: 0,
    trialEndsAt: null,
  });

  useEffect(() => {
    async function fetchStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("plan, trial_ends_at")
        .eq("id", user.id)
        .single();

      if (!data) return;

      const profile = data as unknown as ProfileRow;
      const rawPlan = (profile.plan ?? "sem_plano").trim().toLowerCase();

      const trialEndsAt = profile.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : null;

      const now = new Date();

      // ── Dias restantes do trial ───────────────────────────────────
      let daysRemaining = 0;
      if (trialEndsAt) {
        const diffMs = trialEndsAt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      // ── Derivar estado ────────────────────────────────────────────

      // Pago = plano profissional ativo (ou cancelado mas ainda no período pago)
      const isPaid = PAID_PLANS.includes(rawPlan);

      // Cancelado efetivamente = plano explicitamente cancelado
      // "free" NÃO é cancelado — é usuário que ainda não assinou
      const isCanceled = CANCELED_PLANS.includes(rawPlan);

      // Sem plano = nunca passou pelo checkout
      const semPlano = rawPlan === "sem_plano" || rawPlan === "free" || rawPlan === "";

      // Trial ativo = plano "trial" com dias restantes
      const isTrialActive = rawPlan === "trial" && daysRemaining > 0;

      // Trial expirado = plano "trial" com dias zerados
      // (enquanto o webhook não chegou para atualizar para "profissional")
      const isTrialExpired = rawPlan === "trial" && daysRemaining === 0;

      // Bloqueado:
      // - trial expirado (webhook ainda não chegou ou cartão recusado)
      // - OU plano explicitamente cancelado
      // NÃO bloqueia: free/sem_plano (redireciona para /setup-payment no auth)
      // NÃO bloqueia: profissional / cancel_at_period_end
      const isBlocked = isTrialExpired || isCanceled;

      const plan: PlanType = isPaid
        ? "profissional"
        : isCanceled
        ? "cancelado"
        : isTrialActive || isTrialExpired
        ? "trial"
        : "sem_plano";

      setStatus({
        isLoading: false,
        plan,
        isTrialActive,
        isTrialExpired,
        isPaid,
        isCanceled,
        isBlocked,
        daysRemaining,
        trialEndsAt,
      });
    }

    fetchStatus();

    // Re-fetch quando volta do Stripe (?trial=success na URL) ou navega dentro do app
    // Sem isso, quem fica parado numa página vê o card de "trial expirado" travado
    // mesmo depois que o webhook do Stripe confirma o pagamento e libera o plano pago.
    const interval = setInterval(fetchStatus, 60_000);
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pathname, search]);

  return status;
}