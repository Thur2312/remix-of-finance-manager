import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

// Eco compacto do GrowthMotif da landing (src/components/landing/GrowthMotif.tsx)
// pro painel de marca do auth: mesma linguagem visual (linha ascendente azul→dourado,
// chip de dado, motas ambiente), mas sem GSAP/ScrollTrigger — aqui não há scroll pra
// escrubar, então o traço só desenha uma vez ao montar, via framer-motion (já usado
// no resto das telas de auth).
const PATH_D = "M12 210 C 70 175, 55 130, 110 108 C 160 88, 140 48, 196 18";

const DOTS = [
  { x: 24, y: 150, r: 2, dur: 5.5, delay: 0.2 },
  { x: 150, y: 60, r: 1.6, dur: 6.2, delay: 1 },
  { x: 90, y: 20, r: 1.8, dur: 5, delay: 0.6 },
];

export function AuthMotif() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 210 230"
        className="absolute -right-4 top-6 w-[72%] max-w-[240px] h-auto opacity-80"
        fill="none"
      >
        <defs>
          <linearGradient id="authMotifGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#5BA6F5" stopOpacity="0.6" />
            <stop offset="65%" stopColor="#318EF1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F2C078" stopOpacity="0.85" />
          </linearGradient>
          <filter id="authMotifGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {DOTS.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="#5BA6F5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0], y: [d.y, d.y - 14, d.y] }}
            transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <motion.path
          d={PATH_D}
          stroke="url(#authMotifGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }, opacity: { duration: 0.3, delay: 0.5 } }}
        />

        <motion.circle
          cx={196}
          cy={18}
          r={4}
          fill="#F2C078"
          filter="url(#authMotifGlow)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: [1, 1.25, 1] }}
          transition={{
            opacity: { delay: 1.9, duration: 0.3 },
            scale: { delay: 1.9, duration: 2.4, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </svg>

      <motion.div
        className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-sm px-2.5 py-1.5"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <TrendingUp className="w-3 h-3 text-[#8CC4FF] shrink-0" />
        <span className="text-[11px] font-semibold text-white/80 leading-none whitespace-nowrap">
          Lucro real <span className="ml-1 font-normal text-white/40">em tempo real</span>
        </span>
      </motion.div>
    </div>
  );
}
