import type { MouseEvent, ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface RollButtonProps {
  label: ReactNode;
  icon: ReactNode;
  className?: string;
  textWrapperClassName?: string;
  circleClassName?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Desloca o botão alguns px em direção ao cursor dentro da sua área —
   *  reservado pro CTA primário (ver docs/DESIGN-DIRECTION.md addendum P6),
   *  não pros usos secundários (login da navbar etc.) pra não virar tique
   *  repetido em todo botão do site. */
  magnetic?: boolean;
}

// Botão com brilho diagonal cruzando no hover + ícone que desliza pra dentro
// (mesmo padrão usado no Login da Navbar) — CTA principal em toda a landing.
export function RollButton({
  label,
  icon,
  className = "",
  textWrapperClassName = "",
  circleClassName = "",
  onClick,
  type = "button",
  disabled = false,
  magnetic = false,
}: RollButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.4 });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!magnetic) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.3);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.3);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={magnetic ? { x: springX, y: springY } : undefined}
      className={`group relative overflow-hidden inline-flex items-center gap-1.5 rounded-full transition-colors duration-300 disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      <span className={`relative z-10 ${textWrapperClassName}`}>{label}</span>
      <span
        className={`relative z-10 flex items-center justify-center rounded-full shrink-0 -ml-1.5 scale-0 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:ml-0 group-hover:scale-100 group-hover:opacity-100 ${circleClassName}`}
      >
        {icon}
      </span>
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none" />
    </motion.button>
  );
}
