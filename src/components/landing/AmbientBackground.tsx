import { motion } from "framer-motion";

// Camada fixa por trás de toda a landing — substitui a antiga sequência de
// seções coloridas por um único fundo navy com movimento sutil, pra dar vida
// sem competir com o conteúdo. Só CSS/framer-motion, sem dependência nova.
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0A1628]">
      <motion.div
        className="absolute w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full"
        style={{
          top: "-15%",
          right: "-10%",
          background: "radial-gradient(circle, rgba(49,142,241,0.28) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] rounded-full"
        style={{
          bottom: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(49,142,241,0.16) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute w-[35vw] h-[35vw] max-w-[520px] max-h-[520px] rounded-full"
        style={{
          top: "38%",
          left: "50%",
          background: "radial-gradient(circle, rgba(91,166,245,0.10) 0%, transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [0, 25, 0], y: [0, -25, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
      {/* Textura fina pra tirar o "chapado" de um gradiente puro */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  );
}
