import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCountUp } from "./hooks";
import { EXPO_OUT } from "./Reveal";

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const sellers = useCountUp(500, 1500, visible);
  const orders = useCountUp(50000, 1500, visible);
  const savings = useCountUp(37, 1200, visible);

  const stats = [
    { value: `+${sellers}`, label: "Vendedores ativos" },
    { value: `+${orders.toLocaleString("pt-BR")}`, label: "Pedidos analisados" },
    { value: `R$ ${savings}`, label: "Por mês — sem surpresas" },
  ];

  return (
    <section className="py-16 border-y border-white/10" ref={ref}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EXPO_OUT }}
            >
              <p className="font-display text-4xl md:text-5xl font-bold text-[#318EF1] mb-2">{stat.value}</p>
              <p className="text-white/60 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
