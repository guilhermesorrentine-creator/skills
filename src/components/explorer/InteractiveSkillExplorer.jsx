import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens, springs } from "../../lib/motion-tokens.js";
import { areas, areaNames } from "../../lib/areas.js";
import CyberpunkCharacter from "../categories/CyberpunkCharacter.jsx";

const howItWorks = {
  software: "Skills de código, agentes, automação e segurança ficam agrupadas por repositório de origem.",
  empreendedorismo: "Negócios, marca, redes sociais e vídeo aparecem juntos para quem está lançando uma ideia.",
  conteudo: "Design, voz e materiais visuais reunidos na área de criação.",
  ciencia: "Ferramentas de pesquisa, química, biologia e estatística com origem científica identificada.",
};

// Demonstração pública do produto: categorias reais, amostra fixa de skills (`/data/demo.json`)
// e prévia da skill escolhida. Não carrega o catálogo completo.
export default function InteractiveSkillExplorer({ onFullAccess, fullAccessLabel = "Acessar biblioteca completa" }) {
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState(null);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState("software");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/data/demo.json").then((response) => { if (!response.ok) throw new Error("demo"); return response.json(); })
      .then((data) => { if (active) setDemo(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  const list = useMemo(() => demo?.skills.filter((skill) => skill.category === category) || [], [demo, category]);
  const selected = list.find((skill) => skill.id === selectedId) || list[0];
  const choose = (id) => { setCategory(id); setSelectedId(null); };
  const layoutTransition = reduced ? { duration: 0 } : springs.layout;

  return <div className="explorer" data-category={category}>
    <header className="explorer-head">
      <span className="term-dots" aria-hidden="true"><i/><i/><i/></span>
      <div><p className="explorer-title">SKILL EXPLORER</p><h3>Explore as possibilidades da Biblioteca Total</h3></div>
      <span className="explorer-badge">MODO DEMONSTRAÇÃO</span>
    </header>
    {failed && <p className="explorer-error" role="alert">Não foi possível carregar a demonstração. Atualize a página para tentar novamente.</p>}
    <div className="explorer-body">
      <div className="explorer-areas" role="radiogroup" aria-label="Categoria da demonstração">
        {areas.slice(1).map((area) => {
          const on = category === area.id;
          return <button key={area.id} type="button" role="radio" aria-checked={on} className={`explorer-area ${on ? "is-on" : ""}`} data-category={area.id} onClick={() => choose(area.id)}>
            {on && <motion.span layoutId="explorer-marker" className="explorer-marker" transition={layoutTransition} aria-hidden="true"/>}
            <span className="explorer-avatar" aria-hidden="true"><CyberpunkCharacter category={area.id} active={on}/></span>
            <span className="explorer-area-text"><b>{area.label}</b><small>{demo ? `${demo.stats.byArea[area.id].toLocaleString("pt-BR")} skills` : "…"}</small></span>
          </button>;
        })}
      </div>

      <div className="explorer-list" aria-live="polite">
        <p className="explorer-count"><span className="prompt-caret" aria-hidden="true">&gt;</span> {demo ? `${list.length} de ${demo.stats.byArea[category].toLocaleString("pt-BR")} skills em ${areaNames[category]}` : "Carregando amostra…"}</p>
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((skill, index) => <motion.button key={skill.id} type="button" layout={reduced ? false : "position"} className={`explorer-item ${selected?.id === skill.id ? "is-selected" : ""}`} aria-pressed={selected?.id === skill.id} onClick={() => setSelectedId(skill.id)}
            initial={reduced ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: 12, transition: { duration: motionTokens.duration.fast } }}
            transition={{ ...layoutTransition, opacity: { duration: motionTokens.duration.fast, delay: reduced ? 0 : index * 0.04 } }}>
            <span className="explorer-item-top"><b>{skill.name}</b><span className="cat-badge">{areaNames[skill.category]}</span></span>
            <span className="explorer-item-desc">{skill.description || "A fonte não informa uma descrição."}</span>
            <span className="explorer-item-repo">{skill.repoName}</span>
          </motion.button>)}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {selected && <motion.aside key={selected.id} className="explorer-preview" aria-label="Prévia da skill"
          initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: motionTokens.duration.fast }}>
          <p className="sys-tag"><span className="status-dot"/> PRÉVIA</p>
          <h4>{selected.name}</h4>
          <dl>
            <div><dt>Categoria</dt><dd>{areaNames[selected.category]}</dd></div>
            <div><dt>Origem</dt><dd>{selected.repoName}</dd></div>
          </dl>
          <p className="explorer-preview-desc">{selected.description || "A fonte não informa uma descrição."}</p>
          <p className="explorer-note">{howItWorks[selected.category]} Na biblioteca completa você vê o caminho do arquivo, o link para a fonte original, favoritos, histórico e comparação.</p>
          <button type="button" className="button button-primary" onClick={onFullAccess}>{fullAccessLabel}</button>
        </motion.aside>}
      </AnimatePresence>
    </div>
  </div>;
}
