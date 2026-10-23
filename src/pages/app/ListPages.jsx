import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { matchPaths, searchResources } from "../../lib/search.js";
import { CATEGORIES, resourcePath, SECTIONS } from "../../lib/resources.js";
import { useT } from "../../i18n/index.js";
import ResourceCard from "../../components/app/ResourceCard.jsx";

const PAGE = 48;

// Estado da listagem na URL (busca, área, fonte) e posição de rolagem salva por endereço.
function useListState() {
  const read = () => { const p = new URLSearchParams(location.search); return { q: p.get("q") || "", area: p.get("area") || "todas", fonte: p.get("fonte") || "todas" }; };
  const [state, setState] = useState(read);
  const update = (patch) => setState((current) => {
    const next = { ...current, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.area !== "todas") params.set("area", next.area);
    if (next.fonte !== "todas") params.set("fonte", next.fonte);
    history.replaceState(history.state, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
    return next;
  });
  return [state, update];
}

function useScrollMemory(ready) {
  useLayoutEffect(() => {
    if (!ready) return;
    const key = `bt:scroll:${location.pathname}${location.search}`;
    try { const y = Number(sessionStorage.getItem(key)); if (y) window.scrollTo({ top: y, behavior: "instant" }); } catch { /* opcional */ }
    const save = () => { try { sessionStorage.setItem(`bt:scroll:${location.pathname}${location.search}`, String(window.scrollY)); } catch { /* opcional */ } };
    window.addEventListener("scroll", save, { passive: true });
    return () => { save(); window.removeEventListener("scroll", save); };
  }, [ready]);
}

export function CompareToggle({ item }) {
  const { compare, actions } = useLibrary();
  const { t } = useT();
  if (item.type !== "skill") return null;
  const on = compare.includes(item.id);
  return <button type="button" className="icon-btn" aria-pressed={on} disabled={!on && compare.length >= 3} aria-label={on ? t("app.list.compareRemove", { title: item.title }) : t("app.list.compareAdd", { title: item.title })} title={on ? t("app.list.inCompare") : compare.length >= 3 ? t("app.list.compareLimit") : t("app.list.compareButton")} onClick={() => actions.toggleCompare(item.id)}>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h6v14H5zM13 5h6v14h-6z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"/></svg>
  </button>;
}

export function GoalPaths({ paths }) {
  const { byId } = useLibrary();
  const { t } = useT();
  if (!paths.length) return null;
  return <section className="goal-paths" aria-label={t("app.list.paths")}>
    {paths.map((path) => <article key={path.id} className="goal-path">
      <p className="eyebrow">{t("app.list.path")}</p>
      <h2>{path.goal}</h2>
      {path.description && <p className="muted">{path.description}</p>}
      <ol>{path.steps.map((step, index) => { const item = byId.get(step.resource_id); return item && <li key={step.resource_id}>
        <span className="goal-step-n" aria-hidden="true">{index + 1}</span>
        <div><Link className="goal-step-title" to={resourcePath(item.id)}>{item.title}</Link> <span className="badge badge-type">{t(`type.${item.type}`)}</span><p className="small muted">{step.reason}</p></div>
      </li>; })}</ol>
    </article>)}
  </section>;
}

// Listagem por seção (skills, subagentes…) ou busca geral em /app/buscar.
export function ResourceListPage({ section }) {
  const { t, n } = useT();
  const { index, library, loading, error, compare } = useLibrary();
  const [state, update] = useListState();
  const [limit, setLimit] = useState(PAGE);
  const config = SECTIONS.find((s) => s.route === section);
  const title = config ? t(`section.${config.route}`) : t("app.list.search");
  const results = useMemo(() => searchResources(index, state.q, { types: config?.types || null, category: state.area, source: state.fonte }), [index, state, config]);
  const sources = useMemo(() => [...new Set(index.filter((item) => !config || config.types.includes(item.type)).map((item) => item.source_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [index, config]);
  const paths = useMemo(() => matchPaths(library?.paths || [], state.q), [library, state.q]);
  useEffect(() => setLimit(PAGE), [state.q, state.area, state.fonte, section]);
  useScrollMemory(!loading);

  if (error) return <LoadError error={error}/>;
  return <div className="page">
    <header className="page-head">
      <h1>{title}</h1>
      <p className="muted">{loading ? t("app.list.loading") : t("app.list.count", { n: results.length, count: n(results.length), q: state.q })}</p>
    </header>
    <div className="filters">
      <label className="search-inline"><span aria-hidden="true">⌕</span><span className="sr-only">{t("app.list.searchIn", { title })}</span>
        <input className="input" type="search" value={state.q} onChange={(e) => update({ q: e.target.value })} placeholder={t("app.list.placeholder")}/>
      </label>
      <div className="chip-row" role="group" aria-label={t("app.list.area")}>
        {[{ id: "todas" }, ...CATEGORIES].map((c) => <button key={c.id} type="button" className="chip" aria-pressed={state.area === c.id} onClick={() => update({ area: c.id })}>{c.id === "todas" ? t("cat.all") : t(`cat.${c.id}`)}</button>)}
      </div>
      {sources.length > 1 && <label className="field field-inline">{t("app.list.source")}<select value={state.fonte} onChange={(e) => update({ fonte: e.target.value })}><option value="todas">{t("app.list.all")}</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>}
    </div>
    {compare.length > 0 && <div className="compare-bar" role="status"><span>{t("app.list.compare", { n: compare.length })}</span><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/app/comparar")}>{t("app.list.compareButton")}</button></div>}
    <GoalPaths paths={paths}/>
    {!loading && !results.length && <div className="empty"><h3>{t("app.list.emptyTitle")}</h3><p>{state.q ? t("app.list.emptyQuery") : t("app.list.emptySection", { title: title.toLowerCase() })}</p>{(state.q || state.area !== "todas" || state.fonte !== "todas") && <button type="button" className="btn btn-secondary btn-sm" onClick={() => update({ q: "", area: "todas", fonte: "todas" })}>{t("app.list.clear")}</button>}</div>}
    <div className="r-grid">{results.slice(0, limit).map((item, i) => <ResourceCard key={item.id} index={i} item={item} query={state.q} extra={<CompareToggle item={item}/>}/>)}</div>
    {results.length > limit && <div className="load-more"><span className="muted small">{t("app.list.showing", { limit: n(limit), total: n(results.length) })}</span><button type="button" className="btn btn-secondary" onClick={() => setLimit((value) => value + PAGE)}>{t("app.list.more")}</button></div>}
  </div>;
}

export function LoadError({ error }) {
  const { t } = useT();
  return <div className="page"><div className="empty"><h3>{t("app.list.loadError")}</h3><p>{error.message}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => location.reload()}>{t("app.list.retry")}</button></div></div>;
}

export function FavoritesPage() {
  const { t } = useT();
  const { me, byId, loading } = useLibrary();
  const items = me.favorites.map((id) => byId.get(id)).filter(Boolean);
  return <div className="page"><header className="page-head"><h1>{t("app.favorites.title")}</h1><p className="muted">{loading ? t("common.loading") : t("app.favorites.count", { n: items.length })}</p></header>
    {!loading && !items.length && <div className="empty"><h3>{t("app.favorites.emptyTitle")}</h3><p>{t("app.favorites.empty")}</p><Link className="btn btn-secondary btn-sm" to="/app/skills">{t("app.favorites.explore")}</Link></div>}
    <div className="r-grid">{items.map((item, i) => <ResourceCard key={item.id} index={i} item={item}/>)}</div>
  </div>;
}

export function RecentPage() {
  const { t } = useT();
  const { me, byId, actions, loading } = useLibrary();
  const items = me.recent.map((row) => byId.get(row.id)).filter(Boolean);
  return <div className="page"><header className="page-head page-head-row"><div><h1>{t("app.recent.title")}</h1><p className="muted">{t("app.recent.lead")}</p></div>{items.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.clearRecent().catch(() => {})}>{t("app.recent.clear")}</button>}</header>
    {!loading && !items.length && <div className="empty"><h3>{t("app.recent.emptyTitle")}</h3><p>{t("app.recent.empty")}</p></div>}
    <div className="r-grid">{items.map((item, i) => <ResourceCard key={item.id} index={i} item={item}/>)}</div>
  </div>;
}

export function ComparePage() {
  const { t } = useT();
  const { compare, byId, actions } = useLibrary();
  const items = compare.map((id) => byId.get(id)).filter(Boolean);
  const rows = [[t("app.compare.repo"), (i) => i.source_name], [t("app.compare.area"), (i) => t(`cat.${i.category}`)], [t("app.compare.description"), (i) => i.summary || t("app.compare.descNotInformed")], [t("app.compare.path"), (i) => (i.path ? <code>{i.path}</code> : t("app.compare.notInformed"))], [t("app.compare.requirements"), () => t("app.compare.reqNotInformed")]];
  return <div className="page"><header className="page-head page-head-row"><div><h1>{t("app.compare.title")}</h1><p className="muted">{t("app.compare.lead")}</p></div>{items.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={actions.clearCompare}>{t("app.compare.clear")}</button>}</header>
    {!items.length && <div className="empty"><h3>{t("app.compare.emptyTitle")}</h3><p>{t("app.compare.empty")}</p><Link className="btn btn-secondary btn-sm" to="/app/skills">{t("app.compare.goSkills")}</Link></div>}
    {items.length > 0 && <div className="compare-grid" style={{ "--n": items.length }}>{items.map((item) => <article key={item.id} className="compare-col" data-category={item.category}>
      <header><Link to={resourcePath(item.id)}><h2>{item.title}</h2></Link><button type="button" className="icon-btn" aria-label={t("app.compare.remove", { title: item.title })} onClick={() => actions.toggleCompare(item.id)}>×</button></header>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value(item)}</dd></div>)}</dl>
    </article>)}</div>}
  </div>;
}
