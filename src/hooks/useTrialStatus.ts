import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TRIAL_DAYS = 5;

export type TrialStatus = {
  isLoading: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPaid: boolean;
  daysRemaining: number;
  trialStartedAt: Date | null;
};

type ProfileRow = {
  plan: string | null;
  trial_started_at: string | null;
};

export function useTrialStatus(): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>({
    isLoading: true,
    isTrialActive: false,
    isTrialExpired: false,
    isPaid: false,
    daysRemaining: 0,
    trialStartedAt: null,
  });

  useEffect(() => {
    async function fetchStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("plan, trial_started_at")
        .eq("id", user.id)
        .single();

      if (!data) return;

      // Cast seguro enquanto o database.types.ts não é regenerado
      const profile = data as unknown as ProfileRow;

      const isPaid = !!profile.plan && profile.plan !== "free" && profile.plan !== "trial";
      const trialStartedAt = profile.trial_started_at
        ? new Date(profile.trial_started_at)
        : null;

      const now = new Date();
      const diffMs = now.getTime() - (trialStartedAt?.getTime() ?? now.getTime());
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, TRIAL_DAYS - diffDays);
      const isTrialExpired = !isPaid && daysRemaining === 0;
      const isTrialActive = !isPaid && daysRemaining > 0;

      setStatus({
        isLoading: false,
        isTrialActive,
        isTrialExpired,
        isPaid,
        daysRemaining,
        trialStartedAt,
      });
    }

    fetchStatus();
  }, []);

  return status;
}