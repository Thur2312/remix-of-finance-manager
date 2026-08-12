import { useState } from "react";
import { Building2, CheckCircle2, Crown, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EnterpriseLeadDialog } from "@/components/EnterpriseLeadDialog";
import { Reveal } from "./Reveal";
import { SectionTag } from "./SectionTag";

const pricingFeatures = [
  "Cálculo de lucro por pedido",
  "Calculadora de precificação",
  "DRE automático",
  "Integração com Shopee",
  "Integração com TikTok Shop",
  "Histórico financeiro completo",
  "Análise de margem por produto",
  "Suporte por e-mail",
];

const pricingPlans = [
  {
    id: "mensal",
    name: "Mensal",
    tag: "FLEXÍVEL",
    icon: Zap,
    price: "74",
    cents: "99",
    priceSuffix: "por mês",
    billingNote: null as string | null,
    popular: false,
  },
  {
    id: "semestral",
    name: "Semestral",
    tag: "ECONOMIZE",
    icon: Sparkles,
    price: "57",
    cents: "90",
    priceSuffix: "por mês",
    billingNote: "6x de R$ 57,90 — total R$ 347,40",
    popular: false,
  },
  {
    id: "anual",
    name: "Anual",
    tag: "MELHOR OFERTA",
    icon: Crown,
    price: "37",
    cents: "90",
    priceSuffix: "por mês",
    billingNote: "12x de R$ 37,90 — total R$ 454,80",
    popular: true,
  },
];

export function PricingSection() {
  const navigate = useNavigate();
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  return (
    <section id="planos" className="relative py-20 md:py-32 text-white">
      <div className="container">
        <Reveal className="flex justify-center mb-6">
          <SectionTag index={4} total={5} label="Planos e preços" />
        </Reveal>
        <Reveal className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-[-0.02em]">
            Plano simples, transparente e sem surpresas
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-5 max-w-6xl mx-auto items-stretch">
          {pricingPlans.map((plan, i) => (
            // Wrapper estático carrega o destaque do plano popular (scale/translate);
            // o Reveal interno cuida só da entrada, pra não brigarem pelo mesmo transform.
            <div key={plan.id} className={`relative h-full ${plan.popular ? "xl:-translate-y-5 xl:scale-[1.05] xl:z-10" : ""}`}>
            {plan.popular && <div className="absolute -inset-3 rounded-[2rem] bg-[#318EF1]/25 blur-2xl pointer-events-none" />}
            <Reveal
              delay={i * 0.08}
              className="glass-card relative rounded-3xl overflow-hidden flex flex-col h-full"
            >
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-[#0A1628] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Mais popular
                </div>
              )}

              <div className="px-6 pt-8 pb-6" style={{ backgroundColor: "#318EF1" }}>
                <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                  <plan.icon className="w-3.5 h-3.5" />
                  {plan.tag}
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">{plan.name}</h3>
                <p className="text-white/80 text-sm">Seller Finance</p>
              </div>

              <div className="px-6 py-6 border-b border-gray-100">
                <div className="flex items-end gap-1">
                  <span className="text-gray-500 text-base font-medium">R$</span>
                  <span className="font-display text-4xl font-bold text-[#0A1628]">{plan.price}</span>
                  <span className="text-gray-500 text-base mb-1">,{plan.cents}</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">{plan.priceSuffix}</p>
                {plan.billingNote && <p className="text-gray-400 text-[11px] mt-1">{plan.billingNote}</p>}
              </div>

              <div className="px-6 py-4">
                <button onClick={() => navigate("/user/auth?redirect=/planos")} className="btn-cta">
                  ASSINE AGORA →
                </button>
              </div>

              <div className="px-6 pb-8 flex-1">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">Funcionalidades incluídas:</p>
                <div className="space-y-2.5">
                  {pricingFeatures.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#318EF1] flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            </div>
          ))}

          {/* Plano Empresarial */}
          <Reveal delay={pricingPlans.length * 0.08} className="glass-panel relative rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="px-6 pt-8 pb-6">
              <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                <Building2 className="w-3.5 h-3.5" />
                SOB MEDIDA
              </div>
              <h3 className="text-white font-bold text-2xl mb-1">Empresarial</h3>
              <p className="text-white/60 text-sm">Para operações com múltiplas lojas ou grandes volumes</p>
            </div>

            <div className="px-6 py-6 border-b border-white/10">
              <span className="font-display text-3xl font-bold text-white">Vamos conversar</span>
              <p className="text-white/50 text-xs mt-1">Proposta personalizada para o seu negócio</p>
            </div>

            <div className="px-6 py-4">
              <button onClick={() => setLeadDialogOpen(true)} className="btn-cta bg-white !text-[#0A1628] hover:opacity-90">
                FALE COM NOSSO TIME →
              </button>
            </div>

            <div className="px-6 pb-8 flex-1">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">Além de tudo do plano padrão:</p>
              <div className="space-y-2.5">
                {[
                  "Múltiplas lojas e CNPJs",
                  "Onboarding assistido",
                  "Suporte prioritário via WhatsApp",
                  "Relatórios e integrações sob medida",
                ].map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#318EF1] flex-shrink-0" />
                    <span className="text-white/80 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bonus banner */}
        <Reveal className="glass-panel max-w-6xl mx-auto mt-10 xl:mt-16 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#318EF1]/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-[#318EF1]" />
          </div>
          <p className="text-white/80 text-sm">
            Assine agora e tenha acesso imediato a todas as funcionalidades, incluindo integrações com Shopee e TikTok
            Shop.
          </p>
        </Reveal>
      </div>

      <EnterpriseLeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} />
    </section>
  );
}
