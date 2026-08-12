import { ArrowRight, Calculator, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { RollButton } from "./RollButton";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-28 text-white">
      <div className="container relative z-10">
        <div className="glass-panel rounded-[2.5rem] p-8 md:p-14 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-[-0.02em] mb-6">
              Pronto para descobrir seu lucro real nos marketplaces?
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Crie sua conta hoje e experimente o impacto real que o Seller Finance gera na clareza financeira e
              lucratividade da sua loja.
            </p>
            <RollButton
              label="Assine agora"
              icon={<ArrowRight size={14} className="text-white" />}
              onClick={() => navigate("/user/auth?redirect=/planos")}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white pl-6 pr-2 py-2 shadow-[0_10px_30px_-6px_rgba(49,142,241,0.55)] hover:-translate-y-0.5 transition-all"
              textWrapperClassName="text-[15px] font-semibold"
              circleClassName="w-8 h-8 bg-white/20"
            />
          </Reveal>

          <Reveal delay={0.15} className="hidden lg:block">
            <div className="relative">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card rounded-2xl p-6 mb-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#318EF1]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#318EF1]" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Lucro do mês</p>
                    <p className="text-[#0A1628] font-bold text-xl">R$ 8.420,00</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 bg-[#318EF1] rounded-full w-3/4" />
                </div>
                <p className="text-gray-400 text-xs mt-1">75% da meta atingida</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="glass-card rounded-2xl p-6 ml-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#318EF1]/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-[#318EF1]" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Margem média</p>
                    <p className="text-[#0A1628] font-bold text-xl">32,5%</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
