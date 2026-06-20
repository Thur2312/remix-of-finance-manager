import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Crown,
  Zap,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
  Loader2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserPlan = 'free' | 'trial' | 'mensal' | 'semestral' | 'anual' | 'cancelado' | string;
type PaidPlanId = 'mensal' | 'semestral' | 'anual';

interface ProfileData {
  plan: UserPlan;
  trial_ends_at: string | null;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const sharedFeatures = [
  'Lucro real por venda',
  'Dashboard avançado',
  'Integrações ilimitadas',
  'Análise inteligente por produto',
  'DRE automatizado',
  'Precificação otimizada',
  'Suporte prioritário',
  'Fluxo de caixa avançado',
  'Relatórios customizados',
  'Consultoria dedicada',
];

const plans = [
  {
    id: 'free' as const,
    name: 'Starter',
    price: 'Free',
    priceSuffix: '/mês',
    billingNote: null as string | null,
    description: 'Ideal para vendedores iniciantes',
    icon: Zap,
    features: [
      'Lucro real por venda',
      'Dashboard básico',
      'Suporte por e-mail',
    ],
    popular: false,
  },
  {
    id: 'mensal' as const,
    name: 'Mensal',
    price: 'R$ 74,99',
    priceSuffix: '/mês',
    billingNote: null as string | null,
    description: 'Flexibilidade sem compromisso',
    icon: Zap,
    features: sharedFeatures,
    popular: false,
  },
  {
    id: 'semestral' as const,
    name: 'Semestral',
    price: 'R$ 57,90',
    priceSuffix: '/mês',
    billingNote: '6x de R$ 57,90 — total R$ 347,40',
    description: 'Economize pagando por 6 meses',
    icon: Sparkles,
    features: sharedFeatures,
    popular: false,
  },
  {
    id: 'anual' as const,
    name: 'Anual',
    price: 'R$ 37,90',
    priceSuffix: '/mês',
    billingNote: '12x de R$ 37,90 — total R$ 454,80',
    description: 'O melhor custo-benefício',
    icon: Crown,
    features: sharedFeatures,
    popular: true,
  },
];

const faqs = [
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, você pode cancelar sua assinatura a qualquer momento pelo próprio app, sem multas ou taxas adicionais. Se cancelar durante o período de trial, não será cobrado.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'Ao assinar qualquer plano você tem 5 dias grátis. O cartão é solicitado no cadastro, mas a cobrança só acontece após o período de teste — e somente se você não cancelar.',
  },
  {
    question: 'Preciso de cartão de crédito para testar?',
    answer: 'Sim, pedimos o cartão no início para garantir a continuidade caso você queira manter o plano. Mas não cobramos nada nos primeiros 5 dias.',
  },
  {
    question: 'Qual a diferença entre os planos Mensal, Semestral e Anual?',
    answer: 'Todos liberam exatamente os mesmos recursos. A diferença é só o ciclo de cobrança: Mensal é cobrado todo mês (R$ 74,99), Semestral a cada 6 meses (R$ 347,40, equivalente a R$ 57,90/mês) e Anual a cada 12 meses (R$ 454,80, equivalente a R$ 37,90/mês).',
  },
  {
    question: 'Quais marketplaces são suportados?',
    answer: 'Atualmente suportamos Shopee e TikTok Shop, com mais marketplaces sendo adicionados em breve.',
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanosContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canceledFromCheckout = searchParams.get('canceled') === 'true';

  const { user } = useAuth();

const { handleCheckout, handleCancel: cancelSubscription, loadingCancel, loadingPlanId } = useStripeCheckout();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('plan, trial_ends_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as unknown as ProfileData);
        setLoadingProfile(false);
      });
  }, [user]);

  const userPlan: UserPlan = profile?.plan ?? 'free';
  const isPaid = userPlan === 'mensal' || userPlan === 'semestral' || userPlan === 'anual';
  const isTrial = userPlan === 'trial';
  const isActive = isPaid || isTrial;
  const daysLeft = trialDaysLeft(profile?.trial_ends_at ?? null);

  const currentPriceLabel =
    userPlan === 'anual' ? 'R$ 37,90/mês (cobrança anual)' :
    userPlan === 'semestral' ? 'R$ 57,90/mês (cobrança semestral)' :
    userPlan === 'mensal' ? 'R$ 74,99/mês' :
    null;

  const currentPlanName =
    userPlan === 'anual' ? 'Anual' :
    userPlan === 'semestral' ? 'Semestral' :
    'Mensal';

  const handleSelectPlan = (planId: PaidPlanId) => {
    if (isActive) return;
    if (user) {
      handleCheckout(planId);
    } else {
      navigate('/user/auth?redirect=/planos');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Tem certeza que quer cancelar sua assinatura? Você perderá o acesso aos recursos avançados.')) return;
    const result = await cancelSubscription();
    if (result.success) {
      setCancelSuccess(true);
      if (user) {
        const { data } = await supabase.from('profiles').select('plan, trial_ends_at').eq('id', user.id).single();
        if (data) setProfile(data as unknown as ProfileData);
      }
    }
  };

  const renderPaidCta = (planId: PaidPlanId, label: string) => {
    if (loadingProfile) {
      return (
        <Button className="w-full mt-4" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando...
        </Button>
      );
    }

    if (cancelSuccess) {
      return (
        <Button className="w-full mt-4" variant="outline" disabled>
          <XCircle className="mr-2 h-4 w-4" />
          Assinatura cancelada
        </Button>
      );
    }

    if (userPlan === planId) {
      return (
        <Button
          className="w-full mt-4"
          variant="destructive"
          onClick={handleCancel}
          disabled={loadingCancel}
        >
          {loadingCancel ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...</>
          ) : (
            <><XCircle className="mr-2 h-4 w-4" /> Cancelar assinatura</>
          )}
        </Button>
      );
    }

    if (isActive) {
      return (
        <Button className="w-full mt-4" variant="outline" disabled>
          Plano indisponível
        </Button>
      );
    }
      return (
      <Button
        className="w-full mt-4"
        variant={planId === 'anual' ? 'default' : 'outline'}
        onClick={() => handleSelectPlan(planId)}
        disabled={loadingPlanId !== null} // desabilita todos enquanto um está carregando
      >
        {loadingPlanId === planId ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
        ) : (
          <>{label} <ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Planos e Preços</h1>
        </div>
        <p className="text-muted-foreground">Escolha o plano ideal para o seu negócio</p>
      </div>

      {/* Aviso de checkout cancelado */}
      {canceledFromCheckout && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Assinatura não concluída. Você pode tentar novamente quando quiser.</span>
        </div>
      )}

      {/* Active plan banner */}
      {!loadingProfile && isActive && (
        <Card className={`border-primary/40 bg-primary/5 ${isTrial ? 'border-amber-400/40 bg-amber-50/30 dark:bg-amber-950/20' : ''}`}>
          <CardContent className="py-4 flex items-center gap-3">
            {isTrial ? (
              <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            ) : (
              <Crown className="h-5 w-5 text-primary flex-shrink-0" />
            )}
            <div>
              {isTrial ? (
                <>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Você está no período de trial
                    {daysLeft !== null && ` — ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Após o trial, a cobrança será feita automaticamente conforme o plano escolhido. Cancele a qualquer momento.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-primary">
                    Você está no plano {currentPlanName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acesso completo a todas as funcionalidades.
                    {currentPriceLabel && ` ${currentPriceLabel}.`}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = plan.id === userPlan;

          return (
            <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-md' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Mais Popular
                  </Badge>
                </div>
              )}

              {!loadingProfile && isCurrentPlan && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    {isTrial && plan.id !== 'free' ? 'Em trial' : 'Seu plano atual'}
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${plan.popular ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm mb-1">{plan.priceSuffix}</span>
                </div>
                {plan.billingNote && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.billingNote}</p>
                )}
                {plan.id !== 'free' && !isActive && (
                  <p className="text-xs text-muted-foreground mt-1">
                    🎉 5 dias grátis — cancele antes de ser cobrado
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.id === 'free' ? (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={() => navigate('/fluxo-caixa')}
                    disabled={userPlan === 'free' && !isActive}
                  >
                    {userPlan === 'free' ? 'Plano Atual' : 'Ver Starter'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  renderPaidCta(plan.id as PaidPlanId, `Assinar ${plan.name}`)
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Why choose */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Por que escolher o Seller Finance?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, title: 'Aumente seus Lucros', desc: 'Análises precisas ajudam você a identificar produtos mais rentáveis e otimizar precificação.' },
            { icon: Shield, title: 'Controle Total', desc: 'Tenha visibilidade completa do seu fluxo de caixa e custos fixos em tempo real.' },
            { icon: Users, title: 'Suporte Especializado', desc: 'Equipe dedicada para ajudar você a crescer seu negócio com estratégias personalizadas.' },
          ].map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-sm">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      {!isActive && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Pronto para começar?</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Junte-se a vendedores que já usam o Seller Finance para maximizar seus lucros.
            </p>
            <Button onClick={() => handleSelectPlan('anual')} disabled={loadingPlanId !== null}>
            {loadingPlanId === 'anual' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
            ) : (
              <>Começar 5 dias grátis <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground pb-4">
        Todos os planos incluem criptografia de dados e suporte técnico. Cancele a qualquer momento, sem multas.
      </p>
    </div>
  );
}

export default function Planos() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <PlanosContent />
      </AppLayout>
    </ProtectedRoute>
  );
}