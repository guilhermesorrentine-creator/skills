import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";
import { relatedSkills } from "../../lib/search.js";
import { areaNames } from "../../lib/areas.js";
import { CompareButton, CopyButton, FavoriteButton, detailPromptFor } from "../shared.jsx";
import TerminalPanel from "./TerminalPanel.jsx";

const missing = ["Texto integral da skill", "Requisitos específicos", "Compatibilidade com agentes", "Exemplos documentados", "Instruções de instalação"];

export function DetailHeaderBar({ onBack, trail }) {
  return <nav className="detail-bar" aria-label="Trilha">
    <button type="button" className="button button-ghost back-button" onClick={onBack}><span aria-hidden="true">←</span> Voltar ao catálogo</button>
    <p className="detail-trail" aria-hidden="true">{trail}</p>
  </nav>;
}

// Página completa da skill (rota `#skill/<id>`), em linguagem de terminal com organização editorial.
export default function SkillDetailPage({ skill, index, favorite, compared, onFavorite, onCompare, onBack, onOpenSkill, onOpenRepo }) {
  const reduced = useReducedMotion();
  const headingRef = useRef(null);
  const related = useMemo(() => relatedSkills(index, skill), [index, skill]);
  const prompt = detailPromptFor(skill);
  const shareUrl = `${location.origin}${location.pathname}${location.search}#skill/${encodeURIComponent(skill.id)}`;
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [skill.id]);

  return <article className="detail-page wrap" data-category={skill.category} aria-labelledby="skill-title">
    <DetailHeaderBar onBack={onBack} trail={`CATEGORY://${skill.category.toUpperCase()} / ${skill.repoName} / ${skill.name}`}/>
    <motion.header className="detail-hero" initial={reduced ? false : { opacity: 0, y: motionTokens.distance.sm }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
      <p className="sys-tag"><span className="status-dot"/> SKILL_LOADED · {areaNames[skill.category]}</p>
      <h1 id="skill-title" ref={headingRef} tabIndex={-1}>{skill.name}</h1>
      <p className="detail-origin">em <button type="button" className="text-link" onClick={() => onOpenRepo(skill.repoName)}>{skill.repoName}</button>{skill.path ? <> · <code>{skill.path}</code></> : " · caminho não informado no catálogo"}</p>
      <div className="detail-actions">
        <FavoriteButton skill={skill} active={favorite} onToggle={onFavorite}/>
        <CompareButton skill={skill} active={compared} onToggle={onCompare}/>
        <CopyButton value={shareUrl}>Copiar link</CopyButton>
        {skill.skillUrl && <a className="button button-primary" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Abrir SKILL.md ↗</a>}
      </div>
    </motion.header>

    <div className="detail-grid">
      <div className="detail-main">
        <TerminalPanel title="Descrição" code="cat description.txt" order={0}>
          <p className="detail-desc">{skill.description || "A fonte não informa uma descrição."}</p>
        </TerminalPanel>
        <TerminalPanel title="Finalidade" code="scope --from-catalog" order={1}>
          <p>{skill.description ? "A finalidade conhecida é a própria descrição do catálogo. Considere esta skill quando sua tarefa coincidir com esse escopo e confira o arquivo original antes de usá-la." : "O catálogo não contém dados suficientes para afirmar a finalidade. Consulte a fonte original antes de escolher esta skill."}</p>
        </TerminalPanel>
        <TerminalPanel title="Prompt de exemplo" code="prompt --generic" order={2} className="panel-prompt">
          <pre>{prompt}</pre>
          <CopyButton value={prompt}>Copiar prompt</CopyButton>
        </TerminalPanel>
        <TerminalPanel title="Informações ausentes" code="status --missing" order={3} className="panel-missing">
          <p>O índice guarda nome, descrição e caminho. Estes itens não constam no catálogo e não foram inferidos:</p>
          <ul className="missing-list">{missing.map((item) => <li key={item}><span aria-hidden="true">∅</span> {item}</li>)}</ul>
        </TerminalPanel>
      </div>
      <aside className="detail-side">
        <TerminalPanel title="Origem" code="git remote -v" order={1}>
          <dl className="source-list">
            <div><dt>Repositório</dt><dd>{skill.repoName}</dd></div>
            <div><dt>Categoria</dt><dd>{areaNames[skill.category]}</dd></div>
            <div><dt>Caminho</dt><dd>{skill.path ? <code>{skill.path}</code> : "Não informado."}</dd></div>
            {skill.repoSummary && <div><dt>Sobre o repositório</dt><dd>{skill.repoSummary}</dd></div>}
          </dl>
          <div className="source-links">
            {skill.skillUrl && <a className="text-link" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Arquivo original ↗</a>}
            {skill.repoUrl && <a className="text-link" href={skill.repoUrl} target="_blank" rel="noopener noreferrer">Repositório no GitHub ↗</a>}
            {skill.path && <CopyButton value={skill.path}>Copiar caminho</CopyButton>}
          </div>
        </TerminalPanel>
        {related.length > 0 && <TerminalPanel title="Skills relacionadas" code="ls --related" order={2}>
          <p className="muted small">Critérios locais: mesmo repositório ou mesma categoria com termo em comum no nome.</p>
          <ul className="related-list">{related.map(({ skill: item, reason }) => <li key={item.id} data-category={item.category}>
            <button type="button" onClick={() => onOpenSkill(item)}><span className="related-name">{item.name}</span><span className="related-meta">{item.repoName} · {reason}</span></button>
          </li>)}</ul>
        </TerminalPanel>}
      </aside>
    </div>
  </article>;
}

export function NotFoundPage({ kind, onBack }) {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  return <article className="detail-page wrap" aria-labelledby="notfound-title">
    <DetailHeaderBar onBack={onBack} trail="ERR://NOT_FOUND"/>
    <TerminalPanel title={kind === "repo" ? "Repositório não encontrado" : "Skill não encontrada"} code="404" labelledBy="notfound-title">
      <p ref={headingRef} tabIndex={-1}>O link não corresponde a nenhum registro do catálogo atual. Ele pode ter sido digitado incorretamente ou o item pode ter mudado de caminho.</p>
      <button type="button" className="button button-primary" onClick={onBack}>Voltar ao catálogo</button>
    </TerminalPanel>
  </article>;
}
