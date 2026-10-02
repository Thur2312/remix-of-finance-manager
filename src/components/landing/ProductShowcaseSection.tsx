import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "./Reveal";

gsap.registerPlugin(ScrollTrigger);

// "O Extrato Que Falta": em vez de um cartão de DRE que só aparece pronto
// (reveal no mount), a seção prende a tela por um trecho de rolagem e a
// conta se resolve ao vivo, controlada pelo próprio scroll — receita entra,
// o desconto sai, o lucro líquido pousa. Números 100% reais e já existentes
// no projeto (mesmos de antes), só a forma de revelar muda: de "aparece
// pronto" pra "acontece enquanto você rola". Em mobile/prefers-reduced-motion
// não prende a tela — mostra o resultado final direto (ver gsap.matchMedia
// abaixo), igual ao resto da landing.
const RECEITA = 47320;
const CUSTOS = 34480;
const LUCRO = 12840;
const MARGEM = "27,1%";

function formatBRL(value: number) {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function DREMockup() {
  const cardRef = useRef<HTMLDivElement>(null);
  const receitaValueRef = useRef<HTMLSpanElement>(null);
  const custosValueRef = useRef<HTMLSpanElement>(null);
  const lucroValueRef = useRef<HTMLSpanElement>(null);
  const marginValueRef = useRef<HTMLSpanElement>(null);
  const receitaBarRef = useRef<HTMLDivElement>(null);
  const custosBarRef = useRef<HTMLDivElement>(null);
  const lucroBarRef = useRef<HTMLDivElement>(null);
  const lucroRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const section = card?.closest("[data-pin-section]") as HTMLElement | null;
    if (!card || !section) return;

    const setText = (el: HTMLSpanElement | null, value: number) => {
      if (el) el.textContent = formatBRL(value);
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop + sem prefers-reduced-motion: trava a tela e resolve a
      // conta em sincronia com o scroll (scrub, reversível pra trás também).
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        gsap.set([receitaBarRef.current, custosBarRef.current, lucroBarRef.current], { width: 0 });
        setText(receitaValueRef.current, 0);
        setText(custosValueRef.current, 0);
        setText(lucroValueRef.current, 0);
        if (marginValueRef.current) marginValueRef.current.textContent = "0,0%";

        const counters = { receita: 0, custos: 0, lucro: 0 };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=100%",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        });

        tl.to(receitaBarRef.current, { width: "100%", duration: 0.3, ease: "none" }, 0)
          .to(
            counters,
            {
              receita: RECEITA,
              duration: 0.3,
              ease: "none",
              onUpdate: () => setText(receitaValueRef.current, counters.receita),
            },
            0,
          )
          .to(custosBarRef.current, { width: "73%", duration: 0.32, ease: "none" }, 0.36)
          .to(
            counters,
            {
              custos: CUSTOS,
              duration: 0.32,
              ease: "none",
              onUpdate: () => setText(custosValueRef.current, counters.custos),
            },
            0.36,
          )
          .to(lucroBarRef.current, { width: "27%", duration: 0.26, ease: "none" }, 0.72)
          .to(
            counters,
            {
              lucro: LUCRO,
              duration: 0.26,
              ease: "none",
              onUpdate: () => setText(lucroValueRef.current, counters.lucro),
            },
            0.72,
          )
          .to(
            lucroRowRef.current,
            { scale: 1.04, duration: 0.1, ease: "power1.out", yoyo: true, repeat: 1 },
            0.92,
          )
          .call(() => {
            if (marginValueRef.current) marginValueRef.current.textContent = MARGEM;
          }, [], 0.92);

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      // Mobile ou prefers-reduced-motion: sem pin, mostra o resultado final
      // direto (mesmo princípio dos heros com pin do resto da landing).
      mm.add("(prefers-reduced-motion: reduce), (max-width: 767px)", () => {
        gsap.set(receitaBarRef.current, { width: "100%" });
        gsap.set(custosBarRef.current, { width: "73%" });
        gsap.set(lucroBarRef.current, { width: "27%" });
        setText(receitaValueRef.current, RECEITA);
        setText(custosValueRef.current, CUSTOS);
        setText(lucroValueRef.current, LUCRO);
        if (marginValueRef.current) marginValueRef.current.textContent = MARGEM;
      });

      return () => mm.revert();
    }, card);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={cardRef} className="relative max-w-[480px] ml-auto">
      <div className="glass-card rounded-2xl p-7">
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
          <div>
            <div className="flex items-center justify-between text-[13px] mb-1.5">
              <span className="text-[#0A1628]/55">Receita Bruta</span>
              <span ref={receitaValueRef} className="font-mono font-bold text-[#0A1628] tabular-nums">
                R$ 0
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0A1628]/[0.07] overflow-hidden">
              <div ref={receitaBarRef} className="h-full rounded-full bg-[#0A1628]/20" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[13px] mb-1.5">
              <span className="text-[#0A1628]/55">Custos e taxas</span>
              <span ref={custosValueRef} className="font-mono font-bold text-[#0A1628] tabular-nums">
                R$ 0
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0A1628]/[0.07] overflow-hidden">
              <div ref={custosBarRef} className="h-full rounded-full bg-red-500/45" />
            </div>
          </div>

          <div ref={lucroRowRef}>
            <div className="flex items-center justify-between text-[13px] mb-1.5">
              <span className="text-[#0A1628]/70 font-medium">Lucro líquido</span>
              <span ref={lucroValueRef} className="font-mono font-bold text-[#1F5FC4] tabular-nums">
                R$ 0
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0A1628]/[0.07] overflow-hidden">
              <div ref={lucroBarRef} className="h-full rounded-full bg-[#318EF1]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#0A1628]/[0.08]">
          <span className="text-[13px] text-[#0A1628]/50">Margem líquida</span>
          <span ref={marginValueRef} className="font-display font-bold text-xl text-[#0A1628] tabular-nums">
            0,0%
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductShowcaseSection() {
  return (
    <section data-pin-section className="relative py-24 md:py-32 overflow-hidden min-h-screen flex items-center">
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

          <DREMockup />
        </div>
      </div>
    </section>
  );
}
