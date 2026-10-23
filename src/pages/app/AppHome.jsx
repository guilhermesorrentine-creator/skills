import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReduced } from "../../lib/motion-pref.jsx";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { resolveFeatured } from "../../lib/featured.js";
import { resourcePath, SECTIONS } from "../../lib/resources.js";
import { useT } from "../../i18n/index.js";
import ResourceCard from "../../components/app/ResourceCard.jsx";
import CyberpunkCharacter from "../../components/categories/CyberpunkCharacter.jsx";
import { useFidgets } from "../../components/categories/alive.js";
import { LoadError } from "./ListPages.jsx";

// Início autenticado: busca destacada, continuar de onde parou, coleções, seleção e favoritos.
export default function AppHome({ account }) {
  const reduced = useReduced();
  const { t, n } = useT();
  const { index, byId, me, loading, error } = useLibrary();
  const [query, setQuery] = useState("");
  // O Hacker acompanha a busca: olha para o campo e digita junto enquanto você escreve.
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(0);
  const heroRef = useRef(null);
  useEffect(() => () => window.clearTimeout(typingTimer.current), []);
  const onType = (value) => { setQuery(value); setTyping(true); window.clearTimeout(typingTimer.current); typingTimer.current = window.setTimeout(() => setTyping(false), 900); };
  const fidgets = useFidgets(["software"], { enabled: !reduced && !typing, rootRef: heroRef, every: 4200 });
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
    <motion.section ref={heroRef} className="home-hero" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <span className="home-hero-char" aria-hidden="true"><CyberpunkCharacter category="software" active={typing || fidgets.software === "act"} fidget={fidgets.software === "hop" ? "hop" : null} look={typing ? { x: -1, y: 1 } : null}/></span>
      <p className="muted">{t("app.home.hello")}{account?.email ? `, ${account.email.split("@")[0]}` : ""}.</p>
      <h1>{t("app.home.title")}</h1>
      <form className="home-search" onSubmit={(event) => { event.preventDefault(); navigate(`/app/buscar?q=${encodeURIComponent(query)}`); }}>
        <span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="home-q">{t("app.home.search")}</label>
        <input id="home-q" className="input" value={query} onChange={(e) => onType(e.target.value)} placeholder={t("app.home.placeholder")}/>
        <button type="submit" className="btn btn-primary btn-sm">{t("app.home.search")}</button>
      </form>
      <div className="chip-row">{t("app.home.goals").map((goal) => <button key={goal} type="button" className="chip" onClick={() => navigate(`/app/buscar?q=${encodeURIComponent(goal)}`)}>{goal}</button>)}</div>
    </motion.section>

    {last && <section className="home-block"><h2>{t("app.home.continue")}</h2>
      <Link className="continue-card" to={resourcePath(last.id)} data-category={last.category}><span className="badge">{t(`cat.${last.category}`)}</span><span className="badge badge-type">{t(`type.${last.type}`)}</span><b>{last.title}</b><span className="muted small">{last.summary}</span></Link>
    </section>}

    <section className="home-block"><div className="home-block-head"><h2>{t("app.home.collections")}</h2><Link className="link" to="/app/colecoes">{t("app.home.seeAll")}</Link></div>
      {me.collections.length === 0 ? <p className="muted">{t("app.home.noCollections")} <Link className="link" to="/app/colecoes">{t("app.home.createFirst")}</Link></p>
        : <div className="f-grid">{me.collections.slice(0, 3).map((c, i) => <Link key={c.id} to={`/app/colecoes/${c.id}`} className="f-card" data-category={["software", "conteudo", "ciencia"][i % 3]}><span className="tag-mono">{t("app.home.items", { n: c.items.length })}</span><h3>{c.name}</h3>{c.description && <p>{c.description}</p>}</Link>)}</div>}
    </section>

    <section className="home-block"><h2>{t("app.home.featured")}</h2>
      {loading ? <p className="muted">{t("common.loading")}</p> : <div className="r-grid">{featured.map((item, i) => <ResourceCard key={item.id} index={i} item={item}/>)}</div>}
    </section>

    <section className="home-block"><h2>{t("app.home.byType")}</h2>
      <div className="type-tiles">{SECTIONS.map((s) => <Link key={s.route} to={`/app/${s.route}`} className="type-tile"><b>{t(`section.${s.route}`)}</b><span className="muted small">{counts[s.route] ? t("app.home.inEdition", { count: n(counts[s.route]) }) : t("app.home.curating")}</span></Link>)}</div>
    </section>

    {favorites.length > 0 && <section className="home-block"><div className="home-block-head"><h2>{t("app.home.favorites")}</h2><Link className="link" to="/app/favoritos">{t("app.home.seeAllFavorites")}</Link></div><div className="r-grid">{favorites.map((item, i) => <ResourceCard key={item.id} index={i} item={item}/>)}</div></section>}
    {recent.length > 0 && <section className="home-block"><div className="home-block-head"><h2>{t("app.home.recent")}</h2><Link className="link" to="/app/recentes">{t("app.home.history")}</Link></div><div className="r-grid">{recent.map((item, i) => <ResourceCard key={item.id} index={i} item={item}/>)}</div></section>}
  </div>;
}
