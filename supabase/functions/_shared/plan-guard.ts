import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mesma lista de PAID_PLANS usada no frontend (src/hooks/useTrialStatus.ts) —
// mantém as duas em sincronia se um novo plano for adicionado.
const PAID_PLANS = ["mensal", "semestral", "anual", "cancel_at_period_end"];

/**
 * Antes, as edge functions de IA (generate-ad, generate-product-images,
 * financial-assistant, parse-bank-statement) só checavam "o JWT é válido" —
 * nunca consultavam profiles.plan. O bloqueio de acesso (PaywallModal,
 * FeatureGate) era decidido inteiramente no cliente: um usuário com plano
 * cancelado ou trial expirado, mas ainda logado, podia chamar essas funções
 * direto via supabase.functions.invoke no console do navegador e continuar
 * usando os recursos pagos de IA sem limite.
 */
export async function hasActivePlanAccess(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string
): Promise<boolean> {
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, trial_ends_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.plan) return false;
  if (PAID_PLANS.includes(profile.plan)) return true;

  if (profile.plan === "trial") {
    if (!profile.trial_ends_at) return false;
    return new Date(profile.trial_ends_at).getTime() > Date.now();
  }

  return false;
}
