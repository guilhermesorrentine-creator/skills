import { motion, useReducedMotion } from "motion/react";
import { motionTokens, springs } from "../../lib/motion-tokens.js";
import CyberpunkCharacter, { characters } from "./CyberpunkCharacter.jsx";
import useCharacterActivation from "./useCharacterActivation.js";

const blurbs = {
  software: "Código, agentes, automação, segurança e ferramentas de desenvolvimento.",
  empreendedorismo: "Negócios, marca, redes sociais e produção de vídeo para lançar ideias.",
  conteudo: "Design, voz, documentação visual e criação de materiais.",
  ciencia: "Bioinformática, química, estatística, literatura e laboratório.",
};

// Quatro ambientes com personagens pixel-art; o clique aplica o filtro de categoria.
export default function CategorySection({ areas, counts, active, onSelect, onShowCatalog }) {
  const reduced = useReducedMotion();
  return <section className="categories-section" id="categorias" aria-labelledby="categorias-title">
    <div className="wrap">
      <div className="section-head">
        <p className="sys-tag">CATEGORY://SELECT</p>
        <h2 id="categorias-title">Quatro áreas, <span className="neon-text">quatro agentes.</span></h2>
        <p className="section-lead">Escolha um personagem para filtrar o catálogo e reorganizar a biblioteca 3D.</p>
      </div>
      <div className="category-grid">
        {areas.map((area, index) => <CategoryCard key={area.id} area={area} index={index} count={counts[area.id] || 0} selected={active === area.id} reduced={reduced} onSelect={onSelect} onShowCatalog={onShowCatalog}/>)}
      </div>
    </div>
  </section>;
}

function CategoryCard({ area, index, count, selected, reduced, onSelect, onShowCatalog }) {
  const { active, handlers } = useCharacterActivation();
  return <motion.article className={`category-card ${selected ? "is-selected" : ""} ${active ? "is-active" : ""}`} data-category={area.id}
    initial={reduced ? false : { opacity: 0, y: motionTokens.distance.md }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: motionTokens.duration.normal, delay: index * motionTokens.stagger.normal, ease: motionTokens.easing.smooth }}>
    <button type="button" className="category-hit" aria-pressed={selected} onClick={() => onSelect(selected ? "todas" : area.id)} {...handlers}>
      <span className="category-stage" aria-hidden="true">
        <span className="category-ring"/>
        <CyberpunkCharacter category={area.id} active={active}/>
      </span>
      <span className="category-code">CATEGORY://{area.code}</span>
      <span className="category-name">{area.label}</span>
      <span className="category-role">{characters[area.id].title}</span>
      <span className="category-blurb">{blurbs[area.id]}</span>
      <span className="category-count"><b>{count.toLocaleString("pt-BR")}</b> skills {selected ? "· filtro ativo" : ""}</span>
    </button>
    {selected && <motion.button type="button" className="category-go" onClick={onShowCatalog} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : springs.snappy}>Ver no catálogo ↓</motion.button>}
  </motion.article>;
}
