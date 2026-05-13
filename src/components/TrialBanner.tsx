import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Zap } from "lucide-react";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

const CHECKOUT_URL = "https://payfast.greenn.com.br/m56nu2k";

export function TrialBanner() {
  const { isTrialActive, daysRemaining, isPaid, isLoading } = useTrialStatus();

  const { handleCheckout } = useStripeCheckout();


  if (isLoading || isPaid || !isTrialActive) return null;

  const isUrgent = daysRemaining <= 1;

  const message = daysRemaining === 1
    ? "Seu período gratuito termina hoje!"
    : daysRemaining === 0
    ? "Seu período gratuito encerrou."
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
        className="text-xs bg-white text-amber-700 hover:bg-white/90 font-semibold gap-1.5 shrink-0"
        onClick={handleCheckout}
      >
        <Zap size={13} />
        Assinar por R$ 74,99/mês
      </Button>

    </div>
  );
}