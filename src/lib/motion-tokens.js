// Tokens de movimento compartilhados; o CSS espelha as durações em `src/styles/tokens.css`.
export const motionTokens = {
  duration: {
    instant: 0.08,
    fast: 0.18,
    normal: 0.42,
    slow: 0.72,
    cinematic: 0.9,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1],
    sharp: [0.4, 0, 0.2, 1],
    // Curvas medidas pelo motionmaxxing: pousar desacelera, sair acelera.
    softLand: [0.16, 0.84, 0.3, 1],
    snapSettle: [0.05, 0.95, 0.1, 1],
    accelExit: [0.55, 0, 0.9, 0.4],
  },
  distance: { xs: 4, sm: 10, md: 24, lg: 40 },
  scale: { press: 0.97, pop: 1.025 },
  stagger: { tight: 0.05, normal: 0.08 },
  // Intensidade da inclinação da cena 3D (graus) e da paralaxe por camada (px).
  tilt: { x: 9, y: 13 },
  parallax: [10, 22, 38],
};

export const springs = {
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 155, damping: 22 },
  bouncy: { type: "spring", stiffness: 400, damping: 10 },
  layout: { type: "spring", stiffness: 260, damping: 32, mass: 0.9 },
  pointer: { stiffness: 90, damping: 18, mass: 0.6 },
};

export function shouldAnimate(prefersReducedMotion) {
  return !prefersReducedMotion;
}

// Entrada padrão de um bloco; `order` define o atraso dentro de uma sequência.
export function reveal(reduced, order = 0) {
  if (reduced) return { initial: false, animate: { opacity: 1, y: 0 } };
  return {
    initial: { opacity: 0, y: motionTokens.distance.md },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: order * motionTokens.stagger.normal },
  };
}

// Card entrando com o scroll: chega de um pouco maior e mais baixo, com desfoque que se resolve.
// Escalonamento irregular por coluna (as regras medidas evitam intervalos idênticos).
const columnDelay = [0, 0.07, 0.12, 0.18, 0.22];
export function cardReveal(reduced, index = 0, amount = 0.25) {
  if (reduced) return { initial: false };
  return {
    initial: { opacity: 0, y: 46, scale: 1.04, rotateX: 9, filter: "blur(6px)" },
    whileInView: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)" },
    viewport: { once: true, amount, margin: "0px 0px -40px 0px" },
    transition: {
      default: { duration: 0.62, ease: motionTokens.easing.softLand, delay: columnDelay[index % columnDelay.length] },
      opacity: { duration: 0.2, delay: columnDelay[index % columnDelay.length] },
      filter: { duration: 0.32, delay: columnDelay[index % columnDelay.length] },
    },
    style: { transformPerspective: 900 },
  };
}
