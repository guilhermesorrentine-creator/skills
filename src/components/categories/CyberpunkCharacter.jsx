import { memo } from "react";

// Sprites originais desenhados em grade de pixels. Cada corpo é descrito pela metade esquerda
// (10 colunas) e espelhado; acessórios assimétricos entram como camadas posicionadas.
const mirror = (rows) => rows.map((row) => row + [...row].reverse().join(""));

const outline = { K: "#170a22", S: "#f2b79b", s: "#c47d6c", D: "#2b1a40", d: "#1d1030", B: "#0f0816" };

const legs = [
  "....KDDDDD",
  "....KDDDDK",
  "....KDDdK.",
  "....KDDdK.",
  "...KBBBBK.",
  "...KKKKKK.",
];

export const characters = {
  software: {
    title: "Hacker de terminal",
    palette: { ...outline, H: "#6b34a6", h: "#45206f", V: "#ff4fa5", G: "#fff0fb", P: "#7a3cba", p: "#55288a", Z: "#e88dff", L: "#2a0f3e", g: "#d94cf5", M: "#3b1d57" },
    body: mirror([
      "......KKKK", "....KKhhhh", "...KhhHHHH", "..KhHHHHHH", "..KhHHKKKK", "..KhHKSSSS",
      "..KhHKVVVV", "..KhHKVGVV", "..KhHKSSSS", "..KhHKSSSs", "...KhHKSSS", "...KhHHKKK",
      "..KhPPPPPP", ".KhPPPPPPZ", ".KPPPpPPPZ", "KPPPPpPPPZ", "KPPPPpPPPZ", "KPSPPpPPPZ",
      "KKSKPPPPPZ", ".KK.KPPPPP", ...legs,
    ]),
    blink: "G",
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
    ],
  },
  empreendedorismo: {
    title: "Estrategista neon",
    palette: { ...outline, R: "#3a1650", r: "#ff7cb9", J: "#c23c86", j: "#8f2a63", W: "#fff0fb", T: "#d94cf5", E: "#170a22", C: "#ff7cb9", c: "#e88dff", F: "#ff7cb9" },
    body: mirror([
      "......KKKK", "....KKRRRR", "...KRRRRrr", "..KRRRRRRR", "..KRRRRRRR", "..KRRSSSSS",
      "..KRSSSSSS", "..KSSEESSS", "..KSSSSSSS", "..KsSSSSSS", "...KSSSSss", "....KKSSSS",
      "...KKJJWWT", "..KJJJJWWT", ".KJJJJjWTT", ".KJJJJjWTT", ".KJJJJjWWT", ".KJSJJjJWW",
      ".KKSKJJJJJ", "...KKJJJJJ", ...legs,
    ]),
    blink: "c",
    layers: [
      { x: 16, y: -1, className: "sprite-holo", rows: [
        "FFFFFFF",
        "F.....F",
        "F....cF",
        "F..c.cF",
        "Fc.c.cF",
        "Fccc.cF",
        "FFFFFFF",
      ] },
    ],
  },
  conteudo: {
    title: "Criadora audiovisual",
    palette: { ...outline, A: "#ff4fa5", a: "#b8307a", E: "#2a0f3e", e: "#d94cf5", N: "#5b2a8a", n: "#3d1d63", V: "#170a22", O: "#1b1129", R: "#ff4fa5", c: "#e88dff", L: "#fff0fb" },
    body: mirror([
      ".....EEEEE", "...EEKKKKK", "..EKAAAAAA", "..EKAAAAAA", ".eEKAAaaAA", ".eEKASSSSS",
      ".eEKSSVVSS", ".eEKSSSSSS", "..EKSSSSSS", "...KSSSSss", "...KASSSSS", "....KKSSSS",
      "...KKNNNNN", "..KNNNNnNN", ".KNNNNnNNN", ".KNNNNnNNN", ".KNNNNnNNN", ".KNSNNnNNN",
      ".KKSKNNNNN", "...KKNNNNN", ...legs,
    ]),
    blink: "R",
    layers: [
      { x: 9, y: 13, className: "sprite-camera", rows: [
        "..KKK....",
        "KKKKKKKKK",
        "KOOOOKKOK",
        "KOcLcKROK",
        "KOccOKOOK",
        "KOOOOOOOK",
        "KKKKKKKKK",
      ] },
    ],
  },
  ciencia: {
    title: "Pesquisadora de laboratório",
    palette: { ...outline, U: "#2a1a52", u: "#4a3380", Y: "#7ef0ff", y: "#3bb7d0", C: "#efe3ff", c: "#b9a6d6", I: "#5b2a8a", M: "#7ef0ff", m: "#e88dff" },
    body: mirror([
      "......KKKK", "....KKUUUU", "...KUUUUUU", "..KUUUuuUU", "..KUKKKKKK", "..KUKYyKYY",
      "..KUKKKKKK", "..KUSSSSSS", "..KUSKKSSS", "..KUSSSSSS", "...KSSSSss", "....KKSSSS",
      "...KKCCIII", "..KCCCCCII", ".KCCCcCCII", ".KCCCcCCCI", ".KCCCcCCCI", ".KCSCcCCCC",
      ".KKSKCCCCC", "...KCCCCCC", ...legs,
    ]),
    blink: "Y",
    layers: [
      { x: -4, y: 0, className: "sprite-molecule", rows: [
        "..M...",
        ".mMm..",
        "..M..M",
        "...mMm",
        "..M..M",
        ".mMm..",
      ] },
    ],
  },
};

function toRects(rows, palette, x0, y0, blinkKey, keyPrefix) {
  const rects = [];
  rows.forEach((row, y) => {
    let start = 0;
    for (let x = 1; x <= row.length; x++) {
      if (x < row.length && row[x] === row[start]) continue;
      const key = row[start];
      if (key !== "." && palette[key]) {
        rects.push(<rect key={`${keyPrefix}-${y}-${start}`} x={x0 + start} y={y0 + y} width={x - start} height={1} fill={palette[key]} className={key === blinkKey ? "px-blink" : undefined}/>);
      }
      start = x;
    }
  });
  return rects;
}

// Personagem pixel-art em SVG; `shape-rendering` mantém as bordas nítidas em qualquer escala.
function CyberpunkCharacter({ category, className = "" }) {
  const sprite = characters[category];
  if (!sprite) return null;
  return <svg className={`pixel-sprite sprite-${category} ${className}`} viewBox="-5 -2 30 29" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
    <g className="sprite-body">{toRects(sprite.body, sprite.palette, 0, 0, sprite.blink, "b")}</g>
    {sprite.layers.map((layer, index) => <g key={index} className={`sprite-layer ${layer.className}`}>{toRects(layer.rows, sprite.palette, layer.x, layer.y, sprite.blink, `l${index}`)}</g>)}
  </svg>;
}

export default memo(CyberpunkCharacter);
