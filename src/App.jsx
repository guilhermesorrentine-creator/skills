import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import InteractiveSkillExplorer from "./components/explorer/InteractiveSkillExplorer.jsx";
import ComparePanel from "./components/ComparePanel.jsx";
import { CopyButton } from "./components/shared.jsx";
import AuroraBackground from "./components/effects/AuroraBackground.jsx";
import FloatingNavbar from "./components/layout/FloatingNavbar.jsx";
import SiteFooter from "./components/layout/SiteFooter.jsx";
import CyberHero from "./components/hero/CyberHero.jsx";
import CategorySection from "./components/categories/CategorySection.jsx";
import FeaturedSkills from "./components/catalog/FeaturedSkills.jsx";
import SkillMosaic from "./components/catalog/SkillMosaic.jsx";
import SearchBox from "./components/catalog/SearchBox.jsx";
import RepositoryIndex from "./components/catalog/RepositoryIndex.jsx";
import CommandPalette from "./components/catalog/CommandPalette.jsx";
import SkillDetailPage, { NotFoundPage } from "./components/details/SkillDetailPage.jsx";
import RepoDetailPage from "./components/details/RepoDetailPage.jsx";
import { motionTokens } from "./lib/motion-tokens.js";
import { areas, intentions } from "./lib/areas.js";
import { MOSAIC_PAGE, pickHeroSkills, resolveFeatured } from "./lib/featured.js";
import { buildSearchIndex, buildSuggestions, filterResults, getSkillIdFromHash, searchRepos, searchSkills } from "./lib/search.js";
import { clearRecent, getCatalogControls, loadFavorites, loadRecent, recordRecent, setCatalogControls, toggleComparison, toggleFavorite } from "./lib/local-state.js";

const sectionIds = ["topo", "categorias", "catalogo", "repositorios", "como-usar"];

function decodeRoute(value) { try { return decodeURIComponent(value); } catch { return ""; } }
function readRoute() {
  return { skillId: getSkillIdFromHash(location.hash), repoName: location.hash.startsWith("#repo/") ? decodeRoute(location.hash.slice(6)) : "" };
}

export default function App() {
  const reduced = useReducedMotion();
  const heroInputRef = useRef(null);
  const homeScroll = useRef(0);
  const pendingScroll = useRef(null);
  const lastOpened = useRef(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(false);
  const [controls, setControls] = useState(() => getCatalogControls(location.search));
  const [route, setRoute] = useState(readRoute);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [recent, setRecent] = useState(loadRecent);
  const [compareIds, setCompareIds] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(MOSAIC_PAGE);
  const [sort, setSort] = useState("relevance");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("topo");
  const onDetail = Boolean(route.skillId || route.repoName);

  useEffect(() => {
    let active = true;
    fetch("/data/catalog.json").then((response) => {
      if (!response.ok) throw new Error("catalog");
      return response.json();
    }).then((data) => { if (active) setCatalog(data); }).catch(() => { if (active) setCatalogError(true); });
    return () => { active = false; };
  }, []);

  // Voltar/avançar do navegador: retornar de uma ficha restaura a rolagem da home.
  useEffect(() => {
    const sync = () => {
      const next = readRoute();
      setRoute((previous) => {
        if ((previous.skillId || previous.repoName) && !next.skillId && !next.repoName) pendingScroll.current = { type: "restore" };
        return next;
      });
      setControls(getCatalogControls(location.search));
    };
    window.addEventListener("popstate", sync); window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);

  const index = useMemo(() => buildSearchIndex(catalog), [catalog]);
  const query = useDeferredValue(controls.query);
  const skillMatches = useMemo(() => searchSkills(index, query), [index, query]);
  const repoMatches = useMemo(() => searchRepos(index, query), [index, query]);
  const repoOptions = useMemo(() => index.repos.map((repo) => repo.name).sort((a, b) => a.localeCompare(b)), [index]);
  const baseSkills = useMemo(() => controls.view === "favoritos" ? skillMatches.filter((skill) => favorites.includes(skill.id))
    : controls.view === "recentes" ? skillMatches.filter((skill) => recent.some((item) => item.id === skill.id)) : skillMatches, [skillMatches, controls.view, favorites, recent]);
  const visibleSkills = useMemo(() => filterResults(baseSkills, { category: controls.category, repo: controls.repo, sort, query }), [baseSkills, controls.category, controls.repo, sort, query]);
  const visibleRepos = useMemo(() => filterResults(repoMatches, { category: controls.category, repo: controls.repo, sort, query }), [repoMatches, controls.category, controls.repo, sort, query]);
  const countByArea = useMemo(() => Object.fromEntries(areas.slice(1).map((area) => [area.id, index.skills.filter((skill) => skill.category === area.id).length])), [index]);
  const counts = { repos: catalog.length, skills: index.skills.length };
  const featured = useMemo(() => query ? visibleSkills.slice(0, 5) : resolveFeatured(index.skills, { category: controls.category, count: 5 }), [query, visibleSkills, index, controls.category]);
  const heroSkills = useMemo(() => pickHeroSkills(index.skills, { matches: skillMatches, query, count: 12 }), [index, skillMatches, query]);
  const emphasisIds = useMemo(() => new Set(query ? skillMatches.slice(0, 4).map((skill) => skill.id) : []), [query, skillMatches]);
  const suggestions = useMemo(() => buildSuggestions(index, query, skillMatches, { goals: intentions, areas: areas.slice(1), repoMatches }), [index, query, skillMatches, repoMatches]);
  const comparison = compareIds.map((id) => index.skills.find((skill) => skill.id === id)).filter(Boolean);
  const selectedSkill = route.skillId ? index.skills.find((skill) => skill.id === route.skillId) : null;
  const selectedRepo = route.repoName ? index.repos.find((repo) => repo.name === route.repoName) : null;

  useEffect(() => setVisibleLimit(MOSAIC_PAGE), [controls.query, controls.category, controls.repo, controls.view, controls.kind, sort]);

  // Rolagem após trocar de vista: restaura a home, vai a uma âncora ou abre a ficha no topo.
  useLayoutEffect(() => {
    if (onDetail) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    const pending = pendingScroll.current;
    pendingScroll.current = null;
    if (pending?.type === "restore") {
      window.scrollTo({ top: homeScroll.current, behavior: "instant" });
      requestAnimationFrame(() => document.querySelector(`[data-focus-id="${CSS.escape(lastOpened.current || "")}"]`)?.focus({ preventScroll: true }));
    } else if (pending?.type === "anchor") {
      requestAnimationFrame(() => document.getElementById(pending.id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" }));
    }
  }, [onDetail, route.skillId, route.repoName, reduced]);

  // Seção ativa da navegação.
  useEffect(() => {
    if (onDetail || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.2, 0.6] });
    sectionIds.forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [onDetail, catalog.length]);

  const updateControls = useCallback((patch) => {
    setControls((current) => {
      const next = { ...current, ...patch };
      history.replaceState(history.state, "", setCatalogControls(location.href, next));
      return next;
    });
  }, []);

  const openSkill = useCallback((skill) => {
    if (!readRoute().skillId && !readRoute().repoName) homeScroll.current = window.scrollY;
    lastOpened.current = skill.id;
    history.pushState({ bt: "detail" }, "", `${location.pathname}${location.search}#skill/${encodeURIComponent(skill.id)}`);
    setRoute({ skillId: skill.id, repoName: "" });
    setPaletteOpen(false);
    setRecent((items) => {
      const next = recordRecent(items, skill.id);
      if (next === items) { setStorageError(true); setNotice("O histórico local não pôde ser salvo neste navegador."); }
      return next;
    });
  }, []);
  const openRepo = useCallback((repoName) => {
    if (!readRoute().skillId && !readRoute().repoName) homeScroll.current = window.scrollY;
    lastOpened.current = `repo:${repoName}`;
    history.pushState({ bt: "detail" }, "", `${location.pathname}${location.search}#repo/${encodeURIComponent(repoName)}`);
    setRoute({ skillId: null, repoName });
    setPaletteOpen(false);
  }, []);
  const closeDetail = useCallback(() => {
    if (history.state?.bt === "detail") { history.back(); return; }
    pendingScroll.current = { type: "anchor", id: "catalogo" };
    history.replaceState(null, "", `${location.pathname}${location.search}#catalogo`);
    setRoute({ skillId: null, repoName: "" });
  }, []);
  const navigate = useCallback((event, id) => {
    if (!readRoute().skillId && !readRoute().repoName) {
      event?.preventDefault();
      history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`);
      document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
      return;
    }
    event?.preventDefault();
    pendingScroll.current = { type: "anchor", id };
    history.pushState(null, "", `${location.pathname}${location.search}#${id}`);
    setRoute({ skillId: null, repoName: "" });
  }, [reduced]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((open) => !open); return; }
      if (event.key === "Escape" && !paletteOpen && onDetail && !event.defaultPrevented) closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, onDetail, closeDetail]);

  const toggleSaved = useCallback((id) => {
    setFavorites((current) => {
      const next = toggleFavorite(current, id);
      if (next === current) { setStorageError(true); setNotice("O armazenamento local está indisponível; o favorito não foi salvo."); return current; }
      setStorageError(false); setNotice(next.includes(id) ? "Skill salva nos favoritos locais." : "Skill removida dos favoritos.");
      return next;
    });
  }, []);
  const toggleCompared = useCallback((id) => {
    setCompareIds((current) => {
      const result = toggleComparison(current, id);
      setNotice(result.limited ? "A comparação aceita até 3 skills." : result.ids.includes(id) ? "Skill adicionada à comparação." : "Skill removida da comparação.");
      return result.ids;
    });
  }, []);
  const clearFilters = () => updateControls({ query: "", category: "todas", repo: "todos", view: "todos" });
  const showCatalog = () => document.getElementById("catalogo")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  const pickSuggestion = useCallback((option) => {
    if (option.type === "skill") openSkill(option.value);
    else if (option.type === "repo") openRepo(option.value);
    else if (option.type === "area") { updateControls({ category: option.value, query: "" }); showCatalog(); }
    else if (option.type === "goal") updateControls({ query: option.value });
    else if (option.type === "submit") showCatalog();
  }, [openSkill, openRepo, updateControls]);

  const search = { inputRef: heroInputRef, value: controls.query, onChange: (value) => updateControls({ query: value }), suggestions, onPick: pickSuggestion };
  const resultCount = controls.kind === "skills" ? visibleSkills.length : visibleRepos.length;
  const items = controls.kind === "skills" ? visibleSkills : visibleRepos;

  const detail = selectedSkill ? <SkillDetailPage key={selectedSkill.id} skill={selectedSkill} index={index} favorite={favorites.includes(selectedSkill.id)} compared={compareIds.includes(selectedSkill.id)} onFavorite={toggleSaved} onCompare={toggleCompared} onBack={closeDetail} onOpenSkill={openSkill} onOpenRepo={openRepo}/>
    : selectedRepo ? <RepoDetailPage key={selectedRepo.name} repo={selectedRepo} onBack={closeDetail} onOpenSkill={openSkill}/>
    : catalog.length ? <NotFoundPage kind={route.repoName ? "repo" : "skill"} onBack={closeDetail}/>
    : <p className="wrap loading-line" role="status">Carregando o índice…</p>;

  return <div className="site-shell">
    <AuroraBackground/>
    <FloatingNavbar active={onDetail ? "" : activeSection} onNavigate={navigate} onOpenPalette={() => setPaletteOpen(true)}/>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <AnimatePresence mode="wait" initial={false}>
      {onDetail ? <motion.main key="detail" id="conteudo" className="view view-detail"
        initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}>{detail}</motion.main>
      : <motion.main key="home" id="conteudo" className="view view-home"
        initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: motionTokens.duration.fast }}>
        <CyberHero search={search} counts={counts} heroSkills={heroSkills} category={controls.category} emphasisIds={emphasisIds} onOpenSkill={openSkill} onExplore={showCatalog}/>
        <CategorySection areas={areas.slice(1)} counts={countByArea} active={controls.category} onSelect={(category) => updateControls({ category })} onShowCatalog={showCatalog}/>

        <section className="catalog-section" id="catalogo" aria-labelledby="catalogo-title">
          <div className="wrap">
            <div className="section-head">
              <p className="sys-tag">SEARCH_PROTOCOL://CATALOGO</p>
              <h2 id="catalogo-title">Explorar o acervo</h2>
              <p className="section-lead">Ranking local: nome, descrição e caminho de cada skill, com sinônimos em português e inglês. Nada é enviado a serviços externos.</p>
            </div>
            <FeaturedSkills skills={featured} query={query} category={controls.category} onOpen={openSkill}/>
            <div className="catalog-console">
              <SearchBox inputRef={null} value={controls.query} onChange={(value) => updateControls({ query: value })} suggestions={suggestions} onPick={pickSuggestion} showShortcut={false} label="Buscar no catálogo"/>
              <div className="chip-row intent-row" role="group" aria-label="Buscar por objetivo">{intentions.slice(0, 7).map((item) => <button key={item} type="button" className="chip" aria-pressed={controls.query === item} onClick={() => updateControls({ query: controls.query === item ? "" : item })}>{item}</button>)}</div>
              <div className="toolbar">
                <div className="segmented" role="group" aria-label="Tipo de resultado">
                  <button type="button" aria-pressed={controls.kind === "skills"} onClick={() => updateControls({ kind: "skills" })}>Skills <span>{visibleSkills.length.toLocaleString("pt-BR")}</span></button>
                  <button type="button" aria-pressed={controls.kind === "repositorios"} onClick={() => updateControls({ kind: "repositorios", view: "todos" })}>Repositórios <span>{visibleRepos.length}</span></button>
                </div>
                <label className="field">Categoria<select value={controls.category} onChange={(event) => updateControls({ category: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>
                <label className="field">Repositório<select value={controls.repo} onChange={(event) => updateControls({ repo: event.target.value })}><option value="todos">Todos</option>{repoOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
                <label className="field">Ordenar<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevância</option><option value="name">Nome (A–Z)</option></select></label>
              </div>
              <div className="toolbar toolbar-secondary">
                <div className="segmented" role="group" aria-label="Coleção pessoal">
                  <button type="button" aria-pressed={controls.view === "todos"} onClick={() => updateControls({ view: "todos" })}>Todas</button>
                  <button type="button" aria-pressed={controls.view === "favoritos"} onClick={() => updateControls({ view: controls.view === "favoritos" ? "todos" : "favoritos", kind: "skills" })}>★ Favoritos <span>{favorites.length}</span></button>
                  <button type="button" aria-pressed={controls.view === "recentes"} onClick={() => updateControls({ view: controls.view === "recentes" ? "todos" : "recentes", kind: "skills" })}>Recentes <span>{recent.length}</span></button>
                </div>
                {controls.view === "recentes" && recent.length > 0 && <button type="button" className="button button-ghost" onClick={() => { if (!clearRecent()) { setStorageError(true); setNotice("O histórico não pôde ser limpo neste navegador."); return; } setRecent([]); setNotice("Histórico local limpo."); }}>Limpar histórico</button>}
                <button type="button" className="button button-ghost" onClick={clearFilters}>Limpar filtros</button>
              </div>
            </div>

            <p className="result-summary"><span className="prompt-caret" aria-hidden="true">&gt;</span> {controls.kind === "skills" ? `${resultCount.toLocaleString("pt-BR")} skills` : `${resultCount} repositórios`} {controls.query ? `para “${controls.query}”` : "no índice"}{storageError ? " · armazenamento local indisponível" : ""}</p>
            {catalogError && <div className="empty-state" role="alert"><p className="sys-tag">ERR://CATALOG_UNAVAILABLE</p><p>Não foi possível carregar o catálogo. Atualize a página para tentar novamente.</p></div>}
            {!catalog.length && !catalogError && <div className="mosaic mosaic-loading" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <div key={i} className={`tile tile-${i === 0 ? "L" : "S"} tile-skeleton`}/>)}</div>}
            {catalog.length > 0 && resultCount > 0 && <SkillMosaic kind={controls.kind} items={items.slice(0, visibleLimit)} query={query} favorites={favorites} compareIds={compareIds} onOpen={openSkill} onOpenRepo={openRepo} onFavorite={toggleSaved} onCompare={toggleCompared}/>}
            {catalog.length > 0 && !resultCount && <div className="empty-state">
              <p className="sys-tag">QUERY://SEM_RESULTADOS</p>
              <h3>Nenhuma skill corresponde a esta combinação.</h3>
              <p>{controls.view === "favoritos" ? "Você ainda não favoritou skills com estes filtros. Use ☆ nos cartões para salvar." : controls.view === "recentes" ? "Nenhuma skill visitada corresponde a estes filtros." : "Tente termos mais curtos, em inglês, ou remova a categoria e o repositório selecionados."}</p>
              <div className="chip-row">{intentions.slice(0, 4).map((item) => <button key={item} type="button" className="chip" onClick={() => updateControls({ query: item, category: "todas", repo: "todos", view: "todos" })}>{item}</button>)}</div>
              <button type="button" className="button button-primary" onClick={clearFilters}>Limpar busca e filtros</button>
            </div>}
            {resultCount > visibleLimit && <div className="load-more"><p>Mostrando {visibleLimit.toLocaleString("pt-BR")} de {resultCount.toLocaleString("pt-BR")}</p><button type="button" className="button button-ghost" onClick={() => setVisibleLimit((limit) => limit + MOSAIC_PAGE)}>Carregar mais</button></div>}
            {showCompare && <ComparePanel skills={comparison} onRemove={toggleCompared} onClear={() => setCompareIds([])} onOpen={openSkill}/>}
          </div>
        </section>

        <RepositoryIndex repos={index.repos} onOpenRepo={openRepo}/>

        <section className="resources-section" id="como-usar" aria-labelledby="como-usar-title">
          <div className="wrap">
            <div className="section-head">
              <p className="sys-tag">MANUAL://COMO_USAR</p>
              <h2 id="como-usar-title">Do catálogo ao agente</h2>
              <p className="section-lead">Três passos em ordem. Nomes e caminhos vêm do catálogo; requisitos sempre se confirmam no arquivo original.</p>
            </div>
            <div className="resources-grid">
              <ol className="steps-terminal">
                <li><span className="step-n" aria-hidden="true">01</span><div><b>Encontre</b><p>Pesquise pelo nome ou pelo objetivo, ou escolha uma das quatro áreas.</p></div></li>
                <li><span className="step-n" aria-hidden="true">02</span><div><b>Confira a origem</b><p>Abra a ficha, veja o repositório e o caminho e leia o SKILL.md no GitHub.</p></div></li>
                <li><span className="step-n" aria-hidden="true">03</span><div><b>Adapte o pedido</b><p>Copie o prompt genérico e preencha objetivo, contexto e formato.</p></div></li>
              </ol>
              <div className="term-panel command-board">
                <header className="term-head"><span className="term-dots" aria-hidden="true"><i/><i/><i/></span><h3>Prompt genérico</h3><span className="term-code" aria-hidden="true">prompt --template</span></header>
                <div className="term-body">
                  <pre>{"Use as instruções de [skill] para [objetivo].\nContexto: [contexto].\nEntregue: [formato]."}</pre>
                  <CopyButton value={"Use as instruções de [skill] para [objetivo]. Contexto: [contexto]. Entregue: [formato]."}>Copiar prompt</CopyButton>
                  <p className="muted small">A biblioteca não presume instalação nem compatibilidade; o arquivo original é a referência.</p>
                </div>
              </div>
            </div>
            <div className="explorer-wrap">
              <InteractiveSkillExplorer onFullAccess={showCatalog}/>
            </div>
          </div>
        </section>
        <SiteFooter counts={counts}/>
      </motion.main>}
    </AnimatePresence>
    {onDetail && <SiteFooter counts={counts}/>}

    {!onDetail && <motion.div className={`compare-tray ${comparison.length ? "is-visible" : ""}`} aria-hidden={!comparison.length} initial={false} animate={{ y: comparison.length ? 0 : 120, opacity: comparison.length ? 1 : 0 }} transition={reduced ? { duration: 0 } : { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
      <span className="compare-tray-count">◆ {comparison.length}/3 na comparação</span>
      <button type="button" className="button button-primary" tabIndex={comparison.length ? 0 : -1} onClick={() => { setShowCompare(true); requestAnimationFrame(() => document.getElementById("comparacao")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" })); }}>Comparar</button>
    </motion.div>}
    <AnimatePresence>{paletteOpen && <CommandPalette index={index} onClose={() => setPaletteOpen(false)} onOpenSkill={openSkill} onOpenRepo={openRepo} onNavigate={navigate}/>}</AnimatePresence>
  </div>;
}
