import { useState } from "react";
import { FileText, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { SectionTag } from "./SectionTag";
import { useCountUp, useInView, useStaggeredFlags } from "./hooks";

const tabs = [
  { label: "O que é o Seller Finance", id: 0 },
  { label: "É para você", id: 1 },
  { label: "Benefícios", id: 2 },
];

const content = [
  {
    title: "Uma plataforma criada especialmente para vendedores de marketplace.",
    text: "Com funcionalidades exclusivas de gestão financeira, cálculo de lucro e precificação, o Seller Finance elimina a confusão das planilhas manuais e entrega ao vendedor um painel completo para enxergar a real lucratividade de cada pedido.",
  },
  {
    title: "Para quem vende na Shopee, no Mercado Livre ou no TikTok Shop e quer saber de verdade quanto lucra.",
    text: "Se você usa planilhas para calcular seu lucro, perde horas somando taxas e custos, ou simplesmente não sabe se está ganhando ou perdendo dinheiro em cada venda — o Seller Finance foi feito para você.",
  },
  {
    title: "Clareza financeira que transforma a forma como você vende.",
    text: "Com o Seller Finance você para de adivinhar e começa a decidir com dados. Veja o lucro real de cada pedido, calcule o preço ideal antes de precificar e acompanhe o DRE da sua loja automaticamente.",
  },
];

const dreRows = [
  { label: "Receita bruta", value: 32480, tone: "text-[#0A1628]" },
  { label: "(–) Taxas e comissões", value: 6104, tone: "text-red-500" },
  { label: "(–) Custo dos produtos", value: 12860, tone: "text-red-500" },
  { label: "(=) Lucro líquido", value: 13516, tone: "text-[#318EF1] font-bold" },
];

function formatBRL(value: number) {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function DrePreviewMockup() {
  const [ref, visible] = useInView<HTMLDivElement>();
  const flags = useStaggeredFlags(visible, dreRows.length, 220, 150);
  const v0 = useCountUp(dreRows[0].value, 500, flags[0]);
  const v1 = useCountUp(dreRows[1].value, 500, flags[1]);
  const v2 = useCountUp(dreRows[2].value, 500, flags[2]);
  const v3 = useCountUp(dreRows[3].value, 600, flags[3]);
  const values = [v0, v1, v2, v3];
  const badgePct = useCountUp(18, 500, flags[3]);

  return (
    <div ref={ref} className="glass-card relative rounded-2xl p-6 max-w-md ml-auto">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#318EF1]/10 flex items-center justify-center">
          <FileText className="w-4 h-4 text-[#318EF1]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0A1628]">DRE — Julho</p>
          <p className="text-xs text-gray-400">Gerado automaticamente</p>
        </div>
      </div>

      <div className="space-y-3">
        {dreRows.map((row, i) => (
          <div key={row.label} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
            <span className="text-gray-500">{row.label}</span>
            <span className={`font-mono tabular-nums ${row.tone}`}>{formatBRL(values[i])}</span>
          </div>
        ))}
      </div>

      <div className="absolute -bottom-4 -right-4 bg-[#0A1628] rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-[#318EF1]" />
        <span className="text-white text-xs font-semibold tabular-nums">+{badgePct}% vs. mês anterior</span>
      </div>
    </div>
  );
}

export function WhatIsSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="para-voce" className="relative pt-28 md:pt-36 pb-24 md:pb-32 text-white">
      <div className="container">
        <Reveal className="mb-10">
          <SectionTag index={1} total={5} label="Sobre" />
        </Reveal>

        <div className="flex flex-wrap gap-2 mb-12 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === tab.id ? "bg-[#318EF1] text-white shadow-md" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div className="min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight tracking-[-0.02em] mb-6">
                  {content[activeTab].title}
                </h2>
                <p className="text-white/70 text-lg leading-relaxed mb-8">{content[activeTab].text}</p>
                <p className="font-serif italic text-white/45 text-lg leading-relaxed">
                  "Tudo pensado para que você possa crescer nos marketplaces de forma inteligente e estratégica."
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <Reveal delay={0.1}>
            <DrePreviewMockup />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
