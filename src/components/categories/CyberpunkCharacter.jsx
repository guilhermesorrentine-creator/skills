import { memo } from "react";
import { characters } from "./sprites.js";

// Sprites originais desenhados em grade de pixels. Cada corpo é descrito pela metade esquerda
// (10 colunas) e espelhado; acessórios assimétricos entram como camadas posicionadas.
// Ao ativar (hover, foco ou toque) o corpo troca por poses de ação em quadros (`steps()`) e
// surgem os objetos próprios de cada personagem — ver `.pixel-sprite[data-active]` em home.css.
// Objetos animados próprios de cada personagem (só no componente; o e-mail usa a pose de repouso).

// Terminal holográfico com linhas de código digitadas.
function SoftwareExtras() {
  return <g className="sprite-extra x-terminal">
    <rect x="15" y="-1" width="10" height="8" fill="#170a22" opacity=".85"/>
    <rect x="15" y="-1" width="10" height="1" fill="#d94cf5"/>
    <rect x="15" y="6" width="10" height="1" fill="#d94cf5"/>
    <rect x="15" y="0" width="1" height="6" fill="#d94cf5"/>
    <rect x="24" y="0" width="1" height="6" fill="#d94cf5"/>
    <rect className="code-line l1" x="17" y="1" width="5" height="1" fill="#ff7cb9"/>
    <rect className="code-line l2" x="18" y="2" width="5" height="1" fill="#e88dff"/>
    <rect className="code-line l3" x="18" y="3" width="3" height="1" fill="#7ef0ff"/>
    <rect className="code-line l4" x="17" y="4" width="4" height="1" fill="#e88dff"/>
    <rect className="code-cursor" x="22" y="4" width="1" height="1" fill="#fff0fb"/>
  </g>;
}

// Gráfico holográfico com barras de crescimento.
function StrategistExtras() {
  return <g className="sprite-extra x-chart">
    <rect x="16" y="-1" width="9" height="8" fill="#170a22" opacity=".8"/>
    <rect x="16" y="-1" width="9" height="1" fill="#ff7cb9"/>
    <rect x="16" y="6" width="9" height="1" fill="#ff7cb9"/>
    <rect x="16" y="0" width="1" height="6" fill="#ff7cb9"/>
    <rect x="24" y="0" width="1" height="6" fill="#ff7cb9"/>
    <rect className="chart-bar b1" x="18" y="4" width="1" height="2" fill="#e88dff"/>
    <rect className="chart-bar b2" x="20" y="3" width="1" height="3" fill="#e88dff"/>
    <rect className="chart-bar b3" x="22" y="1" width="1" height="5" fill="#ff4fa5"/>
    <rect className="chart-spark" x="23" y="0" width="1" height="1" fill="#fff0fb"/>
  </g>;
}

// Câmera erguida, gravação acesa, foco da lente e marcadores de vídeo.
function CreatorExtras({ palette }) {
  return <g className="sprite-extra x-video">
    <g className="cam-rig">
      {toRects(camera, palette, 9, 13, null, "cam")}
      <rect x="8" y="16" width="1" height="2" fill={palette.S}/>
      <rect x="18" y="16" width="1" height="2" fill={palette.S}/>
      <rect className="rec-dot" x="15" y="16" width="1" height="1" fill="#ff2d6f"/>
      <rect className="lens-ring" x="10" y="15" width="3" height="3" fill="none" stroke="#7ef0ff" strokeWidth=".35"/>
    </g>
    <g className="vid-ui">
      <rect x="-5" y="0" width="2" height="1" fill="#ff7cb9"/><rect x="-5" y="1" width="1" height="1" fill="#ff7cb9"/>
      <rect x="-1" y="0" width="2" height="1" fill="#ff7cb9"/><rect x="0" y="1" width="1" height="1" fill="#ff7cb9"/>
      <rect x="-5" y="5" width="1" height="1" fill="#ff7cb9"/><rect x="-5" y="6" width="2" height="1" fill="#ff7cb9"/>
      <rect x="0" y="5" width="1" height="1" fill="#ff7cb9"/><rect x="-1" y="6" width="2" height="1" fill="#ff7cb9"/>
      <rect x="-3" y="2" width="1" height="3" fill="#fff0fb"/><rect x="-2" y="3" width="1" height="1" fill="#fff0fb"/>
      <rect className="vid-progress" x="-5" y="8" width="6" height="1" fill="#e88dff"/>
    </g>
  </g>;
}

// Partículas ao redor da projeção científica.
function ScientistExtras() {
  return <g className="sprite-extra x-lab">
    <rect className="beam" x="0" y="5" width="1" height="2" fill="#7ef0ff" opacity=".6"/>
    <rect className="spark s1" x="-5" y="6" width="1" height="1" fill="#7ef0ff"/>
    <rect className="spark s2" x="2" y="-1" width="1" height="1" fill="#e88dff"/>
    <rect className="spark s3" x="-4" y="-2" width="1" height="1" fill="#fff0fb"/>
    <rect className="spark s4" x="3" y="4" width="1" height="1" fill="#7ef0ff"/>
  </g>;
}

const EXTRAS = { software: SoftwareExtras, empreendedorismo: StrategistExtras, conteudo: CreatorExtras, ciencia: ScientistExtras };

function toRects(rows, palette, x0, y0, sprite, keyPrefix) {
  const rects = [];
  rows.forEach((row, y) => {
    let start = 0;
    for (let x = 1; x <= row.length; x++) {
      if (x < row.length && row[x] === row[start]) continue;
      const key = row[start];
      if (key !== "." && palette[key]) {
        const className = key === sprite?.blink ? "px-blink" : sprite?.glow?.includes(key) ? "px-glow" : undefined;
        rects.push(<rect key={`${keyPrefix}-${y}-${start}`} x={x0 + start} y={y0 + y} width={x - start} height={1} fill={palette[key]} className={className}/>);
      }
      start = x;
    }
  });
  return rects;
}

// Personagem pixel-art em SVG; `shape-rendering` mantém as bordas nítidas em qualquer escala.
// Cabeça (linhas 0-11) separada do tronco: respira e acompanha o olhar (`look`, em pixels do sprite).
// `fidget` dispara um gesto curto ("hop"); a pose de ação vem de `active`.
const HEAD_ROWS = 12;
function CyberpunkCharacter({ category, active = false, fidget = null, look = null, className = "" }) {
  const sprite = characters[category];
  if (!sprite) return null;
  const Extras = EXTRAS[category];
  const style = look ? { "--lx": look.x, "--ly": look.y } : undefined;
  return <svg className={`pixel-sprite sprite-${category} ${className}`} data-active={active || undefined} data-fidget={fidget || undefined} style={style} viewBox="-5 -2 30 29" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <g className="sprite-body pose-idle">
      <g className="sprite-torso">{toRects(sprite.body.slice(HEAD_ROWS), sprite.palette, 0, HEAD_ROWS, sprite, "bt")}</g>
      <g className="sprite-look"><g className="sprite-head">{toRects(sprite.body.slice(0, HEAD_ROWS), sprite.palette, 0, 0, sprite, "bh")}</g></g>
    </g>
    {sprite.poses.map((pose, index) => <g key={index} className={`pose-act ${sprite.poses.length > 1 ? `f2-${index}` : ""}`}>{toRects(pose, sprite.palette, 0, 0, sprite, `p${index}`)}</g>)}
    {sprite.layers.map((layer, index) => <g key={index} className={`sprite-layer when-${layer.when || "always"} ${layer.frame || ""} ${layer.className || ""}`}>{toRects(layer.rows, sprite.palette, layer.x, layer.y, sprite, `l${index}`)}</g>)}
    <Extras palette={sprite.palette}/>
  </svg>;
}

export default memo(CyberpunkCharacter);
