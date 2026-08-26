import { ArrowRight, ChevronDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, type MouseEvent } from "react";
import { Reveal, EXPO_OUT } from "./Reveal";
import { RollButton } from "./RollButton";
import { useCountUp } from "./hooks";
import logoShopee from "@/assets/logo-shopee.jpg";
import logoTikTok from "@/assets/logo-tiktok.png";

const breakdown = [
  { label: "Preço de venda", value: 89.9, pct: 100, color: "bg-white/25" },
  { label: "Taxas do marketplace", value: 17.98, pct: 20, color: "bg-red-400/70" },
  { label: "Custo do produto", value: 24.1, pct: 27, color: "bg-white/25" },
  { label: "Lucro líquido", value: 47.82, pct: 53, color: "bg-[#318EF1]" },
];

const headline = [
  { text: "Descubra" },
  { text: "o" },
  { text: "seu" },
  { text: "lucro real", accent: true },
  { text: "em" },
  { text: "cada" },
  { text: "pedido" },
];

function OrderProfitMockup() {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 22 });

  const [start, setStart] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStart(true), 700);
    return () => clearTimeout(t);
  }, []);

  const margin = useCountUp(532, 1400, start);
  const monthProfit = useCountUp(4820, 1400, start);
  const trend = useCountUp(124, 1000, start);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className="relative" style={{ perspective: 1200 }}>
      <div className="absolute -inset-8 rounded-[2.5rem] bg-[#318EF1]/20 blur-3xl" />

      {/* Flutuação ambiente (idle) — a inclinação por mouse fica no card interno,
         separada num nó próprio pra não brigar pelo mesmo transform. */}
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="glass-panel relative rounded-2xl shadow-2xl p-7 w-full max-w-md"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-white/40 text-[11px] uppercase tracking-wider mb-1">Pedido #48291</p>
              <p className="text-white text-base font-semibold">Fone Bluetooth X200</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-[#F97316]/20 text-[#F97316] px-2 py-1 rounded-md">
              Shopee
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {breakdown.map((row, i) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/60">{row.label}</span>
                  <span className={`font-mono font-medium ${row.label === "Lucro líquido" ? "text-[#318EF1]" : "text-white/80"}`}>
                    R$ {row.value.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${row.color}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${row.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 + i * 0.12, ease: EXPO_OUT }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-white/50 text-sm">Margem líquida</span>
            <span className="text-white font-display font-semibold text-xl tabular-nums">{(margin / 10).toFixed(1)}%</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="glass-card absolute -bottom-6 -left-6 rounded-xl px-4 py-3 flex items-center gap-2"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Lucro do mês</p>
          <p className="text-sm font-bold text-gray-900 tabular-nums">R$ {monthProfit.toLocaleString("pt-BR")},00</p>
        </div>
      </motion.div>

      <motion.div
        className="glass-card absolute -top-5 -right-5 rounded-xl px-3.5 py-2.5 flex items-center gap-1.5"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[#0A1628] text-xs font-bold tabular-nums">+{(trend / 10).toFixed(1)}% essa semana</span>
      </motion.div>
    </div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex flex-col pt-28 pb-8 relative text-white">
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 78% 45%, rgba(49,142,241,0.32) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10 flex-1 flex items-center">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-16 lg:gap-8 items-center">
          <Reveal className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#318EF1] animate-pulse" />
              <span className="text-white/80 text-sm font-medium">Gestão financeira para marketplaces</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-[-0.02em] mb-6">
              {headline.map((word, i) => (
                <span key={i} className="inline-block overflow-hidden pb-1 mr-[0.28em] align-bottom">
                  <motion.span
                    className={`inline-block ${word.accent ? "text-[#318EF1]" : "text-white"}`}
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 + i * 0.06, ease: EXPO_OUT }}
                  >
                    {word.text}
                  </motion.span>
                </span>
              ))}
            </h1>

            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-md">
              O Seller Finance entrega gestão financeira completa para vendedores de Shopee e
              TikTok Shop — cálculo de lucro, precificação inteligente e DRE automático em um só
              lugar.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-10">
              <RollButton
                label="Assine agora"
                icon={<ArrowRight size={14} className="text-white" />}
                onClick={() => navigate("/user/auth?redirect=/planos")}
                className="bg-[#318EF1] hover:bg-[#2678d1] text-white pl-6 pr-4 py-2 shadow-[0_10px_30px_-6px_rgba(49,142,241,0.55)] hover:shadow-[0_14px_36px_-6px_rgba(49,142,241,0.65)] hover:-translate-y-0.5 transition-all"
                textWrapperClassName="text-[15px] font-semibold"
                circleClassName="w-4 h-4"
              />
              <span className="text-white/50 text-sm">Cancele quando quiser</span>
            </div>

            {/* Antes mostrava avatares com iniciais genéricas ("C", "A", "R", "M")
               afirmando "vendedores já usam" sem nenhuma fonte real por trás —
               mesma prova social fabricada que a StatsSection tinha. Troca por
               uma afirmação verificável: o produto realmente conecta com essas
               lojas, sem alegar escala/uso que a gente não tem como provar. */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={logoShopee} alt="Shopee" className="w-6 h-6 object-contain" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={logoTikTok} alt="TikTok Shop" className="w-7 h-7 object-contain" />
                </div>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Conecta direto com sua loja</p>
                <p className="text-white/50 text-xs">Shopee · TikTok Shop</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:pt-8 lg:pl-6">
            <OrderProfitMockup />
          </Reveal>
        </div>
      </div>

      <motion.div
        className="relative z-10 hidden md:flex justify-center pb-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-5 h-5 text-white/30" />
      </motion.div>
    </section>
  );
}
