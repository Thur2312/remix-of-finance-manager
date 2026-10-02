import { motion } from "framer-motion";

// Peça gráfica assinatura do Hero (ver docs/DESIGN-DIRECTION.md addendum P5):
// a linha de perfuração de um recibo de verdade, separando "o que foi
// descontado" de "o que sobra" — reforça literalmente o conceito do produto
// em vez de um divisor genérico. Desenhada uma vez ao entrar em view
// (stroke-dashoffset + pathLength, não é mecânica de scroll nova — dispara
// com whileInView, igual ao resto dos reveals da landing).
export function ReceiptTear({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 12"
      preserveAspectRatio="none"
      className={`w-full h-3 ${className}`}
      aria-hidden="true"
    >
      <motion.line
        x1="2"
        y1="6"
        x2="398"
        y2="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="0.5 11"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
    </svg>
  );
}
