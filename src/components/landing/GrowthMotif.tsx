import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type GrowthMotifProps = {
  /** Section the line grows through — scroll progress is measured against this, not the viewport. */
  containerRef: RefObject<HTMLElement | null>;
};

// Régua de margem, não luz decorativa: um traço único e parado se desenha
// conforme o scroll (stroke-dashoffset/scrub) e carrega marcas nos pontos
// exatos onde cada seção começa, numeradas 01–05 — os MESMOS números que o
// SectionTag já mostra no topo de cada seção. Nada aqui é inventado (sem
// estatística fabricada, sem partícula solta, sem ponto brilhante seguindo
// o mouse): é só a numeração que já existe na página, redesenhada como
// régua de leitura.
const VIEW_W = 1000;
const VIEW_H = 3550;

const PATH_D =
  "M60 40 C 260 220, 120 420, 340 560 C 560 700, 460 900, 620 1080 C 780 1260, 660 1480, 780 1650 C 900 1820, 760 2050, 860 2220 C 940 2350, 880 2480, 940 2600 C 1000 2760, 800 2950, 780 3150 C 760 3320, 580 3420, 520 3550";

// x/y = ponto do traço onde a seção começa; reveal = fração do timeline (0–1)
// em que a marca aparece; index deve bater com o número já exibido pelo
// SectionTag daquela seção (WhatIs=01, HowItWorks=02, Features=03,
// Pricing=04, FAQ=05 — ProductShowcase não tem SectionTag próprio).
const MARKS: { x: number; y: number; dir: 1 | -1; reveal: number; index: string }[] = [
  { x: 340, y: 560, dir: -1, reveal: 0.144, index: "01" },
  { x: 620, y: 1080, dir: 1, reveal: 0.288, index: "02" },
  { x: 780, y: 1650, dir: 1, reveal: 0.433, index: "03" },
  { x: 860, y: 2220, dir: 1, reveal: 0.562, index: "04" },
  { x: 940, y: 2600, dir: 1, reveal: 0.69, index: "05" },
];

// Frações do timeline (0–1, mapeadas ao scroll completo do container, que
// vai até o fim do Footer).
const DRAW_END = 0.95; // traço inteiro termina de se desenhar
const FADE_START = 0.96; // dissolve final, terminando junto com o fim do container

const GRID_LINES = 9;

export function GrowthMotif({ containerRef }: GrowthMotifProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const trigger = containerRef.current;
    const path = pathRef.current;
    const layer = layerRef.current;
    if (!svg || !trigger || !path || !layer) return;

    const ctx = gsap.context(() => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

      const marks = svg.querySelectorAll<SVGGElement>("[data-mark]");
      gsap.set(marks, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: 1.4 },
      });

      tl.to(path, { strokeDashoffset: 0, duration: DRAW_END, ease: "none" }, 0);

      marks.forEach((g, i) => {
        tl.to(g, { opacity: 1, duration: 0.15, ease: "power1.out" }, MARKS[i].reveal);
      });

      // Dissolve final, terminando junto com o fim do container — sem corte
      // seco quando a seção sai da tela.
      tl.to(layer, { opacity: 0, ease: "power1.in" }, FADE_START);
    }, svg);

    return () => ctx.revert();
  }, [containerRef]);

  return (
    <div ref={layerRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        fill="none"
      >
        {/* Grid bem fino evocando papel de gráfico — textura estática, sem custo de animação */}
        {Array.from({ length: GRID_LINES }).map((_, i) => (
          <line
            key={i}
            x1={0}
            y1={(VIEW_H / (GRID_LINES + 1)) * (i + 1)}
            x2={VIEW_W}
            y2={(VIEW_H / (GRID_LINES + 1)) * (i + 1)}
            stroke="#FFFFFF"
            strokeOpacity={0.025}
            strokeWidth={1}
          />
        ))}

        <path ref={pathRef} d={PATH_D} stroke="#318EF1" strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />

        {MARKS.map((m) => (
          <g key={m.index} data-mark>
            <line
              x1={m.x - m.dir * 9}
              y1={m.y}
              x2={m.x + m.dir * 9}
              y2={m.y}
              stroke="#318EF1"
              strokeOpacity={0.45}
              strokeWidth={1.5}
            />
            <text
              x={m.x + m.dir * 16}
              y={m.y}
              textAnchor={m.dir === 1 ? "start" : "end"}
              dominantBaseline="middle"
              fill="#FFFFFF"
              fillOpacity={0.3}
              fontSize={13}
              fontFamily="monospace"
              fontWeight={600}
            >
              {m.index}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
