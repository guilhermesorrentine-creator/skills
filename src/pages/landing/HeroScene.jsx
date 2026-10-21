import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import CyberpunkCharacter from "../../components/categories/CyberpunkCharacter.jsx";
import { CATEGORIES, categoryLabel, typeLabel } from "../../lib/resources.js";
import { motionTokens } from "../../lib/motion-tokens.js";

const placeholders = {
  todas: "Buscar skills, ferramentas e guias…",
  software: "Ex.: revisar segurança do meu código",
  empreendedorismo: "Ex.: planejar o lançamento de um produto",
  conteudo: "Ex.: editar um vídeo com IA",
  ciencia: "Ex.: analisar dados de um experimento",
};

// Cena do hero: a janela central é a interface real do Arsenal (busca, categorias, cards)
// com dados de demonstração; os quatro personagens trocam a categoria mostrada.
// Hover/foco = prévia temporária; clique/toque = fixa a categoria.
export default function HeroScene({ demo }) {
  const reduced = useReducedMotion();
  const [fixed, setFixed] = useState("todas");
  const [preview, setPreview] = useState(null);
  const [acting, setActing] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const shown = preview || fixed;

  const items = useMemo(() => {
    const all = demo?.skills || [];
    const pool = shown === "todas" ? CATEGORIES.map((c) => all.find((s) => s.category === c.id)).filter(Boolean) : all.filter((s) => s.category === shown);
    return pool.slice(0, 4);
  }, [demo, shown]);
  const count = shown === "todas" ? demo?.stats.skills : demo?.stats.byArea[shown];

  const act = (id, ms = 2400) => {
    setActing(id); window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActing((current) => (current === id ? null : current)), ms);
  };
  const choose = (id) => { setFixed((current) => (current === id ? "todas" : id)); setPreview(null); act(id); };

  const character = (category, side) => {
    const active = acting === category.id || preview === category.id;
    const selected = fixed === category.id;
    return <button key={category.id} type="button" className={`hero-char hero-char-${side} ${selected ? "is-selected" : ""}`} data-category={category.id}
      aria-pressed={selected} aria-label={`${category.label}: mostrar recursos de ${category.label.toLowerCase()} na demonstração`}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") { setPreview(category.id); setActing(category.id); } }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") { setPreview(null); setActing((current) => (current === category.id && fixed !== category.id ? null : current)); } }}
      onFocus={(event) => { if (event.target.matches(":focus-visible")) { setPreview(category.id); setActing(category.id); } }}
      onBlur={() => { setPreview(null); setActing(null); }}
      onClick={() => choose(category.id)}>
      <span className="hero-char-stage" aria-hidden="true"><span className="hero-char-shadow"/><CyberpunkCharacter category={category.id} active={active}/></span>
      <span className="hero-char-label">{category.label}</span>
    </button>;
  };

  return <div className="hero-scene" data-category={shown === "todas" ? undefined : shown}>
    <div className="hero-chars hero-chars-left">{CATEGORIES.slice(0, 2).map((c) => character(c, "left"))}</div>
    <motion.div className="hero-window" initial={reduced ? false : { opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.2, ease: motionTokens.easing.smooth }}>
      <div className="hw-bar" aria-hidden="true"><i/><i/><i/><span>arsenal ia · demonstração</span></div>
      <div className="hw-body">
        <div className="hw-search" aria-hidden="true"><span>⌕</span><AnimatePresence mode="wait" initial={false}><motion.span key={shown} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -4 }} transition={{ duration: motionTokens.duration.fast }}>{placeholders[shown]}</motion.span></AnimatePresence><kbd>Ctrl K</kbd></div>
        <div className="hw-tabs" role="group" aria-label="Categoria da demonstração">
          {[{ id: "todas", label: "Todas" }, ...CATEGORIES].map((tab) => <button key={tab.id} type="button" className={`hw-tab ${shown === tab.id ? "is-on" : ""}`} aria-pressed={fixed === tab.id} onClick={() => (tab.id === "todas" ? (setFixed("todas"), setPreview(null)) : choose(tab.id))}>
            {shown === tab.id && <motion.span layoutId="hw-tab-pill" className="hw-tab-pill" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }} aria-hidden="true"/>}
            <span>{tab.label}</span>
          </button>)}
        </div>
        <p className="hw-count" aria-live="polite">{count != null ? `${count.toLocaleString("pt-BR")} skills ${shown === "todas" ? "no acervo" : `em ${categoryLabel[shown]}`}` : "Carregando…"}</p>
        <div className="hw-results">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, index) => <motion.article key={`${shown}-${item.id}`} className="hw-card" data-category={item.category}
              initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.28, delay: reduced ? 0 : index * 0.05, ease: motionTokens.easing.smooth }}>
              <div className="hw-card-top"><span className="badge">{categoryLabel[item.category]}</span><span className="badge badge-type">{typeLabel.skill}</span></div>
              <h3>{item.name}</h3>
              <p>{item.description || "Descrição não informada na fonte."}</p>
              <span className="r-card-source">{item.repoName}</span>
            </motion.article>)}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
    <div className="hero-chars hero-chars-right">{CATEGORIES.slice(2).map((c) => character(c, "right"))}</div>
  </div>;
}
