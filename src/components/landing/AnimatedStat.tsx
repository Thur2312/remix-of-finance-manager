import { useEffect, useState } from "react";
import { useInView, useSpring } from "framer-motion";
import { useRef } from "react";

export function AnimatedStat({
  target,
  prefix = "",
  formatter,
  className,
}: {
  target: number;
  prefix?: string;
  formatter?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) spring.set(target);
  }, [inView, target, spring]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.floor(v))), [spring]);

  const value = formatter ? formatter(display) : `${prefix}${display.toLocaleString("pt-BR")}`;

  return (
    <p ref={ref} className={className}>
      {value}
    </p>
  );
}
