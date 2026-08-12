import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

// Easing "expo out" customizado — troca o ease-out padrão do navegador por
// uma curva mais lenta na chegada, que lê como intencional em vez de genérica.
export const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}

export function Reveal({ children, className, delay = 0, y = 24, once = true }: RevealProps) {
  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EXPO_OUT } },
  };
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  once?: boolean;
}

// Para listas/grids onde cada item deve entrar em cascata (cards, steps, etc).
export function RevealGroup({ children, className, stagger = 0.08, once = true }: RevealGroupProps) {
  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={container}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, y = 20 }: { children: ReactNode; className?: string; y?: number }) {
  const item: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EXPO_OUT } },
  };
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
