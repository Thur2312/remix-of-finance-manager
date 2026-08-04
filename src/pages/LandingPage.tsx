import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Crown,
  DollarSign,
  Instagram,
  Mail,
  Menu,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import logo from "@/assets/logo-new.svg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EnterpriseLeadDialog } from "@/components/EnterpriseLeadDialog";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HeroProfitVisual } from "@/components/landing/HeroProfitVisual";
import { AnimatedStat } from "@/components/landing/AnimatedStat";
import { useLenisScroll } from "@/components/landing/useLenisScroll";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// ─── Scroll animation hook (reveal genérico, usado nas seções que não têm story próprio) ──
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".animate-fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Para você", href: "#para-voce" },
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Planos", href: "#planos" },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-navy/95 backdrop-blur-md shadow-lg" : "bg-transparent"
    }`}>
      <div className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-1">
          <img src={logo} alt="Seller Finance" className="h-16 w-auto" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => user ? navigate("/fluxo-caixa") : navigate("/user/auth")}
            className="text-white !py-2.5 !px-5 !text-sm"
          >
            {user ? "DASHBOARD" : "LOGIN"}
          </button>
          <button
            onClick={() => navigate("/user/auth?redirect=planos")}
            className="btn-cta !py-2.5 !px-5 !text-sm"
          >
            ASSINE JÁ →
          </button>
        </div>

        <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-navy border-t border-white/10 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}
              className="text-white/80 hover:text-white font-medium"
              onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <button onClick={() => navigate("/user/auth?redirect=planos")} className="btn-cta">
            COMEÇAR AGORA →
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="section-dark min-h-screen flex items-center pt-20 pb-24 relative">
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-white/80 text-sm font-medium">
                Gestão financeira para marketplaces
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] mb-6">
              Descubra o seu{" "}
              <span className="text-gold">lucro real</span>{" "}
              em cada pedido
            </h1>

            <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
              O Seller Finance entrega gestão financeira completa para vendedores
              de Shopee e TikTok Shop — cálculo de lucro, precificação inteligente
              e DRE automático em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <button onClick={() => navigate("/user/auth?redirect=planos")} className="btn-cta">
                QUERO VER MEU LUCRO REAL →
              </button>
              <span className="text-white/50 text-sm self-center">Cancele quando quiser</span>
            </div>

            <p className="text-white/40 text-sm">
              Já disponível para vendedores <span className="text-white/60">Shopee</span> e{" "}
              <span className="text-white/60">TikTok Shop</span>
            </p>
          </div>

          <div className="lg:pl-8">
            <HeroProfitVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How it Works Section ─────────────────────────────────────────────────────
const howItWorksSteps = [
  {
    step: "01",
    title: "Conecte sua loja",
    desc: "Integre sua conta da Shopee ou TikTok Shop em poucos cliques, sem necessidade de conhecimento técnico.",
    icon: ShoppingBag,
  },
  {
    step: "02",
    title: "Veja seu lucro real",
    desc: "O sistema calcula automaticamente o lucro líquido de cada pedido, descontando taxas, custos e comissões.",
    icon: DollarSign,
  },
  {
    step: "03",
    title: "Tome decisões com dados",
    desc: "Use a precificação inteligente e o DRE automático para crescer com estratégia e segurança financeira.",
    icon: BarChart3,
  },
];

function HowItWorksSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-28 bg-primary overflow-hidden">
      <div className="container">
        <div className="text-center mb-16 md:mb-20">
          <p className="section-label-white mb-3">COMO FUNCIONA</p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight max-w-3xl mx-auto">
            Entenda como o Seller Finance transforma sua gestão financeira
          </h2>
        </div>

        <motion.div
          className="relative grid md:grid-cols-3 gap-x-8 gap-y-14 mb-16"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}
        >
          <div className="hidden md:block absolute top-6 left-[16.66%] right-[16.66%] h-px bg-white/25" />

          {howItWorksSteps.map((item) => (
            <motion.div
              key={item.step}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="relative z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center font-mono font-bold text-primary text-lg">
                  {item.step}
                </span>
                <item.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-white/75 text-sm leading-relaxed max-w-xs">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center">
          <button
            onClick={() => navigate("/user/auth?redirect=planos")}
            className="btn-cta bg-white !text-primary hover:opacity-90"
          >
            COMECE AGORA →
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatsSection() {
  return (
    <section className="section-dark py-16 border-b border-white/10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <AnimatedStat
              target={500}
              formatter={(v) => `+${v}`}
              className="font-mono text-4xl md:text-5xl font-bold text-primary mb-2"
            />
            <p className="text-white/60 font-medium">Vendedores ativos</p>
          </div>
          <div>
            <AnimatedStat
              target={50000}
              formatter={(v) => `+${v.toLocaleString("pt-BR")}`}
              className="font-mono text-4xl md:text-5xl font-bold text-primary mb-2"
            />
            <p className="text-white/60 font-medium">Pedidos analisados</p>
          </div>
          <div>
            <AnimatedStat
              target={37}
              formatter={(v) => `R$ ${v}`}
              className="font-mono text-4xl md:text-5xl font-bold text-primary mb-2"
            />
            <p className="text-white/60 font-medium">Por mês — sem surpresas</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
const pricingFeatures = [
  "Cálculo de lucro por pedido",
  "Calculadora de precificação",
  "DRE automático",
  "Integração com Shopee",
  "Integração com TikTok Shop",
  "Histórico financeiro completo",
  "Análise de margem por produto",
  "Suporte por e-mail",
];

const pricingPlans = [
  {
    id: "mensal",
    name: "Mensal",
    tag: "FLEXÍVEL",
    icon: Zap,
    price: "74",
    cents: "99",
    priceSuffix: "por mês",
    billingNote: null as string | null,
    popular: false,
    cta: "ASSINAR MENSAL →",
  },
  {
    id: "semestral",
    name: "Semestral",
    tag: "ECONOMIZE",
    icon: Sparkles,
    price: "57",
    cents: "90",
    priceSuffix: "por mês",
    billingNote: "6x de R$ 57,90 — total R$ 347,40",
    popular: false,
    cta: "ASSINAR SEMESTRAL →",
  },
  {
    id: "anual",
    name: "Anual",
    tag: "MELHOR OFERTA",
    icon: Crown,
    price: "37",
    cents: "90",
    priceSuffix: "por mês",
    billingNote: "12x de R$ 37,90 — total R$ 454,80",
    popular: true,
    cta: "QUERO O PLANO ANUAL →",
  },
];

function PricingSection() {
  const navigate = useNavigate();
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  return (
    <section id="planos" className="section-dark relative py-20 md:py-28">
      <div className="container">
        <div className="text-center mb-12 animate-fade-up">
          <p className="section-label-white mb-3">PLANOS E PREÇOS</p>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-white">
            Plano simples, transparente e sem surpresas
          </h2>
        </div>

        <motion.div
          className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >
          {pricingPlans.map((plan) => (
            <motion.div
              key={plan.id}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className={`relative bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
                plan.popular ? "ring-4 ring-gold" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-navy text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Mais popular
                </div>
              )}

              {/* Header */}
              <div className="px-6 pt-8 pb-6 bg-primary">
                <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                  <plan.icon className="w-3.5 h-3.5" />
                  {plan.tag}
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">{plan.name}</h3>
                <p className="text-white/80 text-sm">Seller Finance</p>
              </div>

              {/* Price */}
              <div className="px-6 py-6 border-b border-gray-100">
                <div className="flex items-end gap-1 font-mono">
                  <span className="text-gray-500 text-base font-medium">R$</span>
                  <span className="text-4xl font-bold text-navy">{plan.price}</span>
                  <span className="text-gray-500 text-base mb-1">,{plan.cents}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">{plan.priceSuffix}</p>
                {plan.billingNote && (
                  <p className="text-gray-400 text-[11px] mt-1 font-mono">{plan.billingNote}</p>
                )}
              </div>

              {/* CTA */}
              <div className="px-6 py-4">
                <button onClick={() => navigate("/user/auth?redirect=planos")} className="btn-cta">
                  {plan.cta}
                </button>
              </div>

              {/* Features */}
              <div className="px-6 pb-8 flex-1">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                  Funcionalidades incluídas:
                </p>
                <div className="space-y-2.5">
                  {pricingFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Plano Empresarial */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="relative bg-navy rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
          >
            <div className="px-6 pt-8 pb-6">
              <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                <Building2 className="w-3.5 h-3.5" />
                SOB MEDIDA
              </div>
              <h3 className="text-white font-bold text-2xl mb-1">Empresarial</h3>
              <p className="text-white/60 text-sm">Para operações com múltiplas lojas ou grandes volumes</p>
            </div>

            <div className="px-6 py-6 border-b border-white/10">
              <span className="text-3xl font-bold text-white">Vamos conversar</span>
              <p className="text-white/50 text-xs mt-1">Proposta personalizada para o seu negócio</p>
            </div>

            <div className="px-6 py-4">
              <button
                onClick={() => setLeadDialogOpen(true)}
                className="btn-cta bg-white !text-navy hover:opacity-90"
              >
                FALE COM NOSSO TIME →
              </button>
            </div>

            <div className="px-6 pb-8 flex-1">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
                Além de tudo do plano padrão:
              </p>
              <div className="space-y-2.5">
                {[
                  "Múltiplas lojas e CNPJs",
                  "Onboarding assistido",
                  "Suporte prioritário via WhatsApp",
                  "Relatórios e integrações sob medida",
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-white/80 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bonus banner */}
        <div className="max-w-6xl mx-auto mt-6 bg-white/10 rounded-2xl pl-5 pr-4 py-4 flex items-center gap-3 border-l-2 border-gold animate-fade-up">
          <Zap className="w-4 h-4 text-gold flex-shrink-0" />
          <p className="text-white/80 text-sm">
            Assine agora e tenha acesso imediato a todas as funcionalidades,
            incluindo integrações com Shopee e TikTok Shop.
          </p>
        </div>
      </div>

      <EnterpriseLeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} />
    </section>
  );
}

// ─── CTA Final Section ────────────────────────────────────────────────────────
const ctaProfitTrend = [
  { m: "Mar", v: 5200 }, { m: "Abr", v: 6100 }, { m: "Mai", v: 5800 },
  { m: "Jun", v: 7300 }, { m: "Jul", v: 7900 }, { m: "Ago", v: 8420 },
];

function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-28 section-dark">
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-6">
              Pronto para descobrir seu lucro real nos marketplaces?
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Crie sua conta hoje e experimente o impacto real que o Seller Finance
              gera na clareza financeira e lucratividade da sua loja.
            </p>
            <button onClick={() => navigate("/user/auth?redirect=planos")} className="btn-cta-gold">
              CRIAR MINHA CONTA →
            </button>
          </div>

          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            whileHover={{ y: -4 }}
          >
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-6">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-white/60 text-xs mb-1">Lucro do mês</p>
                  <p className="font-mono text-3xl font-bold text-gold">R$ 8.420,00</p>
                </div>
                <div className="flex items-center gap-1 text-gold text-xs font-mono font-semibold pb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +18%
                </div>
              </div>

              <div className="h-20 -mx-2 my-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ctaProfitTrend} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="ctaProfitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="hsl(var(--gold))" strokeWidth={2} fill="url(#ctaProfitFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-white/60 text-xs">Margem média</span>
                <span className="font-mono font-bold text-white text-sm">32,5%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    { q: "O que diferencia o Seller Finance de outras ferramentas?", a: "O Seller Finance é focado exclusivamente em gestão financeira para vendedores de marketplace, entregando cálculo de lucro real por pedido, DRE automático e calculadora de precificação — tudo integrado com Shopee e TikTok Shop." },
    { q: "Há suporte disponível?", a: "Sim, oferecemos suporte técnico por e-mail. Nossa equipe está disponível para ajudar com dúvidas sobre integração, uso das funcionalidades e interpretação dos dados financeiros." },
    { q: "Prazo de reembolso", a: "Se você assinar e, durante os primeiros 7 dias, perceber que o Seller Finance não é para você, basta solicitar o reembolso. Sem complicações." },
    { q: "Forma de pagamento", a: "Aceitamos cartão de crédito como forma de pagamento. Assim, você nunca será pego de surpresa e seu acesso sempre ficará ativo." },
    { q: "A integração com Shopee e TikTok Shop é segura?", a: "Sim. Nossa integração utiliza as APIs oficiais dos marketplaces, garantindo segurança e fidelidade nos dados. Seus dados financeiros são protegidos com criptografia." },
    { q: "Funciona com outros marketplaces?", a: "Sim. O Seller Finance é integrado com Shopee, TikTok Shop e Mercado Livre. Estamos trabalhando para adicionar Amazon em breve." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim. Você pode cancelar sua assinatura a qualquer momento, sem multas ou burocracia. O acesso continua ativo até o fim do período pago." },
  ];

  return (
    <section className="section-white py-20 md:py-28">
      <div className="container max-w-3xl">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-navy">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3 animate-fade-up">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-semibold text-navy pr-4">{faq.q}</span>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  open === i ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {open === i ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-gray-600 leading-relaxed text-sm">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SEO Dialog ───────────────────────────────────────────────────────────────
const seoSections = [
  {
    title: "Gestão financeira para vendedores de Shopee, TikTok Shop e Mercado Livre",
    text: "O Seller Finance é a plataforma de gestão financeira criada para quem vende na Shopee, no TikTok Shop e no Mercado Livre e quer saber, com precisão, o lucro real de cada pedido. Diferente das planilhas manuais, o sistema calcula automaticamente taxas de marketplace, custo do produto e demais despesas, entregando uma visão clara da lucratividade da sua loja.",
  },
  {
    title: "Calculadora de precificação para marketplace",
    text: "Defina o preço ideal de venda antes de anunciar. A calculadora de precificação do Seller Finance considera custo do produto, comissões da Shopee, TikTok Shop e Mercado Livre e a margem de lucro desejada, evitando que o vendedor precifique no prejuízo.",
  },
  {
    title: "DRE automático e controle financeiro de loja online",
    text: "Tenha o Demonstrativo de Resultado do Exercício (DRE) da sua operação gerado automaticamente, sem depender de contador ou planilhas. Acompanhe receitas, custos e margem de contribuição por produto, e entenda a evolução financeira da sua loja ao longo do tempo.",
  },
  {
    title: "Cálculo de lucro real por pedido",
    text: "Saiba exatamente quanto sobra de cada venda depois de descontar taxas, frete, impostos e custo do produto. Essa clareza financeira é o que diferencia vendedores que crescem de forma estratégica nos marketplaces.",
  },
  {
    title: "Simulador de cenários de venda por marketplace",
    text: "Compare o mesmo produto e preço na Shopee, no TikTok Shop e no Mercado Livre antes de anunciar. O simulador de cenários do Seller Finance mostra qual canal entrega a melhor margem de lucro para cada produto do seu catálogo.",
  },
  {
    title: "Assistente de anúncio com inteligência artificial",
    text: "Gere títulos e descrições de anúncio otimizados para Shopee, TikTok Shop e Mercado Livre em segundos. O assistente de anúncio com IA do Seller Finance ajuda o vendedor a criar listagens mais atrativas e converter mais vendas.",
  },
  {
    title: "Fluxo de caixa e histórico financeiro para e-commerce",
    text: "Controle entradas e saídas do seu fluxo de caixa, acompanhe o histórico financeiro completo da loja e analise a margem por produto ao longo do tempo, tudo sincronizado automaticamente com seus marketplaces.",
  },
  {
    title: "Integração automática com Shopee, TikTok Shop e Mercado Livre",
    text: "Conecte suas contas de vendedor e sincronize pedidos, produtos, pagamentos e taxas automaticamente. A integração do Seller Finance com Shopee, TikTok Shop e Mercado Livre elimina o trabalho manual de conciliar planilhas.",
  },
];

function SEODialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seller Finance: gestão financeira completa para vendedores de marketplace</DialogTitle>
          <DialogDescription>
            Cálculo de lucro, precificação inteligente, simulador de cenários, assistente de anúncio com IA e DRE automático para quem vende na Shopee, no TikTok Shop e no Mercado Livre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-sm leading-6">
          {seoSections.map((section, i) => (
            <div key={section.title}>
              {i > 0 && <Separator className="mb-6" />}
              <h3 className="text-base font-semibold text-navy mb-2">{section.title}</h3>
              <p className="text-gray-600">{section.text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const [seoOpen, setSeoOpen] = useState(false);

  return (
    <footer className="section-dark pt-16 pb-8">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-1 mb-4">
              <img src={logo} alt="Seller Finance" className="h-12 w-auto" />
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Gestão financeira completa para vendedores de Shopee e TikTok Shop.
            </p>
          </div>

          <div>
            <p className="text-white font-semibold mb-4">Navegação</p>
            <div className="space-y-2">
              {[
                { label: "Para você", href: "#para-voce" },
                { label: "Funcionalidades", href: "#funcionalidades" },
                { label: "Planos", href: "#planos" },
              ].map((link) => (
                <a key={link.href} href={link.href}
                  className="block text-white/50 hover:text-white text-sm transition-colors">
                  {link.label}
                </a>
              ))}
              <button onClick={() => setSeoOpen(true)}
                className="block text-white/50 hover:text-white text-sm transition-colors text-left">
                SEO
              </button>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-4">Contato</p>
            <div className="space-y-3">
              <a href="mailto:suporte@sellerfinance.com.br"
                className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
                <Mail className="w-4 h-4" />
                suporte@sellerfinance.com.br
              </a>
            </div>
            <div className="flex gap-3 mt-4">
              <a href="https://www.instagram.com/qx_assessoria/"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/5583987999393"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Seller Finance. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <a href="/termos-de-uso" className="text-white/40 hover:text-white/70 text-xs transition-colors">Termos de uso</a>
            <a href="/politica-de-privacidade" className="text-white/40 hover:text-white/70 text-xs transition-colors">Política de privacidade</a>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/20 text-sm font-medium tracking-widest uppercase">
            Clareza. Controle. Crescimento.
          </p>
        </div>
      </div>

      <SEODialog open={seoOpen} onOpenChange={setSeoOpen} />
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  useScrollAnimation();
  useLenisScroll();

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <StatsSection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </div>
  );
}
