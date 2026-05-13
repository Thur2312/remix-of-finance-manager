import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Crown, Check, ArrowRight, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";


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
  const { isTrialExpired, isLoading } = useTrialStatus();
  const navigate = useNavigate();
  const { handleCheckout } = useStripeCheckout();

  if (isLoading || !isTrialExpired) return null;

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
            Você usou o Seller Finance gratuitamente. Para continuar com acesso
            completo, assine o plano Profissional.
          </p>
        </div>

        {/* Card do plano */}
        <div className="border-2 border-primary rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-orange-500" />
              <span className="font-medium">Profissional</span>
              <Badge className="text-xs px-2 py-0">Mais popular</Badge>
            </div>
            <div className="text-right">
              <span className="text-xl font-semibold">R$ 74,99</span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {PAYWALL_FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                onClick={handleCheckout}
        >
          <CreditCard size={16} className="mr-2" />
          Assinar agora — R$ 74,99/mês
          <ArrowRight size={16} className="ml-2" />
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