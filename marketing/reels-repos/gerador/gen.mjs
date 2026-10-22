// Reel explicativo 9:16 sobre um repositório: narração Kokoro frase a frase, cenas animadas com os
// personagens pixel art e legenda com palavra-chave. Cada frase escolhe uma cena da biblioteca abaixo
// e passa parâmetros em `p`; `"scene": "+"` continua a cena anterior. Uso: node gen.mjs reels/<repo>.json
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
const OUT = `out/${spec.repo}`;
mkdirSync(`${OUT}/assets/voz`, { recursive: true });
cpSync("assets/fonts", `${OUT}/assets/fonts`, { recursive: true });
cpSync("hyperframes.json", `${OUT}/hyperframes.json`);

const PY = "D:/dev/tts-venv/Scripts/python.exe";
const FF = execFileSync("bash", ["-c", 'ls -d "$LOCALAPPDATA"/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg-*/bin | head -1']).toString().trim();
const VOICE = "pm_alex:0.65,pm_santa:0.35", SPEED = "1.12"; // voz B aprovada
const CLEAN = "highpass=f=60,equalizer=f=3000:t=q:w=1.5:g=1.5,loudnorm=I=-16:TP=-1.5";

// 1. Narração: uma faixa por frase, em cache pelo texto.
const GAP = 0.18;
let t = 0.3;
const lines = spec.lines.map((l, i) => {
  const hash = createHash("md5").update(`${VOICE}|${SPEED}|${l.say}`).digest("hex").slice(0, 8);
  const file = `assets/voz/l${i}-${hash}.wav`;
  if (!existsSync(`${OUT}/${file}`)) {
    execFileSync(PY, ["tts.py", `${OUT}/raw.wav`, l.say, "--mix", VOICE, "--speed", SPEED], { stdio: "inherit" });
    execFileSync(`${FF}/ffmpeg`, ["-v", "error", "-y", "-i", `${OUT}/raw.wav`, "-af", CLEAN, "-ar", "44100", `${OUT}/${file}`]);
  }
  const dur = +execFileSync(`${FF}/ffprobe`, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${OUT}/${file}`]).toString();
  const line = { ...l, i, file, start: +t.toFixed(3), dur: +dur.toFixed(3) };
  t += dur + GAP;
  return line;
});
const TOTAL = +(t + 1.6).toFixed(2);

// 2. Personagens: os quatro sprites do site e bonecos pixel novos gerados por mapa.
const sprite = (name, cls = "") => readFileSync(`assets/sprites/${name}.svg`, "utf8").replace('class="pixel-sprite', `class="spr ${cls} pixel-sprite`);
const PERSON = [
  "....HHHH....", "...HHHHHH...", "...HKKKKH...", "...KEKKEK...", "...KKKKKK...", "....KKKK....",
  "..SSSTTSSS..", ".SSSSTTSSSS.", ".S.SSTTSS.S.", ".K.SSSSSS.K.", "...SSSSSS...",
  "...PP..PP...", "...PP..PP...", "...PP..PP...", "..BBB..BBB..",
];
// Cada combinação de cores vira um <symbol> desenhado uma vez; os bonecos usam <use> (DOM leve).
const symbols = new Map();
function person({ hair = "#2a1f3d", skin = "#f1c9a5", shirt = "#7445c7", tie = null, pants = "#2c2641", shoes = "#15131b", eye = "#15131b", cls = "" }) {
  const col = { H: hair, K: skin, E: eye, S: shirt, T: tie || shirt, P: pants, B: shoes };
  const key = Object.values(col).join("");
  if (!symbols.has(key)) {
    // Uma linha horizontal por cor e trecho contíguo (menos elementos que um <rect> por pixel).
    const runs = PERSON.flatMap((row, y) => { const out = []; let x = 0;
      while (x < row.length) { const c = row[x]; let w = 1; while (row[x + w] === c) w++; if (col[c]) out.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${col[c]}"/>`); x += w; }
      return out; }).join("");
    symbols.set(key, { id: `pp${symbols.size}`, svg: runs });
  }
  return `<svg class="pp ${cls}" viewBox="0 0 12 15" shape-rendering="crispEdges"><use href="#${symbols.get(key).id}"/></svg>`;
}
let seed = 7;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const HAIR = ["#2a1f3d", "#5b3a1e", "#d9a441", "#15131b", "#8a3b2e", "#e8e1d5"], SKIN = ["#f1c9a5", "#d9a47c", "#a8714f", "#7a4b30"];
const SHIRT = ["#7445c7", "#f27aa8", "#5fd3a0", "#f2a65a", "#4f8ef7", "#e85d5d", "#c9b3f5"];
const CROWD = Array.from({ length: 12 }, () => ({ hair: pick(HAIR), skin: pick(SKIN), shirt: pick(SHIRT) }));

// 3. Biblioteca de cenas: recebem os tempos das frases (s) e os parâmetros (p) e devolvem HTML + animação GSAP.
const A = spec.accent, CHAR = spec.char;
const hero = (style) => `<div class="hero" style="${style}">${sprite(CHAR)}</div>`;
const heroIn = (from, at) => `q(".hero").forEach(h => tl.fromTo(h, { ${from} }, { x: 0, y: 0, duration: 0.5, ease: "back.out(1.5)" }, ${at}));`;
const js = (v) => JSON.stringify(v);
const scenes = {
  // Valor que despenca (ex.: economias), moedas voando.
  hook: (s, p) => ({
    dark: true,
    html: `<div class="counter"><small>${esc(p.label)}</small><b id="money">${esc(p.prefix)}${p.from.toLocaleString("pt-BR")}</b></div>
      <div class="coins">${Array.from({ length: 14 }, (_, k) => `<i class="coin" style="top:${-k * 24}px" data-dx="${Math.round(rnd() * 900 - 450)}" data-dy="${-Math.round(500 + rnd() * 500)}"></i>`).join("")}</div>
      ${hero("left:360px;top:930px;width:360px")}`,
    anim: `
      ${heroIn("y: 700", s.t0)}
      q(".coin").forEach((c, k) => tl.fromTo(c, { scale: 0 }, { scale: 1, duration: 0.18, ease: "back.out(3)" }, ${s.t0} + 0.2 + k * 0.03));
      q(".counter").forEach(c => tl.fromTo(c, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0} + 0.3));
      q(".coin").forEach((c, k) => tl.to(c, { x: +c.dataset.dx, y: +c.dataset.dy, rotation: 360, opacity: 0, duration: 0.7, ease: "power2.in" }, ${s.t0 + 1.2} + k * 0.07));
      const m = { v: ${p.from} };
      tl.to(m, { v: ${p.to}, duration: 1.6, ease: "power2.in", onUpdate: () => document.getElementById("money").textContent = ${js(p.prefix)} + Math.round(m.v).toLocaleString("pt-BR") }, ${s.t0 + 1.2});
      tl.to("#money", { color: "#e85d5d", duration: 0.2 }, ${s.t0 + 2.6});
      q(".hero").forEach(h => tl.to(h, { rotation: 8, duration: 0.12, yoyo: true, repeat: 7, ease: "sine.inOut" }, ${s.t0 + 2.6}));`,
  }),
  // Cartões pendurados num varal (até 14), numerados.
  varal: (s, p) => {
    const n = p.items.length, row1 = Math.ceil(n / 2), w = Math.min(230, Math.floor(1040 / row1));
    const card = (label, k) => { const r = k < row1 ? 0 : 1, c = r ? k - row1 : k, cols = r ? n - row1 : row1;
      return `<div class="card" style="width:${w - 18}px;left:${Math.round((1080 - cols * w) / 2 + 9 + c * w)}px;top:${r ? 690 : 330}px"><span class="pin"></span><b>${k + 1}</b><em>${esc(label)}</em></div>`; };
    return {
      dark: false,
      html: `<svg class="rope" viewBox="0 0 1080 900"><path d="M0 330 Q540 380 1080 330"/><path d="M0 690 Q540 740 1080 690"/></svg>${p.items.map(card).join("")}${hero("left:380px;top:1080px;width:320px")}`,
      anim: `
        q(".card").forEach((c, k) => tl.fromTo(c, { y: -900, rotation: k % 2 ? 25 : -25 }, { y: 0, rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" }, ${s.t0} + 0.15 + k * ${Math.min(0.11, 1.4 / n).toFixed(3)}));
        q(".hero").forEach(h => { tl.fromTo(h, { x: -800 }, { x: 0, duration: 0.8, ease: "power2.out" }, ${s.t0}); tl.to(h, { y: -20, duration: 0.15, yoyo: true, repeat: 5 }, ${s.t0}); });`,
    };
  },
  // Três diretores de terno dão nota e votam.
  conselho: (s, p) => {
    const colors = ["#5fd3a0", "#f2a65a", "#e85d5d"], ties = ["#e85d5d", "#4f8ef7", "#5fd3a0"];
    return {
      dark: true,
      html: p.board.map((b, k) => `<div class="member" style="left:${90 + k * 300}px">${person({ hair: pick(HAIR), skin: pick(SKIN), shirt: "#2c2a3a", tie: ties[k], pants: "#1d1b28" })}<div class="score">${b.score}<small>/10</small></div></div>`).join("") +
        `<div class="table"></div>` + p.board.map((b, k) => `<div class="vote" style="left:${100 + k * 300}px;background:${colors[k]}">${esc(b.vote)}</div>`).join(""),
      anim: `
        q(".member").forEach((m, k) => tl.fromTo(m, { y: 500, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }, ${s.t0} + k * 0.12));
        q(".table").forEach(m => tl.fromTo(m, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.out" }, ${s.t0} + 0.1));
        q(".score").forEach((m, k) => tl.fromTo(m, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" }, ${s.t0 + s.d * 0.45} + k * 0.25));
        q(".vote").forEach((m, k) => tl.fromTo(m, { scale: 2.4, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: -4, duration: 0.22, ease: "power4.in" }, ${s.t0 + s.d * 0.75} + k * 0.2));`,
    };
  },
  // Multidão 10×10; na frase seguinte (cena "+") cada um ganha ✓ ou ✕ e aparece o placar.
  multidao: (s, p) => {
    const cells = Array.from({ length: 100 }, (_, k) => {
      const r = Math.floor(k / 10), c = k % 10, yes = rnd() < p.yes / 100;
      return `<div class="buyer" data-r="${r}" data-c="${c}" style="left:${70 + c * 96}px;top:${330 + r * 104}px">${person(CROWD[k % CROWD.length])}<i class="mark ${yes ? "yes" : "no"}">${yes ? "✓" : "✕"}</i></div>`;
    }).join("");
    const t1 = s.times[1] ?? s.t0 + s.d * 0.6;
    return {
      dark: false,
      html: `<div class="tag">${esc(p.label)}</div>${cells}<div class="tally"><span class="y">compram <b>${p.yes}</b></span><span class="n">passam <b>${100 - p.yes}</b></span><small>exemplo</small></div>`,
      anim: `
        q(".tag").forEach(e => tl.fromTo(e, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0}));
        q(".buyer").forEach(b => { const d = Math.hypot(+b.dataset.r - 4.5, +b.dataset.c - 4.5); tl.fromTo(b, { scale: 0, y: 30 }, { scale: 1, y: 0, duration: 0.25, ease: "back.out(2.5)" }, ${s.t0} + 0.1 + d * 0.09); });
        q(".mark").forEach((m, k) => tl.fromTo(m, { scale: 0 }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, ${t1} + (k % 17) * 0.05));
        q(".buyer").forEach(b => { if (b.querySelector(".no")) tl.to(b, { opacity: 0.35, duration: 0.3 }, ${t1 + 0.9}); });
        q(".tally").forEach(e => tl.fromTo(e, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "back.out(2)" }, ${t1 + 0.6}));`,
    };
  },
  // Diretor financeiro com calculadora, contador e gráfico subindo.
  cfo: (s, p) => ({
    dark: true,
    html: `<div class="cfo">${person({ hair: "#15131b", skin: "#d9a47c", shirt: "#2c2a3a", tie: A, pants: "#1d1b28", eye: "#c9b3f5" })}<div class="calc"><i></i><i></i><i></i><i></i></div></div>
      <div class="flip"><div class="digits">${[...p.number].map((_, k) => `<b id="d${s.n}-${k}">0</b>`).join("")}</div><p>${esc(p.label)}</p><small>${esc(p.note)}</small></div>
      <svg class="chart" viewBox="0 0 900 360"><line class="be" x1="0" y1="190" x2="900" y2="190"/><path class="line" d="M0 330 L150 300 L300 250 L450 200 L600 140 L750 90 L900 40"/></svg>`,
    anim: `
      q(".cfo").forEach(e => tl.fromTo(e, { x: -500 }, { x: 0, duration: 0.5, ease: "power3.out" }, ${s.t0}));
      q(".flip").forEach(e => tl.fromTo(e, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }, ${s.t0} + 0.3));
      const target = ${js(p.number)};
      [...target].forEach((_, k) => { const o = { v: 0 }; tl.to(o, { v: 30 + k * 7, duration: 1.2, ease: "power2.out", onUpdate: () => { const el = document.getElementById("d${s.n}-" + k); el.textContent = o.v >= 30 + k * 7 - 0.01 ? target[k] : String(Math.floor(o.v) % 10); } }, ${s.t0} + 0.4 + k * 0.15); });
      q(".chart .line").forEach(e => tl.fromTo(e, { strokeDashoffset: 1200 }, { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, ${s.t0 + s.d * 0.4}));
      q(".chart .be").forEach(e => tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${s.t0 + s.d * 0.4}));
      q(".calc i").forEach((e, k) => tl.to(e, { backgroundColor: "${A}", duration: 0.08, yoyo: true, repeat: 3 }, ${s.t0} + 0.6 + k * 0.2));`,
  }),
  // Documento sendo escrito, opções e carimbo.
  plano: (s, p) => ({
    dark: false,
    html: `<div class="doc"><h3>${esc(p.title)}</h3>${Array.from({ length: 9 }, () => `<i style="width:${60 + Math.round(rnd() * 40)}%"></i>`).join("")}<div class="stamp">${esc(p.stamp)}</div></div>
      ${p.opts ? `<div class="opts">${p.opts.map((o, k) => `<span class="o${k + 1}">${esc(o)}</span>`).join("")}</div>` : ""}
      ${hero("left:800px;top:1230px;width:220px")}`,
    anim: `
      q(".doc").forEach(e => tl.fromTo(e, { y: 900, rotation: 8 }, { y: 0, rotation: -2, duration: 0.5, ease: "power3.out" }, ${s.t0}));
      q(".doc i").forEach((e, k) => tl.fromTo(e, { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power2.out" }, ${s.t0} + 0.4 + k * 0.08));
      q(".opts span").forEach((e, k) => tl.fromTo(e, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "back.out(2)" }, ${s.t0 + s.d * 0.55} + k * 0.25));
      q(".stamp").forEach(e => tl.fromTo(e, { scale: 3, opacity: 0, rotation: -30 }, { scale: 1, opacity: 1, rotation: -14, duration: 0.22, ease: "power4.in" }, ${s.t0 + s.d * (p.opts ? 0.9 : 0.6)}));
      q(".o2, .o3").forEach(e => tl.to(e, { opacity: 0.3, duration: 0.2 }, ${s.t0 + s.d * 0.9}));
      ${heroIn("x: 400", s.t0 + 0.5)}`,
  }),
  // Programas trancados: o agente não consegue usar.
  apps: (s, p) => ({
    dark: true,
    html: `<div class="apps">${p.apps.map((a) => `<div class="app"><b>${esc(a)}</b><span class="lock">🔒</span></div>`).join("")}</div>${hero("left:380px;top:1050px;width:320px")}<div class="huh">?</div>`,
    anim: `
      q(".app").forEach((e, k) => tl.fromTo(e, { scale: 0, rotation: k % 2 ? 12 : -12 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.2)" }, ${s.t0} + 0.1 + k * 0.1));
      ${heroIn("y: 700", s.t0 + 0.3)}
      q(".hero").forEach(h => tl.to(h, { x: -30, duration: 0.08, yoyo: true, repeat: 5 }, ${s.t0 + s.d * 0.55}));
      q(".lock").forEach((e, k) => tl.fromTo(e, { scale: 1 }, { scale: 1.35, duration: 0.1, yoyo: true, repeat: 1 }, ${s.t0 + s.d * 0.55} + k * 0.05));
      q(".huh").forEach(e => tl.fromTo(e, { scale: 0, y: 40 }, { scale: 1, y: 0, duration: 0.3, ease: "back.out(3)" }, ${s.t0 + s.d * 0.6}));`,
  }),
  // Um programa entra na máquina e sai como linha de comando.
  transform: (s, p) => ({
    dark: false,
    html: `<div class="app solo"><b>${esc(p.app)}</b></div><div class="machine"><i></i><i></i><i></i><span>${esc(p.machine)}</span></div>
      <div class="term small"><div class="tbar"><i></i><i></i><i></i></div><pre>${esc(p.cmd)}</pre></div>${hero("left:60px;top:1150px;width:240px")}`,
    anim: `
      q(".app.solo").forEach(e => { tl.fromTo(e, { x: -700 }, { x: 0, duration: 0.5, ease: "power3.out" }, ${s.t0}); tl.to(e, { x: 330, scale: 0.2, opacity: 0, duration: 0.45, ease: "power2.in" }, ${s.t0 + s.d * 0.35}); });
      q(".machine").forEach(e => { tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, ${s.t0} + 0.2); tl.to(e, { rotation: 4, duration: 0.06, yoyo: true, repeat: 9 }, ${s.t0 + s.d * 0.45}); });
      q(".machine i").forEach((e, k) => tl.to(e, { backgroundColor: "${A}", duration: 0.1, yoyo: true, repeat: 5 }, ${s.t0 + s.d * 0.45} + k * 0.08));
      q(".term.small").forEach(e => tl.fromTo(e, { y: 300, opacity: 0, scale: 0.6 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.8)" }, ${s.t0 + s.d * 0.7}));
      ${heroIn("x: -400", s.t0 + 0.4)}`,
  }),
  // Terminal digitando comandos, com saída.
  terminal: (s, p) => {
    const rows = p.lines.map((l) => `<div class="tl ${l.out ? (l.out.startsWith("✗") ? "out err" : "out") : "cmd"}">${l.out ? esc(l.out) : `<span class="ps">$</span> <span class="typed" data-text="${esc(l.cmd)}"></span>`}</div>`).join("");
    const step = (s.d - 0.6) / p.lines.length;
    return {
      dark: true,
      html: `<div class="term big"><div class="tbar"><i></i><i></i><i></i><span>terminal</span></div><div class="tbody">${rows}</div></div>${hero("left:740px;top:1120px;width:280px")}`,
      anim: `
        q(".term.big").forEach(e => tl.fromTo(e, { y: 900 }, { y: 0, duration: 0.45, ease: "power3.out" }, ${s.t0}));
        ${heroIn("x: 400", s.t0 + 0.3)}
        q(".tl").forEach((row, k) => {
          const at = ${s.t0 + 0.5} + k * ${step.toFixed(3)};
          tl.fromTo(row, { opacity: 0 }, { opacity: 1, duration: 0.05 }, at);
          const typed = row.querySelector(".typed");
          if (typed) { const text = typed.dataset.text, o = { i: 0 }; tl.to(o, { i: text.length, duration: Math.min(0.9, text.length * 0.04), ease: "none", onUpdate: () => typed.textContent = text.slice(0, Math.round(o.i)) }, at); }
        });`,
    };
  },
  // Cadeia de N fases que acendem em sequência.
  fases: (s, p) => ({
    dark: false,
    html: `<div class="tag">${esc(p.label)}</div><div class="chain">${Array.from({ length: p.n }, (_, k) => `<div class="node"><b>${k + 1}</b></div>`).join("")}</div>
      <div class="done-card">${esc(p.result)}</div>${hero("left:400px;top:1120px;width:280px")}`,
    anim: `
      q(".tag").forEach(e => tl.fromTo(e, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0}));
      q(".node").forEach((e, k) => { tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.25, ease: "back.out(3)" }, ${s.t0} + 0.15 + k * 0.08); tl.to(e, { backgroundColor: "${A}", duration: 0.15 }, ${s.t0 + s.d * 0.3} + k * ${((s.d * 0.45) / p.n).toFixed(3)}); });
      q(".done-card").forEach(e => tl.fromTo(e, { scale: 0, rotation: -6 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.5)" }, ${s.t0 + s.d * 0.78}));
      ${heroIn("y: 600", s.t0 + 0.2)}
      q(".hero").forEach(h => tl.to(h, { y: -30, duration: 0.18, yoyo: true, repeat: 3 }, ${s.t0 + s.d * 0.8}));`,
  }),
  // Celular com um Reel que não decola (visualizações baixas).
  flop: (s, p) => ({
    dark: true,
    html: `<div class="phone tall"><div class="reelthumb"><span class="play">▶</span></div><div class="views"><b id="views${s.n}">0</b> visualizações</div></div>${hero("left:20px;top:1180px;width:250px")}<div class="sweat">💧</div>`,
    anim: `
      q(".phone").forEach(e => tl.fromTo(e, { y: 1200 }, { y: 0, duration: 0.5, ease: "power3.out" }, ${s.t0}));
      const v = { n: 0 }; tl.to(v, { n: ${p.views}, duration: 1.6, ease: "power3.out", onUpdate: () => document.getElementById("views${s.n}").textContent = Math.round(v.n) }, ${s.t0} + 0.5);
      ${heroIn("x: -400", s.t0 + 0.4)}
      q(".sweat").forEach(e => tl.fromTo(e, { opacity: 0, y: 0 }, { opacity: 1, y: 60, duration: 0.6, ease: "power1.in" }, ${s.t0 + s.d * 0.7}));`,
  }),
  // Ganchos com barra de nota e coroa no melhor.
  ganchos: (s, p) => ({
    dark: false,
    html: `<div class="tag">${esc(p.label)}</div>${p.hooks.map((h, k) => `<div class="hook-card" style="top:${310 + k * 250}px"><p>“${esc(h.text)}”</p><div class="bar"><i style="width:${h.score}%"></i></div>${h.best ? '<span class="crown">♛</span>' : ""}</div>`).join("")}${hero("left:780px;top:1150px;width:240px")}`,
    anim: `
      q(".tag").forEach(e => tl.fromTo(e, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0}));
      q(".hook-card").forEach((e, k) => tl.fromTo(e, { x: k % 2 ? 900 : -900 }, { x: 0, duration: 0.45, ease: "power3.out" }, ${s.t0} + 0.2 + k * 0.18));
      q(".hook-card .bar i").forEach((e, k) => tl.fromTo(e, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.out" }, ${s.t0 + s.d * 0.5} + k * 0.2));
      q(".crown").forEach(e => tl.fromTo(e, { scale: 0, rotation: -30 }, { scale: 1, rotation: 12, duration: 0.3, ease: "back.out(3)" }, ${s.t0 + s.d * 0.85}));
      ${heroIn("x: 400", s.t0 + 0.4)}`,
  }),
  // Semana planejada: posts caindo nos dias.
  semana: (s, p) => ({
    dark: true,
    html: `<div class="tag light">${esc(p.label)}</div><div class="week">${["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d, k) => `<div class="day"><small>${d}</small><i class="post p${k % 3}">${["▶", "▤", "◎"][k % 3]}</i></div>`).join("")}</div>${hero("left:400px;top:1080px;width:280px")}`,
    anim: `
      q(".tag").forEach(e => tl.fromTo(e, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0}));
      q(".day").forEach((e, k) => tl.fromTo(e, { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: "power3.out" }, ${s.t0} + 0.1 + k * 0.05));
      q(".post").forEach((e, k) => tl.fromTo(e, { y: -700, rotation: 30 }, { y: 0, rotation: 0, duration: 0.45, ease: "bounce.out" }, ${s.t0 + s.d * 0.3} + k * 0.14));
      ${heroIn("y: 600", s.t0 + 0.2)}`,
  }),
  // Antes (marcas de IA riscadas) e depois (texto limpo).
  humanizar: (s, p) => ({
    dark: false,
    html: `<div class="paper"><h3>${esc(p.title)}</h3><small class="lbl">antes</small><p class="before">${p.before.map((seg) => (typeof seg === "string" ? esc(seg) : `<mark class="bad">${esc(seg.bad)}</mark>`)).join("")}</p>
      <small class="lbl ok">depois</small><p class="after">${esc(p.after)}</p></div><div class="badge-ok">${esc(p.badge)}</div>${hero("left:60px;top:1150px;width:260px")}`,
    anim: `
      q(".paper").forEach(e => tl.fromTo(e, { y: 900 }, { y: 0, duration: 0.45, ease: "power3.out" }, ${s.t0}));
      q(".bad").forEach((e, k) => { tl.fromTo(e, { backgroundColor: "rgba(217,72,72,0)" }, { backgroundColor: "rgba(217,72,72,0.18)", duration: 0.2 }, ${s.t0 + s.d * 0.2} + k * 0.2); tl.fromTo(e, { backgroundSize: "0% 6px, 100% 100%" }, { backgroundSize: "100% 6px, 100% 100%", duration: 0.25 }, ${s.t0 + s.d * 0.35} + k * 0.2); });
      q(".lbl.ok, .after").forEach((e, k) => tl.fromTo(e, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ${s.t0 + s.d * 0.55} + k * 0.1));
      q(".badge-ok").forEach(e => tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, ${s.t0 + s.d * 0.8}));
      ${heroIn("x: -400", s.t0 + 0.3)}`,
  }),
  // Celular com botão "Publicar": o personagem é quem aperta.
  aprovar: (s, p) => ({
    dark: true,
    html: `<div class="phone"><div class="draft"><b>${esc(p.draft)}</b><i></i><i></i><i></i></div><div class="publish">${esc(p.button ?? "Publicar")}</div></div><div class="you">${esc(p.you)}</div>${hero("left:700px;top:1150px;width:280px")}`,
    anim: `
      q(".phone").forEach(e => tl.fromTo(e, { y: 1200 }, { y: 0, duration: 0.5, ease: "power3.out" }, ${s.t0}));
      ${heroIn("x: 400", s.t0 + 0.3)}
      q(".hero").forEach(h => tl.to(h, { x: -160, y: -420, duration: 0.35, ease: "power2.out" }, ${s.t0 + s.d * 0.55}));
      q(".publish").forEach(e => { tl.to(e, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, ${s.t0 + s.d * 0.65}); tl.to(e, { backgroundColor: "#2fa36b", duration: 0.1 }, ${s.t0 + s.d * 0.68}); });
      q(".you").forEach(e => tl.fromTo(e, { scale: 0, rotation: -10 }, { scale: 1, rotation: -4, duration: 0.3, ease: "back.out(3)" }, ${s.t0 + s.d * 0.72}));`,
  }),
  // Personagem no centro com áreas surgindo ao redor.
  orbita: (s, p) => {
    const n = p.items.length;
    return {
      dark: true,
      html: hero("left:380px;top:620px;width:320px") + p.items.map((it, k) => { const a = (k / n) * Math.PI * 2 - Math.PI / 2;
        return `<div class="orb" style="left:${Math.round(540 + Math.cos(a) * 340 - 130)}px;top:${Math.round(790 + Math.sin(a) * 430 - 34)}px">${esc(it)}</div>`; }).join(""),
      anim: `
        ${heroIn("y: 600", s.t0)}
        q(".orb").forEach((e, k) => tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(2.5)" }, ${s.t0} + 0.4 + k * ${Math.min(0.35, (s.d * 0.7) / n).toFixed(3)}));
        q(".hero").forEach(h => tl.to(h, { rotation: 6, duration: 0.25, yoyo: true, repeat: 5, ease: "sine.inOut" }, ${s.t0 + 0.6}));`,
    };
  },
  // Contador grande com grade de frascos.
  contador: (s, p) => ({
    dark: false,
    html: `<div class="bignum"><b id="bn${s.n}">0</b><span>${esc(p.label)}</span></div><div class="flasks">${Array.from({ length: 60 }, (_, k) => `<i class="flask f${k % 4}"></i>`).join("")}</div>${hero("left:400px;top:1150px;width:280px")}`,
    anim: `
      const c = { v: 0 }; tl.to(c, { v: ${p.to}, duration: 1.5, ease: "power2.out", onUpdate: () => document.getElementById("bn${s.n}").textContent = Math.round(c.v).toLocaleString("pt-BR") }, ${s.t0} + 0.2);
      q(".flask").forEach((e, k) => tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, ${s.t0} + 0.2 + k * 0.022));
      ${heroIn("y: 600", s.t0 + 0.3)}`,
  }),
  // Três painéis de laboratório: DNA, molécula e gráfico.
  lab: (s, p) => ({
    dark: true,
    html: `<div class="panel pa"><svg viewBox="0 0 200 300"><g class="dna">${Array.from({ length: 12 }, (_, k) => { const w = Math.max(10, Math.abs(Math.cos(k / 1.9)) * 110); return `<rect x="${Math.round(100 - w / 2)}" y="${10 + k * 24}" width="${Math.round(w)}" height="10" rx="5" fill="${k % 2 ? A : "#c9b3f5"}"/>`; }).join("")}</g></svg><b>${esc(p.labels[0])}</b></div>
      <div class="panel pb"><svg viewBox="0 0 200 300"><g class="mol"><line x1="100" y1="80" x2="50" y2="160"/><line x1="100" y1="80" x2="150" y2="160"/><line x1="50" y1="160" x2="100" y2="240"/><line x1="150" y1="160" x2="100" y2="240"/><circle cx="100" cy="80" r="22"/><circle cx="50" cy="160" r="18"/><circle cx="150" cy="160" r="18"/><circle cx="100" cy="240" r="22"/></g></svg><b>${esc(p.labels[1])}</b></div>
      <div class="panel pc"><svg viewBox="0 0 200 300"><g class="bars">${[120, 180, 90, 220, 160].map((h, k) => `<rect x="${20 + k * 34}" y="${270 - h}" width="24" height="${h}" fill="${k % 2 ? A : "#c9b3f5"}"/>`).join("")}</g></svg><b>${esc(p.labels[2])}</b></div>${hero("left:400px;top:1150px;width:280px")}`,
    anim: `
      q(".panel").forEach((e, k) => tl.fromTo(e, { y: 700, rotation: k === 1 ? 0 : (k ? 8 : -8) }, { y: 0, rotation: 0, duration: 0.5, ease: "back.out(1.4)" }, ${s.t0} + k * ${(s.d * 0.25).toFixed(3)}));
      q(".dna rect").forEach((e, k) => tl.fromTo(e, { scaleX: 0, transformOrigin: "50% 50%" }, { scaleX: 1, duration: 0.2 }, ${s.t0} + 0.3 + k * 0.04));
      q(".mol").forEach(e => tl.fromTo(e, { rotation: -90, svgOrigin: "100 160" }, { rotation: 0, duration: 0.8, ease: "back.out(1.6)" }, ${s.t0 + s.d * 0.25} + 0.2));
      q(".bars rect").forEach((e, k) => tl.fromTo(e, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.3, ease: "back.out(2)" }, ${s.t0 + s.d * 0.5} + 0.2 + k * 0.08));
      ${heroIn("y: 600", s.t0 + 0.2)}`,
  }),
  // Texto com citações [n] ligadas a uma pilha de artigos.
  citacoes: (s, p) => ({
    dark: false,
    html: `<div class="doc narrow"><h3>${esc(p.title)}</h3>${[0, 1, 2, 3, 4].map((k) => `<div class="cline"><i style="width:${55 + k * 6}%"></i><span class="cite">[${k + 1}]</span></div>`).join("")}</div>
      <div class="papers">${[0, 1, 2, 3, 4].map((k) => `<div class="paperlet" style="top:${k * 120}px"><b>[${k + 1}]</b><i></i><i></i></div>`).join("")}</div>${hero("left:60px;top:1180px;width:240px")}`,
    anim: `
      q(".doc").forEach(e => tl.fromTo(e, { x: -900 }, { x: 0, duration: 0.45, ease: "power3.out" }, ${s.t0}));
      q(".paperlet").forEach((e, k) => tl.fromTo(e, { x: 600, rotation: 10 }, { x: 0, rotation: 0, duration: 0.35, ease: "back.out(1.6)" }, ${s.t0} + 0.3 + k * 0.1));
      q(".cline i").forEach((e, k) => tl.fromTo(e, { scaleX: 0 }, { scaleX: 1, duration: 0.25 }, ${s.t0 + s.d * 0.3} + k * 0.2));
      q(".cite").forEach((e, k) => tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, ${s.t0 + s.d * 0.3} + 0.2 + k * 0.2));
      q(".paperlet").forEach((e, k) => tl.to(e, { backgroundColor: "${A}", duration: 0.12, yoyo: true, repeat: 1 }, ${s.t0 + s.d * 0.3} + 0.25 + k * 0.2));
      ${heroIn("x: -400", s.t0 + 0.4)}`,
  }),
  // Gráfico de publicação sendo desenhado.
  grafico: (s, p) => ({
    dark: true,
    html: `<div class="figure"><h3>${esc(p.title)}</h3><svg viewBox="0 0 800 520"><line class="ax" x1="60" y1="20" x2="60" y2="470"/><line class="ax" x1="60" y1="470" x2="780" y2="470"/>
      ${[0, 1, 2, 3, 4, 5].map((k) => { const h = 120 + ((k * 53) % 200) + k * 25; return `<rect class="gbar" x="${100 + k * 110}" y="${470 - h}" width="70" height="${h}" fill="${k % 2 ? A : "#c9b3f5"}"/>`; }).join("")}
      <path class="gline" d="M135 330 L245 290 L355 250 L465 190 L575 150 L685 90"/></svg><small>Fig. 1</small></div>${hero("left:760px;top:1150px;width:260px")}`,
    anim: `
      q(".figure").forEach(e => tl.fromTo(e, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.8)" }, ${s.t0}));
      q(".gbar").forEach((e, k) => tl.fromTo(e, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.35, ease: "back.out(2)" }, ${s.t0} + 0.4 + k * 0.1));
      q(".gline").forEach(e => tl.fromTo(e, { strokeDashoffset: 900 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, ${s.t0} + 1.1));
      ${heroIn("x: 400", s.t0 + 0.3)}`,
  }),
  // Busca na Voxelia dentro do celular, com o card do repositório.
  voxelia: (s, p) => ({
    dark: true,
    html: `<div class="phone"><div class="bar"><span class="dot"></span>Voxelia</div><div class="search"><span id="typed${s.n}"></span><i class="caret"></i></div>
      <div class="result"><div class="rtop">${sprite(CHAR)}<div><b>${esc(spec.repo)}</b><p>${esc(p.tagline)}</p></div></div>
      <div class="chips">${p.chips.map((c) => `<span>${esc(c)}</span>`).join("")}</div><div class="guide">Guia passo a passo em português →</div></div></div>`,
    anim: `
      q(".phone").forEach(e => tl.fromTo(e, { y: 1200 }, { y: 0, duration: 0.55, ease: "power3.out" }, ${s.t0}));
      const typed = ${js(p.query)}, o = { i: 0 };
      tl.to(o, { i: typed.length, duration: 1.1, ease: "none", onUpdate: () => document.getElementById("typed${s.n}").textContent = typed.slice(0, Math.round(o.i)) }, ${s.t0} + 0.5);
      q(".result").forEach(e => tl.fromTo(e, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.8)" }, ${s.t0} + 1.7));
      q(".chips span").forEach((e, k) => tl.fromTo(e, { scale: 0 }, { scale: 1, duration: 0.2, ease: "back.out(3)" }, ${s.t0} + 2.0 + k * 0.12));
      q(".guide").forEach(e => tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ${s.t0 + s.d * 0.7}));`,
  }),
  cta: (s, p) => ({
    dark: true, purple: true,
    html: `<div class="row">${["software", "empreendedorismo", "conteudo", "ciencia"].map((c) => sprite(c)).join("")}</div>
      <div class="ctapill">${esc(p.pre ?? "Link no")} <span>${esc(p.key ?? "comentário fixado")}</span></div><div class="arrow">↓</div><p class="ctasub">${esc(p.sub ?? "passo a passo completo no site da Voxelia")}</p><div class="handle">@voxelia.ia</div>`,
    anim: `
      q(".row .spr").forEach((e, k) => { tl.fromTo(e, { y: -900 }, { y: 0, duration: 0.4, ease: "bounce.out" }, ${s.t0} + k * 0.08); tl.to(e, { y: -40, duration: 0.25, yoyo: true, repeat: 7, ease: "sine.inOut" }, ${s.t0} + 0.8 + k * 0.06); });
      q(".ctapill").forEach(e => tl.fromTo(e, { scale: 0, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.5)" }, ${s.t0} + 0.2));
      q(".ctasub, .handle").forEach((e, k) => tl.fromTo(e, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, ${s.t0} + 0.5 + k * 0.2));
      q(".arrow").forEach(e => { tl.fromTo(e, { opacity: 0 }, { opacity: 1, duration: 0.2 }, ${s.t0} + 0.4); tl.to(e, { y: 40, duration: 0.3, yoyo: true, repeat: 7, ease: "sine.inOut" }, ${s.t0} + 0.6); });`,
  }),
};

const groups = [];
for (const l of lines) {
  if (l.scene === "+" && groups.length) groups.at(-1).lines.push(l); else groups.push({ key: l.scene, p: l.p || {}, lines: [l] });
}
const built = groups.map((g, n) => {
  const t0 = g.lines[0].start, t1 = n < groups.length - 1 ? groups[n + 1].lines[0].start : TOTAL;
  if (!scenes[g.key]) throw new Error(`cena desconhecida: ${g.key}`);
  const s = scenes[g.key]({ t0, d: +(t1 - t0).toFixed(3), n, times: g.lines.map((l) => l.start) }, g.p);
  return { ...s, t0, d: +(t1 - t0).toFixed(3), n };
});

// 4. Legendas: blocos de até 3 palavras, tempo proporcional ao tamanho, palavra-chave em destaque.
const norm = (w) => w.toLowerCase().replace(/[.,:?!“”"]/g, "");
const captions = lines.flatMap((l) => {
  const words = (l.show || l.say).split(" ");
  const keys = l.key.toLowerCase().split(" ").map(norm);
  const chunks = [];
  for (let k = 0; k < words.length; k += 3) chunks.push(words.slice(k, k + 3));
  const total = chunks.reduce((a, c) => a + c.join(" ").length, 0);
  let at = l.start;
  return chunks.map((c) => {
    const d = (l.dur * c.join(" ").length) / total;
    const html = c.map((w) => (keys.includes(norm(w)) ? `<em>${esc(w)}</em>` : esc(w))).join(" ");
    const cap = { at: +at.toFixed(3), d: +d.toFixed(3), html };
    at += d;
    return cap;
  });
});

const css = readFileSync("scenes.css", "utf8");
const html = `<!doctype html>
<html lang="pt-BR" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${css}
      #root { --accent: ${A}; }
    </style>
  </head>
  <body>
    <svg width="0" height="0" style="position:absolute"><defs>${[...symbols.values()].map((p) => `<symbol id="${p.id}" viewBox="0 0 12 15">${p.svg}</symbol>`).join("")}</defs></svg>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="${TOTAL}">
      ${lines.map((l) => `<audio id="voz${l.i}" src="${l.file}" data-start="${l.start}" data-duration="${l.dur}" data-track-index="${20 + l.i}" data-volume="1"></audio>`).join("\n      ")}
      <audio id="trilha" src="assets/trilha.wav" data-start="0" data-duration="${TOTAL}" data-track-index="40" data-volume="0.12"></audio>
      ${built.map((b) => `<section id="sc${b.n}" class="clip scene ${b.purple ? "dark purple" : b.dark ? "dark" : "light"}" data-start="${b.t0}" data-duration="${(b.d + (b.n < built.length - 1 ? 0.3 : 0)).toFixed(3)}" data-track-index="${b.n % 2}" data-layout-allow-overflow data-layout-allow-overlap><div class="bg"></div><div class="stage">${b.html}</div></section>`).join("\n      ")}
      <div id="cap" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="5">${captions.map((c, k) => `<div class="cap" id="c${k}">${c.html}</div>`).join("")}</div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${built.map((b) => `{
        const sc = document.getElementById("sc${b.n}"), q = (s) => sc.querySelectorAll(s);
        tl.fromTo(sc, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: ${b.n ? 0.3 : 0.01}, ease: "power3.inOut" }, ${b.t0});
        tl.fromTo(sc.querySelector(".stage"), { scale: 1 }, { scale: 1.05, duration: ${b.d}, ease: "none" }, ${b.t0});
        ${b.anim}
      }`).join("\n      ")}
      ${JSON.stringify(captions.map((c) => [c.at, c.d]))}.forEach(([at, d], k) => {
        tl.fromTo("#c" + k, { opacity: 0, scale: 0.85, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.12, ease: "back.out(2)" }, at);
        tl.to("#c" + k, { opacity: 0, duration: 0.06 }, at + d - 0.03);
      });
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;
writeFileSync(`${OUT}/index.html`, html);
cpSync("assets/trilha.wav", `${OUT}/assets/trilha.wav`);
console.log(`${OUT} ${TOTAL}s, ${lines.length} frases, ${built.length} cenas, ${captions.length} legendas`);
