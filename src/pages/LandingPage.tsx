import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  Atom,
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
  Users,
  PackageCheck,
  Clock,
  Star,
  DollarSign,
  Target,
  Award,
} from 'lucide-react';

// Animated counter hook (mantido)
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

// Animation variants (mantidos)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const bounceIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, type: 'spring' as const, stiffness: 100 } }
};

// FAQ Item Component (mantido)
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-blue-200 last:border-0 bg-white/50 rounded-lg p-4 mb-2 shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left hover:text-blue-600 transition-colors group"
      >
        <span className="font-semibold text-lg">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors"
        >
          <ChevronDown className="h-4 w-4 text-blue-600" />
        </motion.div>
      </button>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden"
      >
        <p className="text-gray-600 leading-relaxed mt-4">{answer}</p>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count: usersCount, ref: usersRef } = useCountUp(2500, 2500);
  const { count: ordersCount, ref: ordersRef } = useCountUp(75000, 2500);
  const { count: savingsCount, ref: savingsRef } = useCountUp(98, 2000);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: DollarSign,
      title: 'Lucro Real em Tempo Real',
      description: 'Descubra exatamente quanto você ganha por venda, sem surpresas. Visualize margens e faturamento instantaneamente.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Target,
      title: 'Análise Inteligente por Produto',
      description: 'Identifique produtos campeões de venda e otimize seu catálogo. Dados precisos para decisões estratégicas.',
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: BarChart3,
      title: 'DRE Automatizado',
      description: 'Relatórios financeiros profissionais gerados automaticamente. Demonstre resultados para investidores e bancos.',
      gradient: 'from-indigo-500 to-blue-500',
    },
    {
      icon: TrendingUp,
      title: 'Precificação Otimizada',
      description: 'Calculadora inteligente que considera taxas e custos. Maximize lucros sem perder vendas.',
      gradient: 'from-blue-600 to-indigo-600',
    },
    {
      icon: Shield,
      title: 'Fluxo de Caixa Seguro',
      description: 'Controle entradas e saídas com previsões precisas. Evite surpresas e planeje seu crescimento.',
      gradient: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Award,
      title: 'Integração Completa',
      description: 'Conecte Shopee, TikTok e mais marketplaces. Centralize tudo em uma plataforma intuitiva.',
      gradient: 'from-blue-400 to-cyan-500',
    },
  ];

  const testimonials = [
    {
      name: 'Carlos Mendes',
      role: 'Vendedor Shopee - São Paulo',
      text: 'O Finance Manager mudou minha vida! Agora vejo meu lucro real e cresci 40% em 6 meses.',
      rating: 5,
    },
    {
      name: 'Ana Paula Santos',
      role: 'Empreendedora TikTok - Rio de Janeiro',
      text: 'Fácil de usar e super preciso. Me ajudou a identificar produtos ruins e focar no que vende.',
      rating: 5,
    },
    {
      name: 'Roberto Lima',
      role: 'Lojista Online - Belo Horizonte',
      text: 'Relatórios automáticos salvaram meu tempo. Recomendo para qualquer vendedor sério.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'Como funciona o teste grátis?',
      answer: 'Teste completo por 7 dias sem cartão. Acesse todas as funcionalidades e veja seus dados reais.',
    },
    {
      question: 'Quais marketplaces são suportados?',
      answer: 'Shopee e TikTok Shop hoje. Mercado Livre e Amazon em breve, com notificações automáticas.',
    },
    {
      question: 'Preciso de conhecimento técnico?',
      answer: 'Não! Interface intuitiva para vendedores. Suporte 24/7 se precisar de ajuda.',
    },
    {
      question: 'Meus dados estão seguros?',
      answer: 'Criptografia bancária e servidores brasileiros. Seus dados financeiros são 100% protegidos.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Sim, sem multas. Cancele online em segundos se não estiver satisfeito.',
    },
  ];

  const benefits = [
    'Lucro real por venda',
    'Relatórios automáticos',
    'Integração com marketplaces',
    'Suporte brasileiro 24/7',
    'Cancele quando quiser',
  ];

  const plans = [
    {
      name: 'Básico',
      price: 'R$ 19,90',
      period: '/mês',
      description: 'Ideal para vendedores iniciantes',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 text-gray-900 overflow-x-hidden relative">
      {/* Elementos Laterais para Preencher */}
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-blue-200/30 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-blue-200/30 to-transparent pointer-events-none" />

      {/* Header - Fixo, sem mudanças */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-blue-50/90 backdrop-blur-lg shadow-lg border-b border-blue-200' : 'bg-transparent'}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-300"
              whileHover={{ scale: 1.1 }}
            >
              <Atom className="h-5 w-5 text-white" />
            </motion.div>
            <span className="font-bold text-xl text-gray-900">Finance Manager</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#sobre" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Sobre</a>
            <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Funcionalidades</a>
            <a href="#planos" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Planos</a>
            <a href="#faq" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-300">
                Assinar
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 hover:bg-blue-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div 
            className="md:hidden bg-blue-50/90 backdrop-blur-lg border-b border-blue-200 shadow-xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <nav className="container mx-auto px-6 py-6 flex flex-col gap-4">
              <a href="#sobre" className="text-gray-900 hover:text-blue-600 transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Sobre</a>
              <a href="#features" className="text-gray-900 hover:text-blue-600 transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Funcionalidades</a>
              <a href="#planos" className="text-gray-900 hover:text-blue-600 transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Planos</a>
              <a href="#faq" className="text-gray-900 hover:text-blue-600 transition-colors font-medium py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <div className="flex flex-col gap-3 pt-4 border-t border-blue-200">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-blue-300">Entrar</Button>
                </Link>
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500">Teste Grátis</Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </motion.header>

          {/* Hero Section - Dashboard Organizado */}
      <motion.section 
        className="pt-24 pb-16 relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-blue-700 text-sm font-semibold shadow-sm border border-blue-200"
                variants={fadeInUp}
              >
                <Zap className="h-4 w-4" />
                Descubra seu lucro real hoje
              </motion.div>
              
              <motion.h1 
                className="text-5xl lg:text-7xl font-bold leading-tight text-gray-900"
                variants={fadeInUp}
              >
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">92%</span> dos vendedores não sabem quanto lucram verdadeiramente
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-600 max-w-lg leading-relaxed"
                variants={fadeInUp}
              >
                Pare de usar planilhas manuais. Com o Finance Manager, veja seu lucro por venda em tempo real, otimize produtos e cresça seu negócio no e-commerce brasileiro.
              </motion.p>
              
              <motion.ul 
                className="space-y-4"
                variants={stagger}
              >
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-gray-900 font-medium">Lucro real por venda instantâneo</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-gray-900 font-medium">Relatórios automáticos e precisos</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-gray-900 font-medium">Integração com Shopee e TikTok</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <span className="text-gray-900 font-medium">Suporte brasileiro 24/7</span>
                </li>
              </motion.ul>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                variants={stagger}
              >
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-10 py-6 shadow-xl shadow-blue-300 font-semibold text-lg">
                    Começar 7 dias grátis <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
              
              </motion.div>
              
              <motion.div 
                className="flex items-center gap-6 text-sm text-gray-600"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Cancele quando quiser</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              className="relative"
              variants={bounceIn}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-3xl blur-2xl opacity-50" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-10 border border-blue-200">
                <div className="flex items-center justify-between pb-4 border-b border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                    <span className="text-sm font-medium text-gray-600">Dashboard — Finance Manager</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Online" />
                    <span className="text-xs text-gray-500">Atualizado agora</span>
                  </div>
                </div>
                
                {/* Alertas Rápidas */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700 font-medium">🚀 Lucro aumentou 22% esta semana!</p>
                </div>
                
                {/* Cards Organizados - 6 cards em grid-cols-2 */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100">
                    <p className="text-sm text-gray-600 mb-1">Faturamento Hoje</p>
                    <p className="text-3xl font-bold text-blue-700">R$ 2.450</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">↑ 15% vs ontem</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-5 border border-green-100">
                    <p className="text-sm text-gray-600 mb-1">Lucro Líquido</p>
                    <p className="text-3xl font-bold text-green-600">R$ 890</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">↑ 22% vs ontem</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-blue-50 rounded-2xl p-5 border border-yellow-100">
                    <p className="text-sm text-gray-600 mb-1">Margem Média</p>
                    <p className="text-3xl font-bold text-yellow-600">32,5%</p>
                    <p className="text-xs text-gray-600 mt-2">Meta: 30%</p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100">
                    <p className="text-sm text-gray-600 mb-1">Pedidos Hoje</p>
                    <p className="text-3xl font-bold text-indigo-600">47</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">↑ 8 novos</p>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-5 border border-teal-100">
                    <p className="text-sm text-gray-600 mb-1">Crescimento Mensal</p>
                    <p className="text-3xl font-bold text-teal-600">18%</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">Meta: 15%</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl p-5 border border-orange-100">
                    <p className="text-sm text-gray-600 mb-1">Pedidos Pendentes</p>
                    <p className="text-3xl font-bold text-orange-600">12</p>
                    <p className="text-xs text-yellow-600 mt-2 font-medium">Aguardando envio</p>
                  </div>
                </div>
                
                {/* Gráfico Expandido */}
                
              </div>
            </motion.div>
          </div>
        </div>
        
        <style>{`
          @keyframes grow {
            from { height: 0; opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </motion.section>

      {/* Sobre Section */}
      <motion.section 
        id="sobre" 
        className="py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-blue-700 text-sm font-semibold shadow-sm border border-blue-200"
              variants={fadeInUp}
            >
              <Sparkles className="h-4 w-4" />
              Sobre a plataforma
            </motion.div>
            <motion.h2 
              className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight"
              variants={fadeInUp}
            >
              O que é o Finance Manager?
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              A ferramenta definitiva para vendedores de marketplace no Brasil. Centralize dados de Shopee e TikTok, descubra seu lucro real e tome decisões que impulsionam seu negócio.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Features Section - Redesenhada */}
      <motion.section 
        id="features" 
        className="py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Funcionalidades que Fazem a Diferença</h2>
            <p className="text-lg text-gray-600">Tudo que você precisa para dominar suas vendas e lucros</p>
          </motion.div>
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={stagger}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.05 }}
                className="bg-white border border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-400 group"
              >
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-blue-300 transition-shadow`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">{feature.title}</CardTitle>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section - Visual Interessante */}
      <motion.section 
        className="py-16 bg-white rounded-3xl mx-6 shadow-2xl border border-blue-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6 text-center">
          <motion.h2 className="text-4xl font-bold text-gray-900 mb-12" variants={fadeInUp}>Números que Impressionam</motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div ref={usersRef} className="space-y-4" variants={fadeInUp}>
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center border-4 border-blue-300 shadow-lg">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{usersCount.toLocaleString()}+</p>
              <p className="text-gray-600">Vendedores Ativos</p>
            </motion.div>
            <motion.div ref={ordersRef} className="space-y-4" variants={fadeInUp}>
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center border-4 border-cyan-300 shadow-lg">
                <PackageCheck className="h-12 w-12 text-cyan-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{ordersCount.toLocaleString()}+</p>
              <p className="text-gray-600">Pedidos Analisados</p>
            </motion.div>
            <motion.div ref={savingsRef} className="space-y-4" variants={fadeInUp}>
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center border-4 border-indigo-300 shadow-lg">
                <Clock className="h-12 w-12 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{savingsCount}%</p>
              <p className="text-gray-600">Menos Tempo em Planilhas</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section - Novos Dados */}
      <motion.section 
        className="py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Histórias de Sucesso</h2>
            <p className="text-lg text-gray-600">Veja como vendedores reais transformaram seus negócios</p>
          </motion.div>
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white border border-blue-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

            {/* Pricing Section - Todos os Planos */}
      <motion.section 
        id="planos" 
        className="py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Planos Flexíveis</h2>
            <p className="text-lg text-gray-600">Escolha o plano que cabe no seu bolso e cresça seu negócio</p>
          </motion.div>
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={stagger}
          >
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`bg-white border rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-400 relative flex flex-col justify-between min-h-[400px] ${plan.popular ? 'border-blue-500 border-2' : 'border-blue-200'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                    Mais Popular
                  </div>
                )}
                <div>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{plan.price}</p>
                    <p className="text-gray-600">{plan.period}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-gray-900">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/auth">
                  <Button className={`w-full py-6 font-semibold ${plan.popular ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}>
                    {plan.cta} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="text-center mt-12" variants={fadeInUp}>
            <Link to="/planos">
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 px-8 py-4">
                Ver Todos os Detalhes <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>
      {/* FAQ Section - Novos Dados */}
      <motion.section 
        id="faq" 
        className="py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-lg text-gray-600">Tudo que você precisa saber antes de começar</p>
          </motion.div>
          <motion.div 
            className="max-w-2xl mx-auto space-y-4"
            variants={stagger}
          >
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <FAQItem question={faq.question} answer={faq.answer} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Final CTA Section - Persuasiva */}
      <motion.section 
        className="py-16 bg-white rounded-3xl mx-6 shadow-2xl border border-blue-200"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-6 text-center">
          <motion.h2 className="text-4xl font-bold text-gray-900 mb-6" variants={fadeInUp}>Pronto para Descobrir Seu Lucro Real?</motion.h2>
          <motion.p className="text-xl mb-8 text-gray-600" variants={fadeInUp}>Junte-se a milhares de vendedores e transforme seu e-commerce hoje mesmo</motion.p>
          <Link to="/auth">
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-10 py-6 font-bold shadow-xl text-lg">
              Começar Agora - É Grátis! <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Footer - Redesenhado */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Atom className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">Finance Manager</span>
              </div>
              <p className="text-gray-400">A ferramenta que vendedores brasileiros merecem para crescer no e-commerce.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <nav className="space-y-2">
                <a href="#sobre" className="text-gray-400 hover:text-white transition-colors">Sobre</a>
                <br />
                <a href="#features" className="text-gray-400 hover:text-white transition-colors">Funcionalidades</a>
                <br />
                <a href="#planos" className="text-gray-400 hover:text-white transition-colors">Planos</a>
                <br />
                <a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Recursos</h4>
              <nav className="space-y-2">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Central de Ajuda</a>
                <br />
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Tutoriais em Vídeo</a>
                <br />
                <a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <a href="mailto:suporte@financemanager.com.br" className="text-gray-400 hover:text-white transition-colors">suporte@financemanager.com.br</a>
              <div className="flex gap-3 mt-4">
                <Link to="https://www.instagram.com/qx_assessoria/" className="text-gray-400 hover:text-white"><Instagram className="h-5 w-5" /></Link>
                <Link to="https://wa.me/558387999393" className="text-gray-400 hover:text-white"><MessageCircle className="h-5 w-5" /></Link>
              </div>
            </div>
          </div>
          <Separator className="bg-gray-700 mb-8" />
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© {new Date().getFullYear()} Finance Manager. Todos os direitos reservados.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white">Termos de Uso</a>
              <a href="#" className="text-gray-400 hover:text-white">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
