import { lazy, Suspense } from "react";
import { motion, useReducedMotion } from "motion/react";
import { reveal } from "../../lib/motion-tokens.js";
import SearchBox from "../catalog/SearchBox.jsx";

// A cena 3D carrega em um chunk separado: texto e busca renderizam primeiro.
const FloatingSkillLibrary = lazy(() => import("./FloatingSkillLibrary.jsx"));

export default function CyberHero({ search, counts, heroSkills, category, emphasisIds, onOpenSkill, onExplore }) {
  const reduced = useReducedMotion();
  return <section className="hero" id="topo" aria-labelledby="hero-title">
    <div className="wrap hero-grid">
      <div className="hero-copy">
        <motion.p className="sys-tag" {...reveal(reduced, 0)}><span className="status-dot"/> [ SYSTEM ONLINE ] · ÍNDICE DE AGENT SKILLS</motion.p>
        <motion.h1 id="hero-title" {...reveal(reduced, 1)}>Biblioteca <span className="neon-text">Total</span><span className="hero-sub">o acervo holográfico de Agent Skills.</span></motion.h1>
        <motion.p className="hero-lead" {...reveal(reduced, 2)}>Pesquise por nome, tecnologia ou objetivo, entenda de onde cada skill vem e abra a fonte original antes de usá-la com o seu agente.</motion.p>
        <motion.div className="hero-search" {...reveal(reduced, 3)}>
          <SearchBox {...search}/>
          <div className="hero-actions">
            <button type="button" className="button button-primary" onClick={onExplore}><span aria-hidden="true">&gt;</span> EXPLORE_LIBRARY</button>
            <a className="button button-ghost" href="#categorias">Ver categorias</a>
          </div>
        </motion.div>
        <motion.dl className="hero-counts" {...reveal(reduced, 4)}>
          <div><dt>REPOSITÓRIOS</dt><dd>{counts.repos.toString().padStart(2, "0")}</dd></div>
          <div><dt>SKILLS_INDEXED</dt><dd>{counts.skills.toLocaleString("pt-BR")}</dd></div>
          <div><dt>CATEGORIAS</dt><dd>04</dd></div>
        </motion.dl>
      </div>
      <motion.div className="hero-visual" initial={reduced ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        <Suspense fallback={<div className="holo-stage is-loading" aria-hidden="true"/>}>
          {heroSkills.length > 0 ? <FloatingSkillLibrary skills={heroSkills} category={category} emphasisIds={emphasisIds} onOpen={onOpenSkill}/> : <div className="holo-stage is-loading" aria-hidden="true"/>}
        </Suspense>
      </motion.div>
    </div>
  </section>;
}
