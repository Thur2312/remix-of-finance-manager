import { type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Graus máximos de inclinação — sutil de propósito (ver addendum P6,
   *  docs/DESIGN-DIRECTION.md: "poucos graus", não o tilt dramático do
   *  HeroProfitVisual, que é a peça-assinatura e pode ser mais ousada). */
  maxTilt?: number;
}

// Tilt 3D sutil no hover, reaproveitando a mesma técnica do OrderProfitMockup
// (HeroSection.tsx) — rotateX/rotateY via mouse position, com spring pra
// suavizar. Extraído pra componente porque agora tem 2 usos (Hero + cards
// de preço) e a lógica é idêntica nos dois.
export function TiltCard({ children, className = "", maxTilt = 4 }: TiltCardProps) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), { stiffness: 200, damping: 22 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), { stiffness: 200, damping: 22 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} className="h-full">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}
