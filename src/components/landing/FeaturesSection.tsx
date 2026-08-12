import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { SectionTag } from "./SectionTag";

function AccordionPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ overflow: "hidden" }}
    >
      {children}
    </motion.div>
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

const marginBars = [
  { label: "Fone Bluetooth X200", pct: 78 },
  { label: "Case Silicone Pro", pct: 61 },
  { label: "Carregador 20W", pct: 44 },
  { label: "Suporte Veicular", pct: 29 },
];

function MarginMockup() {
  return (
    <div className="glass-card rounded-2xl p-6 max-w-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">Margem por produto</p>
      <div className="space-y-4">
        {marginBars.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-mono font-semibold text-[#0A1628]">{row.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#318EF1] to-[#5BA6F5]"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingCalcMockup() {
  return (
    <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto lg:mx-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Calculadora de preço</p>
      <div className="space-y-3 text-sm">
        {[
          { label: "Custo do produto", value: "R$ 24,10" },
          { label: "Taxa do marketplace", value: "20%" },
          { label: "Margem desejada", value: "35%" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-mono text-[#0A1628]">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl p-4 text-center" style={{ backgroundColor: "#0A1628" }}>
        <p className="text-white/50 text-[11px] uppercase tracking-wide mb-1">Preço ideal de venda</p>
        <p className="font-display text-white text-2xl font-bold">R$ 46,35</p>
      </div>
    </div>
  );
}

export function FeaturesSection() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(0);

  return (
    <section id="funcionalidades" className="relative py-20 md:py-28 text-white">
      <div className="container">
        <Reveal className="mb-6">
          <SectionTag index={3} total={5} label="Funcionalidades" />
        </Reveal>
        <Reveal className="mb-16 max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-[-0.02em]">
            Tenha soluções completas para sua gestão financeira nos marketplaces.{" "}
            <span className="text-[#318EF1]">Só o Seller Finance entrega:</span>
          </h2>
        </Reveal>

        {/* Block 1: Analytics */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center mb-16">
          <Reveal>
            <p className="text-[#318EF1] font-bold text-lg mb-2">Analytics:</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Acesse dados financeiros que os marketplaces não entregam
            </h3>
            <div className="space-y-3">
              {analyticsItems.map((item, i) => (
                <div key={i} className="glass-panel rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.03] transition-colors"
                    onClick={() => setOpenAccordion(openAccordion === i ? null : i)}
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <ChevronDown className={`w-5 h-5 text-[#318EF1] transition-transform ${openAccordion === i ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === i && (
                      <AccordionPanel>
                        <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">{item.desc}</div>
                      </AccordionPanel>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:pt-10">
            <MarginMockup />
          </Reveal>
        </div>

        {/* Block 2: Controle */}
        <div className="glass-panel rounded-3xl p-8 md:p-12 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
          <Reveal>
            <PricingCalcMockup />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[#318EF1] font-bold text-lg mb-2">Controle financeiro:</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Toda a gestão do vendedor em um painel simples e completo
            </h3>
            <div className="space-y-3">
              {controlItems.map((item, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.05] transition-colors"
                    onClick={() => setOpenAccordion(openAccordion === i + 10 ? null : i + 10)}
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${openAccordion === i + 10 ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === i + 10 && (
                      <AccordionPanel>
                        <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">{item.desc}</div>
                      </AccordionPanel>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
