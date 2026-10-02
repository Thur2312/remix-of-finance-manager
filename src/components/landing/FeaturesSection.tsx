import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, EXPO_OUT } from "./Reveal";
import { SectionTag } from "./SectionTag";
import { useCountUp, useInView, useStaggeredFlags } from "./hooks";

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
    desc: "Descubra o lucro real de cada venda. O Seller Finance calcula automaticamente o lucro líquido descontando taxas da Shopee, Mercado Livre e TikTok Shop, custo do produto e outras despesas.",
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

const invoiceItems = [
  {
    title: "Dados do comprador prontos pra copiar",
    desc: "Pra pedidos do Mercado Livre, o Seller Finance busca nome, CPF/CNPJ e endereço do comprador direto na API — você só copia e cola no seu emissor de nota.",
  },
  {
    title: "Emitente sempre atualizado",
    desc: "Cadastre os dados fiscais da sua empresa uma vez (IE, regime tributário, endereço) e eles aparecem prontos em cada nota, sem redigitar.",
  },
];

const marginBars = [
  { label: "Fone Bluetooth X200", pct: 78 },
  { label: "Case Silicone Pro", pct: 61 },
  { label: "Carregador 20W", pct: 44 },
  { label: "Suporte Veicular", pct: 29 },
];

function MarginMockup() {
  const [ref, visible] = useInView<HTMLDivElement>();
  const flags = useStaggeredFlags(visible, marginBars.length, 150, 100);

  return (
    <div ref={ref} className="glass-card rounded-2xl p-6 max-w-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5">Margem por produto</p>
      <div className="space-y-4">
        {marginBars.map((row, i) => (
          <div key={row.label}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600">{row.label}</span>
              <motion.span
                className="font-mono font-semibold text-[#0A1628]"
                initial={{ opacity: 0 }}
                animate={flags[i] ? { opacity: 1 } : {}}
                transition={{ duration: 0.3 }}
              >
                {row.pct}%
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#318EF1] to-[#5BA6F5]"
                initial={{ width: 0 }}
                animate={flags[i] ? { width: `${row.pct}%` } : {}}
                transition={{ duration: 0.6, ease: EXPO_OUT }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingCalcMockup() {
  const [ref, visible] = useInView<HTMLDivElement>();
  const priceCents = useCountUp(4635, 700, visible);

  return (
    <div ref={ref} className="glass-card rounded-2xl p-6 max-w-xs mx-auto lg:mx-0">
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
        <p className="font-display text-white text-2xl font-bold tabular-nums">
          R$ {(priceCents / 100).toFixed(2).replace(".", ",")}
        </p>
      </div>
    </div>
  );
}

const invoiceFields = [
  { label: "Destinatário", value: "Mariana Costa Lima" },
  { label: "CPF", value: "123.456.789-00" },
  { label: "Endereço", value: "Rua das Flores, 240 — SP" },
];

function InvoiceMockup() {
  const [ref, visible] = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="glass-card rounded-2xl p-6 max-w-sm mx-auto lg:mx-0">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Dados pra nota fiscal</p>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#318EF1] bg-[#318EF1]/10 rounded-full px-2 py-1">
          Mercado Livre
        </span>
      </div>
      <div className="space-y-3">
        {invoiceFields.map((f, i) => (
          <div key={f.label} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400">{f.label}</p>
              <p className="text-sm font-medium text-[#0A1628] truncate">{f.value}</p>
            </div>
            <motion.div
              className="shrink-0 w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={visible ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.18, ease: EXPO_OUT }}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </motion.div>
          </div>
        ))}
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

        {/* Block 3: Nota Fiscal */}
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center mt-16">
          <Reveal>
            <p className="text-[#318EF1] font-bold text-lg mb-2">Nota fiscal:</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
              Emita nota sem redigitar nada do comprador
            </h3>
            <div className="space-y-3">
              {invoiceItems.map((item, i) => (
                <div key={i} className="glass-panel rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.03] transition-colors"
                    onClick={() => setOpenAccordion(openAccordion === i + 20 ? null : i + 20)}
                  >
                    <span className="font-semibold text-white">{item.title}</span>
                    <ChevronDown className={`w-5 h-5 text-[#318EF1] transition-transform ${openAccordion === i + 20 ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === i + 20 && (
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
            <InvoiceMockup />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
