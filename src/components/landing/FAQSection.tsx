import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { SectionTag } from "./SectionTag";

const faqs = [
  {
    q: "O que diferencia o Seller Finance de outras ferramentas?",
    a: "O Seller Finance é focado exclusivamente em gestão financeira para vendedores de marketplace, entregando cálculo de lucro real por pedido, DRE automático e calculadora de precificação — tudo integrado com Shopee e TikTok Shop.",
  },
  {
    q: "Há suporte disponível?",
    a: "Sim, oferecemos suporte técnico por e-mail. Nossa equipe está disponível para ajudar com dúvidas sobre integração, uso das funcionalidades e interpretação dos dados financeiros.",
  },
  {
    q: "Prazo de reembolso",
    a: "Se você assinar e, durante os primeiros 7 dias, perceber que o Seller Finance não é para você, basta solicitar o reembolso. Sem complicações.",
  },
  {
    q: "Forma de pagamento",
    a: "Aceitamos cartão de crédito como forma de pagamento. Assim, você nunca será pego de surpresa e seu acesso sempre ficará ativo.",
  },
  {
    q: "A integração com Shopee e TikTok Shop é segura?",
    a: "Sim. Nossa integração utiliza as APIs oficiais dos marketplaces, garantindo segurança e fidelidade nos dados. Seus dados financeiros são protegidos com criptografia.",
  },
  {
    q: "Funciona com outros marketplaces?",
    a: "Sim. O Seller Finance é integrado com Shopee, TikTok Shop e Mercado Livre. Estamos trabalhando para adicionar Amazon em breve.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Você pode cancelar sua assinatura a qualquer momento, sem multas ou burocracia. O acesso continua ativo até o fim do período pago.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 md:py-36 text-white">
      <div className="container max-w-3xl">
        <Reveal className="flex justify-center mb-6">
          <SectionTag index={5} total={5} label="Perguntas frequentes" />
        </Reveal>
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-[-0.02em]">Ainda com dúvidas?</h2>
        </Reveal>
        <Reveal delay={0.1} className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-panel rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-white pr-4">{faq.q}</span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    open === i ? "text-white" : "bg-white/[0.06] text-white/50"
                  }`}
                  style={open === i ? { backgroundColor: "#318EF1" } : {}}
                >
                  {open === i ? <X className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-5 pb-5 text-white/60 leading-relaxed text-sm">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
