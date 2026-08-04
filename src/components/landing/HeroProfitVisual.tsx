import { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

type Step = { label: string; value: number; kind: "base" | "deduction" | "result" };

const steps: Step[] = [
  { label: "Pedido Shopee", value: 100, kind: "base" },
  { label: "Taxa Shopee", value: -18, kind: "deduction" },
  { label: "Frete", value: -8, kind: "deduction" },
  { label: "Imposto", value: -4, kind: "deduction" },
  { label: "Lucro real", value: 70, kind: "result" },
];

function formatBRL(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}R$ ${Math.abs(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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

  return (
    <div ref={ref} className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 shadow-2xl"
      >
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">Exemplo real</p>
        <h3 className="text-white font-serif text-xl md:text-2xl mb-6">
          De cada pedido ao lucro que sobra
        </h3>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.15 * i }}
              className={`flex items-center justify-between gap-4 ${
                step.kind === "result" ? "pt-3 border-t border-white/15" : ""
              }`}
            >
              <span className={`text-sm ${step.kind === "result" ? "text-white font-semibold" : "text-white/60"}`}>
                {step.label}
              </span>
              <AnimatedCurrency
                value={step.value}
                active={inView}
                className={`font-mono tabular-nums ${
                  step.kind === "result"
                    ? "text-gold text-2xl font-bold"
                    : step.kind === "base"
                      ? "text-white text-sm"
                      : "text-white/60 text-sm"
                }`}
              />
            </motion.div>
          ))}
        </div>

        <div className="h-20 mt-6 -mx-2" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={steps} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis type="number" hide domain={[-30, 100]} />
              <YAxis type="category" dataKey="label" hide />
              <Bar dataKey="value" radius={4} isAnimationActive={inView} animationDuration={900} animationBegin={200}>
                {steps.map((step) => (
                  <Cell
                    key={step.label}
                    fill={
                      step.kind === "result"
                        ? "hsl(var(--gold))"
                        : step.kind === "base"
                          ? "hsl(var(--primary))"
                          : "hsl(var(--destructive) / 0.55)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
