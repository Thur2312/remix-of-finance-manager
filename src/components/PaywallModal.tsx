import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Check, ArrowRight, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";

// Rotas onde o paywall NUNCA deve aparecer
const PAYWALL_EXCLUDED = ["/setup-payment", "/planos", "/auth", "/login"];

const PAYWALL_FEATURES = [
  "Dashboard avançado",
  "DRE automatizado",
  "Integrações ilimitadas",
  "Fluxo de caixa avançado",
  "Precificação otimizada",
  "Suporte prioritário",
  "Relatórios customizados",
  "Consultoria dedicada",
];

export function PaywallModal() {
  const { isBlocked, isLoading } = useTrialStatus();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { handleCheckout, loadingPlanId } = useStripeCheckout();

  const loadingAnual = loadingPlanId === "anual";

  // Não mostrar nas rotas excluídas
  const isExcluded = PAYWALL_EXCLUDED.some((r) => pathname.startsWith(r));

  if (isLoading || !isBlocked || isExcluded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border shadow-2xl max-w-md w-full p-8">

        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-full">
            <Lock className="text-orange-500" size={28} />
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <Badge variant="destructive" className="mb-3 text-xs">
            Período gratuito encerrado
          </Badge>
          <h2 className="text-xl font-semibold mb-2">
            Continue gerenciando sua loja
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu período de teste terminou. Garanta o plano{" "}
            <span className="font-semibold text-foreground">Anual</span> e
            continue com acesso completo pagando menos por mês.
          </p>
        </div>

        {/* Card do plano anual */}
        <div className="border-2 border-primary rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-orange-500" />
              <span className="font-medium">Anual</span>
              <Badge className="text-xs px-2 py-0">Melhor oferta</Badge>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs text-muted-foreground line-through">
                  R$ 74,99
                </span>
                <span className="text-xl font-semibold">R$ 37,90</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                12x de R$ 37,90 — total R$ 454,80/ano
              </span>
            </div>
          </div>

          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-3 text-xs">
            Economize 49% em relação ao mensal
          </Badge>

          <div className="grid grid-cols-2 gap-1.5">
            {PAYWALL_FEATURES.map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Check size={12} className="text-primary flex-shrink-0" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium mb-2"
          size="lg"
          onClick={() => handleCheckout("anual")}
          disabled={loadingPlanId !== null}
        >
          <CreditCard size={16} className="mr-2" />
          {loadingAnual
            ? "Redirecionando..."
            : "Assinar plano anual — R$ 37,90/mês"}
          {!loadingAnual && <ArrowRight size={16} className="ml-2" />}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-sm text-muted-foreground"
          onClick={() => navigate("/planos")}
        >
          Ver todos os planos
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Cancele a qualquer momento. Sem fidelidade. Dados criptografados.
        </p>
      </div>
    </div>
  );
}
