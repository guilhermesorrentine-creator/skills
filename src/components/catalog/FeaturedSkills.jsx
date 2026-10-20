import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";
import { areaNames } from "../../lib/areas.js";
import { CopyButton, promptFor } from "../shared.jsx";
import { trackGlare } from "./SkillMosaic.jsx";

// Vitrine editorial (sem busca) ou dos melhores resultados (com busca). Não indica popularidade.
export default function FeaturedSkills({ skills, query, category, onOpen }) {
  const reduced = useReducedMotion();
  if (!skills.length) return null;
  const [lead, ...rest] = skills;
  const heading = query ? "Mais relevantes para a busca" : category !== "todas" ? `Seleção editorial · ${areaNames[category]}` : "Seleção editorial";
  return <section className="featured" aria-labelledby="featured-title">
    <div className="featured-head">
      <p className="sys-tag">{query ? "RANKING://LOCAL" : "CURADORIA://EDITORIAL"}</p>
      <h2 id="featured-title">{heading}</h2>
      <p className="section-lead">{query ? "Ordenados pelo ranking local de correspondência com o que você digitou." : "Pontos de partida escolhidos à mão em cada área — não é uma lista de popularidade."}</p>
    </div>
    <div className="featured-grid">
      {[lead, ...rest].map((skill, index) => <motion.article key={skill.id} className={`feature-card ${index === 0 ? "is-lead" : ""}`} data-category={skill.category} onPointerMove={trackGlare}
        initial={reduced ? false : { opacity: 0, y: motionTokens.distance.md }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: motionTokens.duration.normal, delay: index * motionTokens.stagger.tight, ease: motionTokens.easing.smooth }}>
        <span className="tile-glare" aria-hidden="true"/>
        <p className="feature-path"><span>{areaNames[skill.category]}</span>://{skill.repoName}</p>
        <h3><button type="button" data-focus-id={skill.id} onClick={() => onOpen(skill)}>{skill.name}</button></h3>
        <p className="feature-desc">{skill.description || "A fonte não informa uma descrição."}</p>
        {index === 0 && <div className="feature-actions"><button type="button" className="button button-primary" onClick={() => onOpen(skill)}>Abrir ficha</button><CopyButton value={promptFor(skill)}>Copiar prompt</CopyButton></div>}
      </motion.article>)}
    </div>
  </section>;
}
