import { CopyButton } from "./shared.jsx";

export default function ComparePanel({ skills, onRemove, onClear }) {
  if (!skills.length) return null;
  return <section className="compare-panel" aria-labelledby="compare-title">
    <div className="compare-heading"><div><p className="eyebrow">ESCOLHA INFORMADA</p><h2 id="compare-title">Comparar skills <span>({skills.length}/3)</span></h2></div><button className="text-link" onClick={onClear}>Limpar comparação</button></div>
    {skills.length < 2 && <p className="muted">Selecione mais uma skill para comparar informações documentadas.</p>}
    <div className="compare-grid" style={{ "--compare-count": skills.length }}>
      {skills.map((skill) => <article className="compare-card" key={skill.id}>
        <button className="icon-action compare-remove" aria-label={`Remover ${skill.name}`} onClick={() => onRemove(skill.id)}>×</button>
        <h3>{skill.name}</h3><dl>
          <dt>Repositório</dt><dd>{skill.repoName}</dd>
          <dt>Categoria</dt><dd>{skill.category}</dd>
          <dt>Descrição original</dt><dd>{skill.description || "Não informada no catálogo."}</dd>
          <dt>Caminho</dt><dd><code>{skill.path || "Não informado."}</code></dd>
          <dt>Requisitos</dt><dd>Não informados no catálogo.</dd>
          <dt>Limitações</dt><dd>Não informadas no catálogo.</dd>
        </dl>
        <CopyButton value={`Use a skill ${skill.name} de ${skill.repoName} para [objetivo], considerando [contexto] e entregando [formato].`}>Copiar exemplo</CopyButton>
        {skill.skillUrl && <a className="text-link" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">Ver fonte ↗</a>}
      </article>)}
    </div>
    <p className="compare-note">As diferenças exibidas vêm dos campos disponíveis no catálogo; nenhum escore de qualidade é calculado.</p>
  </section>;
}
