import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Crown,
  Zap,
  Check,
  X,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '/mês',
    description: 'Ideal para vendedores iniciantes',
    icon: Zap,
    features: [
      'Lucro real por venda',
      'Dashboard básico',
      'Integração com 1 marketplace',
      'Suporte por e-mail',
    ],
    cta: 'Plano Atual',
    popular: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 37,00',
    period: '/mês',
    description: 'Para vendedores em crescimento',
    icon: Crown,
    features: [
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
    ],
    cta: 'Assinar Profissional',
    popular: true,
  },
];

const comparisonFeatures = [
  { feature: 'Lucro real por venda', basico: true, profissional: true },
  { feature: 'Dashboard básico', basico: true, profissional: true },
  { feature: 'Dashboard avançado', basico: false, profissional: true },
  { feature: 'Integração com marketplaces', basico: '1', profissional: 'ilimitada' },
  { feature: 'Análise inteligente por produto', basico: false, profissional: true },
  { feature: 'DRE automatizado', basico: false, profissional: true },
  { feature: 'Precificação otimizada', basico: false, profissional: true },
  { feature: 'Suporte prioritário', basico: false, profissional: true },
  { feature: 'Fluxo de caixa avançado', basico: false, profissional: true },
  { feature: 'Relatórios customizados', basico: false, profissional: true },
  { feature: 'Consultoria dedicada', basico: false, profissional: true },
];

const faqs = [
  { question: 'Posso cancelar a qualquer momento?', answer: 'Sim, você pode cancelar seu plano a qualquer momento sem multas ou taxas adicionais.' },
  { question: 'Como funciona o período de teste?', answer: 'O plano Básico oferece 7 dias grátis para você testar todas as funcionalidades da plataforma.' },
  { question: 'Preciso de cartão de crédito para testar?', answer: 'Não, o plano Básico é completamente grátis e não requer informações de pagamento.' },
  { question: 'Quais marketplaces são suportados?', answer: 'Atualmente suportamos Shopee e TikTok Shop, com mais marketplaces sendo adicionados em breve.' },
];

export function PlanosContent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (plan.name === 'Starter') {
      navigate('/fluxo-caixa');
      return;
    }
    if (user) {
      window.location.href = 'https://payfast.greenn.com.br/m56nu2k';
    } else {
      navigate('/user/auth?redirect=/planos');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Planos e Preços</h1>
        </div>
        <p className="text-muted-foreground">
          Escolha o plano ideal para o seu negócio
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.name} className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-md' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Mais Popular
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
                  {plan.period && <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compare os Planos</CardTitle>
          <CardDescription>Veja detalhadamente as diferenças entre os planos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionalidades</TableHead>
                <TableHead className="text-center">Starter</TableHead>
                <TableHead className="text-center">Profissional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonFeatures.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.feature}</TableCell>
                  <TableCell className="text-center">
                    {typeof item.basico === 'boolean' ? (
                      item.basico
                        ? <Check className="h-4 w-4 text-primary mx-auto" />
                        : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    ) : (
                      <Badge variant="outline">{item.basico}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {typeof item.profissional === 'boolean' ? (
                      item.profissional
                        ? <Check className="h-4 w-4 text-primary mx-auto" />
                        : <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    ) : (
                      <Badge variant="outline">{item.profissional}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Pronto para começar?</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Junte-se a vendedores que já usam o Seller Finance para maximizar seus lucros.
          </p>
          <Button onClick={() => handleSelectPlan(plans[1])}>
            Assinar Profissional
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

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