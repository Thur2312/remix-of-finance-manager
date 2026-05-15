import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

export function PlanBadge() {
  const { isLoading, isPaid, isTrialActive, isTrialExpired, daysRemaining } = useTrialStatus();

  if (isLoading) return null;

  if (isPaid) {
    return (
      <Badge className="w-fit text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 font-medium">
        <Crown size={9} />
        Pro
      </Badge>
    );
  }

  if (isTrialExpired) {
    return (
      <Badge className="w-fit text-[10px] px-1.5 py-0 bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20 font-medium">
        Expirado
      </Badge>
    );
  }

  if (isTrialActive) {
    const isUrgent = daysRemaining <= 1;
    return (
      <Badge className={`w-fit text-[10px] px-1.5 py-0 font-medium
        ${isUrgent
          ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
        }`}>
        {daysRemaining === 1 ? "Trial · último dia" : `Trial · ${daysRemaining} dias`}
      </Badge>
    );
  }

  return null;
}