import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { prefersReducedMotion } from "./scrolltrigger";

type Step = { label: string; value: number; kind: "base" | "deduction" };

const steps: Step[] = [
  { label: "Pedido Shopee", value: 100, kind: "base" },
  { label: "Taxa Shopee", value: -18, kind: "deduction" },
  { label: "Frete", value: -8, kind: "deduction" },
  { label: "Imposto", value: -4, kind: "deduction" },
];

const PROFIT = 70;

function formatBRL(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}R$ ${Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Path de "rasgo de perfuracao" -- zigue-zague desenhado a mao, nao icone de
// biblioteca, pra separar a lista de descontos do total como um recibo real.
function tearPath(teeth = 28, amplitude = 3.2, width = 100, baseline = 6) {
  let d = `M0,${baseline}`;
  for (let i = 1; i <= teeth; i++) {
    const x = (width / teeth) * i;
    const y = i % 2 === 0 ? baseline - amplitude : baseline + amplitude;
    d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}
const TEAR_PATH = tearPath();

function AnimatedCurrency({ value, active, className }: { value: number; active: boolean; className?: string }) {
  const spring = useSpring(0, { stiffness: 90, damping: 22 });
  const [display, setDisplay] = useState(formatBRL(0));

  useEffect(() => {
    if (active) spring.set(value);
  }, [active, value, spring]);

  useEffect(() => spring.on("change", (v) => setDisplay(formatBRL(v))), [spring]);

  return <span className={className}>{display}</span>;
}

export function HeroProfitVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [cursorActive, setCursorActive] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const cursorSpringX = useSpring(cursorX, { stiffness: 300, damping: 28, mass: 0.4 });
  const cursorSpringY = useSpring(cursorY, { stiffness: 300, damping: 28, mass: 0.4 });

  const handleCursorMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    cursorX.set(e.clientX - rect.left);
    cursorY.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={ref}
      className={`relative ${!prefersReducedMotion() ? "cursor-none" : ""}`}
      onMouseMove={handleCursorMove}
      onMouseEnter={() => !prefersReducedMotion() && setCursorActive(true)}
      onMouseLeave={() => setCursorActive(false)}
    >
      <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />
      {cursorActive && (
        <motion.div
          className="pointer-events-none absolute z-20 flex items-center justify-center w-9 h-9 rounded-full bg-gold text-navy text-[10px] font-mono font-bold -translate-x-1/2 -translate-y-1/2"
          style={{ left: cursorSpringX, top: cursorSpringY }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          aria-hidden
        >
          R$
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-gold-glow"
      >
        <div className="p-6 md:p-8 pb-4">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Exemplo real</p>
          <h3 className="text-white font-serif text-xl md:text-2xl mb-6">
            De cada pedido ao lucro que sobra
          </h3>

          <div className="space-y-3 font-mono">
            {steps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-baseline gap-2"
              >
                <span className="text-white/60 text-sm whitespace-nowrap">{step.label}</span>
                <span className="flex-1 border-b border-dotted border-white/20 translate-y-[-3px]" aria-hidden />
                <AnimatedCurrency
                  value={step.value}
                  active={inView}
                  className={`tabular-nums text-sm ${step.kind === "base" ? "text-white" : "text-white/60"}`}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="w-full h-3 block" aria-hidden>
          <motion.path
            d={TEAR_PATH}
            fill="none"
            stroke="hsl(var(--gold) / 0.45)"
            strokeWidth={0.8}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="px-6 md:px-8 pt-3 pb-6 md:pb-8 bg-gold/[0.07]"
        >
          <p className="text-gold/70 text-xs font-semibold uppercase tracking-[0.2em] mb-1">Lucro real</p>
          <AnimatedCurrency
            value={PROFIT}
            active={inView}
            className="block font-serif text-6xl md:text-7xl font-semibold text-gold leading-[0.95] tracking-tight -ml-0.5"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
