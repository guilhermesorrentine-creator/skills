// Dados dos personagens pixel-art (sem React): usados pelo componente e pelo gerador da arte do e-mail.
// Cada corpo é descrito pela metade esquerda (10 colunas) e espelhado; acessórios entram como camadas.
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

export const camera = [
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
  },
};
