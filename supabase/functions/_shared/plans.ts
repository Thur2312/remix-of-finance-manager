// Configuração única de planos pagos — usada pelas edge functions da Asaas.
// Mantenha em sincronia com src/config/plans.ts (frontend).

export type PlanId = "mensal" | "semestral" | "anual";

export interface PlanConfig {
  value: number;
  cycle: "MONTHLY" | "SEMIANNUALLY" | "YEARLY";
  label: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  mensal: { value: 74.99, cycle: "MONTHLY", label: "Mensal" },
  semestral: { value: 347.40, cycle: "SEMIANNUALLY", label: "Semestral" },
  anual: { value: 454.80, cycle: "YEARLY", label: "Anual" },
};

export function resolvePlanId(planId?: string): PlanId {
  return planId && planId in PLANS ? (planId as PlanId) : "mensal";
}

export function planIdByCycle(cycle: string): PlanId | null {
  const entry = (Object.entries(PLANS) as [PlanId, PlanConfig][])
    .find(([, config]) => config.cycle === cycle);
  return entry ? entry[0] : null;
}
