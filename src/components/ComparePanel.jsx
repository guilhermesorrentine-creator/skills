import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../lib/motion-tokens.js";
import { areaNames } from "../lib/areas.js";
import { CopyButton } from "./shared.jsx";

const rows = [
  ["Repositório", (skill) => skill.repoName],
  ["Categoria", (skill) => areaNames[skill.category] || skill.category],
  ["Descrição original", (skill) => skill.description || "Não informada no catálogo."],
  ["Caminho", (skill) => skill.path ? <code>{skill.path}</code> : "Não informado."],
  ["Requisitos", () => "Não informados no catálogo."],
  ["Limitações", () => "Não informadas no catálogo."],
];

// Comparação de até 3 skills: colunas lado a lado no desktop, cartões empilhados no celular.
export default function ComparePanel({ skills, onRemove, onClear, onOpen }) {
  const reduced = useReducedMotion();
  return <motion.section className="compare-panel" id="comparacao" aria-labelledby="compare-title"
    initial={reduced ? false : { opacity: 0, y: motionTokens.distance.md }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
    <div className="compare-heading">
      <div><p className="sys-tag">DIFF://SKILLS</p><h2 id="compare-title">Comparar skills <span>({skills.length}/3)</span></h2></div>
      {skills.length > 0 && <button type="button" className="button button-ghost" onClick={onClear}>Limpar comparação</button>}
    </div>
    {skills.length === 0 && <p className="muted">Nenhuma skill selecionada. Use o botão ◇ nos cartões ou na ficha para adicionar até três.</p>}
    {skills.length === 1 && <p className="muted">Selecione mais uma skill para comparar informações documentadas.</p>}
    {skills.length > 0 && <div className="compare-grid" style={{ "--compare-count": skills.length }}>
      {skills.map((skill) => <article className="compare-card" key={skill.id} data-category={skill.category}>
        <header><h3><button type="button" className="text-link" onClick={() => onOpen(skill)}>{skill.name}</button></h3><button type="button" className="icon-action" aria-label={`Remover ${skill.name} da comparação`} onClick={() => onRemove(skill.id)}>×</button></header>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value(skill)}</dd></div>)}</dl>
        <div className="compare-actions">
          <CopyButton value={`Use a skill ${skill.name} de ${skill.repoName} para [objetivo], considerando [contexto] e entregando [formato].`}>Copiar exemplo</CopyButton>
          {skill.skillUrl && <a className="text-link" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>}
        </div>
      </article>)}
    </div>}
    <p className="compare-note">Os campos vêm do catálogo; nenhuma nota ou escore de qualidade é calculado.</p>
  </motion.section>;
}
