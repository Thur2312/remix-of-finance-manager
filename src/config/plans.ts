// Configuração única de planos pagos — usada pelas telas de checkout/planos.
// Mantenha em sincronia com supabase/functions/_shared/plans.ts (edge functions).

export type PlanId = "mensal" | "semestral" | "anual";

export interface PlanConfig {
  /** Valor cobrado a cada ciclo, em reais. */
  value: number;
  /** Preço equivalente por mês, para exibição. */
  monthlyEquivalent: number;
  label: string;
  billingNote: string | null;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  mensal: {
    value: 74.99,
    monthlyEquivalent: 74.99,
    label: "Mensal",
    billingNote: null,
  },
  semestral: {
    value: 347.40,
    monthlyEquivalent: 57.90,
    label: "Semestral",
    billingNote: "6x de R$ 57,90 — total R$ 347,40",
  },
  anual: {
    value: 454.80,
    monthlyEquivalent: 37.90,
    label: "Anual",
    billingNote: "12x de R$ 37,90 — total R$ 454,80",
  },
};
