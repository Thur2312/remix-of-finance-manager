import { type Variants } from 'framer-motion';

// Easing de assinatura da área interna — "expo out" (curva lenta na chegada,
// lê como intencional em vez do ease-out genérico do navegador). Mesmo valor
// que a landing usa (src/components/landing/Reveal.tsx:EXPO_OUT) e que já está
// espalhado em .panel / .btn-cta no index.css — aqui é o ponto único pro JS.
export const EXPO_OUT = [0.16, 1, 0.3, 1] as const;

// Entrada padrão de um bloco (fade + leve subida). Curta — a área interna não
// é a landing, o movimento serve só pra dar continuidade, não pra encenar.
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EXPO_OUT } },
};

// Container de cascata (grids de KPI/card). O item entra com `fadeSlideUp`.
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

// Transição de troca de rota (usada no InternalLayout).
export const routeTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: EXPO_OUT },
} as const;
