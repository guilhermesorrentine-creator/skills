import { useEffect, useRef, useState } from "react";
import { areaNames } from "../../lib/areas.js";
import { CopyButton } from "../shared.jsx";
import TerminalPanel from "./TerminalPanel.jsx";
import { DetailHeaderBar } from "./SkillDetailPage.jsx";

// Página do repositório (rota `#repo/<nome>`): dados do catálogo e lista navegável das skills.
export default function RepoDetailPage({ repo, onBack, onOpenSkill }) {
  const headingRef = useRef(null);
  const [limit, setLimit] = useState(48);
  const prompt = `Consulte a documentação de ${repo.name}. Ajude com [objetivo], considerando [contexto]. Confirme os pré-requisitos na fonte original antes de executar etapas específicas.`;
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [repo.name]);
  const skills = [...repo.skillRecords].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  return <article className="detail-page wrap" data-category={repo.category} aria-labelledby="repo-title">
    <DetailHeaderBar onBack={onBack} trail={`SOURCE://GITHUB / ${repo.name}`}/>
    <header className="detail-hero">
      <p className="sys-tag"><span className="status-dot"/> REPOSITÓRIO · {areaNames[repo.category]}</p>
      <h1 id="repo-title" ref={headingRef} tabIndex={-1}>{repo.name}</h1>
      <p className="detail-origin">{repo.skills.length ? `${repo.skills.length} skills no índice` : "Nenhuma skill catalogada no índice"}</p>
      <div className="detail-actions">{repo.repoUrl && <a className="button button-primary" href={repo.repoUrl} target="_blank" rel="noopener noreferrer">Abrir repositório ↗</a>}</div>
    </header>
    <div className="detail-grid">
      <div className="detail-main">
        <TerminalPanel title="Resumo" code="cat README" order={0}><p className="detail-desc">{repo.summary || "O catálogo não informa uma descrição."}</p>{repo.readme && <p className="muted small">README: {repo.readme}</p>}</TerminalPanel>
        <TerminalPanel title={`Skills (${repo.skills.length})`} code="ls skills/" order={1} labelledBy="repo-skills-title">
          {!skills.length && <p>Este repositório está no índice como referência, mas nenhuma skill foi catalogada a partir dele.</p>}
          <ul className="related-list repo-skill-list">{skills.slice(0, limit).map((skill) => <li key={skill.id}><button type="button" data-focus-id={skill.id} onClick={() => onOpenSkill(skill)}><span className="related-name">{skill.name}</span><span className="related-meta">{skill.description || "Descrição não informada."}</span></button></li>)}</ul>
          {skills.length > limit && <button type="button" className="button button-ghost" onClick={() => setLimit((value) => value + 48)}>Mostrar mais ({limit} de {skills.length})</button>}
        </TerminalPanel>
      </div>
      <aside className="detail-side">
        <TerminalPanel title="Prompt de exemplo" code="prompt --repo" order={1} className="panel-prompt"><pre>{prompt}</pre><CopyButton value={prompt}>Copiar prompt</CopyButton></TerminalPanel>
      </aside>
    </div>
  </article>;
}
