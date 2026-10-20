import { memo } from "react";

// Partículas em posições fixas (determinísticas). No celular o CSS mostra só as primeiras seis.
const particles = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 2 + (i % 3),
  delay: -(i * 1.7) % 14,
  duration: 14 + (i % 5) * 3,
}));

// Fundo cinematográfico em três camadas: ambiente, auroras e grade com partículas.
// Apenas CSS (transform/opacity); o movimento é removido com `prefers-reduced-motion`.
function AuroraBackground() {
  return <div className="cinematic-bg" aria-hidden="true">
    <div className="bg-ambient"/>
    <div className="bg-aurora aurora-a"/>
    <div className="bg-aurora aurora-b"/>
    <div className="bg-aurora aurora-c"/>
    <div className="bg-grid"/>
    <div className="bg-particles">{particles.map((p, i) => <i key={i} style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}/>)}</div>
    <div className="bg-vignette"/>
  </div>;
}

export default memo(AuroraBackground);
