import { useEffect, useRef, type RefObject } from "react";
import { TrendingUp } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type GrowthMotifProps = {
  /** Section the line grows through — scroll progress is measured against this, not the viewport. */
  containerRef: RefObject<HTMLElement | null>;
};

// A "assinatura" da marca: uma linha de crescimento única, subindo em
// diagonal da esquerda pra direita conforme o usuário rola — passa pelas
// seções de conteúdo com clusters de barrinhas e chips de dado, tem um
// "flash" de chegada ao fim da vitrine (Pricing) e depois segue, bem mais
// quieta, como um fio residual até o fim da página, esmaecendo pouco antes
// do rodapé acabar. A cor evolui de azul (a maior parte do trajeto) pra um
// dourado sutil só na reta final — o resultado da jornada.
// Scroll-scrub via GSAP ScrollTrigger (stroke-dasharray), técnica herdada do
// motivo botânico da Selva Nutrition, com vocabulário financeiro.
const VIEW_W = 1000;
const VIEW_H = 3550;

const PATH_D =
  "M60 40 C 260 220, 120 420, 340 560 C 560 700, 460 900, 620 1080 C 780 1260, 660 1480, 780 1650 C 900 1820, 760 2050, 860 2220 C 940 2350, 880 2480, 940 2600 C 1000 2760, 800 2950, 780 3150 C 760 3320, 580 3420, 520 3550";

// Ponto onde a "vitrine" de conteúdo termina (fim do Pricing) — depois disso
// o traço continua, mas sem clusters/chips, só como fio residual.
const ARRIVAL_X = 940;
const ARRIVAL_Y = 2600;

const MARKS: { x: number; y: number; dir: 1 | -1; reveal: number; label: string; sub: string; chipDir: 1 | -1 }[] = [
  { x: 340, y: 560, dir: -1, reveal: 0.144, label: "+12%", sub: "essa semana", chipDir: -1 },
  { x: 620, y: 1080, dir: 1, reveal: 0.288, label: "R$ 2.860", sub: "lucro líquido", chipDir: 1 },
  { x: 780, y: 1650, dir: 1, reveal: 0.433, label: "+24%", sub: "margem", chipDir: 1 },
  { x: 860, y: 2220, dir: 1, reveal: 0.562, label: "Lucro real", sub: "sem planilha", chipDir: 1 },
];

// Frações do timeline (0–1, mapeadas ao scroll completo do container, que
// vai até o fim do Footer).
const ARRIVAL_AT = 0.62 ; // flash de chegada ao fim da vitrine de conteúdo
const DRAW_END = 0.95; // traço inteiro (incluindo o fio residual) termina de se desenhar
const FADE_START = 0.96; // dissolve final, terminando junto com o fim do container

const BAR_HEIGHTS = [5, 12, 18];

// Motas ambiente flutuando devagar, soltas do scroll — companhia pro traço,
// incluindo o trecho residual mais vazio depois do Pricing.
const PARTICLES: { x: number; y: number; r: number; dur: number; delay: number }[] = [
  { x: 180, y: 180, r: 2.2, dur: 5.5, delay: 0 },
  { x: 640, y: 120, r: 1.6, dur: 6.5, delay: 0.6 },
  { x: 470, y: 340, r: 2.6, dur: 7, delay: 1.4 },
  { x: 130, y: 780, r: 1.8, dur: 5.8, delay: 0.3 },
  { x: 900, y: 850, r: 2.2, dur: 6.2, delay: 2 },
  { x: 420, y: 1260, r: 1.5, dur: 5, delay: 1 },
  { x: 40, y: 1420, r: 2, dur: 6.8, delay: 0.9 },
  { x: 960, y: 1350, r: 1.8, dur: 6, delay: 1.8 },
  { x: 560, y: 1900, r: 2.4, dur: 7.4, delay: 0.4 },
  { x: 150, y: 2050, r: 1.6, dur: 5.4, delay: 2.4 },
  { x: 700, y: 2380, r: 2, dur: 6.6, delay: 1.2 },
  { x: 980, y: 2500, r: 1.7, dur: 5.9, delay: 0.7 },
  { x: 260, y: 2780, r: 1.8, dur: 6, delay: 1.5 },
  { x: 720, y: 2920, r: 2, dur: 6.4, delay: 0.5 },
  { x: 460, y: 3220, r: 1.6, dur: 5.6, delay: 2 },
  { x: 610, y: 3420, r: 2.2, dur: 7, delay: 1 },
];

const GRID_LINES = 9;

const TIP_COLOR_START = "#5BA6F5";
const TIP_COLOR_GOLD = "#F2C078";

function lerpColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${b2})`;
}

export function GrowthMotif({ containerRef }: GrowthMotifProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const echoPathRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const arrivalGlowRef = useRef<SVGCircleElement>(null);

  // Scroll-scrubbed draw + reveal timeline.
  useEffect(() => {
    const svg = svgRef.current;
    const trigger = containerRef.current;
    const path = pathRef.current;
    const echoPath = echoPathRef.current;
    const parallaxLayer = parallaxRef.current;
    if (!svg || !trigger || !path || !echoPath || !parallaxLayer) return;

    const ctx = gsap.context(() => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

      const echoLength = echoPath.getTotalLength();
      gsap.set(echoPath, { strokeDasharray: echoLength, strokeDashoffset: echoLength });

      const clusters = svg.querySelectorAll<SVGGElement>("[data-cluster]");
      gsap.set(clusters, { opacity: 0, y: 10 });

      const chips = svg.parentElement?.querySelectorAll<HTMLDivElement>("[data-chip]");
      if (chips) gsap.set(chips, { opacity: 0, y: 10 });

      const tip = tipRef.current;
      const arrivalGlow = arrivalGlowRef.current;
      if (tip) gsap.set(tip, { opacity: 0 });
      if (arrivalGlow) gsap.set(arrivalGlow, { opacity: 0 });

      // Posição da ponta suavizada em duas camadas: o valor "cru" vem do
      // scrub (já com lag próprio via ScrollTrigger), e essa camada de
      // quickTo (sobre um objeto simples, não o DOM diretamente) faz a
      // bolinha "perseguir" esse valor com um atraso próprio.
      const tipState = { x: 0, y: 0 };
      const applyTipPos = () => tip && gsap.set(tip, { attr: { cx: tipState.x, cy: tipState.y } });
      const tipXTo = gsap.quickTo(tipState, "x", { duration: 0.22, ease: "power2.out", onUpdate: applyTipPos });
      const tipYTo = gsap.quickTo(tipState, "y", { duration: 0.22, ease: "power2.out" });

      // Free-running loops — só ticando enquanto o motivo está em tela.
      const loopTweens: gsap.core.Tween[] = [];

      loopTweens.push(
        gsap.to(tip, {
          attr: { r: 7 },
          duration: 1.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          paused: true,
        }),
      );

      const particleEls = svg.querySelectorAll<SVGCircleElement>("[data-particle]");
      particleEls.forEach((el, i) => {
        const cfg = PARTICLES[i];
        loopTweens.push(
          gsap.to(el, {
            attr: { cy: cfg.y - 26 },
            opacity: 0.55,
            duration: cfg.dur,
            delay: cfg.delay,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            paused: true,
          }),
        );
      });

      ScrollTrigger.create({
        trigger,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => loopTweens.forEach((t) => t.play()),
        onEnterBack: () => loopTweens.forEach((t) => t.play()),
        onLeave: () => loopTweens.forEach((t) => t.pause()),
        onLeaveBack: () => loopTweens.forEach((t) => t.pause()),
      });

      // scrub mais alto = mais lag/inércia acompanhando o scroll.
      const tl = gsap.timeline({
        scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: 2 },
      });

      // Controla os writes de opacidade da ponta pra não escrever no DOM
      // todo frame à toa quando o estado (visível/invisível) não mudou.
      let tipVisible = false;

      tl.to(
        path,
        {
          strokeDashoffset: 0,
          duration: DRAW_END,
          ease: "none",
          // Usa o progresso do próprio tween em vez de reler o atributo do
          // DOM (gsap.getProperty) — evita um layout/read desnecessário a
          // cada frame, uma causa comum de engasgo em scrub animado.
          onUpdate: function (this: gsap.core.Tween) {
            const drawn = this.progress() * length;
            if (drawn <= 0 || drawn >= length - 1) {
              if (tipVisible && tip) {
                gsap.set(tip, { opacity: 0 });
                tipVisible = false;
              }
              return;
            }
            if (!tipVisible && tip) {
              gsap.set(tip, { opacity: 1 });
              tipVisible = true;
            }
            const point = path.getPointAtLength(drawn);
            tipXTo(point.x);
            tipYTo(point.y);

            // A cor só migra pro dourado no último terço do trajeto — o
            // resto da jornada fica no azul da marca.
            const t = drawn / length;
            const shiftT = Math.max(0, Math.min(1, (t - 0.66) / 0.34));
            if (shiftT > 0) {
              tip?.setAttribute("fill", lerpColor(TIP_COLOR_START, TIP_COLOR_GOLD, shiftT));
            }
          },
        },
        0,
      );

      // Eco: uma segunda linha, mais fina e apagada, desenhando-se um passo
      // atrás da principal — dá profundidade/companhia sem competir com ela.
      // Sem filtro de blur (era recalculado a cada tick do scrub, já que o
      // traçado muda o tempo todo — custo real de repaint); só opacidade e
      // traço fino já dão o efeito de "eco" suave.
      tl.to(echoPath, { strokeDashoffset: 0, duration: DRAW_END - 0.06, ease: "none" }, 0.06);

      clusters.forEach((g, i) => {
        tl.to(g, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, MARKS[i].reveal);
      });
      chips?.forEach((chip, i) => {
        tl.to(chip, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, MARKS[i].reveal + 0.03);
      });

      if (arrivalGlow) {
        tl.to(arrivalGlow, { opacity: 1, duration: 0.05 }, ARRIVAL_AT).to(
          arrivalGlow,
          { opacity: 0, duration: 0.2 },
          ARRIVAL_AT + 0.08,
        );
      }

      // Saída elegante: em vez de cortar seco quando o container sai da
      // tela, a camada inteira (traço + eco + ponta + motas) se dissolve
      // nos últimos passos do scroll, terminando quando o rodapé acaba de
      // sair da viewport.
      tl.to(parallaxLayer, { opacity: 0, ease: "power1.in" }, FADE_START);
    }, svg);

    return () => ctx.revert();
  }, [containerRef]);

  // Leve resposta ao mouse (parallax) sobre a camada inteira, além do
  // scroll. Throttlado por rAF pra não empilhar chamadas além da taxa de
  // atualização da tela (mousemove pode disparar bem mais rápido que 60fps
  // em alguns mouses/telas).
  useEffect(() => {
    const layer = parallaxRef.current;
    if (!layer) return;
    const xTo = gsap.quickTo(layer, "x", { duration: 1.2, ease: "power3.out" });
    const yTo = gsap.quickTo(layer, "y", { duration: 1.2, ease: "power3.out" });

    let pending = false;
    let lastX = 0;
    let lastY = 0;

    const applyMove = () => {
      pending = false;
      xTo(lastX);
      yTo(lastY);
    };

    const handleMove = (e: MouseEvent) => {
      lastX = (e.clientX / window.innerWidth - 0.5) * 26;
      lastY = (e.clientY / window.innerHeight - 0.5) * 18;
      if (!pending) {
        pending = true;
        requestAnimationFrame(applyMove);
      }
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div ref={parallaxRef} className="absolute inset-[-3%]" style={{ willChange: "transform" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          fill="none"
        >
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5BA6F5" stopOpacity="0.7" />
              <stop offset="40%" stopColor="#318EF1" stopOpacity="0.55" />
              <stop offset="68%" stopColor="#318EF1" stopOpacity="0.48" />
              <stop offset="88%" stopColor="#E3A75C" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#F2C078" stopOpacity="0.8" />
            </linearGradient>
            <filter id="growthTipGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="growthEndGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

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

          {/* Motas ambientes flutuando devagar, soltas do scroll — companhia pro traço */}
          {PARTICLES.map((p, i) => (
            <circle key={i} data-particle cx={p.x} cy={p.y} r={p.r} fill="#5BA6F5" opacity={0.22} />
          ))}

          <path
            ref={echoPathRef}
            d={PATH_D}
            transform="translate(28 36)"
            stroke="url(#growthGradient)"
            strokeOpacity={0.32}
            strokeWidth={1.4}
            strokeLinecap="round"
          />

          <path ref={pathRef} d={PATH_D} stroke="url(#growthGradient)" strokeWidth={2.5} strokeLinecap="round" />

          {MARKS.map((m) => (
            <g key={m.label} data-cluster>
              {BAR_HEIGHTS.map((h, i) => {
                const bx = m.x + m.dir * (i * 11);
                return (
                  <rect
                    key={i}
                    x={bx - 3}
                    y={m.y - h}
                    width={6}
                    height={h}
                    rx={1.5}
                    fill={i === BAR_HEIGHTS.length - 1 ? "#8CC4FF" : "#318EF1"}
                    fillOpacity={0.55 + i * 0.15}
                  />
                );
              })}
            </g>
          ))}

          <circle ref={arrivalGlowRef} cx={ARRIVAL_X} cy={ARRIVAL_Y} r={6} fill="#8CC4FF" filter="url(#growthEndGlow)" />
          <circle ref={tipRef} r={5} fill="#8CC4FF" filter="url(#growthTipGlow)" />
        </svg>

        {MARKS.map((m) => {
          const left = (m.x / VIEW_W) * 100;
          const top = (m.y / VIEW_H) * 100;
          return (
            <div
              key={m.label}
              data-chip
              className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-sm px-2.5 py-1.5"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(${m.chipDir === 1 ? "18px" : "calc(-100% - 18px)"}, -50%)`,
              }}
            >
              <TrendingUp className="w-3 h-3 text-[#8CC4FF] shrink-0" />
              <span className="text-[11px] font-semibold text-white/80 leading-none whitespace-nowrap">
                {m.label}
                <span className="ml-1 font-normal text-white/40">{m.sub}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
