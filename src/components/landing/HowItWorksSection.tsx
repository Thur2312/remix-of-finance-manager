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
    <section className="relative py-24 md:py-32 text-white">
      <div className="container">
        <Reveal className="mb-6">
          <SectionTag index={2} total={5} label="Como funciona" />
        </Reveal>
        <Reveal className="mb-14">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-[-0.02em] max-w-3xl">
            Entenda como o Seller Finance transforma sua gestão financeira
          </h2>
        </Reveal>

        {/* Passo 2 (o "lucro real", núcleo emocional do pitch) fica deslocado
           pra baixo e com destaque de cor — em vez dos 3 cards idênticos lado
           a lado, que era o clichê de grid simétrico "3-step how it works". */}
        <RevealGroup className="grid md:grid-cols-3 gap-6 mb-14">
          {steps.map((item, i) => (
            <RevealItem
              key={item.step}
              className={`rounded-2xl p-6 relative ${
                i === 1
                  ? "md:mt-10 bg-[#318EF1]/[0.08] border border-[#318EF1]/25 shadow-[0_20px_40px_-16px_rgba(49,142,241,0.35)]"
                  : "glass-panel"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`font-display text-4xl font-bold leading-none ${i === 1 ? "text-[#318EF1]/50" : "text-white/30"}`}>
                  {item.step}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    i === 1 ? "bg-[#318EF1] text-white" : "bg-[#318EF1]/15 text-[#318EF1]"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal className="text-center">
          <RollButton
            label="Conectar minha loja"
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
