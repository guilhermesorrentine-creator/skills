export const motionTokens = {
  duration: {
    instant: 0.08,
    fast: 0.18,
    normal: 0.42,
    slow: 0.72,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1],
    sharp: [0.4, 0, 0.2, 1],
  },
  distance: { xs: 4, sm: 10, md: 24 },
  scale: { press: 0.97, pop: 1.025 },
};

export const springs = {
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 155, damping: 22 },
  bouncy: { type: "spring", stiffness: 400, damping: 10 },
};

export function shouldAnimate(prefersReducedMotion) {
  return !prefersReducedMotion;
}
