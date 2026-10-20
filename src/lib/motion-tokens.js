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
