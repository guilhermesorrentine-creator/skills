import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";

// Painel de terminal: entra em sequência (`order`) com breve iluminação da borda; o conteúdo já é legível.
export default function TerminalPanel({ title, code, order = 0, className = "", children, labelledBy }) {
  const reduced = useReducedMotion();
  const id = labelledBy || `panel-${title.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  return <motion.section className={`term-panel ${className}`} aria-labelledby={id}
    initial={reduced ? false : { opacity: 0, y: motionTokens.distance.sm }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: motionTokens.duration.normal, delay: reduced ? 0 : 0.06 + order * motionTokens.stagger.tight, ease: motionTokens.easing.smooth }}>
    <header className="term-head"><span className="term-dots" aria-hidden="true"><i/><i/><i/></span><h2 id={id}>{title}</h2>{code && <span className="term-code" aria-hidden="true">{code}</span>}</header>
    <div className="term-body">{children}</div>
  </motion.section>;
}
