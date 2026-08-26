import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Reveal, EXPO_OUT } from "./Reveal";
import { useCountUp } from "./hooks";

// Substitui a antiga StatsSection (números "+500 vendedores" / avatares com
// iniciais genéricas, sem nenhuma fonte real) — em vez de afirmar escala que
// a gente não tem prova pra sustentar, mostra a tela real do DRE com dado de
// exemplo, claramente rotulado como ilustrativo. Prova por transparência, não
// por confiança emprestada de terceiros.
const rows = [
  { label: "Receita Bruta", value: 47320, fill: 100, color: "bg-[#0A1628]/20" },
  { label: "Custos e taxas", value: 34480, fill: 73, color: "bg-red-500/45" },
  { label: "Lucro líquido", value: 12840, fill: 27, color: "bg-[#318EF1]", highlight: true },
];

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function DREMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const receita = useCountUp(rows[0].value, 1200, visible);
  const custos = useCountUp(rows[1].value, 1200, visible);
  const lucro = useCountUp(rows[2].value, 1200, visible);
  const counts = [receita, custos, lucro];

  return (
    <div ref={ref} className="relative max-w-[480px] ml-auto">
      <div className="rounded-2xl overflow-hidden border border-white/[0.07] shadow-[0_24px_48px_-14px_rgba(5,10,20,0.55),0_2px_6px_-1px_rgba(5,10,20,0.4)] bg-[#0F1E33]">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white/[0.18]" />
            <span className="w-2 h-2 rounded-full bg-white/[0.18]" />
            <span className="w-2 h-2 rounded-full bg-white/[0.18]" />
          </div>
          <div className="flex-1 bg-white/[0.04] rounded-md px-2.5 py-1 text-center">
            <span className="font-mono text-[11px] text-white/40">sellerfinance.com.br/dre</span>
          </div>
        </div>

        <div className="bg-white/[0.97] px-7 py-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#0A1628]/40 mb-1">DRE · Outubro</p>
              <p className="text-[15px] font-semibold text-[#0A1628]">Shopee + TikTok Shop + ML</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#B45309] bg-[#D97706]/10 px-2.5 py-1 rounded-md whitespace-nowrap">
              Dado ilustrativo
            </span>
          </div>

          <div className="flex flex-col gap-4 mb-5">
            {rows.map((row, i) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[13px] mb-1.5">
                  <span className={row.highlight ? "text-[#0A1628]/70 font-medium" : "text-[#0A1628]/55"}>
                    {row.label}
                  </span>
                  <span className={`font-mono font-bold ${row.highlight ? "text-[#1F5FC4]" : "text-[#0A1628]"}`}>
                    {formatBRL(counts[i])}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0A1628]/[0.07] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${row.color}`}
                    initial={{ width: 0 }}
                    animate={visible ? { width: `${row.fill}%` } : {}}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: EXPO_OUT }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#0A1628]/[0.08]">
            <span className="text-[13px] text-[#0A1628]/50">Margem líquida</span>
            <span className="font-display font-bold text-xl text-[#0A1628]">27,1%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductShowcaseSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div
        className="absolute -top-36 -right-24 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(49,142,241,0.22), transparent 70%)" }}
      />

      <div className="container relative">
        <div className="grid lg:grid-cols-[0.82fr_1fr] gap-16 lg:gap-20 items-center">
          <Reveal className="max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full py-1.5 px-4 border border-white/10 bg-white/[0.04] backdrop-blur-md text-xs font-medium uppercase tracking-[0.1em] text-white/65 mb-7">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5BA6F5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M7 15l3-4 3 2 4-6" />
              </svg>
              Tela real do produto
            </span>

            <h2 className="font-display text-4xl font-bold leading-[1.14] tracking-tight text-white mb-5">
              Isso não é uma estimativa.
              <br />É o que abre quando
              <br />você conecta sua loja.
            </h2>
            <p className="text-white/55 text-base leading-relaxed">
              Shopee, TikTok Shop e Mercado Livre consolidados num único resumo — receita, custo e
              lucro de verdade, não o que sobra depois de tentar somar planilha.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <DREMockup />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
