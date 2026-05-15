import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

const TRIAL_DAYS = 5;

export type PlanType = "sem_plano" | "trial" | "profissional" | "cancelado";

export type TrialStatus = {
  isLoading: boolean;
  plan: PlanType;
  // Atalhos para os casos mais comuns
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaid: boolean;
  isCanceled: boolean;
  isBlocked: boolean; // true quando deve bloquear acesso (trial expirado OU cancelado)
  daysRemaining: number;
  trialEndsAt: Date | null;
};

type ProfileRow = {
  plan: string | null;
  trial_ends_at: string | null;
};

export function useTrialStatus(): TrialStatus {
  const { pathname } = useLocation();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("plan, trial_ends_at")
        .eq("id", user.id)
        .single();

      if (!data) return;

      const profile = data as unknown as ProfileRow;
      const rawPlan = profile.plan ?? "sem_plano";
      const trialEndsAt = profile.trial_ends_at
        ? new Date(profile.trial_ends_at)
        : null;

      const now = new Date();

      // ── Calcular dias restantes do trial ──────────────────────────
      let daysRemaining = 0;
      if (trialEndsAt) {
        const diffMs = trialEndsAt.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      // ── Derivar estado a partir do plano salvo no DB ───────────────
      const isPaid = rawPlan === "profissional";
      const isCanceled = rawPlan === "cancelado" || rawPlan === "free";
      const isTrialActive = rawPlan === "trial" && daysRemaining > 0;
      // Trial expirado = tem plano trial mas daysRemaining zerou
      const isTrialExpired = rawPlan === "trial" && daysRemaining === 0;

      // Sem plano = ainda não passou pelo checkout (nunca chegou ao Stripe)
      // Não bloqueia aqui — o redirecionamento para /setup-payment é feito no Auth
      const semPlano = rawPlan === "sem_plano" || rawPlan === null;

      // Bloqueado: trial expirado OU cancelado (respeitando fim do período pago)
      const isBlocked = (isTrialExpired || isCanceled) && !semPlano;

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
  }, [pathname]); // re-fetch ao trocar de rota (ex: retorno do Stripe)

  return status;
}