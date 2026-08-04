import { useEffect } from "react";
import Lenis from "lenis";
import { ensureScrollTrigger, gsap, prefersReducedMotion } from "./scrolltrigger";

export function useLenisScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const ScrollTrigger = ensureScrollTrigger();
    const lenis = new Lenis({ autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
}
