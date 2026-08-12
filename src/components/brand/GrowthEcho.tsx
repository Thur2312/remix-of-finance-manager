import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EXPO_OUT } from "@/components/landing/Reveal";

type GrowthEchoProps = {
  /** "glyph" — ícone compacto (substitui AlertCircle etc. em estados vazios).
   *  "ribbon" — linha fina horizontal, assinatura de marca em topbar/onboarding. */
  variant?: "glyph" | "ribbon";
  /** "mount" desenha assim que aparece (modais, estados vazios).
   *  "in-view" espera entrar na viewport (cards mais abaixo na página). */
  trigger?: "mount" | "in-view";
  className?: string;
};

const GLYPH_PATH = "M4 24 C 9 24, 11 17, 15 15 C 19 13, 20 9, 26 6";
const RIBBON_PATH = "M2 13 C 20 13, 26 4, 46 4 C 66 4, 74 11, 98 5";

// Eco compacto do GrowthMotif da landing — mesmo vocabulário (traço ascendente,
// azul → dourado), mas sem scroll-scrub: desenha uma vez (ao montar ou ao
// entrar em vista) e para. É assinatura de marca, não visualização de dado
// real, então nunca precisa refletir números — mantém zero acoplamento com
// lógica de negócio.
export function GrowthEcho({ variant = "glyph", trigger = "mount", className }: GrowthEchoProps) {
  const gradientId = `growth-echo-${useId()}`;
  const reduceMotion = useReducedMotion();
  const isGlyph = variant === "glyph";
  const path = isGlyph ? GLYPH_PATH : RIBBON_PATH;
  const viewBox = isGlyph ? "0 0 32 32" : "0 0 100 16";
  const tip = isGlyph ? { cx: 26, cy: 6 } : { cx: 98, cy: 5 };

  const drawTransition = reduceMotion
    ? { duration: 0 }
    : { duration: isGlyph ? 0.7 : 0.9, ease: EXPO_OUT };

  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent-gold))" />
        </linearGradient>
      </defs>
      <motion.path
        d={path}
        stroke={`url(#${gradientId})`}
        strokeWidth={isGlyph ? 2.5 : 2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        {...(trigger === "mount"
          ? { animate: { pathLength: 1 } }
          : { whileInView: { pathLength: 1 }, viewport: { once: true, margin: "-40px" } })}
        transition={drawTransition}
      />
      <motion.circle
        cx={tip.cx}
        cy={tip.cy}
        r={isGlyph ? 2.25 : 2}
        fill="hsl(var(--accent-gold))"
        initial={{ opacity: 0, scale: 0.4 }}
        {...(trigger === "mount"
          ? { animate: { opacity: 1, scale: 1 } }
          : { whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: "-40px" } })}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.3, delay: drawTransition.duration, ease: EXPO_OUT }
        }
      />
    </svg>
  );
}
