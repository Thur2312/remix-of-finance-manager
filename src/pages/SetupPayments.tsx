import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { usePaymentCheckout } from '@/hooks/usePaymentCheckout';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useEffect } from 'react';
import { PLANS as PLAN_PRICING } from '@/config/plans';

const beneficios = [
  'Acesso completo a todos os recursos',
  'Dashboard avançado e análise por produto',
  'DRE automatizado e fluxo de caixa',
  'Precificação otimizada com IA',
  'Suporte prioritário',
];

function SetupPaymentContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const { handleCheckout, loadingPlanId } = usePaymentCheckout();
  const loadingCheckout = loadingPlanId !== null;
  const { plan, isLoading } = useTrialStatus();

  // Se o usuário já tem plano ativo, redirecionar para o dashboard
  useEffect(() => {
    if (!isLoading && (plan === 'trial' || plan === 'profissional')) {
      navigate('/dashboard', { replace: true });
    }
  }, [plan, isLoading, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 animate-fade-in">

        {/* Aviso de cancelamento */}
        {canceled && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Você cancelou a assinatura. Conclua para liberar seu acesso.
            </span>
          </div>
        )}

        {/* Card principal */}
        <Card className="border-primary/20 shadow-md">
          <CardContent className="pt-8 pb-6 px-6 space-y-6">

            {/* Ícone + título */}
            <div className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Crown className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Assine o plano Profissional</h1>
              <p className="text-sm text-muted-foreground">
                Continue com acesso completo ao Seller Finance.
              </p>
            </div>

            {/* Benefícios */}
            <ul className="space-y-2">
              {beneficios.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {/* Preço */}
            <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Plano anual</p>
                <p className="font-semibold text-sm">R$ {PLAN_PRICING.anual.monthlyEquivalent.toFixed(2).replace('.', ',')} / mês</p>
                <p className="text-[11px] text-muted-foreground">
                  {PLAN_PRICING.anual.billingNote}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Cancele quando quiser
              </Badge>
            </div>

            {/* Botão principal — único CTA, sem opção de pular */}
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleCheckout("anual")}
              disabled={loadingCheckout}
            >
              {loadingCheckout ? (
                'Redirecionando...'
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Assinar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>
                Pagamento seguro via Asaas. Seus dados são criptografados.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Nota de transparência — sem botão de escape */}
        <p className="text-center text-xs text-muted-foreground px-4">
          Cancele a qualquer momento antes do próximo vencimento.
        </p>
      </div>
    </div>
  );
}

export default function SetupPayment() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <SetupPaymentContent />
      </AppLayout>
    </ProtectedRoute>
  );
}