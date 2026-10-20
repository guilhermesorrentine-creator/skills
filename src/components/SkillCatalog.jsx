import { getMatchReason } from "../lib/search.js";
import { CopyButton } from "./shared.jsx";

const areaNames = { software: "Software", empreendedorismo: "Empreendedorismo", conteudo: "Conteúdo", ciencia: "Ciência" };

export function Highlight({ text = "", query = "" }) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length > 1);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return String(text).split(pattern).map((part, index) => new RegExp(pattern.source, "i").test(part)
    ? <mark key={`${index}-${part}`}>{part}</mark> : part);
}

export function SkillCard({ skill, query, favorite, compared, onOpen, onFavorite, onCompare, index = 0 }) {
  return <article className="skill-result" data-category={skill.category} data-reveal style={{ "--card-delay": `${index % 6 * 28}ms` }}>
    <div className="skill-result-meta"><span className="category-badge">{areaNames[skill.category] || skill.category}</span><span className="origin-label">{skill.repoName}</span></div>
    <h3><button className="skill-title-button" onClick={() => onOpen(skill)}><Highlight text={skill.name} query={query}/></button></h3>
    <p><Highlight text={skill.description || "A fonte não informa uma descrição para esta skill."} query={query}/></p>
    <p className="match-reason">{getMatchReason(skill, query)}</p>
    {skill.path && <code className="skill-path">{skill.path}</code>}
    <div className="skill-actions">
      <button className="button button-outline" onClick={() => onOpen(skill)}>Ver detalhes</button>
      <CopyButton value={promptFor(skill)}>Copiar prompt</CopyButton>
      {skill.skillUrl && <a className="text-link" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Abrir no GitHub ↗</a>}
      <button className="icon-action" aria-pressed={favorite} aria-label={favorite ? `Remover ${skill.name} dos favoritos` : `Favoritar ${skill.name}`} onClick={() => onFavorite(skill.id)}>{favorite ? "★" : "☆"}</button>
      <button className="icon-action" aria-pressed={compared} aria-label={compared ? `Remover ${skill.name} da comparação` : `Comparar ${skill.name}`} onClick={() => onCompare(skill.id)}>{compared ? "☑" : "☐"}</button>
    </div>
  </article>;
}

export function RepoCard({ repo, onOpen, index = 0 }) {
  return <article className="repo-result" data-category={repo.category} data-reveal style={{ "--card-delay": `${index % 6 * 28}ms` }}>
    <div className="skill-result-meta"><span className="category-badge">{areaNames[repo.category] || repo.category}</span><span className="repo-serial">#{String(index + 1).padStart(2, "0")}</span></div>
    <strong className="repo-count"><b>{repo.skills.length}</b><small>skills<br/>no índice</small></strong>
    <h3>{repo.name}</h3><p>{repo.summary || "O catálogo não informa uma descrição."}</p>
    <div className="skill-actions"><button className="button button-outline" onClick={() => onOpen(repo.name)}>Ver guia</button>{repo.repoUrl && <a className="text-link" href={repo.repoUrl} target="_blank" rel="noopener noreferrer">Abrir repositório ↗</a>}</div>
  </article>;
}

function promptFor(skill) {
  return `Consulte a skill ${skill.name}${skill.path ? ` (${skill.path})` : ""} em ${skill.repoName}. Use as instruções documentadas que se aplicarem a [objetivo]. Contexto: [contexto]. Entrega esperada: [formato].`;
}
