import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Zap } from "lucide-react";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PLANS as PLAN_PRICING } from "@/config/plans";

export function TrialBanner() {
  const { isTrialActive, daysRemaining, isPaid, isLoading } = useTrialStatus();
  const { handleCheckout } = usePaymentCheckout();

  if (isLoading || isPaid || !isTrialActive) return null;

  const isUrgent = daysRemaining <= 1;

  const message = daysRemaining === 1
    ? "Seu período gratuito termina hoje!"
    : `Você tem ${daysRemaining} dias restantes no período gratuito`;

  return (
    <div className={`w-full px-4 py-2 flex items-center justify-between text-sm font-medium
      ${isUrgent ? "bg-red-600" : "bg-amber-500"} text-white`}>

      <div className="flex items-center gap-2">
        {isUrgent ? <AlertCircle size={15} /> : <Clock size={15} />}
        <span>{message}</span>
      </div>

      <Button
        size="sm"
        className={`text-xs bg-white hover:bg-white/90 font-semibold gap-1.5 shrink-0
          ${isUrgent ? "text-red-600" : "text-amber-600"}`}
        onClick={() => handleCheckout("anual")}
      >
        <Zap size={13} />
        Assinar anual por R$ {PLAN_PRICING.anual.monthlyEquivalent.toFixed(2).replace('.', ',')}/mês
      </Button>

    </div>
  );
}