import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../lib/motion-tokens.js";
import { CopyButton } from "./shared.jsx";

const categoryNames = { software: "Software", empreendedorismo: "Empreendedorismo", conteudo: "Conteúdo", ciencia: "Ciência" };

export default function SkillDetail({ skill, onClose }) {
  const reduced = useReducedMotion();
  const prompt = `Use as instruções da skill ${skill.name} para [objetivo].\nContexto: [contexto do projeto]\nResultado esperado: [formato]\nConsidere somente os requisitos confirmados no conteúdo original.`;
  const shareUrl = `${location.origin}${location.pathname}${location.search}#skill/${encodeURIComponent(skill.id)}`;
  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex={-1} initial={reduced ? false : { opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduced ? 0 : motionTokens.duration.normal, ease: motionTokens.easing.smooth }} onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const nodes = [...event.currentTarget.querySelectorAll("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")];
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }}>
      <button className="dialog-close" aria-label="Fechar detalhes" onClick={onClose}>×</button>
      <p className="eyebrow">FICHA DA SKILL · {categoryNames[skill.category] || skill.category}</p>
      <h2 id="detail-title">{skill.name}</h2>
      <p className="detail-origin">Em <strong>{skill.repoName}</strong>{skill.path ? <> · <code>{skill.path}</code></> : " · caminho não informado no catálogo"}</p>
      <section><h3>Descrição da fonte</h3><p>{skill.description || "A fonte não informa uma descrição."}</p></section>
      <section><h3>Finalidade e quando considerar</h3><p>{skill.description ? `A descrição original indica: ${skill.description} Considere esta skill quando sua tarefa coincidir com esse escopo e confira o conteúdo completo antes de utilizá-la.` : "O catálogo não contém dados suficientes para afirmar a finalidade. Consulte a fonte original antes de escolher esta skill."}</p></section>
      <section className="detail-limits"><h3>Limitações e requisitos</h3><p>O catálogo resumido não registra limitações ou requisitos. Não foram inferidos requisitos de instalação nem compatibilidade com agentes.</p></section>
      <section className="detail-source"><h3>Conteúdo integral</h3><p>O texto completo não está armazenado nesta biblioteca. Consulte o arquivo original no GitHub.</p><div className="skill-actions">{skill.skillUrl && <a className="button button-primary" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Abrir SKILL.md ↗</a>}{skill.repoUrl && <a className="button button-outline" href={skill.repoUrl} target="_blank" rel="noopener noreferrer">Abrir repositório ↗</a>}{skill.path && <CopyButton value={skill.path}>Copiar caminho</CopyButton>}</div></section>
      <section className="detail-prompt"><h3>Prompt de exemplo</h3><pre>{prompt}</pre><CopyButton value={prompt}>Copiar prompt</CopyButton></section>
      <div className="detail-footer"><span>Origem: catálogo de repositórios da Biblioteca Total.</span><CopyButton value={shareUrl}>Copiar link desta skill</CopyButton><button className="text-link" onClick={onClose}>Fechar</button></div>
    </motion.section>
  </div>;
}
