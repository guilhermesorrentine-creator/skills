import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { apiFetch } from "../../lib/auth.jsx";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { Markdown, parseMarkdown } from "../../lib/markdown.jsx";
import { safeHref } from "../../lib/markdown-parse.js";
import { categoryLabel, resourcePath, typeLabel } from "../../lib/resources.js";
import { CopyButton } from "../../components/shared.jsx";
import { FavoriteToggle, SaveToCollection } from "../../components/app/ResourceCard.jsx";
import { CompareToggle } from "./ListPages.jsx";

// Página "Aprender e utilizar": mostra só as seções que têm conteúdo real.
export default function ResourcePage({ id }) {
  const reduced = useReducedMotion();
  const { actions, library, byId } = useLibrary();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    apiFetch(`/api/resource?id=${encodeURIComponent(id)}`).then((data) => {
      if (!active) return;
      setState({ loading: false, ...data });
      if (!data.locked) actions.visit(id);
    }).catch((error) => active && setState({ loading: false, error }));
    return () => { active = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const resource = state.resource;
  const parsed = useMemo(() => parseMarkdown(resource?.body_md || ""), [resource]);
  const related = useMemo(() => {
    if (!resource) return [];
    const linked = (library?.relations || []).filter((rel) => rel.from_id === id).map((rel) => ({ item: byId.get(rel.to_id), reason: rel.kind === "requires" ? "Pré-requisito" : rel.kind === "next" ? "Próximo passo" : "Relacionado" }));
    const sameRepo = resource.type === "skill" ? [...byId.values()].filter((item) => item.source_name === resource.source_name && item.id !== id).slice(0, 4).map((item) => ({ item, reason: "Mesmo repositório" })) : [];
    return [...linked, ...sameRepo].filter((row) => row.item).slice(0, 8);
  }, [resource, library, byId, id]);

  if (state.loading) return <div className="page"><p className="muted">Carregando…</p></div>;
  if (state.error) return <div className="page"><div className="empty"><h3>{state.error.status === 404 ? "Recurso não encontrado." : "Não foi possível abrir o recurso."}</h3><p>{state.error.status === 404 ? "O link pode estar incorreto ou o recurso foi despublicado." : state.error.message}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => history.back()}>Voltar</button></div></div>;
  if (state.locked) return <div className="page"><div className="empty"><span className="badge badge-lock">Edição superior</span><h3>{resource.title}</h3><p>Este recurso faz parte de uma edição que sua licença ainda não inclui. Seu acesso atual continua vitalício; o upgrade é opcional.</p><Link className="btn btn-primary btn-sm" to="/app/minha-licenca">Ver opções de upgrade</Link></div></div>;

  const source = safeHref(resource.source_url);
  const instructions = resource.instructions || "";
  const isSkill = resource.type === "skill";
  const genericPrompt = isSkill ? `Consulte a skill ${resource.title}${resource.path ? ` (${resource.path})` : ""} em ${resource.source_name}. Use as instruções documentadas que se aplicarem a [objetivo]. Contexto: [contexto]. Entrega esperada: [formato].` : "";

  return <motion.article className="page resource" data-category={resource.category} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <button type="button" className="btn btn-ghost btn-sm back" onClick={() => (history.length > 1 ? history.back() : navigate("/app"))}>← Voltar</button>
    <header className="resource-head">
      <div className="r-card-top"><span className="badge">{categoryLabel[resource.category]}</span><span className="badge badge-type">{typeLabel[resource.type]}</span>{source && !["guide", "skill"].includes(resource.type) && <span className="badge badge-type">Externo</span>}</div>
      <h1>{resource.title}</h1>
      {resource.summary && <p className="resource-summary">{resource.summary}</p>}
      <p className="resource-source">Fonte: <b>{resource.source_name || "Arsenal IA"}</b>{resource.path && <> · <code>{resource.path}</code></>}{resource.author && <> · Autoria: {resource.author}</>}{resource.license && <> · Licença: {resource.license}</>}</p>
      <div className="resource-actions">
        <FavoriteToggle id={resource.id} title={resource.title}/>
        <SaveToCollection id={resource.id} title={resource.title}/>
        {isSkill && <CompareToggle item={resource}/>}
        {instructions && <CopyButton value={instructions}>Copiar instruções</CopyButton>}
        {source && <a className="btn btn-primary btn-sm" href={source} target="_blank" rel="noopener noreferrer">{isSkill ? "Abrir SKILL.md" : "Abrir referência original"} ↗</a>}
      </div>
    </header>

    <div className={`resource-body ${parsed.headings.length > 1 ? "with-toc" : ""}`}>
      {parsed.headings.length > 1 && <nav className="toc" aria-label="Sumário"><p className="tag-mono">Nesta página</p><ol>{parsed.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol></nav>}
      <div className="resource-main">
        {parsed.blocks.length > 0 && <section className="prose" aria-label="Conteúdo"><Markdown blocks={parsed.blocks}/></section>}
        {instructions && <section className="panel"><h2>Instruções</h2><pre className="instructions">{instructions}</pre><CopyButton value={instructions}>Copiar instruções</CopyButton></section>}
        {isSkill && <section className="panel"><h2>Como utilizar</h2>
          <p>O conteúdo completo desta skill está no arquivo original. Abra a fonte, confira os requisitos e adapte o pedido ao seu agente.</p>
          <p className="small muted">Modelo genérico do Arsenal IA (não é documentação oficial da skill):</p>
          <pre className="instructions">{genericPrompt}</pre><CopyButton value={genericPrompt}>Copiar modelo</CopyButton>
        </section>}
        {isSkill && <section className="panel panel-muted"><h2>Informações não disponíveis no catálogo</h2><p className="small">Requisitos, compatibilidade com agentes, exemplos e instruções de instalação não constam no índice e não foram inferidos. Consulte a fonte original.</p></section>}
        {related.length > 0 && <section className="panel"><h2>Recursos relacionados</h2><ul className="related">{related.map(({ item, reason }) => <li key={item.id}><Link to={resourcePath(item.id)}>{item.title}</Link><span className="muted small">{typeLabel[item.type]} · {reason}</span></li>)}</ul></section>}
      </div>
    </div>
  </motion.article>;
}
