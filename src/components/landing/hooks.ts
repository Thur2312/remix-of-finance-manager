import { useEffect, useState } from "react";

const NAV_OFFSET = 2; // espaço pra seção não ficar escondida atrás da navbar flutuante
const OVERSHOOT_PX = 30; // "quique" sutil no fim do scroll — não um salto exagerado
const SETTLE_DURATION = 600;

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Scroll animado até uma seção da landing (ou ao topo, se hash for "#"), em
// duas fases: viaja até um pouco além do alvo (easing "expo out", igual ao
// Reveal) e depois "assenta" de volta na posição certa (easing suave, curto)
// — dá o efeito de descida/subida artesanal em vez do salto instantâneo do
// navegador ou de um scroll-behavior:smooth linear/robótico.
export function scrollToSection(hash: string) {
  const id = hash.replace(/^#/, "");
  const targetEl = id ? document.getElementById(id) : null;
  const startY = window.scrollY;
  const baseTargetY = Math.max(
    0,
    targetEl ? startY + targetEl.getBoundingClientRect().top - NAV_OFFSET : 0,
  );

  if (Math.abs(baseTargetY - startY) < 2) return;

  const direction = baseTargetY > startY ? 1 : -1;
  const overshootY = Math.max(0, baseTargetY + direction * OVERSHOOT_PX);
  const travelDuration = Math.min(1100, Math.max(500, Math.abs(baseTargetY - startY) * 0.5));

  let travelStart: number | null = null;
  const runTravel = (timestamp: number) => {
    if (travelStart === null) travelStart = timestamp;
    const progress = Math.min((timestamp - travelStart) / travelDuration, 1);
    window.scrollTo(0, startY + (overshootY - startY) * easeOutExpo(progress));
    if (progress < 1) {
      requestAnimationFrame(runTravel);
    } else {
      let settleStart: number | null = null;
      const runSettle = (ts: number) => {
        if (settleStart === null) settleStart = ts;
        const settleProgress = Math.min((ts - settleStart) / SETTLE_DURATION, 1);
        window.scrollTo(0, overshootY + (baseTargetY - overshootY) * easeInOutQuad(settleProgress));
        if (settleProgress < 1) requestAnimationFrame(runSettle);
        else if (id) history.pushState(null, "", `#${id}`);
      };
      requestAnimationFrame(runSettle);
    }
  };
  requestAnimationFrame(runTravel);
}

export function useCountUp(target: number, duration = 1500, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}
