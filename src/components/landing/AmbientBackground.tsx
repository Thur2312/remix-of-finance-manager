// Camada fixa por trás de toda a landing. Era um fundo navy com blobs de
// glow azul flutuante (direção antiga, ver docs/DESIGN-DIRECTION.md) —
// trocado pela textura de papel da nova identidade ("Recibo & Caderno de
// contas", docs/design-system.md): fundo --landing-paper sólido + um grão
// sutil (SVG feTurbulence, estático, não um filtro por frame) pra não ficar
// chapado. Sem gradiente azul nenhum.
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-landing-paper">
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />
      {/* Vinheta suave nas bordas — dá profundidade sem precisar de glow colorido */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% 0%, transparent 55%, rgba(28,43,57,0.05) 100%)",
        }}
      />
    </div>
  );
}
