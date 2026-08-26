// Única fonte de verdade pra classificar profiles.plan em pago/cancelado/
// trial. Antes, AuthContext.tsx e useTrialStatus.ts tinham cada um sua
// própria lista hardcoded (PAID_PLANS/CANCELED_PLANS) e podiam divergir
// silenciosamente — confirmado real: useTrialStatus.ts nunca incluía
// "starter" nem "profissional" (planos legados da era Stripe, ainda
// configurados em plan_permissions). Não afeta nenhum profile ativo hoje
// (só existem "trial", "mensal", "anual" em produção), mas era uma
// divergência esperando pra causar bug se esses planos voltarem a existir.
export const PAID_PLANS = ["mensal", "semestral", "anual", "profissional", "starter", "cancel_at_period_end"];
export const CANCELED_PLANS = ["cancelado"];

// Sentinela usado como nome de "plan" pra consultar plan_permissions quando
// o acesso deve ficar bloqueado (trial vencido). Não corresponde a nenhuma
// linha real da tabela — hasPermission()/getPermissionLimit() retornam
// vazio/false pra todo mundo nesse estado (deny-by-default), que é o
// comportamento que já existia antes desta consolidação.
export const BLOCKED_PLAN_SENTINEL = "basico";

export interface PlanStatusInput {
  rawPlan: string | null | undefined;
  trialEndsAt: string | null | undefined;
}

export interface PlanStatus {
  normalizedPlan: string;
  isPaid: boolean;
  isCanceled: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isBlocked: boolean;
  daysRemaining: number;
  trialEndsAtDate: Date | null;
  /** Nome de plano a usar na consulta de plan_permissions. */
  effectivePlanForPermissions: string;
}

export function computePlanStatus({ rawPlan, trialEndsAt }: PlanStatusInput): PlanStatus {
  const normalizedPlan = (rawPlan ?? "sem_plano").trim().toLowerCase();
  const trialEndsAtDate = trialEndsAt ? new Date(trialEndsAt) : null;

  let daysRemaining = 0;
  if (trialEndsAtDate) {
    const diffMs = trialEndsAtDate.getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const isPaid = PAID_PLANS.includes(normalizedPlan);
  const isCanceled = CANCELED_PLANS.includes(normalizedPlan);
  const isTrialActive = normalizedPlan === "trial" && daysRemaining > 0;
  const isTrialExpired = normalizedPlan === "trial" && daysRemaining === 0;
  const isBlocked = isTrialExpired || isCanceled;

  return {
    normalizedPlan,
    isPaid,
    isCanceled,
    isTrialActive,
    isTrialExpired,
    isBlocked,
    daysRemaining,
    trialEndsAtDate,
    effectivePlanForPermissions: isBlocked ? BLOCKED_PLAN_SENTINEL : normalizedPlan,
  };
}
