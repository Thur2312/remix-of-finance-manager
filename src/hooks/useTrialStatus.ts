import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { computePlanStatus, PlanStatus } from "@/lib/plan-status";

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

function toPlanType(status: PlanStatus): PlanType {
  if (status.isPaid) return "profissional";
  if (status.isCanceled) return "cancelado";
  if (status.isTrialActive || status.isTrialExpired) return "trial";
  return "sem_plano";
}

// Antes, este hook fazia sua PRÓPRIA consulta a profiles, com sua própria
// lista de PAID_PLANS e seu próprio cálculo de expiração de trial —
// duplicando o que o AuthContext já busca no login, e podendo divergir dele
// silenciosamente (confirmado real: esta lista nunca incluiu "starter" nem
// "profissional"). Agora só deriva de useAuth(), que é a única fonte que
// efetivamente consulta o banco.
export function useTrialStatus(): TrialStatus {
  const { pathname, search } = useLocation();
  const { user, profile, profileLoading, refreshProfile } = useAuth();

  // Re-fetch quando volta do checkout (?trial=success na URL) ou navega
  // dentro do app — sem isso, quem fica parado numa página vê o card de
  // "trial expirado" travado mesmo depois que o webhook confirma o
  // pagamento e libera o plano pago.
  useEffect(() => {
    if (!user) return;

    refreshProfile();
    const interval = setInterval(refreshProfile, 60_000);
    const onFocus = () => refreshProfile();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, user]);

  const isLoading = !!user && (profileLoading || !profile);
  const status = computePlanStatus({
    rawPlan: profile?.plan,
    trialEndsAt: profile?.trial_ends_at,
  });

  return {
    isLoading,
    plan: toPlanType(status),
    isTrialActive: status.isTrialActive,
    isTrialExpired: status.isTrialExpired,
    isPaid: status.isPaid,
    isCanceled: status.isCanceled,
    isBlocked: status.isBlocked,
    daysRemaining: status.daysRemaining,
    trialEndsAt: status.trialEndsAtDate,
  };
}
