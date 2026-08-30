import { Link } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { Crown, Sparkles, AlertTriangle } from "lucide-react";

// Substitui o antigo PlanBadge (cápsula minúscula). Agora é uma linha com
// ícone em "chip" + rótulo + subtítulo, no mesmo desenho dos cards do
// rodapé. Nos estados de trial/expirado a linha inteira vira link pra
// /planos (o CTA que a sidebar não tinha).
export function PlanCard() {
  const { isLoading, isPaid, isTrialActive, isTrialExpired, daysRemaining } = useTrialStatus();

  if (isLoading) return null;

  if (isPaid) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 px-2.5 py-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-600">
          <Crown className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-xs font-semibold text-sidebar-foreground">Plano Pro</span>
          <span className="text-[10px] text-sidebar-foreground/50">Assinatura ativa</span>
        </div>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <Link
        to="/planos"
        className="group flex items-center gap-2.5 rounded-lg bg-red-500/10 px-2.5 py-2 transition-colors hover:bg-red-500/15"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-red-500/15 text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-xs font-semibold text-sidebar-foreground">Teste expirado</span>
          <span className="text-[10px] text-red-600/80 group-hover:text-red-600">Assinar para continuar &rarr;</span>
        </div>
      </Link>
    );
  }

  if (isTrialActive) {
    const urgent = daysRemaining <= 1;
    return (
      <Link
        to="/planos"
        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
          urgent ? "bg-red-500/10 hover:bg-red-500/15" : "bg-amber-500/10 hover:bg-amber-500/15"
        }`}
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
            urgent ? "bg-red-500/15 text-red-600" : "bg-amber-500/15 text-amber-600"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-xs font-semibold text-sidebar-foreground">
            {daysRemaining === 1 ? "Último dia de teste" : `Teste · ${daysRemaining} dias`}
          </span>
          <span
            className={`text-[10px] group-hover:underline ${
              urgent ? "text-red-600/80" : "text-sidebar-foreground/50"
            }`}
          >
            Ver planos &rarr;
          </span>
        </div>
      </Link>
    );
  }

  return null;
}
