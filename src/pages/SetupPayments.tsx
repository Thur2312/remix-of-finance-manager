import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useAuth } from '@/contexts/AuthContext';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const beneficios = [
  'Acesso completo a todos os recursos por 5 dias',
  'Dashboard avançado e análise por produto',
  'DRE automatizado e fluxo de caixa',
  'Precificação otimizada com IA',
  'Suporte prioritário',
];

function SetupPaymentContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  const { user } = useAuth();
  const { handleCheckout, loadingCheckout } = useStripeCheckout();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 animate-fade-in">

        {/* Aviso de cancelamento */}
        {canceled && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Você cancelou o cadastro do cartão. Conclua para liberar seu acesso.</span>
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
              <h1 className="text-xl font-bold">Comece seu período grátis</h1>
              <p className="text-sm text-muted-foreground">
                Experimente o plano Profissional por <span className="font-semibold text-foreground">5 dias grátis</span>.
                Cancele antes e não será cobrado nada.
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
                <p className="text-xs text-muted-foreground">Após os 5 dias</p>
                <p className="font-semibold text-sm">R$ 74,99 / mês</p>
              </div>
              <Badge variant="secondary" className="text-xs">Cancele quando quiser</Badge>
            </div>

            {/* Botão */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={loadingCheckout}
            >
              {loadingCheckout ? (
                "Redirecionando..."
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Cadastrar cartão e começar grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Pagamento seguro via Stripe. Seus dados são criptografados.</span>
            </div>
          </CardContent>
        </Card>

        {/* Link para pular */}
        <p className="text-center text-xs text-muted-foreground">
          Quer explorar o plano gratuito antes?{' '}
          <button
            onClick={() => navigate('/dashboard')}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Continuar sem assinar
          </button>
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