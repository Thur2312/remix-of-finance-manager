import { useState } from "react";
import { Building2, CheckCircle2, Crown, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EnterpriseLeadDialog } from "@/components/EnterpriseLeadDialog";
import { Reveal } from "./Reveal";
import { SectionTag } from "./SectionTag";
import { TiltCard } from "./TiltCard";

// Espelha plan_permissions.contas_por_marketplace (migration
// 20261001210000_marketplace_account_limit.sql) — única diferenciação real
// entre os planos pagos hoje. Ver mesmo comentário em src/pages/Planos.tsx.
const CONTAS_POR_MARKETPLACE: Record<string, number> = { mensal: 2, semestral: 3, anual: 5 };

const pricingFeaturesBase = [
  "Cálculo de lucro por pedido",
  "Calculadora de precificação",
  "DRE automático",
  "Integração com Shopee",
  "Integração com Mercado Livre",
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
    <section id="planos" className="relative py-20 md:py-32 text-landing-ink">
      <div className="container">
        <Reveal className="flex justify-center mb-6">
          <SectionTag index={4} total={5} label="Planos e preços" />
        </Reveal>
        <Reveal className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-landing-ink tracking-[-0.02em]">
            Plano simples, transparente e sem surpresas
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-5 max-w-6xl mx-auto items-stretch">
          {pricingPlans.map((plan, i) => (
            // Wrapper estático carrega o destaque do plano popular (scale/translate);
            // o Reveal interno cuida só da entrada, pra não brigarem pelo mesmo transform.
            <div key={plan.id} className={`relative h-full ${plan.popular ? "xl:-translate-y-5 xl:scale-[1.05] xl:z-10" : ""}`}>
            {plan.popular && <div className="absolute -inset-3 rounded-[2rem] bg-landing-stamp/15 blur-2xl pointer-events-none" />}
            <Reveal delay={i * 0.08} className="h-full">
            <TiltCard className="paper-card relative rounded-3xl overflow-hidden flex flex-col h-full">
              {plan.popular && (
                <div className="absolute top-4 right-4 bg-landing-stamp text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full -rotate-3 shadow-[0_4px_12px_-2px_hsl(var(--landing-stamp)/0.5)]">
                  Mais popular
                </div>
              )}

              <div className="px-6 pt-8 pb-6 bg-landing-ink">
                <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                  <plan.icon className="w-3.5 h-3.5" />
                  {plan.tag}
                </div>
                <h3 className="text-white font-bold text-2xl mb-1">{plan.name}</h3>
                <p className="text-white/65 text-sm">Seller Finance</p>
              </div>

              <div className="px-6 py-6 border-b border-landing-ink/10">
                <div className="flex items-end gap-1">
                  <span className="text-landing-ink-muted text-base font-medium">R$</span>
                  <span className="font-display text-4xl font-bold text-landing-ink">{plan.price}</span>
                  <span className="text-landing-ink-muted text-base mb-1">,{plan.cents}</span>
                </div>
                <p className="text-landing-ink-muted text-xs mt-1">{plan.priceSuffix}</p>
                {plan.billingNote && <p className="text-landing-ink-muted/70 text-[11px] mt-1">{plan.billingNote}</p>}
              </div>

              <div className="px-6 py-4">
                <button onClick={() => navigate("/user/auth?redirect=/planos")} className="btn-cta-stamp">
                  ASSINE AGORA →
                </button>
              </div>

              <div className="px-6 pb-8 flex-1">
                <p className="text-landing-ink-muted text-xs font-semibold uppercase tracking-wider mb-4">Funcionalidades incluídas:</p>
                <div className="space-y-2.5">
                  {[`Até ${CONTAS_POR_MARKETPLACE[plan.id]} contas por marketplace`, ...pricingFeaturesBase].map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-landing-ledger flex-shrink-0" />
                      <span className="text-landing-ink/80 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
            </Reveal>
            </div>
          ))}

          {/* Plano Empresarial — card escuro de propósito, pra destacar contra os cards de papel */}
          <Reveal delay={pricingPlans.length * 0.08} className="bg-landing-ink relative rounded-3xl overflow-hidden flex flex-col h-full">
            <div className="px-6 pt-8 pb-6">
              <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-white text-xs font-semibold mb-3">
                <Building2 className="w-3.5 h-3.5" />
                SOB MEDIDA
              </div>
              <h3 className="text-white font-bold text-2xl mb-1">Empresarial</h3>
              <p className="text-white/55 text-sm">Para operações com múltiplas lojas ou grandes volumes</p>
            </div>

            <div className="px-6 py-6 border-b border-white/10">
              <span className="font-display text-3xl font-bold text-white">Vamos conversar</span>
              <p className="text-white/45 text-xs mt-1">Proposta personalizada para o seu negócio</p>
            </div>

            <div className="px-6 py-4">
              <button onClick={() => setLeadDialogOpen(true)} className="btn-cta bg-white !text-landing-ink hover:opacity-90">
                FALE COM NOSSO TIME →
              </button>
            </div>

            <div className="px-6 pb-8 flex-1">
              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-4">Além de tudo do plano padrão:</p>
              <div className="space-y-2.5">
                {[
                  "Múltiplas lojas e CNPJs",
                  "Onboarding assistido",
                  "Suporte prioritário via WhatsApp",
                  "Relatórios e integrações sob medida",
                ].map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-landing-ledger-light flex-shrink-0" />
                    <span className="text-white/75 text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bonus banner */}
        <Reveal className="paper-panel max-w-6xl mx-auto mt-10 xl:mt-16 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-landing-stamp/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-landing-stamp" />
          </div>
          <p className="text-landing-ink-muted text-sm">
            Assine agora e tenha acesso imediato a todas as funcionalidades, incluindo integrações com Shopee,
            Mercado Livre e TikTok Shop.
          </p>
        </Reveal>
      </div>

      <EnterpriseLeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} />
    </section>
  );
}
