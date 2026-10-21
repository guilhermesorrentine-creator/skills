import { memo } from "react";

// Sprites originais desenhados em grade de pixels. Cada corpo é descrito pela metade esquerda
// (10 colunas) e espelhado; acessórios assimétricos entram como camadas posicionadas.
// Ao ativar (hover, foco ou toque) o corpo troca por poses de ação em quadros (`steps()`) e
// surgem os objetos próprios de cada personagem — ver `.pixel-sprite[data-active]` em home.css.
const mirror = (rows) => rows.map((row) => row + [...row].reverse().join(""));
// Pose alternativa: substitui linhas inteiras (20 colunas) do corpo espelhado.
const patch = (rows, edits) => rows.map((row, y) => edits[y] ?? row);

const outline = { K: "#170a22", S: "#f2b79b", s: "#c47d6c", D: "#2b1a40", d: "#1d1030", B: "#0f0816" };

const legs = [
  "....KDDDDD",
  "....KDDDDK",
  "....KDDdK.",
  "....KDDdK.",
  "...KBBBBK.",
  "...KKKKKK.",
];

const softwareBody = mirror([
  "......KKKK", "....KKhhhh", "...KhhHHHH", "..KhHHHHHH", "..KhHHKKKK", "..KhHKSSSS",
  "..KhHKVVVV", "..KhHKVGVV", "..KhHKSSSS", "..KhHKSSSs", "...KhHKSSS", "...KhHHKKK",
  "..KhPPPPPP", ".KhPPPPPPZ", ".KPPPpPPPZ", "KPPPPpPPPZ", "KPPPPpPPPZ", "KPSPPpPPPZ",
  "KKSKPPPPPZ", ".KK.KPPPPP", ...legs,
]);
const strategistBody = mirror([
  "......KKKK", "....KKRRRR", "...KRRRRrr", "..KRRRRRRR", "..KRRRRRRR", "..KRRSSSSS",
  "..KRSSSSSS", "..KSSEESSS", "..KSSSSSSS", "..KsSSSSSS", "...KSSSSss", "....KKSSSS",
  "...KKJJWWT", "..KJJJJWWT", ".KJJJJjWTT", ".KJJJJjWTT", ".KJJJJjWWT", ".KJSJJjJWW",
  ".KKSKJJJJJ", "...KKJJJJJ", ...legs,
]);
const creatorBody = mirror([
  ".....EEEEE", "...EEKKKKK", "..EKAAAAAA", "..EKAAAAAA", ".eEKAAaaAA", ".eEKASSSSS",
  ".eEKSSVVSS", ".eEKSSSSSS", "..EKSSSSSS", "...KSSSSss", "...KASSSSS", "....KKSSSS",
  "...KKNNNNN", "..KNNNNnNN", ".KNNNNnNNN", ".KNNNNnNNN", ".KNNNNnNNN", ".KNSNNnNNN",
  ".KKSKNNNNN", "...KKNNNNN", ...legs,
]);
const scientistBody = mirror([
  "......KKKK", "....KKUUUU", "...KUUUUUU", "..KUUUuuUU", "..KUKKKKKK", "..KUKYyKYY",
  "..KUKKKKKK", "..KUSSSSSS", "..KUSKKSSS", "..KUSSSSSS", "...KSSSSss", "....KKSSSS",
  "...KKCCIII", "..KCCCCCII", ".KCCCcCCII", ".KCCCcCCCI", ".KCCCcCCCI", ".KCSCcCCCC",
  ".KKSKCCCCC", "...KCCCCCC", ...legs,
]);

// Braços recolhidos atrás do equipamento (as mãos aparecem nos objetos animados).
const armsIn = (body, fill) => patch(body, {
  17: body[17].replace(/S/g, fill),
  18: body[18].replace(/S/g, fill),
});

const camera = [
  "..KKK....",
  "KKKKKKKKK",
  "KOOOOKKOK",
  "KOcLcKROK",
  "KOccOKOOK",
  "KOOOOOOOK",
  "KKKKKKKKK",
];

export const characters = {
  software: {
    title: "Hacker de terminal",
    palette: { ...outline, H: "#6b34a6", h: "#45206f", V: "#ff4fa5", G: "#fff0fb", P: "#7a3cba", p: "#55288a", Z: "#e88dff", L: "#2a0f3e", g: "#d94cf5", M: "#3b1d57" },
    body: softwareBody,
    blink: "G",
    glow: "V",
    poses: [armsIn(softwareBody, "P")],
    layers: [
      { x: 4, y: 14, className: "sprite-screen", rows: [
        "KKKKKKKKKKKK",
        "KLLLLLLLLLLK",
        "KLgggLLLLLLK",
        "KLLLggggLLLK",
        "KLgLLLLLLLLK",
        "KKKKKKKKKKKK",
        "KMMMMMMMMMMK",
      ] },
      // Mãos digitando: dois quadros alternados sobre o teclado.
      { x: 5, y: 19, when: "active", frame: "f2-0", rows: [".SS........", "........SS."] },
      { x: 5, y: 19, when: "active", frame: "f2-1", rows: ["........SS.", ".SS........"] },
    ],
    Extras: SoftwareExtras,
  },
  empreendedorismo: {
    title: "Estrategista neon",
    palette: { ...outline, R: "#3a1650", r: "#ff7cb9", J: "#c23c86", j: "#8f2a63", W: "#fff0fb", T: "#d94cf5", E: "#170a22", C: "#ff7cb9", c: "#e88dff", F: "#ff7cb9" },
    body: strategistBody,
    blink: "c",
    glow: "T",
    // Braço direito erguido em direção ao gráfico, com um aceno de dois quadros.
    poses: [
      patch(strategistBody, {
        7: "..KSSEESSSSSSEESSKSK", 8: "..KSSSSSSSSSSSSSSKSK", 9: "..KsSSSSSSSSSSSSsKJK",
        10: "...KSSSSssssSSSSKJK.", 11: "....KKSSSSSSSSKKJK..", 12: "...KKJJWWTTWWJJKJK..",
        14: ".KJJJJjWTTTTWjJJJK..", 15: ".KJJJJjWTTTTWjJJJK..", 16: ".KJJJJjWWTTWWjJJJK..",
        17: ".KJSJJjJWWWWJjJJJK..", 18: ".KKSKJJJJJJJJJJJK...",
      }),
      patch(strategistBody, {
        6: "..KRSSSSSSSSSSSSRKSK", 7: "..KSSEESSSSSSEESSKSK", 8: "..KSSSSSSSSSSSSSSKJK", 9: "..KsSSSSSSSSSSSSsKJK",
        10: "...KSSSSssssSSSSKJK.", 11: "....KKSSSSSSSSKKJK..", 12: "...KKJJWWTTWWJJKJK..",
        14: ".KJJJJjWTTTTWjJJJK..", 15: ".KJJJJjWTTTTWjJJJK..", 16: ".KJJJJjWWTTWWjJJJK..",
        17: ".KJSJJjJWWWWJjJJJK..", 18: ".KKSKJJJJJJJJJJJK...",
      }),
    ],
    layers: [
      { x: 16, y: -1, when: "idle", className: "sprite-holo", rows: [
        "FFFFFFF",
        "F.....F",
        "F....cF",
        "F..c.cF",
        "Fc.c.cF",
        "Fccc.cF",
        "FFFFFFF",
      ] },
    ],
    Extras: StrategistExtras,
  },
  conteudo: {
    title: "Criadora audiovisual",
    palette: { ...outline, A: "#ff4fa5", a: "#b8307a", E: "#2a0f3e", e: "#d94cf5", N: "#5b2a8a", n: "#3d1d63", V: "#170a22", O: "#1b1129", R: "#ff4fa5", c: "#e88dff", L: "#fff0fb" },
    body: creatorBody,
    blink: "R",
    poses: [armsIn(creatorBody, "N")],
    layers: [
      { x: 9, y: 13, when: "idle", className: "sprite-camera", rows: camera },
    ],
    Extras: CreatorExtras,
  },
  ciencia: {
    title: "Pesquisadora de laboratório",
    palette: { ...outline, U: "#2a1a52", u: "#4a3380", Y: "#7ef0ff", y: "#3bb7d0", C: "#efe3ff", c: "#b9a6d6", I: "#5b2a8a", M: "#7ef0ff", m: "#e88dff" },
    body: scientistBody,
    blink: "Y",
    glow: "Yy",
    // Braço esquerdo erguido para a projeção, com movimento de dedos em dois quadros.
    poses: [
      patch(scientistBody, {
        7: "KSKUSSSSSSSSSSSSUK..", 8: "KSKUSKKSSSSSSKKSUK..", 9: "KCKUSSSSSSSSSSSSUK..",
        10: ".KCKSSSSssssSSSSK...", 11: "..KCKKSSSSSSSSKK....", 12: "..KCKCCIIIIIICCKK...",
        14: "..KCCcCCIIIICCcCCCK.", 15: "..KCCcCCCIICCCcCCCK.", 16: "..KCCcCCCIICCCcCCCK.",
        17: "..KCCcCCCCCCCCcCSCK.", 18: "...KKCCCCCCCCCCKSKK.",
      }),
      patch(scientistBody, {
        6: "KSKUKKKKKKKKKKKKUK..", 7: "KSKUSSSSSSSSSSSSUK..", 8: "KCKUSKKSSSSSSKKSUK..", 9: "KCKUSSSSSSSSSSSSUK..",
        10: ".KCKSSSSssssSSSSK...", 11: "..KCKKSSSSSSSSKK....", 12: "..KCKCCIIIIIICCKK...",
        14: "..KCCcCCIIIICCcCCCK.", 15: "..KCCcCCCIICCCcCCCK.", 16: "..KCCcCCCIICCCcCCCK.",
        17: "..KCCcCCCCCCCCcCSCK.", 18: "...KKCCCCCCCCCCKSKK.",
      }),
    ],
    layers: [
      { x: -4, y: 0, when: "idle", className: "sprite-molecule", rows: [
        "..M...",
        ".mMm..",
        "..M..M",
        "...mMm",
        "..M..M",
        ".mMm..",
      ] },
      // Molécula girando: três quadros de rotação.
      { x: -5, y: -1, when: "active", frame: "f3-0", rows: ["...M...", ".MM.MM.", ".M.m.M.", ".M...M.", ".MM.MM.", "...M..."] },
      { x: -5, y: -1, when: "active", frame: "f3-1", rows: ["..M....", ".M.MM..", "M..m.M.", ".M...M.", "..MM.M.", "....M.."] },
      { x: -5, y: -1, when: "active", frame: "f3-2", rows: [".MMM...", "M...M..", "M..m.M.", ".M...M.", "..MMM..", "......."] },
    ],
    Extras: ScientistExtras,
  },
};

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
  const { Extras } = sprite;
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
