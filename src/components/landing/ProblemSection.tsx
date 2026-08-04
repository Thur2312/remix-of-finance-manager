import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Package, Percent, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ensureScrollTrigger, prefersReducedMotion } from "./scrolltrigger";

const storySteps = [
  {
    icon: Percent,
    label: "Taxa do marketplace",
    text: "Shopee e TikTok Shop cobram comissões que variam por categoria — no dia a dia da loja, é fácil perder de vista quanto elas realmente comem da sua margem.",
  },
  {
    icon: Package,
    label: "Custo do produto e frete",
    text: "Sem separar custo, frete e imposto do preço de venda, a margem que aparece na tela é maior do que a que sobra de verdade no fim do mês.",
  },
  {
    icon: AlertTriangle,
    label: "Planilha manual",
    text: "Uma fórmula errada, uma célula esquecida — e o cálculo de lucro da loja inteira fica comprometido sem que ninguém perceba.",
  },
  {
    icon: TrendingUp,
    label: "Lucro real, automático",
    text: "O Seller Finance cruza pedido, taxas, custo e imposto sozinho e mostra o que sobra de cada venda — sem planilha, sem adivinhação.",
  },
];

function ScrollStory() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;
    const ScrollTrigger = ensureScrollTrigger();
    const blocks = Array.from(containerRef.current.querySelectorAll<HTMLElement>("[data-step]"));

    const triggers = blocks.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActiveStep(i);
        },
      })
    );

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <div ref={containerRef} className="grid lg:grid-cols-2 gap-12 items-start">
      <div className="lg:sticky lg:top-28 order-2 lg:order-1">
        <div className="rounded-2xl bg-navy p-6 md:p-8 border border-white/10">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-6">
            O que fica escondido
          </p>
          <div className="space-y-1">
            {storySteps.map((step, i) => {
              const active = i === activeStep;
              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 ${
                    active ? "bg-white/10 border border-gold/40" : "opacity-40"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? "bg-gold/20 text-gold" : "bg-white/10 text-white/50"
                    }`}
                  >
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm font-medium ${active ? "text-white" : "text-white/50"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="order-1 lg:order-2 space-y-24 lg:space-y-32 py-4">
        {storySteps.map((step, i) => (
          <div key={step.label} data-step={i} className="min-h-[30vh] flex flex-col justify-center">
            <p className="text-gold font-mono text-sm mb-3">0{i + 1}</p>
            <h3 className="font-serif text-2xl md:text-3xl text-navy leading-snug mb-4">
              {step.label}
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed max-w-md">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const marginTrend = [
  { m: "Jan", v: 22 }, { m: "Fev", v: 24 }, { m: "Mar", v: 21 },
  { m: "Abr", v: 28 }, { m: "Mai", v: 31 }, { m: "Jun", v: 34 },
];

function AnalyticsPanel() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Margem por produto</p>
      <p className="font-mono text-3xl font-bold text-navy mb-4">34,2%</p>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={marginTrend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="marginFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#marginFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PricingCalcPanel() {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/20 p-6 font-mono">
      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Calculadora de precificação</p>
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between text-white/80">
          <span>Custo do produto</span><span>R$ 50,00</span>
        </div>
        <div className="flex justify-between text-white/80">
          <span>Taxa do marketplace (18%)</span><span>R$ 15,48</span>
        </div>
        <div className="flex justify-between text-white/80">
          <span>Margem desejada (30%)</span><span>R$ 25,80</span>
        </div>
        <div className="flex justify-between text-white font-bold pt-2.5 border-t border-white/20">
          <span>Preço sugerido</span><span className="text-gold">R$ 86,00</span>
        </div>
      </div>
    </div>
  );
}

const analyticsItems = [
  {
    title: "Cálculo de Lucro por Pedido",
    desc: "Descubra o lucro real de cada venda. O Seller Finance calcula automaticamente o lucro líquido descontando taxas da Shopee e TikTok Shop, custo do produto e outras despesas.",
  },
  {
    title: "Análise de Margem por Produto",
    desc: "Visualize a margem de contribuição de cada produto do seu catálogo. Identifique quais itens realmente valem a pena vender.",
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
    desc: "Gere o Demonstrativo de Resultado do Exercício da sua loja automaticamente. Tenha uma visão clara de receitas, custos e lucro sem precisar de contador.",
  },
];

function FeatureAccordionBlock({
  eyebrow,
  title,
  items,
  dark,
  panel,
}: {
  eyebrow: string;
  title: string;
  items: { title: string; desc: string }[];
  dark?: boolean;
  panel: ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div
      className={`grid lg:grid-cols-2 gap-12 items-center ${dark ? "rounded-3xl p-8 md:p-12 bg-navy" : ""}`}
    >
      <div>
        <p className={`font-bold text-lg mb-2 ${dark ? "text-gold" : "text-primary"}`}>{eyebrow}</p>
        <h3 className={`font-serif text-2xl md:text-3xl mb-6 ${dark ? "text-white" : "text-navy"}`}>
          {title}
        </h3>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={item.title}
              className={`border rounded-xl overflow-hidden ${dark ? "bg-white/10 border-white/20" : "border-gray-200"}`}
            >
              <button
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                  dark ? "hover:bg-white/10" : "hover:bg-gray-50"
                }`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className={`font-semibold ${dark ? "text-white" : "text-navy"}`}>{item.title}</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${open === i ? "rotate-180" : ""} ${
                    dark ? "text-white/70" : "text-primary"
                  }`}
                />
              </button>
              {open === i && (
                <div className={`px-4 pb-4 text-sm leading-relaxed ${dark ? "text-white/80" : "text-gray-600"}`}>
                  {item.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>{panel}</div>
    </div>
  );
}

export function ProblemSection() {
  return (
    <section id="para-voce" className="section-white relative pt-28 md:pt-36 pb-28 md:pb-36">
      <div className="container">
        <div className="max-w-2xl mb-16 md:mb-24">
          <p className="text-primary font-bold text-sm uppercase tracking-wider mb-3">Para você que vende</p>
          <h2 className="font-serif text-3xl md:text-4xl text-navy leading-tight">
            O problema não é vender pouco. É não saber quanto sobra.
          </h2>
        </div>

        <ScrollStory />

        <div className="mt-28 md:mt-36 space-y-16 md:space-y-20">
          <FeatureAccordionBlock
            eyebrow="Analytics"
            title="Acesse dados financeiros que os marketplaces não entregam"
            items={analyticsItems}
            panel={<AnalyticsPanel />}
          />
          <FeatureAccordionBlock
            eyebrow="Controle financeiro"
            title="Toda a gestão do vendedor em um painel simples e completo"
            items={controlItems}
            dark
            panel={<PricingCalcPanel />}
          />
        </div>
      </div>
    </section>
  );
}
