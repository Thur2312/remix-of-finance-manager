// Configuração única de planos pagos — usada pelas edge functions da Asaas.
// Mantenha em sincronia com src/config/plans.ts (frontend).

export type PlanId = "mensal" | "semestral" | "anual";

export interface PlanConfig {
  value: number;
  cycle: "MONTHLY" | "SEMIANNUALLY" | "YEARLY";
  label: string;
  /** Parcelas máximas no cartão. Só se aplica a planos cobrados como INSTALLMENT (não recorrente). */
  maxInstallmentCount?: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  mensal: { value: 74.99, cycle: "MONTHLY", label: "Mensal" },
  semestral: { value: 347.40, cycle: "SEMIANNUALLY", label: "Semestral", maxInstallmentCount: 6 },
  anual: { value: 454.80, cycle: "YEARLY", label: "Anual", maxInstallmentCount: 12 },
};

export function resolvePlanId(planId?: string): PlanId {
  return planId && planId in PLANS ? (planId as PlanId) : "mensal";
}

export function planIdByCycle(cycle: string): PlanId | null {
  const entry = (Object.entries(PLANS) as [PlanId, PlanConfig][])
    .find(([, config]) => config.cycle === cycle);
  return entry ? entry[0] : null;
}

// Data de expiração do plano pago a partir de agora, respeitando o ciclo
// (mensal/semestral/anual). Usado pelo asaas-webhook ao confirmar pagamento —
// sem isso, o UPDATE herdava o expires_at antigo da linha (ex.: os 5 dias do
// trial gravados no cadastro), fazendo planos pagos "vencerem" cedo demais.
export function planExpiresAt(planId: PlanId, from: Date = new Date()): Date {
  const expiresAt = new Date(from);
  switch (PLANS[planId].cycle) {
    case "MONTHLY":
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      break;
    case "SEMIANNUALLY":
      expiresAt.setMonth(expiresAt.getMonth() + 6);
      break;
    case "YEARLY":
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      break;
  }
  return expiresAt;
}
