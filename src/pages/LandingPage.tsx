import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Zap,
  Shield,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Play,
} from 'lucide-react';
import logo from '@/assets/logo.png';

// Animated counter hook
function useCountUp(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return { count, ref };
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-primary transition-colors"
      >
        <span className="font-medium text-lg">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-muted-foreground">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { count: usersCount, ref: usersRef } = useCountUp(1500, 2500);
  const { count: ordersCount, ref: ordersRef } = useCountUp(50000, 2500);
  const { count: savingsCount, ref: savingsRef } = useCountUp(95, 2000);

  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard em Tempo Real',
      description:
        'Visualize lucro, margem e faturamento instantaneamente. Acompanhe a saúde financeira do seu negócio em tempo real.',
    },
    {
      icon: ShoppingCart,
      title: 'Multi-Marketplace',
      description:
        'Suporte a Shopee e TikTok em uma única ferramenta. Gerencie todas as suas operações em um só lugar.',
    },
    {
      icon: Package,
      title: 'Análise por SKU/Produto',
      description:
        'Descubra quais produtos dão lucro ou prejuízo. Identifique oportunidades e elimine gargalos na sua operação.',
    },
    {
      icon: TrendingUp,
      title: 'DRE Automático',
      description:
        'Demonstração de resultados financeiros gerada automaticamente. Relatórios profissionais sem esforço manual.',
    },
    {
      icon: Zap,
      title: 'Precificação Inteligente',
      description:
        'Calculadora de preços que considera todas as taxas e custos. Nunca mais precifique errado.',
    },
    {
      icon: Shield,
      title: 'Fluxo de Caixa',
      description:
        'Controle suas entradas e saídas. Planeje seu futuro financeiro com visibilidade completa.',
    },
  ];

  const faqs = [
    {
      question: 'Como funciona o período de teste grátis?',
      answer:
        'Você tem 7 dias para testar todas as funcionalidades do Seller Finance sem nenhum custo. Após esse período, você pode optar por assinar o plano mensal de R$ 24,99.',
    },
    {
      question: 'Quais marketplaces são suportados?',
      answer:
        'Atualmente suportamos Shopee e TikTok Shop. Estamos trabalhando para adicionar mais marketplaces em breve, como Mercado Livre e Amazon.',
    },
    {
      question: 'Preciso instalar algum software?',
      answer:
        'Não! O Seller Finance é 100% online. Você acessa pelo navegador do computador ou celular, sem necessidade de instalação.',
    },
    {
      question: 'Meus dados estão seguros?',
      answer:
        'Sim! Utilizamos criptografia de ponta e servidores seguros para garantir que seus dados financeiros estejam sempre protegidos.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer:
        'Claro! Não há fidelidade ou multa. Você pode cancelar sua assinatura a qualquer momento diretamente na plataforma.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Seller Finance" className="h-8 w-8" />
            <span className="font-bold text-xl text-foreground">Seller Finance</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-muted-foreground hover:text-primary transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-primary transition-colors">
              Planos
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="finance-gradient text-white">
                Teste Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                Gestão financeira simplificada
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                <span className="text-primary">96%</span> dos vendedores não sabem{' '}
                <span className="text-primary">quanto lucram</span> em tempo real
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg">
                Com o Seller Finance, você visualiza seu lucro real venda a venda, identifica produtos
                lucrativos e toma decisões mais inteligentes para seu negócio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="finance-gradient text-white w-full sm:w-auto text-lg px-8 py-6">
                    Começar 7 dias grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  <Play className="mr-2 h-5 w-5" />
                  Ver demonstração
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                ✓ Sem cartão de crédito &nbsp;&nbsp; ✓ Cancele quando quiser
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
              <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="ml-2 text-sm text-muted-foreground">Dashboard</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-2xl font-bold text-primary">R$ 45.890</p>
                  </div>
                  <div className="bg-success/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className="text-2xl font-bold text-success">R$ 12.450</p>
                  </div>
                  <div className="bg-warning/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Margem</p>
                    <p className="text-2xl font-bold text-warning">27,1%</p>
                  </div>
                  <div className="bg-secondary/10 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="text-2xl font-bold text-secondary-foreground">1.234</p>
                  </div>
                </div>

                <div className="h-32 bg-gradient-to-t from-primary/20 to-transparent rounded-xl flex items-end justify-center pb-4">
                  <div className="flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div
                        key={i}
                        className="w-8 bg-primary rounded-t-md transition-all duration-500"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              O que é o Seller Finance?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              O Seller Finance é uma ferramenta completa de gestão financeira para vendedores de marketplace.
              Analise suas vendas em tempo real, descubra seu lucro real por produto e tome decisões
              baseadas em dados. Chega de planilhas complicadas e cálculos manuais!
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Funcionalidades do Seller Finance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diga adeus às planilhas de Excel e relatórios difíceis de entender
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div ref={usersRef} className="space-y-2">
              <p className="text-5xl md:text-6xl font-bold">+{usersCount.toLocaleString()}</p>
              <p className="text-xl opacity-90">Vendedores ativos</p>
            </div>
            <div ref={ordersRef} className="space-y-2">
              <p className="text-5xl md:text-6xl font-bold">+{ordersCount.toLocaleString()}</p>
              <p className="text-xl opacity-90">Pedidos analisados</p>
            </div>
            <div ref={savingsRef} className="space-y-2">
              <p className="text-5xl md:text-6xl font-bold">{savingsCount}%</p>
              <p className="text-xl opacity-90">Menos tempo em planilhas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplaces Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Marketplaces Integrados
            </h2>
            <p className="text-lg text-muted-foreground">
              Gerencie todas as suas operações em um só lugar
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12">
            <div className="flex items-center gap-4 px-8 py-6 bg-card rounded-2xl border border-border shadow-lg">
              <div className="h-16 w-16 bg-[#EE4D2D] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
              <div>
                <p className="font-bold text-xl">Shopee</p>
                <p className="text-muted-foreground">Integração completa</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-8 py-6 bg-card rounded-2xl border border-border shadow-lg">
              <div className="h-16 w-16 bg-black rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <div>
                <p className="font-bold text-xl">TikTok Shop</p>
                <p className="text-muted-foreground">Integração completa</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-8 py-6 bg-muted/50 rounded-2xl border border-dashed border-border">
              <div className="h-16 w-16 bg-muted rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground font-bold text-2xl">+</span>
              </div>
              <div>
                <p className="font-bold text-xl text-muted-foreground">Em breve</p>
                <p className="text-muted-foreground">Mais marketplaces</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Plano Simples e Acessível
            </h2>
            <p className="text-lg text-muted-foreground">
              Comece com 7 dias grátis, sem compromisso
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="relative overflow-hidden border-2 border-primary shadow-2xl">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-xl">
                7 dias grátis
              </div>

              <CardHeader className="text-center pt-12 pb-8">
                <CardTitle className="text-2xl mb-4">Plano Completo</CardTitle>
                <div className="space-y-1">
                  <p className="text-5xl font-bold text-primary">
                    R$ 24,99
                    <span className="text-lg font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-muted-foreground">após o período de teste</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pb-8">
                <ul className="space-y-4">
                  {[
                    'Dashboard em tempo real',
                    'Análise por SKU/Produto',
                    'DRE automático',
                    'Calculadora de precificação',
                    'Fluxo de caixa',
                    'Shopee + TikTok Shop',
                    'Pedidos ilimitados',
                    'Suporte por chat',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth" className="block">
                  <Button size="lg" className="w-full finance-gradient text-white text-lg py-6">
                    Começar 7 dias grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>

                <p className="text-center text-sm text-muted-foreground">
                  Cancele a qualquer momento. Sem multas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas sobre o Seller Finance
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-6">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto para descobrir seu lucro real?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Junte-se a milhares de vendedores que já transformaram sua gestão financeira com o Seller Finance
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
            >
              Começar agora - É grátis!
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Seller Finance" className="h-8 w-8" />
              <span className="font-bold text-xl">Seller Finance</span>
            </div>

            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-primary transition-colors">
                Funcionalidades
              </a>
              <a href="#planos" className="hover:text-primary transition-colors">
                Planos
              </a>
              <a href="#faq" className="hover:text-primary transition-colors">
                FAQ
              </a>
            </nav>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Seller Finance. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
