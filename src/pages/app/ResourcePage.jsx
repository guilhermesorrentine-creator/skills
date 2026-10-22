import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useReduced } from "../../lib/motion-pref.jsx";
import { apiFetch } from "../../lib/auth.jsx";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { Markdown, parseMarkdown } from "../../lib/markdown.jsx";
import { safeHref } from "../../lib/markdown-parse.js";
import { resourcePath } from "../../lib/resources.js";
import { useT } from "../../i18n/index.js";
import { CopyButton } from "../../components/shared.jsx";
import { FavoriteToggle, SaveToCollection } from "../../components/app/ResourceCard.jsx";
import { CompareToggle } from "./ListPages.jsx";

// Página "Aprender e utilizar": mostra só as seções que têm conteúdo real.
export default function ResourcePage({ id }) {
  const reduced = useReduced();
  const { t } = useT();
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
    const linked = (library?.relations || []).filter((rel) => rel.from_id === id).map((rel) => ({ item: byId.get(rel.to_id), reason: rel.kind === "requires" ? t("app.resource.requires") : rel.kind === "next" ? t("app.resource.next") : t("app.resource.relatedReason") }));
    const sameRepo = resource.type === "skill" ? [...byId.values()].filter((item) => item.source_name === resource.source_name && item.id !== id).slice(0, 4).map((item) => ({ item, reason: t("app.resource.sameRepo") })) : [];
    return [...linked, ...sameRepo].filter((row) => row.item).slice(0, 8);
  }, [resource, library, byId, id, t]);

  if (state.loading) return <div className="page"><p className="muted">{t("common.loading")}</p></div>;
  if (state.error) return <div className="page"><div className="empty"><h3>{state.error.status === 404 ? t("app.resource.notFound") : t("app.resource.openFailed")}</h3><p>{state.error.status === 404 ? t("app.resource.notFoundText") : state.error.message}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => history.back()}>{t("common.back")}</button></div></div>;
  if (state.locked) return <div className="page"><div className="empty"><span className="badge badge-lock">{t("app.resource.locked")}</span><h3>{resource.title}</h3><p>{t("app.resource.lockedText")}</p><Link className="btn btn-primary btn-sm" to="/app/minha-licenca">{t("app.resource.upgrade")}</Link></div></div>;

  const source = safeHref(resource.source_url);
  const instructions = resource.instructions || "";
  const isSkill = resource.type === "skill";
  const genericPrompt = isSkill ? t("app.resource.prompt", { title: resource.title, path: resource.path, source: resource.source_name }) : "";

  return <motion.article className="page resource" data-category={resource.category} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <button type="button" className="btn btn-ghost btn-sm back" onClick={() => (history.length > 1 ? history.back() : navigate("/app"))}>{t("app.resource.back")}</button>
    <header className="resource-head">
      <div className="r-card-top"><span className="badge">{t(`cat.${resource.category}`)}</span><span className="badge badge-type">{t(`type.${resource.type}`)}</span>{source && !["guide", "skill"].includes(resource.type) && <span className="badge badge-type">{t("app.card.external")}</span>}</div>
      <h1>{resource.title}</h1>
      {resource.summary && <p className="resource-summary">{resource.summary}</p>}
      <p className="resource-source">{t("app.resource.source")} <b>{resource.source_name || "Voxelia"}</b>{resource.path && <> · <code>{resource.path}</code></>}{resource.author && <> · {t("app.resource.createdBy")} {safeHref(resource.author_url) ? <a href={safeHref(resource.author_url)} target="_blank" rel="noopener noreferrer">{resource.author} ↗</a> : resource.author}</>}{resource.license && <> · {t("app.resource.license")} {resource.license}</>}</p>
      <div className="resource-actions">
        <FavoriteToggle id={resource.id} title={resource.title}/>
        <SaveToCollection id={resource.id} title={resource.title}/>
        {isSkill && <CompareToggle item={resource}/>}
        {instructions && <CopyButton value={instructions}>{t("app.resource.copyInstructions")}</CopyButton>}
        {source && <a className="btn btn-primary btn-sm" href={source} target="_blank" rel="noopener noreferrer">{isSkill ? t("app.resource.openSkill") : t("app.resource.openRef")} ↗</a>}
      </div>
    </header>

    <div className={`resource-body ${parsed.headings.length > 1 ? "with-toc" : ""}`}>
      {parsed.headings.length > 1 && <nav className="toc" aria-label={t("app.resource.toc")}><p className="tag-mono">{t("app.resource.onPage")}</p><ol>{parsed.headings.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol></nav>}
      <div className="resource-main">
        {parsed.blocks.length > 0 && <section className="prose" aria-label={t("app.resource.content")}><Markdown blocks={parsed.blocks}/></section>}
        {instructions && <section className="panel"><h2>{t("app.resource.instructions")}</h2><pre className="instructions">{instructions}</pre><CopyButton value={instructions}>{t("app.resource.copyInstructions")}</CopyButton></section>}
        {isSkill && <section className="panel"><h2>{t("app.resource.howTo")}</h2>
          <p>{t("app.resource.howToText")}</p>
          <p className="small muted">{t("app.resource.generic")}</p>
          <pre className="instructions">{genericPrompt}</pre><CopyButton value={genericPrompt}>{t("app.resource.copyTemplate")}</CopyButton>
        </section>}
        {isSkill && <section className="panel panel-muted"><h2>{t("app.resource.missing")}</h2><p className="small">{t("app.resource.missingText")}</p></section>}
        {related.length > 0 && <section className="panel"><h2>{t("app.resource.related")}</h2><ul className="related">{related.map(({ item, reason }) => <li key={item.id}><Link to={resourcePath(item.id)}>{item.title}</Link><span className="muted small">{t(`type.${item.type}`)} · {reason}</span></li>)}</ul></section>}
      </div>
    </div>
  </motion.article>;
}
