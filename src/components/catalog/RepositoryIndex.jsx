import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { springs } from "../../lib/motion-tokens.js";
import { areas, areaNames } from "../../lib/areas.js";

// Diretório dos 37 repositórios reais, com filtro por área. Repositórios sem skills continuam listados.
export default function RepositoryIndex({ repos, onOpenRepo }) {
  const reduced = useReducedMotion();
  const [area, setArea] = useState("todas");
  const max = Math.max(1, ...repos.map((repo) => repo.skills.length));
  const shown = (area === "todas" ? repos : repos.filter((repo) => repo.category === area)).slice().sort((a, b) => b.skills.length - a.skills.length || a.name.localeCompare(b.name));
  return <section className="repos-section" id="repositorios" aria-labelledby="repos-title">
    <div className="wrap">
      <div className="section-head">
        <p className="sys-tag">SOURCE://GITHUB</p>
        <h2 id="repos-title">Repositórios de origem</h2>
        <p className="section-lead">Cada skill aponta para um destes repositórios. A contagem é a do índice; repositórios sem skills catalogadas aparecem como referência.</p>
      </div>
      <div className="chip-row" role="group" aria-label="Filtrar repositórios por área">
        {areas.map((item) => <button key={item.id} type="button" className="chip" aria-pressed={area === item.id} onClick={() => setArea(item.id)}>{item.label}</button>)}
      </div>
      <p className="sr-only" aria-live="polite">{shown.length} repositórios exibidos.</p>
      <ul className="repo-list">
        {shown.map((repo) => <motion.li key={repo.name} layout={reduced ? false : "position"} transition={springs.layout} data-category={repo.category}>
          <button type="button" className="repo-row" data-focus-id={`repo:${repo.name}`} onClick={() => onOpenRepo(repo.name)}>
            <span className="repo-row-name">{repo.name}</span>
            <span className="repo-row-cat">{areaNames[repo.category]}</span>
            <span className="repo-row-bar" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.min(100, Math.sqrt(repo.skills.length) / Math.sqrt(max) * 100))}%` }}/></span>
            <span className="repo-row-count">{repo.skills.length ? `${repo.skills.length} skills` : "sem skills no índice"}</span>
          </button>
        </motion.li>)}
      </ul>
    </div>
  </section>;
}
