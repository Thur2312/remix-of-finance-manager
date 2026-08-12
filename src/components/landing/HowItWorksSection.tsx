import { ArrowRight, BarChart3, DollarSign, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal, RevealGroup, RevealItem } from "./Reveal";
import { SectionTag } from "./SectionTag";
import { RollButton } from "./RollButton";

const steps = [
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

export function HowItWorksSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-28 text-white">
      <div className="container">
        <Reveal className="mb-6">
          <SectionTag index={2} total={5} label="Como funciona" />
        </Reveal>
        <Reveal className="mb-12">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-[-0.02em] max-w-3xl">
            Entenda como o Seller Finance transforma sua gestão financeira
          </h2>
        </Reveal>

        <div className="relative mb-12">
          <div className="hidden md:block absolute left-[16.6%] right-[16.6%] top-[38px] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <RevealGroup className="grid md:grid-cols-3 gap-6">
            {steps.map((item) => (
              <RevealItem key={item.step} className="glass-panel rounded-2xl p-6 relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-display text-white/30 text-4xl font-bold leading-none">{item.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-[#318EF1]/15 flex items-center justify-center text-[#318EF1]">
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal className="text-center">
          <RollButton
            label="Assine agora"
            icon={<ArrowRight size={14} className="text-white" />}
            onClick={() => navigate("/user/auth?redirect=/planos")}
            className="bg-[#318EF1] hover:bg-[#2678d1] text-white pl-6 pr-2 py-2 mx-auto shadow-[0_10px_30px_-6px_rgba(49,142,241,0.55)] hover:-translate-y-0.5 transition-all"
            textWrapperClassName="text-[15px] font-semibold"
            circleClassName="w-8 h-8 bg-white/20"
          />
        </Reveal>
      </div>
    </section>
  );
}
