import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Crown,
  Zap,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const plans = [
  {
    name: 'Starter',
    price: 'Grátis',
    period: '7 dias',
    description: 'Ideal para testar a plataforma',
    icon: Zap,
    gradient: 'from-muted to-muted/50',
    borderColor: 'border-border',
    features: [
      'Dashboard em tempo real',
      'Análise por SKU/Produto',
      'Calculadora de precificação',
      'Suporte a 1 marketplace',
      'Até 100 pedidos',
    ],
    cta: 'Começar Grátis',
    highlighted: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 24,99',
    period: '/mês',
    description: 'Para vendedores que querem crescer',
    icon: Crown,
    gradient: 'from-primary to-primary/80',
    borderColor: 'border-primary/50',
    features: [
      'Dashboard em tempo real',
      'Análise por SKU/Produto',
      'DRE automático',
      'Calculadora de precificação',
      'Fluxo de caixa',
      'Shopee + TikTok Shop',
      'Pedidos ilimitados',
      'Suporte prioritário por chat',
    ],
    cta: 'Assinar Agora',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    description: 'Para grandes operações',
    icon: Star,
    gradient: 'from-secondary to-secondary/80',
    borderColor: 'border-secondary/50',
    features: [
      'Tudo do Profissional',
      'API de integração',
      'Múltiplos usuários',
      'Relatórios personalizados',
      'Consultoria dedicada',
      'SLA garantido',
    ],
    cta: 'Fale Conosco',
    highlighted: false,
  },
];

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = () => {
    if (user) {
      // User already logged in — go to dashboard
      navigate('/dashboard');
    } else {
      // Redirect to auth with return path
      navigate('/auth?redirect=/planos');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Seller Finance</span>
          </div>
          <Button
            variant="ghost"
            className="font-medium"
            onClick={() => navigate('/auth')}
          >
            Entrar
          </Button>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        className="pt-20 pb-8 text-center"
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Escolha o melhor para você
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Planos e Preços
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece com 7 dias grátis e descubra o poder de ter controle financeiro total do seu negócio
          </p>
        </div>
      </motion.section>

      {/* Plans Grid */}
      <motion.section
        className="py-12 pb-24"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.name} variants={fadeInUp}>
                  <Card
                    className={`relative overflow-hidden border-2 ${plan.borderColor} ${
                      plan.highlighted
                        ? 'shadow-2xl shadow-primary/10 scale-[1.03]'
                        : 'shadow-lg'
                    } bg-card`}
                  >
                    {plan.highlighted && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary" />
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 text-xs font-bold rounded-full shadow-lg">
                          Mais Popular
                        </div>
                      </>
                    )}

                    <CardHeader className="text-center pt-10 pb-6">
                      <div
                        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg`}
                      >
                        <Icon
                          className={`h-7 w-7 ${
                            plan.highlighted ? 'text-primary-foreground' : 'text-foreground'
                          }`}
                        />
                      </div>
                      <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                      <div className="pt-4">
                        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                        {plan.period && (
                          <span className="text-muted-foreground text-base ml-1">{plan.period}</span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pb-8">
                      <ul className="space-y-3">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            </div>
                            <span className="text-sm font-medium">{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="lg"
                        className={`w-full font-bold text-base py-6 ${
                          plan.highlighted
                            ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-xl shadow-primary/25'
                            : ''
                        }`}
                        variant={plan.highlighted ? 'default' : 'outline'}
                        onClick={handleSelectPlan}
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom note */}
          <p className="text-center text-sm text-muted-foreground mt-12">
            Todos os planos incluem criptografia de dados e suporte técnico. Cancele a qualquer momento, sem multas.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
