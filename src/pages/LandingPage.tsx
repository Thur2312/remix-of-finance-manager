import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  Instagram,
  Mail,
  Menu,
  ShoppingBag,
  TrendingUp,
  X,
  MessageCircle,
  Zap,
} from "lucide-react";
import logo from "@/assets/logo-new.svg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

  

// ─── Scroll animation hook ────────────────────────────────────────────────────
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".animate-fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Counter animation hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth(); // ou o estado que você usa


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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0A1628]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <a href="#" className="flex items-center gap-1">
          <img
            src={logo}
            alt="Seller Finance"
            className="h-16 w-auto"
          />
          
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
       <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/user/auth")}
            className="text-white !py-2.5 !px-5 !text-sm"
          >
            LOGIN
          </button>

          <a href="/planos" className="btn-cta !py-2.5 !px-5 !text-sm">
            ASSINE JÁ →
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A1628] border-t border-white/10 px-4 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-white/80 hover:text-white font-medium"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/planos"
            rel="noopener noreferrer"
            className="btn-cta text-center justify-center"
          >
            ASSINE JÁ →
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="section-dark min-h-screen flex items-center pt-20 pb-32 overflow-hidden relative">
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 50%, oklch(0.65 0.18 210 / 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Text */}
          <div className="animate-fade-up visible">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#00B4D8] animate-pulse" />
              <span className="text-white/80 text-sm font-medium">
                Gestão financeira para marketplaces
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Descubra o seu{" "}
              <span className="text-[#00B4D8]">lucro real</span>{" "}
              em cada pedido
            </h1>

            <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
              O Seller Finance entrega gestão financeira completa para vendedores
              de Shopee e TikTok Shop — cálculo de lucro, precificação inteligente
              e DRE automático em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="/planos"
                rel="noopener noreferrer"
                className="btn-cta text-base"
              >
                ASSINE AGORA →
              </a>
              <span className="text-white/50 text-sm self-center">
                Cancele quando quiser
              </span>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["bg-blue-400", "bg-cyan-400", "bg-teal-400", "bg-sky-400"].map(
                  (color, i) => (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded-full ${color} border-2 border-[#0A1628] flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {["C", "A", "R", "M"][i]}
                    </div>
                  )
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  Vendedores já usam o Seller Finance
                </p>
                <p className="text-white/50 text-xs">
                  Shopee · TikTok Shop
                </p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="animate-fade-up visible lg:pl-8">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-[#00B4D8]/10 blur-2xl" />
              <img
                src="https://private-us-east-1.manuscdn.com/sessionFile/7WTN430VN22e1xkFAXaNis/sandbox/6BIUka6H9SGVYbnDlOzEWB-img-1_1772034259000_na1fn_c2VsbGVyLWZpbmFuY2UtaGVybw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN1dUTjQzMFZOMjJlMXhrRkFYYU5pcy9zYW5kYm94LzZCSVVrYTZIOVNHVllibkRsT3pFV0ItaW1nLTFfMTc3MjAzNDI1OTAwMF9uYTFmbl9jMlZzYkdWeUxXWnBibUZ1WTJVdGFHVnlidy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=W1UW6dYdtYsjkP9CPyzPPwzg7UgFo8NYCMtqja2-zEVIkDTYNyt0lUoH0H02pmTWaFM3cA8WG0NKeZQThe80L5migZ~Vvz34aWzLRCNrCenCEZPCH3rZiBOXl3h9PMB4BKNVHLmzBZCD8Z1BYpVJSRux91KmAQAmefGFyai6xROITFRnWj7WVij2SV5G12rk4JKbk4ngWZDNwa2Vr-ZGHteNNdXml-Nweg5drOFs857nnmzFSMk5mxXHTi9jfjcozN3Tu3QRY2-gaN471BmKY~-X-dlb~Be73ILyqBHytP99HiFWUZ-Pmzm9ZEH0BbbJ189T~0uix0AME3TNJafrWg__"
                alt="Dashboard Seller Finance"
                className="relative rounded-2xl shadow-2xl w-full cyan-glow"
              />

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Lucro do mês</p>
                  <p className="text-sm font-bold text-gray-900">R$ 4.820,00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Elegant minimal wave */}
      <svg
        className="absolute -bottom-1 left-0 w-full"
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,30 C360,100 1080,0 1440,30 L1440,100 L0,100 Z"
          fill="#ffffff"
        />
      </svg>

</section>
  );
}

// ─── "O que é" Section ────────────────────────────────────────────────────────
function WhatIsSection() {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { label: "O que é o Seller Finance", id: 0 },
    { label: "É para você", id: 1 },
    { label: "Benefícios", id: 2 },
  ];

  const content = [
    {
      title: "Uma plataforma criada especialmente para vendedores de marketplace.",
      text: "Com funcionalidades exclusivas de gestão financeira, cálculo de lucro e precificação, o Seller Finance elimina a confusão das planilhas manuais e entrega ao vendedor um painel completo para enxergar a real lucratividade de cada pedido. Tudo pensado para que você possa crescer na Shopee e no TikTok Shop de forma inteligente e estratégica.",
    },
    {
      title: "Para quem vende na Shopee e no TikTok Shop e quer saber de verdade quanto lucra.",
      text: "Se você usa planilhas para calcular seu lucro, perde horas somando taxas e custos, ou simplesmente não sabe se está ganhando ou perdendo dinheiro em cada venda — o Seller Finance foi feito para você. Ideal para vendedores iniciantes e experientes que querem clareza financeira.",
    },
    {
      title: "Clareza financeira que transforma a forma como você vende.",
      text: "Com o Seller Finance você para de adivinhar e começa a decidir com dados. Veja o lucro real de cada pedido, calcule o preço ideal antes de precificar e acompanhe o DRE da sua loja automaticamente — sem precisar de contador ou planilhas complexas.",
    },
  ];

  return (
    <section id="para-voce"  className="section-white relative pt-28 md:pt-36 pb-40 overflow-hidden">
      <div className="container">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-12 border-b border-gray-100 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[#00B4D8] text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A1628] leading-tight mb-6">
              {content[activeTab].title}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              {content[activeTab].text}
            </p>
            <p className="text-gray-500 leading-relaxed">
              Tudo pensado para que você possa crescer nos marketplaces de forma
              inteligente e estratégica, sem depender de achismo ou planilhas
              complicadas.
            </p>
          </div>

          {/* Image */}
          <div className="animate-fade-up">
            <img
              src="https://private-us-east-1.manuscdn.com/sessionFile/7WTN430VN22e1xkFAXaNis/sandbox/6BIUka6H9SGVYbnDlOzEWB-img-2_1772034263000_na1fn_c2VsbGVyLWZpbmFuY2UtbWFya2V0cGxhY2U.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN1dUTjQzMFZOMjJlMXhrRkFYYU5pcy9zYW5kYm94LzZCSVVrYTZIOVNHVllibkRsT3pFV0ItaW1nLTJfMTc3MjAzNDI2MzAwMF9uYTFmbl9jMlZzYkdWeUxXWnBibUZ1WTJVdGJXRnlhMlYwY0d4aFkyVS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=PPJC8H51cxDwIp2H4sqIdd1ogvGpaveSu5uycB9i9VJEvOUDkeByoL6~gcEmv1amnfzoMwZJF0BRui5qSKg3nf8icunxVR36RO75cgZ~W9n5iS3LMFDJHc5QouO5FxtPaH7o2qdaXpgmSEqk2w-HcAK2GV9wWig72wjy7gKXroj59KDMXq0XuDdH4LhtdPGpCisO9Zh4pLOz9grFpTYHqvsx8h9buPUbar2MqVsAxSQ~v7Vx9YozoV3sRMY-WYLTCeUTxYS4fL9OYb1I~CbAI-R8y6b9ZgdIawG1l8nS~KsOzqgypb04IQ6VDS-e2HEEn~V~9cBO~x7paZn~oPfxFQ__"
              alt="Vendedor de marketplace usando o Seller Finance"
              className="rounded-2xl shadow-xl w-full object-cover"
            />
          </div>
        </div>
      </div>
{/* White → Cyan wave (inverted & softer) */}
<svg
  className="absolute -bottom-1 left-0 w-full"
  viewBox="0 0 1440 110"
  preserveAspectRatio="none"
>
  <path
    d="M0,70 C360,20 1080,120 1440,60 L1440,110 L0,110 Z"
    fill="oklch(0.65 0.18 210)"
  />
</svg>
    </section>
  );
}

// ─── How it Works Section (cyan bg) ──────────────────────────────────────────
function HowItWorksSection() {
  return (
   <section className="section-cyan relative py-20 md:py-28 overflow-hidden">
      <div className="container">
        <div className="text-center mb-12 animate-fade-up">
          <p className="section-label-white mb-3">COMO FUNCIONA</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Entenda como o Seller Finance transforma sua gestão financeira
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 animate-fade-up">
          {[
            {
              step: "01",
              title: "Conecte sua loja",
              desc: "Integre sua conta da Shopee ou TikTok Shop em poucos cliques, sem necessidade de conhecimento técnico.",
              icon: <ShoppingBag className="w-6 h-6" />,
            },
            {
              step: "02",
              title: "Veja seu lucro real",
              desc: "O sistema calcula automaticamente o lucro líquido de cada pedido, descontando taxas, custos e comissões.",
              icon: <DollarSign className="w-6 h-6" />,
            },
            {
              step: "03",
              title: "Tome decisões com dados",
              desc: "Use a precificação inteligente e o DRE automático para crescer com estratégia e segurança financeira.",
              icon: <BarChart3 className="w-6 h-6" />,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-white/40 text-4xl font-bold leading-none">
                  {item.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {item.icon}
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-white/75 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center animate-fade-up">
          <a
            href="/planos"
            rel="noopener noreferrer"
            className="btn-outline-white"
          >
            ASSINE AGORA →
          </a>
        </div>
      </div>
      <svg
          className="absolute -bottom-1 left-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C480,120 960,0 1440,80 L1440,120 L0,120 Z"
            fill="oklch(0.97 0.005 240)"
          />
        </svg>
    </section>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  const analyticsItems = [
    {
      title: "Cálculo de Lucro por Pedido",
      desc: "Descubra o lucro real de cada venda. O Seller Finance calcula automaticamente o lucro líquido descontando taxas da Shopee e TikTok Shop, custo do produto e outras despesas. Isso indica exatamente onde você está ganhando e onde está perdendo dinheiro.",
    },
    {
      title: "Análise de Margem por Produto",
      desc: "Visualize a margem de contribuição de cada produto do seu catálogo. Identifique quais itens realmente valem a pena vender e quais estão consumindo sua lucratividade.",
    },
    {
      title: "Histórico Financeiro",
      desc: "Acompanhe a evolução financeira da sua loja ao longo do tempo. Compare períodos, identifique tendências e tome decisões baseadas em dados históricos reais.",
    },
  ];

  const controlItems = [
    {
      title: "Calculadora de Precificação",
      desc: "Calcule automaticamente o preço de venda ideal considerando custo do produto, taxas do marketplace e a margem de lucro desejada. Nunca mais venda no prejuízo.",
    },
    {
      title: "DRE Automático",
      desc: "Gere o Demonstrativo de Resultado do Exercício da sua loja automaticamente. Tenha uma visão clara de receitas, custos e lucro sem precisar de contador ou planilhas.",
    },
  ];

  return (
    <section id="funcionalidades" className="section-light relative py-20 md:py-28 overflow-hidden">
      <div className="container">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0A1628] leading-tight max-w-3xl mx-auto">
            Tenha soluções completas para sua gestão financeira nos marketplaces.{" "}
            <span className="text-[#00B4D8]">Só o Seller Finance entrega:</span>
          </h2>
        </div>

        {/* Block 1: Analytics */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="animate-fade-up">
            <p className="text-[#00B4D8] font-bold text-lg mb-2">Analytics:</p>
            <h3 className="text-2xl md:text-3xl font-bold text-[#0A1628] mb-6">
              Acesse dados financeiros que os marketplaces não entregam
            </h3>

            <div className="space-y-3">
              {analyticsItems.map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                  >
                    <span className="font-semibold text-[#0A1628]">{item.title}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#00B4D8] transition-transform ${
                        openAccordion === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openAccordion === i && (
                    <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed">
                      {item.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up">
            <img
              src="https://private-us-east-1.manuscdn.com/sessionFile/7WTN430VN22e1xkFAXaNis/sandbox/6BIUka6H9SGVYbnDlOzEWB-img-3_1772034255000_na1fn_c2VsbGVyLWZpbmFuY2UtZHJl.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN1dUTjQzMFZOMjJlMXhrRkFYYU5pcy9zYW5kYm94LzZCSVVrYTZIOVNHVllibkRsT3pFV0ItaW1nLTNfMTc3MjAzNDI1NTAwMF9uYTFmbl9jMlZzYkdWeUxXWnBibUZ1WTJVdFpISmwucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=k78Qs7BFalwNYHQthILSJFeP4Y6IhQZtOYuOR8TutH2OQ1IvqBEH9~lfo8JuKydE-4DIFRGocgbJySWswTH2VotBjnFFiqhvOa5gfZpgHgfgqcYBYWE0RPYZ983jPJQVD7NjLh-fImfvyqHE5RljcksHii4sv48U8CKCXv6JMZKiGoGc96cZRBm0~9RYRfn3m40fLNiOJZEaBsCeeCElBQw3l4qlC68s9YW8fnKwfYCmn2iQ8EZE2jgCriN6eysVTNarzr1kssny8tOPP2~RI8fTkX~E1BVK9Evy1EYBf5q2RYkGjBOOQ7l3ssPeas3pau2refLv4gU4x~RxKjpCXg__"
              alt="DRE Automático Seller Finance"
              className="rounded-2xl shadow-xl w-full"
            />
          </div>
        </div>
        <div
          className="rounded-3xl p-8 md:p-12 grid lg:grid-cols-2 gap-12 items-center"
          style={{ backgroundColor: "oklch(0.65 0.18 210)" }}
        >
          <div className="animate-fade-up">
            <img
              src="https://private-us-east-1.manuscdn.com/sessionFile/7WTN430VN22e1xkFAXaNis/sandbox/6BIUka6H9SGVYbnDlOzEWB-img-4_1772034250000_na1fn_c2VsbGVyLWZpbmFuY2UtcHJpY2luZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN1dUTjQzMFZOMjJlMXhrRkFYYU5pcy9zYW5kYm94LzZCSVVrYTZIOVNHVllibkRsT3pFV0ItaW1nLTRfMTc3MjAzNDI1MDAwMF9uYTFmbl9jMlZzYkdWeUxXWnBibUZ1WTJVdGNISnBZMmx1WncucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=fQrCzB22zraO7ay~qlUaxlW-HJU9EJ87X8cyUu5N60Eb2ordjz9sOxiy7-CciEzGTJcidgPf7EYNabzLkGzhFmBOL9AqDf~TEYHse9aAt3ohmFpQ7NP25-h1IfjPi8305m7l6qBkRieIK~htT8dNXqJLeez7rbcA3FR0KefRPJK3ZaB1N4aasYfPgtMx1ZJyDx9Z97c5iarzd~TYyXeePRamTKUTG8duh4A5ty~hLhcrnz6soDI2d7s9K2U~XmRd2FAccdcr8KtHs8Ua7cuw-xyUN30zawkZ6CfjtbLpXc1ESUFgJJrLRPD4wlHiyE0w4K5Id3gKlZFN5Rie5CpNlg__"
              alt="Calculadora de Precificação Seller Finance"
              className="rounded-2xl shadow-xl w-full max-w-sm mx-auto"
            />
          </div>

          <div className="animate-fade-up">
            <p className="text-white/80 font-bold text-lg mb-2">Controle financeiro:</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Toda a gestão do vendedor em um painel simples e completo
            </h3>

            <div className="space-y-3">
              {controlItems.map((item, i) => (
                <div
                  key={i}
                  className="bg-white/15 border border-white/20 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/10 transition-colors"
                    onClick={() =>
                      setOpenAccordion(openAccordion === i + 10 ? null : i + 10)
                    }
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-white/70 transition-transform ${
                        openAccordion === i + 10 ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openAccordion === i + 10 && (
                    <div className="px-4 pb-4 text-white/80 text-sm leading-relaxed">
                      {item.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
   
      <svg
        className="absolute -bottom-1 left-0 w-full"
        viewBox="0 0 1440 110"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C360,140 1080,0 1440,100 L1440,160 L0,160 Z"
          fill="oklch(0.16 0.04 240)"
        />
      </svg>
    </section>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const sellers = useCountUp(500, 1500, visible);
  const orders = useCountUp(50000, 1500, visible);
  const savings = useCountUp(37, 1200, visible);

  return (
    <section className="section-dark py-16" ref={ref}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { value: `+${sellers}`, label: "Vendedores ativos", suffix: "" },
            { value: `+${orders.toLocaleString("pt-BR")}`, label: "Pedidos analisados", suffix: "" },
            { value: `R$ ${savings}`, label: "Por mês — sem surpresas", suffix: "/mês" },
          ].map((stat, i) => (
            <div key={i} className="animate-fade-up">
              <p className="text-4xl md:text-5xl font-bold text-[#00B4D8] mb-2">
                {stat.value}
              </p>
              <p className="text-white/60 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
function PricingSection() {
  const features = [
    "Cálculo de lucro por pedido",
    "Calculadora de precificação",
    "DRE automático",
    "Integração com Shopee",
    "Integração com TikTok Shop",
    "Histórico financeiro completo",
    "Análise de margem por produto",
    "Suporte por e-mail",
  ];

  return (
    <section id="planos" className="section-dark relative py-20 md:py-28 overflow-hidden">
      <div className="container">
        <div className="text-center mb-12 animate-fade-up">
          <p className="section-label-white mb-3">PLANOS E PREÇOS</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            Plano simples, transparente e sem surpresas
          </h2>
        </div>

        {/* Single plan card */}
        <div className="max-w-md mx-auto animate-fade-up">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#00B4D8] px-8 pt-8 pb-6">
              <div className="inline-block bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                PLANO ÚNICO
              </div>
              <h3 className="text-white font-bold text-2xl mb-1">Seller Finance</h3>
              <p className="text-white/80 text-sm">
                Tudo que você precisa para gerir suas finanças nos marketplaces
              </p>
            </div>

            {/* Price */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-end gap-1">
                <span className="text-gray-500 text-lg font-medium">R$</span>
                <span className="text-5xl font-bold text-[#0A1628]">37</span>
                <span className="text-gray-500 text-lg mb-1">,00</span>
              </div>
              <p className="text-gray-500 text-sm mt-1">por mês · cancele quando quiser</p>
            </div>

            {/* CTA */}
            <div className="px-8 py-4">
              <a
                href="/planos"
                rel="noopener noreferrer"
                className="btn-cta w-full justify-center text-center"
                style={{ display: "flex" }}
              >
                Assinar agora
              </a>
            </div>

            {/* Features */}
            <div className="px-8 pb-8">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                Funcionalidades incluídas:
              </p>
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#00B4D8] flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bonus banner */}
          <div className="mt-4 bg-white/10 rounded-2xl p-4 flex items-center gap-3 border border-white/20">
            <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-[#00B4D8]" />
            </div>
            <p className="text-white/80 text-sm">
              Assine agora e tenha acesso imediato a todas as funcionalidades,
              incluindo integrações com Shopee e TikTok Shop.
            </p>
          </div>
        </div>
      </div>
      <svg
        className="absolute -bottom-1 left-0 w-full"
        viewBox="0 0 1440 170"
        preserveAspectRatio="none"
      >
        <path
          d="M0,120 C300,40 900,180 1440,80 L1440,170 L0,170 Z"
          fill="oklch(0.65 0.18 210)"
        />
      </svg>
    </section>
  );
}

// ─── CTA Final Section ────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="section-cyan py-20 md:py-28 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
              Pronto para descobrir seu lucro real nos marketplaces?
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              Crie sua conta hoje e experimente o impacto real que o Seller Finance
              gera na clareza financeira e lucratividade da sua loja.
            </p>
            <a
              href="/planos"
              rel="noopener noreferrer"
              className="btn-outline-white"
            >
              ASSINE AGORA →
            </a>
          </div>

          {/* Floating cards */}
          <div className="animate-fade-up hidden lg:block">
            <div className="relative">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Lucro do mês</p>
                    <p className="text-white font-bold text-xl">R$ 8.420,00</p>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full">
                  <div className="h-2 bg-white rounded-full w-3/4" />
                </div>
                <p className="text-white/60 text-xs mt-1">75% da meta atingida</p>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30 ml-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Margem média</p>
                    <p className="text-white font-bold text-xl">32,5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <svg
        className="absolute -bottom-1 left-0 w-full"
        viewBox="0 0 1440 130"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C480,120 960,40 1440,90 L1440,130 L0,130 Z"
          fill="oklch(1 0 0)"
        />
      </svg>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: "O que diferencia o Seller Finance de outras ferramentas?",
      a: "O Seller Finance é focado exclusivamente em gestão financeira para vendedores de marketplace, entregando cálculo de lucro real por pedido, DRE automático e calculadora de precificação — tudo integrado com Shopee e TikTok Shop, sem necessidade de planilhas.",
    },
    {
      q: "Há suporte disponível?",
      a: "Sim, oferecemos suporte técnico por e-mail. Nossa equipe está disponível para ajudar com dúvidas sobre integração, uso das funcionalidades e interpretação dos dados financeiros.",
    },
    {
      q: "Prazo de reembolso",
      a: "Se você assinar e, durante os primeiros 7 dias, perceber que o Seller Finance não é para você, basta solicitar o reembolso. Sem complicações.",
    },
    {
      q: "Forma de pagamento",
      a: "Aceitamos cartão de crédito como forma de pagamento. Assim, você nunca será pego de surpresa e seu acesso sempre ficará ativo.",
    },
    {
      q: "A integração com Shopee e TikTok Shop é segura?",
      a: "Sim. Nossa integração utiliza as APIs oficiais dos marketplaces, garantindo segurança e fidelidade nos dados. Seus dados financeiros são protegidos com criptografia.",
    },
    {
      q: "Funciona com outros marketplaces?",
      a: "No momento, o Seller Finance é integrado com Shopee e TikTok Shop. Estamos trabalhando para adicionar Mercado Livre e Amazon em breve.",
    },
    {
      q: "Posso cancelar a qualquer momento?",
      a: "Sim. Você pode cancelar sua assinatura a qualquer momento, sem multas ou burocracia. O acesso continua ativo até o fim do período pago.",
    },
  ];

  return (
    <section className="section-white py-20 md:py-28">
      <div className="container max-w-3xl">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A1628]">
            Perguntas frequentes
          </h2>
        </div>

        <div className="space-y-3 animate-fade-up">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-[#0A1628] pr-4">{faq.q}</span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    open === i ? "bg-[#00B4D8] text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {open === i ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-gray-600 leading-relaxed text-sm">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="section-dark pt-16 pb-8">
      <div className="container">
        {/* Top */}
        <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-1 mb-4">
              <img
                src="/src/assets/logo-new.svg"
                alt="Seller Finance"
                className="h-12 w-auto"
              />
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Gestão financeira completa para vendedores de Shopee e TikTok Shop.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-white font-semibold mb-4">Navegação</p>
            <div className="space-y-2">
              {[
                { label: "Para você", href: "#para-voce" },
                { label: "Funcionalidades", href: "#funcionalidades" },
                { label: "Planos", href: "#planos" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-white/50 hover:text-white text-sm transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white font-semibold mb-4">Contato</p>
            <div className="space-y-3">
              <a
                href="mailto:suporte@sellerfinance.com.br"
                className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                suporte@sellerfinance.com.br
              </a>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/qx_assessoria/"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/5583987999393"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Seller Finance. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">
              Termos de uso
            </a>
            <a href="#" className="text-white/40 hover:text-white/70 text-xs transition-colors">
              Política de privacidade
            </a>
          </div>
        </div>

        {/* Slogan */}
        <div className="text-center mt-8">
          <p className="text-white/20 text-sm font-medium tracking-widest uppercase">
            Clareza. Controle. Crescimento.
          </p>
        </div>
      </div>
    </footer>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  useScrollAnimation();

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <Navbar />
      <HeroSection />
      <WhatIsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <StatsSection />
      <PricingSection />
      <CTASection />
      <FAQSection />
      <Footer />
    </div>
  );
}
