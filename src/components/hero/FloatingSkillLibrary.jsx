import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { motionTokens, springs } from "../../lib/motion-tokens.js";
import { areaNames } from "../../lib/areas.js";

// Posições na cena (px a partir do centro): [x, y, z, rotateY]. Frente → meio → fundo.
const SLOTS = [
  [-30, -18, 160, -6], [175, -125, 115, -14], [-205, 112, 105, 12], [160, 140, 135, -9],
  [-215, -150, 0, 14], [30, -212, -20, -4], [235, 22, 10, -16], [-35, 214, 0, 6],
  [-125, -48, -175, 12], [110, -6, -210, -10], [-262, 8, -240, 18], [268, -175, -215, -18],
];
const glyphs = { software: "</>", empreendedorismo: "↗$", conteudo: "▶●", ciencia: "⌬" };

function shortName(name) {
  return name.length > 24 ? `${name.slice(0, 22)}…` : name;
}

function useLiteMode() {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || navigator.connection?.saveData === true;
    const update = () => setLite(weak || query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return lite;
}

// Biblioteca holográfica em CSS 3D: perspectiva real, camadas em profundidade, inclinação pelo cursor
// e reorganização animada conforme categoria ou busca. Usa só skills reais do catálogo.
function FloatingSkillLibrary({ skills, category, emphasisIds, onOpen }) {
  const reduced = useReducedMotion();
  const lite = useLiteMode();
  const stageRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [entered, setEntered] = useState(false);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, springs.pointer);
  const sy = useSpring(py, springs.pointer);
  const rotateY = useTransform(sx, (v) => v * motionTokens.tilt.y * 2 - 8);
  const rotateX = useTransform(sy, (v) => 6 - v * motionTokens.tilt.x * 2);
  const lightX = useTransform(sx, (v) => `${50 + v * 60}%`);
  const lightY = useTransform(sy, (v) => `${40 + v * 50}%`);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const cards = useMemo(() => {
    const list = lite ? skills.slice(0, 7) : skills;
    const emphasized = (skill) => (category !== "todas" && skill.category === category) || emphasisIds.has(skill.id);
    const hasEmphasis = list.some(emphasized);
    const ordered = [...list.filter(emphasized), ...list.filter((skill) => !emphasized(skill))];
    return ordered.map((skill, index) => ({ skill, slot: SLOTS[index % SLOTS.length], dim: hasEmphasis && !emphasized(skill), lead: hasEmphasis && emphasized(skill), index }));
  }, [skills, category, emphasisIds, lite]);

  const interactive = !reduced && !lite;
  const onPointerMove = (event) => {
    if (!interactive || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const resetPointer = () => { px.set(0); py.set(0); };

  return <div ref={stageRef} className={`holo-stage ${visible ? "" : "is-paused"} ${lite ? "is-lite" : ""}`} onPointerMove={onPointerMove} onPointerLeave={resetPointer} data-active-category={category}>
    <motion.div className="holo-light" style={{ "--lx": lightX, "--ly": lightY }} aria-hidden="true"/>
    <div className="holo-scale">
      <motion.div className="holo-scene" style={interactive ? { rotateX, rotateY } : { rotateX: 6, rotateY: -8 }}>
        <div className="holo-floor" aria-hidden="true"><i/><i/><i/></div>
        <div className="holo-core" aria-hidden="true"/>
        <AnimatePresence>
          {cards.map(({ skill, slot, dim, lead, index }) => <motion.button key={skill.id} data-focus-id={skill.id} type="button" className={`holo-card ${dim ? "is-dim" : ""} ${lead ? "is-lead" : ""}`} data-category={skill.category}
            aria-label={`Abrir skill ${skill.name}, ${areaNames[skill.category]}`}
            initial={reduced ? false : { opacity: 0, scale: 0.6, x: 0, y: 0, z: -300 }}
            animate={{ opacity: dim ? 0.34 : 1, scale: lead ? 1.06 : 1, x: slot[0], y: slot[1], z: slot[2], rotateY: slot[3] }}
            exit={reduced ? undefined : { opacity: 0, scale: 0.6, z: -320 }}
            transition={reduced ? { duration: 0 } : { ...springs.layout, delay: entered ? index * 0.02 : 0.25 + index * 0.035, opacity: { duration: motionTokens.duration.normal } }}
            onClick={() => onOpen(skill)}>
            <span className="holo-card-float" style={{ animationDelay: `${-index * 0.9}s` }}>
              <span className="holo-card-top"><span className="holo-glyph" aria-hidden="true">{glyphs[skill.category]}</span><span className="holo-cat">{areaNames[skill.category]}</span></span>
              <span className="holo-name">{shortName(skill.name)}</span>
              <span className="holo-repo">{skill.repoName}</span>
            </span>
          </motion.button>)}
        </AnimatePresence>
      </motion.div>
    </div>
    <p className="holo-caption" aria-hidden="true"><span className="status-dot"/> {cards.length} SKILLS_RENDERIZADAS · {category === "todas" ? "ALL" : areaNames[category].toUpperCase()}</p>
  </div>;
}

export default memo(FloatingSkillLibrary);
