import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { resolveFeatured } from "../../lib/featured.js";
import { categoryLabel, resourcePath, SECTIONS, typeLabel } from "../../lib/resources.js";
import ResourceCard from "../../components/app/ResourceCard.jsx";
import { LoadError } from "./ListPages.jsx";

const goals = ["Quero criar um site", "Automatizar tarefas", "Editar vídeos", "Analisar dados"];

// Início autenticado: busca destacada, continuar de onde parou, coleções, seleção e favoritos.
export default function AppHome({ account }) {
  const reduced = useReducedMotion();
  const { index, byId, me, loading, error } = useLibrary();
  const [query, setQuery] = useState("");
  const featured = useMemo(() => {
    const guides = index.filter((item) => item.type === "guide").slice(0, 2);
    const skills = resolveFeatured(index.filter((item) => item.type === "skill").map((item) => ({ ...item, description: item.summary })), { count: 4 });
    return [...guides, ...skills].slice(0, 4);
  }, [index]);
  const last = me.recent.map((row) => byId.get(row.id)).find(Boolean);
  const recent = me.recent.map((row) => byId.get(row.id)).filter(Boolean).slice(0, 6);
  const favorites = me.favorites.map((id) => byId.get(id)).filter(Boolean).slice(0, 6);
  const counts = useMemo(() => Object.fromEntries(SECTIONS.map((s) => [s.route, index.filter((item) => s.types.includes(item.type)).length])), [index]);

  if (error) return <LoadError error={error}/>;
  return <div className="page home">
    <motion.section className="home-hero" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <p className="muted">Olá{account?.email ? `, ${account.email.split("@")[0]}` : ""}.</p>
      <h1>O que você quer criar hoje?</h1>
      <form className="home-search" onSubmit={(event) => { event.preventDefault(); navigate(`/app/buscar?q=${encodeURIComponent(query)}`); }}>
        <span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="home-q">Buscar</label>
        <input id="home-q" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busque por nome, tecnologia ou objetivo"/>
        <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
      </form>
      <div className="chip-row">{goals.map((goal) => <button key={goal} type="button" className="chip" onClick={() => navigate(`/app/buscar?q=${encodeURIComponent(goal)}`)}>{goal}</button>)}</div>
    </motion.section>

    {last && <section className="home-block"><h2>Continuar de onde parou</h2>
      <Link className="continue-card" to={resourcePath(last.id)} data-category={last.category}><span className="badge">{categoryLabel[last.category]}</span><span className="badge badge-type">{typeLabel[last.type]}</span><b>{last.title}</b><span className="muted small">{last.summary}</span></Link>
    </section>}

    <section className="home-block"><div className="home-block-head"><h2>Minhas coleções</h2><Link className="link" to="/app/colecoes">Ver todas</Link></div>
      {me.collections.length === 0 ? <p className="muted">Crie coleções para organizar recursos por projeto. <Link className="link" to="/app/colecoes">Criar a primeira</Link></p>
        : <div className="f-grid">{me.collections.slice(0, 3).map((c, i) => <Link key={c.id} to={`/app/colecoes/${c.id}`} className="f-card" data-category={["software", "conteudo", "ciencia"][i % 3]}><span className="tag-mono">{c.items.length} item(ns)</span><h3>{c.name}</h3>{c.description && <p>{c.description}</p>}</Link>)}</div>}
    </section>

    <section className="home-block"><h2>Seleção da Biblioteca</h2>
      {loading ? <p className="muted">Carregando…</p> : <div className="r-grid">{featured.map((item) => <ResourceCard key={item.id} item={item}/>)}</div>}
    </section>

    <section className="home-block"><h2>Explorar por tipo</h2>
      <div className="type-tiles">{SECTIONS.map((s) => <Link key={s.route} to={`/app/${s.route}`} className="type-tile"><b>{s.label}</b><span className="muted small">{counts[s.route] ? `${counts[s.route].toLocaleString("pt-BR")} na sua edição` : "em curadoria"}</span></Link>)}</div>
    </section>

    {favorites.length > 0 && <section className="home-block"><div className="home-block-head"><h2>Favoritos</h2><Link className="link" to="/app/favoritos">Ver todos</Link></div><div className="r-grid">{favorites.map((item) => <ResourceCard key={item.id} item={item}/>)}</div></section>}
    {recent.length > 0 && <section className="home-block"><div className="home-block-head"><h2>Vistos recentemente</h2><Link className="link" to="/app/recentes">Histórico</Link></div><div className="r-grid">{recent.map((item) => <ResourceCard key={item.id} item={item}/>)}</div></section>}
  </div>;
}
