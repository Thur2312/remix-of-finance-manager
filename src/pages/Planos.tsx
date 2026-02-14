import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ArrowLeft,
  Crown,
  Zap,
  Star,
  Check,
  X,
  HelpCircle,
  Users,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
    name: 'Básico',
    price: 'R$ 19,90',
    period: '/mês',
    description: 'Ideal para vendedores iniciantes',
    icon: Zap,
    gradient: 'from-blue-100 to-blue-50',
    borderColor: 'border-blue-200',
    features: [
      'Lucro real por venda',
      'Dashboard básico',
      'Integração com 1 marketplace',
      'Suporte por e-mail',
    ],
    cta: 'Assinar Básico',
    popular: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 39,90',
    period: '/mês',
    description: 'Para vendedores em crescimento',
    icon: Crown,
    gradient: 'from-blue-600 to-blue-500',
    borderColor: 'border-blue-300',
    features: [
      'Lucro real por venda',
      'Dashboard avançado',
      'Integração com 2 marketplaces',
      'Análise inteligente por produto',
      'DRE automatizado',
      'Precificação otimizada',
      'Suporte prioritário',
    ],
    cta: 'Assinar Profissional',
    popular: true,
  },
  {
    name: 'Empresarial',
    price: 'R$ 79,90',
    period: '/mês',
    description: 'Para grandes operações',
    icon: Star,
    gradient: 'from-gray-100 to-gray-50',
    borderColor: 'border-gray-200',
    features: [
      'Análise Inteligente por produto',
      'DRE automatizado',
      'Precificação otimizada',
      'Suporte prioritário',
      'Fluxo de caixa avançado',
      'Integração ilimitada',
      'Relatórios customizados',
      'Consultoria dedicada',
    ],
    cta: 'Assinar Empresarial',
    popular: false,
  },
];

const comparisonFeatures = [
  { feature: 'Lucro real por venda', basico: true, profissional: true, empresarial: true },
  { feature: 'Dashboard básico', basico: true, profissional: false, empresarial: false },
  { feature: 'Dashboard avançado', basico: false, profissional: true, empresarial: true },
  { feature: 'Integração com marketplaces', basico: '1', profissional: '2', empresarial: 'Ilimitada' },
  { feature: 'Análise inteligente por produto', basico: false, profissional: true, empresarial: true },
  { feature: 'DRE automatizado', basico: false, profissional: true, empresarial: true },
  { feature: 'Precificação otimizada', basico: false, profissional: true, empresarial: true },
  { feature: 'Suporte prioritário', basico: false, profissional: true, empresarial: true },
  { feature: 'Fluxo de caixa avançado', basico: false, profissional: false, empresarial: true },
  { feature: 'Relatórios customizados', basico: false, profissional: false, empresarial: true },
  { feature: 'Consultoria dedicada', basico: false, profissional: false, empresarial: true },
];

const faqs = [
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, você pode cancelar seu plano a qualquer momento sem multas ou taxas adicionais.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'O plano Básico oferece 7 dias grátis para você testar todas as funcionalidades da plataforma.',
  },
  {
    question: 'Preciso de cartão de crédito para testar?',
    answer: 'Não, o plano Básico é completamente grátis e não requer informações de pagamento.',
  },
  {
    question: 'Quais marketplaces são suportados?',
    answer: 'Atualmente suportamos Shopee e TikTok Shop, com mais marketplaces sendo adicionados em breve.',
  },
];

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth?redirect=/planos');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-blue-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Seller Finance</span>
          </div>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-sm font-semibold text-blue-700">
            <Sparkles className="h-4 w-4" />
            Escolha o melhor para você
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Planos e Preços
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comece com 7 dias grátis e descubra o poder de ter controle financeiro total do seu negócio
          </p>
        </div>
      </motion.section>

      {/* Plans Grid */}
      <motion.section
        className="py-12"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.name} variants={fadeInUp} className="h-full">
                  <Card
                    className={`relative overflow-hidden border-2 ${plan.borderColor} ${
                      plan.popular
                        ? 'shadow-2xl shadow-blue-500/10 scale-[1.03]'
                        : 'shadow-lg'
                    } bg-white h-full flex flex-col`}
                  >
                    {plan.popular && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600" />
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg">
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
                            plan.popular ? 'text-white' : 'text-gray-900'
                          }`}
                        />
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                      <div className="pt-4">
                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                        {plan.period && (
                          <span className="text-gray-600 text-base ml-1">{plan.period}</span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pb-8 flex flex-col flex-1">
                      <ul className="space-y-3">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="lg"
                        className={`w-full font-bold text-base py-6 mt-auto ${
                          plan.popular
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-xl shadow-blue-500/25'
                            : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                        variant={plan.popular ? 'default' : 'outline'}
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
        </div>
      </motion.section>

      {/* Comparison Table */}
      <motion.section
        className="py-12 bg-blue-50"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={fadeInUp} className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare os Planos</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Veja detalhadamente as diferenças entre os planos e escolha o que melhor se adapta ao seu negócio.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Card className="border border-blue-200 bg-white shadow-lg">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="font-semibold text-gray-900">Funcionalidades</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Básico</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Profissional</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Empresarial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonFeatures.map((item, index) => (
                      <TableRow key={index} className="hover:bg-blue-25">
                        <TableCell className="font-medium text-gray-900">{item.feature}</TableCell>
                        <TableCell className="text-center">
                          {typeof item.basico === 'boolean' ? (
                            item.basico ? <Check className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
                          ) : (
                            <Badge variant="outline" className="border-blue-200 text-blue-700">{item.basico}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {typeof item.profissional === 'boolean' ? (
                            item.profissional ? <Check className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
                          ) : (
                            <Badge variant="outline" className="border-blue-200 text-blue-700">{item.profissional}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {typeof item.empresarial === 'boolean' ? (
                            item.empresarial ? <Check className="h-5 w-5 text-green-600 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />
                          ) : (
                            <Badge variant="outline" className="border-blue-200 text-blue-700">{item.empresarial}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-12"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Por que escolher Seller Finance?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas para maximizar seus lucros e controlar seu negócio de vendas online.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div variants={fadeInUp}>
              <Card className="border border-blue-200 bg-white shadow-lg text-center">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-gray-900">Aumente seus Lucros</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Análises precisas ajudam você a identificar produtos mais rentáveis e otimizar precificação.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="border border-blue-200 bg-white shadow-lg text-center">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-gray-900">Controle Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Tenha visibilidade completa do seu fluxo de caixa e custos fixos em tempo real.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={fadeInUp}>
              <Card className="border border-blue-200 bg-white shadow-lg text-center">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-gray-900">Suporte Especializado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Equipe dedicada para ajudar você a crescer seu negócio com estratégias personalizadas.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section
        className="py-12 bg-blue-50"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Tire suas dúvidas sobre nossos planos e funcionalidades.
            </p>
          </motion.div>
          <motion.div variants={fadeInUp} className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-blue-200 bg-white rounded-lg px-6">
                  <AccordionTrigger className="text-left text-gray-900 hover:text-blue-700">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      {faq.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </motion.section>

      {/* Bottom CTA */}
      <motion.section
        className="py-12"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div variants={fadeInUp}>
            <Card className="border border-blue-200 bg-gradient-to-r from-blue-50 to-white shadow-lg max-w-4xl mx-auto">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto para começar?</h2>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Junte-se a milhares de vendedores que já estão usando Seller Finance para maximizar seus lucros.
                </p>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-xl shadow-blue-500/25"
                  onClick={handleSelectPlan}
                >
                  Começar Grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Bottom note */}
      <p className="text-center text-sm text-gray-600 pb-8">
        Todos os planos incluem criptografia de dados e suporte técnico. Cancele a qualquer momento, sem multas.
      </p>
    </div>
  );
}