import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Sparkles,
  Menu,
  X,
  Mail,
  Instagram,
  Youtube,
  MessageCircle,
  Heart,
  ExternalLink,
} from 'lucide-react';

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

// Animation variants for sections
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-primary transition-colors group"
      >
        <span className="font-semibold text-lg pr-4">{question}</span>
        <div className={`h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 ${isOpen ? 'rotate-180 bg-primary/20' : ''}`}>
          <ChevronDown className="h-4 w-4 text-primary" />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count: usersCount, ref: usersRef } = useCountUp(1500, 2500);
  const { count: ordersCount, ref: ordersRef } = useCountUp(50000, 2500);
  const { count: savingsCount, ref: savingsRef } = useCountUp(95, 2000);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: BarChart3,
      title: 'Dashboard em Tempo Real',
      description:
        'Visualize lucro, margem e faturamento instantaneamente. Acompanhe a saúde financeira do seu negócio em tempo real.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: ShoppingCart,
      title: 'Multi-Marketplace',
      description:
        'Suporte a Shopee e TikTok em uma única ferramenta. Gerencie todas as suas operações em um só lugar.',
      gradient: 'from-orange-500 to-red-500',
    },
    {
      icon: Package,
      title: 'Análise por SKU/Produto',
      description:
        'Descubra quais produtos dão lucro ou prejuízo. Identifique oportunidades e elimine gargalos na sua operação.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: TrendingUp,
      title: 'DRE Automático',
      description:
        'Demonstração de resultados financeiros gerada automaticamente. Relatórios profissionais sem esforço manual.',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Zap,
      title: 'Precificação Inteligente',
      description:
        'Calculadora de preços que considera todas as taxas e custos. Nunca mais precifique errado.',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Shield,
      title: 'Fluxo de Caixa',
      description:
        'Controle suas entradas e saídas. Planeje seu futuro financeiro com visibilidade completa.',
      gradient: 'from-indigo-500 to-blue-500',
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/95 backdrop-blur-xl shadow-lg border-b border-border/50' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Seller Finance</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Funcionalidades
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              Planos
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors font-medium">
              FAQ
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="font-medium">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 font-medium">
                <Sparkles className="h-4 w-4 mr-2" />
                Teste Grátis
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border shadow-xl">
            <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <a href="#funcionalidades" className="text-foreground hover:text-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Funcionalidades
              </a>
              <a href="#planos" className="text-foreground hover:text-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                Planos
              </a>
              <a href="#faq" className="text-foreground hover:text-primary transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Entrar</Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-primary to-primary/80">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Teste Grátis
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <motion.section 
        className="pt-32 pb-24 relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary/10 via-purple-500/5 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full text-primary text-sm font-semibold border border-primary/20 shadow-sm">
                <Zap className="h-4 w-4" />
                Gestão financeira simplificada
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground">
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">96%</span> dos vendedores não sabem{' '}
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">quanto lucram</span> em tempo real
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Com o Seller Finance, você visualiza seu lucro real venda a venda, identifica produtos
                lucrativos e toma decisões mais inteligentes para seu negócio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground w-full sm:w-auto text-lg px-8 py-7 shadow-xl shadow-primary/25 font-semibold">
                    Começar 7 dias grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-7 font-semibold border-2 hover:bg-muted/50">
                  <Play className="mr-2 h-5 w-5" />
                  Ver demonstração
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-purple-500/10 rounded-3xl blur-3xl" />
              <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-3xl shadow-2xl p-8 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-sm font-medium text-muted-foreground">Dashboard — Seller Finance</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl p-5 border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Faturamento</p>
                    <p className="text-3xl font-bold text-primary">R$ 45.890</p>
                    <p className="text-xs text-success mt-2 font-medium">↑ 12% vs mês anterior</p>
                  </div>
                  <div className="bg-gradient-to-br from-success/15 to-success/5 rounded-2xl p-5 border border-success/10">
                    <p className="text-sm text-muted-foreground mb-1">Lucro Líquido</p>
                    <p className="text-3xl font-bold text-success">R$ 12.450</p>
                    <p className="text-xs text-success mt-2 font-medium">↑ 8% vs mês anterior</p>
                  </div>
                  <div className="bg-gradient-to-br from-warning/15 to-warning/5 rounded-2xl p-5 border border-warning/10">
                    <p className="text-sm text-muted-foreground mb-1">Margem</p>
                    <p className="text-3xl font-bold text-warning">27,1%</p>
                    <p className="text-xs text-muted-foreground mt-2">Meta: 25%</p>
                  </div>
                  <div className="bg-gradient-to-br from-secondary/15 to-secondary/5 rounded-2xl p-5 border border-secondary/10">
                    <p className="text-sm text-muted-foreground mb-1">Pedidos</p>
                    <p className="text-3xl font-bold text-foreground">1.234</p>
                    <p className="text-xs text-success mt-2 font-medium">↑ 156 novos hoje</p>
                  </div>
                </div>

                <div className="h-36 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent rounded-2xl flex items-end justify-center pb-6 border border-primary/10">
                  <div className="flex items-end gap-3 w-full px-6">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all duration-700 hover:from-primary/80 hover:to-primary/40"
                        style={{ 
                          height: `${h}%`,
                          animation: `grow 0.8s ease-out ${i * 0.1}s both`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes grow {
            from { height: 0; opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </motion.section>

      {/* What is Section */}
      <motion.section 
        className="py-24 relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Sobre a plataforma
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              O que é o Seller Finance?
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              O Seller Finance é uma ferramenta completa de gestão financeira para vendedores de marketplace.
              Analise suas vendas em tempo real, descubra seu lucro real por produto e tome decisões
              baseadas em dados. <span className="text-foreground font-medium">Chega de planilhas complicadas e cálculos manuais!</span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="funcionalidades" 
        className="py-24 bg-muted/30"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
              <Zap className="h-4 w-4" />
              Recursos poderosos
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Funcionalidades do Seller Finance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Diga adeus às planilhas de Excel e relatórios difíceis de entender
            </p>
          </div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
              >
                <Card
                  className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden h-full"
                >
                <CardHeader className="pb-4">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className="py-24 bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 relative">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div ref={usersRef} className="space-y-3">
              <p className="text-6xl md:text-7xl font-bold">+{usersCount.toLocaleString()}</p>
              <p className="text-xl opacity-90 font-medium">Vendedores ativos</p>
            </div>
            <div ref={ordersRef} className="space-y-3">
              <p className="text-6xl md:text-7xl font-bold">+{ordersCount.toLocaleString()}</p>
              <p className="text-xl opacity-90 font-medium">Pedidos analisados</p>
            </div>
            <div ref={savingsRef} className="space-y-3">
              <p className="text-6xl md:text-7xl font-bold">{savingsCount}%</p>
              <p className="text-xl opacity-90 font-medium">Menos tempo em planilhas</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Marketplaces Section */}
      <motion.section 
        className="py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Integrações
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Marketplaces Integrados
            </h2>
            <p className="text-lg text-muted-foreground">
              Gerencie todas as suas operações em um só lugar
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-5 px-8 py-6 bg-card rounded-3xl border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 w-16 bg-gradient-to-br from-[#EE4D2D] to-[#D73211] rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
              <div>
                <p className="font-bold text-xl">Shopee</p>
                <p className="text-muted-foreground">Integração completa</p>
              </div>
            </div>

            <div className="flex items-center gap-5 px-8 py-6 bg-card rounded-3xl border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-16 w-16 bg-gradient-to-br from-black to-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">T</span>
              </div>
              <div>
                <p className="font-bold text-xl">TikTok Shop</p>
                <p className="text-muted-foreground">Integração completa</p>
              </div>
            </div>

            <div className="flex items-center gap-5 px-8 py-6 bg-muted/30 rounded-3xl border-2 border-dashed border-border/50 hover:border-primary/30 transition-all duration-300">
              <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground font-bold text-2xl">+</span>
              </div>
              <div>
                <p className="font-bold text-xl text-muted-foreground">Em breve</p>
                <p className="text-muted-foreground">Mais marketplaces</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section 
        id="planos" 
        className="py-24 bg-muted/30"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              Preço justo
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Plano Simples e Acessível
            </h2>
            <p className="text-lg text-muted-foreground">
              Comece com 7 dias grátis, sem compromisso
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="relative overflow-hidden border-2 border-primary/50 shadow-2xl shadow-primary/10 bg-card">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-blue-500 to-primary" />
              <div className="absolute top-4 right-4 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground px-4 py-1.5 text-sm font-bold rounded-full shadow-lg">
                7 dias grátis
              </div>

              <CardHeader className="text-center pt-16 pb-8">
                <CardTitle className="text-2xl mb-6 font-bold">Plano Completo</CardTitle>
                <div className="space-y-2">
                  <p className="text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    R$ 24,99
                  </p>
                  <p className="text-muted-foreground text-lg">/mês após o período de teste</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-8 pb-10">
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
                    <li key={i} className="flex items-center gap-4">
                      <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth" className="block">
                  <Button size="lg" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-primary-foreground text-lg py-7 font-bold shadow-xl shadow-primary/25">
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
      </motion.section>

      {/* FAQ Section */}
      <motion.section 
        id="faq" 
        className="py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-primary" />
              Dúvidas
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas sobre o Seller Finance
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-card rounded-3xl border border-border/50 p-8 shadow-xl">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Final CTA Section */}
      <motion.section 
        className="py-24 bg-gradient-to-br from-primary via-primary/90 to-blue-600 text-primary-foreground relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        variants={fadeInUp}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 text-center space-y-8 relative">
          <h2 className="text-3xl md:text-5xl font-bold max-w-3xl mx-auto leading-tight">
            Pronto para descobrir seu lucro real?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Junte-se a milhares de vendedores que já transformaram sua gestão financeira com o Seller Finance
          </p>
          <Link to="/auth">
            <Button
              size="lg"
              className="text-lg px-10 py-7 bg-white text-primary hover:bg-white/90 font-bold shadow-2xl"
            >
              Começar agora - É grátis!
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-card to-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4">
          {/* Main Footer Content */}
          <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-bold text-2xl text-foreground">Seller Finance</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A ferramenta completa para gestão financeira de vendedores de marketplace. Simplifique seus números e maximize seus lucros.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all hover:scale-105 group"
                >
                  <Instagram className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all hover:scale-105 group"
                >
                  <Youtube className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
                <a 
                  href="https://wa.me/5511999999999" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-all hover:scale-105 group"
                >
                  <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-5">
              <h4 className="font-semibold text-foreground text-lg">Produto</h4>
              <nav className="flex flex-col gap-3">
                <a href="#funcionalidades" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                  <span>Funcionalidades</span>
                </a>
                <a href="#planos" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                  <span>Planos e Preços</span>
                </a>
                <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                  <span>Perguntas Frequentes</span>
                </a>
                <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                  <span>Acessar Plataforma</span>
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </nav>
            </div>

            {/* Resources Column */}
            <div className="space-y-5">
              <h4 className="font-semibold text-foreground text-lg">Recursos</h4>
              <nav className="flex flex-col gap-3">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Central de Ajuda
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Tutoriais em Vídeo
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Blog para Sellers
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  Calculadora Grátis
                </a>
              </nav>
            </div>

            {/* Contact Column */}
            <div className="space-y-5">
              <h4 className="font-semibold text-foreground text-lg">Contato</h4>
              <div className="space-y-4">
                <a 
                  href="mailto:contato@sellerfinance.com.br" 
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm">contato@sellerfinance.com.br</span>
                </a>
                <a 
                  href="https://wa.me/5511999999999" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm">WhatsApp</span>
                </a>
              </div>
              
              {/* Newsletter */}
              <div className="pt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Receba dicas por e-mail</p>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="seu@email.com"
                    className="flex-1 h-10 px-4 rounded-lg bg-muted border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <Button size="sm" className="h-10 px-4 bg-primary hover:bg-primary/90">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Bottom Footer */}
          <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-primary transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-primary transition-colors">Política de Cookies</a>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Feito com</span>
              <Heart className="h-4 w-4 text-destructive fill-destructive animate-pulse" />
              <span>para vendedores brasileiros</span>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Seller Finance. CNPJ: 00.000.000/0001-00
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
