import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { matchPaths, searchResources } from "../../lib/search.js";
import { CATEGORIES, categoryLabel, resourcePath, SECTIONS, typeLabel } from "../../lib/resources.js";
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
  if (item.type !== "skill") return null;
  const on = compare.includes(item.id);
  return <button type="button" className="icon-btn" aria-pressed={on} disabled={!on && compare.length >= 3} aria-label={on ? `Remover ${item.title} da comparação` : `Comparar ${item.title}`} title={on ? "Na comparação" : compare.length >= 3 ? "Limite de 3" : "Comparar"} onClick={() => actions.toggleCompare(item.id)}>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h6v14H5zM13 5h6v14h-6z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"/></svg>
  </button>;
}

export function GoalPaths({ paths }) {
  const { byId } = useLibrary();
  if (!paths.length) return null;
  return <section className="goal-paths" aria-label="Caminhos sugeridos">
    {paths.map((path) => <article key={path.id} className="goal-path">
      <p className="eyebrow">Caminho sugerido</p>
      <h2>{path.goal}</h2>
      {path.description && <p className="muted">{path.description}</p>}
      <ol>{path.steps.map((step, index) => { const item = byId.get(step.resource_id); return item && <li key={step.resource_id}>
        <span className="goal-step-n" aria-hidden="true">{index + 1}</span>
        <div><Link className="goal-step-title" to={resourcePath(item.id)}>{item.title}</Link> <span className="badge badge-type">{typeLabel[item.type]}</span><p className="small muted">{step.reason}</p></div>
      </li>; })}</ol>
    </article>)}
  </section>;
}

// Listagem por seção (skills, subagentes…) ou busca geral em /app/buscar.
export function ResourceListPage({ section }) {
  const { index, library, loading, error, compare } = useLibrary();
  const [state, update] = useListState();
  const [limit, setLimit] = useState(PAGE);
  const config = SECTIONS.find((s) => s.route === section);
  const title = config ? config.label : "Busca";
  const results = useMemo(() => searchResources(index, state.q, { types: config?.types || null, category: state.area, source: state.fonte }), [index, state, config]);
  const sources = useMemo(() => [...new Set(index.filter((item) => !config || config.types.includes(item.type)).map((item) => item.source_name).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [index, config]);
  const paths = useMemo(() => matchPaths(library?.paths || [], state.q), [library, state.q]);
  useEffect(() => setLimit(PAGE), [state.q, state.area, state.fonte, section]);
  useScrollMemory(!loading);

  if (error) return <LoadError error={error}/>;
  return <div className="page">
    <header className="page-head">
      <h1>{title}</h1>
      <p className="muted">{loading ? "Carregando o acervo…" : `${results.length.toLocaleString("pt-BR")} ${results.length === 1 ? "recurso" : "recursos"}${state.q ? ` para “${state.q}”` : ""}`}</p>
    </header>
    <div className="filters">
      <label className="search-inline"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar em {title}</span>
        <input className="input" type="search" value={state.q} onChange={(e) => update({ q: e.target.value })} placeholder="Nome, tecnologia ou objetivo"/>
      </label>
      <div className="chip-row" role="group" aria-label="Área">
        {[{ id: "todas", label: "Todas" }, ...CATEGORIES].map((c) => <button key={c.id} type="button" className="chip" aria-pressed={state.area === c.id} onClick={() => update({ area: c.id })}>{c.label}</button>)}
      </div>
      {sources.length > 1 && <label className="field field-inline">Fonte<select value={state.fonte} onChange={(e) => update({ fonte: e.target.value })}><option value="todas">Todas</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>}
    </div>
    {compare.length > 0 && <div className="compare-bar" role="status"><span>{compare.length}/3 skills na comparação</span><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/app/comparar")}>Comparar</button></div>}
    <GoalPaths paths={paths}/>
    {!loading && !results.length && <div className="empty"><h3>Nada por aqui ainda.</h3><p>{state.q ? "Tente termos mais curtos, em inglês, ou remova os filtros." : `Ainda não há ${title.toLowerCase()} publicados nesta edição.`}</p>{(state.q || state.area !== "todas" || state.fonte !== "todas") && <button type="button" className="btn btn-secondary btn-sm" onClick={() => update({ q: "", area: "todas", fonte: "todas" })}>Limpar busca e filtros</button>}</div>}
    <div className="r-grid">{results.slice(0, limit).map((item) => <ResourceCard key={item.id} item={item} query={state.q} extra={<CompareToggle item={item}/>}/>)}</div>
    {results.length > limit && <div className="load-more"><span className="muted small">Mostrando {limit} de {results.length.toLocaleString("pt-BR")}</span><button type="button" className="btn btn-secondary" onClick={() => setLimit((n) => n + PAGE)}>Carregar mais</button></div>}
  </div>;
}

export function LoadError({ error }) {
  return <div className="page"><div className="empty"><h3>Não foi possível carregar a biblioteca.</h3><p>{error.message}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => location.reload()}>Tentar novamente</button></div></div>;
}

export function FavoritesPage() {
  const { me, byId, loading } = useLibrary();
  const items = me.favorites.map((id) => byId.get(id)).filter(Boolean);
  return <div className="page"><header className="page-head"><h1>Favoritos</h1><p className="muted">{loading ? "Carregando…" : `${items.length} favorito(s), salvos na sua conta.`}</p></header>
    {!loading && !items.length && <div className="empty"><h3>Nenhum favorito ainda.</h3><p>Use a estrela nos cards ou na página do recurso para salvar.</p><Link className="btn btn-secondary btn-sm" to="/app/skills">Explorar skills</Link></div>}
    <div className="r-grid">{items.map((item) => <ResourceCard key={item.id} item={item}/>)}</div>
  </div>;
}

export function RecentPage() {
  const { me, byId, actions, loading } = useLibrary();
  const items = me.recent.map((row) => byId.get(row.id)).filter(Boolean);
  return <div className="page"><header className="page-head page-head-row"><div><h1>Recentes</h1><p className="muted">Os últimos 30 recursos abertos.</p></div>{items.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.clearRecent().catch(() => {})}>Limpar histórico</button>}</header>
    {!loading && !items.length && <div className="empty"><h3>Seu histórico está vazio.</h3><p>Os recursos que você abrir aparecem aqui.</p></div>}
    <div className="r-grid">{items.map((item) => <ResourceCard key={item.id} item={item}/>)}</div>
  </div>;
}

export function ComparePage() {
  const { compare, byId, actions } = useLibrary();
  const items = compare.map((id) => byId.get(id)).filter(Boolean);
  const rows = [["Repositório", (i) => i.source_name], ["Área", (i) => categoryLabel[i.category]], ["Descrição na fonte", (i) => i.summary || "Não informada."], ["Caminho", (i) => (i.path ? <code>{i.path}</code> : "Não informado.")], ["Requisitos", () => "Não informados no catálogo."]];
  return <div className="page"><header className="page-head page-head-row"><div><h1>Comparar skills</h1><p className="muted">Campos documentados na fonte; nenhuma nota é calculada.</p></div>{items.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={actions.clearCompare}>Limpar</button>}</header>
    {!items.length && <div className="empty"><h3>Nenhuma skill selecionada.</h3><p>Use o botão de comparar nos cards de skills (até 3).</p><Link className="btn btn-secondary btn-sm" to="/app/skills">Ir para skills</Link></div>}
    {items.length > 0 && <div className="compare-grid" style={{ "--n": items.length }}>{items.map((item) => <article key={item.id} className="compare-col" data-category={item.category}>
      <header><Link to={resourcePath(item.id)}><h2>{item.title}</h2></Link><button type="button" className="icon-btn" aria-label={`Remover ${item.title}`} onClick={() => actions.toggleCompare(item.id)}>×</button></header>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value(item)}</dd></div>)}</dl>
    </article>)}</div>}
  </div>;
}
