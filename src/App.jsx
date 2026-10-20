import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AnatomyFigure from "./components/AnatomyFigure.jsx";
import ComparePanel from "./components/ComparePanel.jsx";
import { CopyButton } from "./components/shared.jsx";
import { Highlight, RepoCard, SkillCard } from "./components/SkillCatalog.jsx";
import SkillDetail from "./components/SkillDetail.jsx";
import { motionTokens, springs } from "./lib/motion-tokens.js";
import { buildSearchIndex, filterResults, getSkillIdFromHash, safeGitHubUrl, searchRepos, searchSkills } from "./lib/search.js";
import { clearRecent, getCatalogControls, loadFavorites, loadRecent, recordRecent, setCatalogControls, toggleComparison, toggleFavorite } from "./lib/local-state.js";

const areas = [
  { id: "todas", label: "Todas" },
  { id: "software", label: "Software" },
  { id: "empreendedorismo", label: "Empreendedorismo" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "ciencia", label: "Ciência" },
];
const intentions = ["Criar um site", "Desenvolver aplicativo", "Automatizar tarefas", "Criar vídeos", "Analisar dados", "Melhorar design", "Economizar tokens", "Pesquisa científica"];

function readRoute() {
  return { skillId: getSkillIdFromHash(location.hash), repoName: location.hash.startsWith("#repo/") ? decodeRoute(location.hash.slice(6)) : "" };
}
function decodeRoute(value) { try { return decodeURIComponent(value); } catch { return ""; } }

function RepoDetail({ repo, onClose }) {
  const prompt = `Consulte a documentação de ${repo.name}. Ajude com [objetivo], considerando [contexto]. Confirme os pré-requisitos na fonte original antes de executar etapas específicas.`;
  const url = safeGitHubUrl(repo.url);
  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="repo-detail-title" tabIndex={-1} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const nodes = [...event.currentTarget.querySelectorAll("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")];
    if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  }}>
    <button className="dialog-close" aria-label="Fechar guia" onClick={onClose}>×</button><p className="eyebrow">GUIA DE REPOSITÓRIO · {repo.category}</p><h2 id="repo-detail-title">{repo.name}</h2><p>{repo.summary || "O catálogo não informa uma descrição."}</p>
    <dl className="repo-detail-fields"><dt>Skills no índice</dt><dd>{repo.skills.length}</dd><dt>README</dt><dd>{repo.readme || "Não informado."}</dd><dt>Conteúdo detalhado</dt><dd>Consulte os arquivos diretamente na fonte do repositório.</dd></dl>
    <div className="detail-prompt"><h3>Prompt de exemplo</h3><pre>{prompt}</pre><CopyButton value={prompt}>Copiar prompt</CopyButton></div>
    {url && <a className="button button-primary" href={url} target="_blank" rel="noopener noreferrer">Abrir repositório ↗</a>}
    <div className="repo-skill-links">{repo.skills.slice(0, 18).map((skill) => <div key={`${repo.name}:${skill.path || skill.name}`}><b>{skill.name}</b><span>{skill.description || "Descrição não informada."}</span>{skill.path && <code>{skill.path}</code>}</div>)}{repo.skills.length > 18 && <p>Exibindo 18 de {repo.skills.length} skills; use a busca no catálogo para encontrar as demais.</p>}</div>
  </section></div>;
}

export default function App() {
  const reduced = useReducedMotion();
  const inputRef = useRef(null);
  const lastFocus = useRef(null);
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(false);
  const [controls, setControls] = useState(() => getCatalogControls(location.search));
  const [route, setRoute] = useState(readRoute);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [recent, setRecent] = useState(loadRecent);
  const [compareIds, setCompareIds] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(72);
  const [sort, setSort] = useState("relevance");
  const [notice, setNotice] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [scopeError, setScopeError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/data/catalog.json").then((response) => {
      if (!response.ok) throw new Error("catalog");
      return response.json();
    }).then((data) => { if (active) setCatalog(data); }).catch(() => { if (active) setCatalogError(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const sync = () => { setRoute(readRoute()); setControls(getCatalogControls(location.search)); };
    window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;
        event.preventDefault(); inputRef.current?.focus();
      }
      if (event.key === "Escape" && (route.skillId || route.repoName)) closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [route]);
  useEffect(() => {
    if (route.skillId || route.repoName) {
      lastFocus.current = document.activeElement;
      requestAnimationFrame(() => document.querySelector(".detail-dialog")?.focus());
      return () => { if (lastFocus.current?.isConnected) lastFocus.current.focus(); };
    }
  }, [route.skillId, route.repoName]);
  useEffect(() => setVisibleLimit(72), [controls.query, controls.category, controls.repo, controls.view, controls.kind, sort]);

  const index = useMemo(() => buildSearchIndex(catalog), [catalog]);
  const skillMatches = useMemo(() => searchSkills(index, controls.query), [index, controls.query]);
  const repoMatches = useMemo(() => searchRepos(index, controls.query), [index, controls.query]);
  const repoOptions = useMemo(() => [...new Set(index.repos.map((repo) => repo.name))].sort((a, b) => a.localeCompare(b)), [index]);
  const baseSkills = controls.view === "favoritos" ? skillMatches.filter((skill) => favorites.includes(skill.id))
    : controls.view === "recentes" ? skillMatches.filter((skill) => recent.some((item) => item.id === skill.id)) : skillMatches;
  const visibleSkills = useMemo(() => filterResults(baseSkills, { category: controls.category, repo: controls.repo, sort, query: controls.query }), [baseSkills, controls, sort]);
  const visibleRepos = useMemo(() => filterResults(repoMatches, { category: controls.category, repo: controls.repo, sort, query: controls.query }), [repoMatches, controls.category, controls.repo, sort]);
  const selectedSkill = route.skillId ? index.skills.find((skill) => skill.id === route.skillId) : null;
  const selectedRepo = route.repoName ? catalog.find((repo) => repo.name === route.repoName) : null;
  const totalSkills = index.skills.length;
  const countByArea = useMemo(() => Object.fromEntries(areas.slice(1).map((area) => [area.id, index.skills.filter((skill) => skill.category === area.id).length])), [index]);
  const comparison = compareIds.map((id) => index.skills.find((skill) => skill.id === id)).filter(Boolean);

  const updateControls = (patch) => {
    const next = { ...controls, ...patch };
    setControls(next);
    history.replaceState(null, "", setCatalogControls(location.href, next));
  };
  const openSkill = (skill) => {
    setRoute({ skillId: skill.id, repoName: "" });
    history.pushState(null, "", `${location.pathname}${location.search}#skill/${encodeURIComponent(skill.id)}`);
    const next = recordRecent(recent, skill.id);
    if (next === recent) { setScopeError(true); setNotice("O histórico local não pôde ser salvo neste navegador."); }
    else setRecent(next);
  };
  const openRepo = (repoName) => {
    setRoute({ skillId: null, repoName });
    history.pushState(null, "", `${location.pathname}${location.search}#repo/${encodeURIComponent(repoName)}`);
  };
  function closeDetail() {
    setRoute({ skillId: null, repoName: "" });
    history.replaceState(null, "", `${location.pathname}${location.search}#catalogo`);
  }
  const toggleSaved = (id) => {
    const next = toggleFavorite(favorites, id);
    if (next === favorites) { setScopeError(true); setNotice("O armazenamento local está indisponível; o favorito não foi salvo."); return; }
    setFavorites(next); setScopeError(false); setNotice(next.includes(id) ? "Skill salva nos favoritos locais." : "Skill removida dos favoritos.");
  };
  const toggleCompared = (id) => {
    const result = toggleComparison(compareIds, id);
    if (result.limited) { setNotice("A comparação aceita até 3 skills."); return; }
    setCompareIds(result.ids);
  };
  const clearFilters = () => updateControls({ query: "", category: "todas", repo: "todos", view: "todos" });

  return <div className="site-shell">
    <header className="topbar"><a className="brand" href="#topo" aria-label="Biblioteca Total, início"><span className="brand-mark">BT</span><span>Biblioteca <b>Total</b></span></a><nav aria-label="Navegação principal"><a href="#catalogo">Biblioteca</a><a href="#comandos">Comandos</a><a href="#como-usar">Como usar</a></nav><a className="top-cta" href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noreferrer">Projeto aberto ↗</a></header>
    <main id="topo">
      <section className="hero wrap"><div className="hero-copy"><p className="eyebrow"><span className="status-dot"/> ÍNDICE DE AGENT SKILLS · EDIÇÃO 2026</p><h1>Uma biblioteca.<br/><em>Mil maneiras</em> de criar.</h1><p className="hero-lead">Encontre a instrução certa, entenda de onde ela vem e leve o próximo passo para o seu agente.</p><div className="search-row hero-search"><label className="search-box"><span aria-hidden="true">⌕</span><input ref={inputRef} value={controls.query} onChange={(event) => updateControls({ query: event.target.value })} placeholder="Buscar skills por nome, tecnologia ou objetivo…" aria-label="Buscar skills e repositórios"/><kbd>Ctrl K</kbd></label></div><div className="hero-actions"><a className="button button-primary" href="#catalogo">Ver resultados <span>↓</span></a><a className="text-link" href="#como-usar">Como funciona <span>↗</span></a></div><div className="hero-counts"><div><strong>{catalog.length.toString().padStart(2, "0")}</strong><span>repositórios</span></div><div><strong>{totalSkills.toLocaleString("pt-BR")}</strong><span>skills indexadas</span></div><div><strong>04</strong><span>áreas de conhecimento</span></div></div></div><div className="hero-art"><img src="/assets/personagens-pixel-art.png" alt="Quatro personagens originais em pixel art representando a equipe da biblioteca"/><div className="art-caption"><span className="status-dot"/> equipe pronta para ajudar <span className="caption-line"/></div><div className="art-sticker">SKILLS<br/><b>LOADED!</b></div></div></section>
      <section className="areas-strip" aria-label="Áreas da biblioteca"><div className="wrap area-grid">{areas.slice(1).map((area, i) => <button key={area.id} className={`area-tile area-${area.id} ${controls.category === area.id ? "is-active" : ""}`} onClick={() => { updateControls({ category: controls.category === area.id ? "todas" : area.id }); location.hash = "catalogo"; }}><span className="area-index">0{i + 1} / 04</span><strong>{area.label}</strong><span>{countByArea[area.id] || 0} skills <b>↗</b></span></button>)}</div></section>
      <section className="catalog-section wrap" id="catalogo">
        <div className="section-heading catalog-heading"><div><p className="eyebrow">O ACERVO</p><h2>O que você quer criar?</h2><p className="muted">Pesquise diretamente nas skills e veja as evidências para cada resultado.</p></div><div className="collection-stamp"><span>{catalog.length}</span><small>REPOS<br/>INDEXADOS</small></div></div>
        <div className="intent-row" aria-label="Buscar por objetivo">{intentions.map((item) => <button key={item} className="intent-chip" onClick={() => updateControls({ query: item })}>{item}</button>)}</div>
        <div className="library-toolbar">
          <div className="result-tabs" role="tablist" aria-label="Tipo de resultado"><button role="tab" aria-selected={controls.kind === "skills"} onClick={() => updateControls({ kind: "skills" })}>Skills <span>{visibleSkills.length.toLocaleString("pt-BR")}</span></button><button role="tab" aria-selected={controls.kind === "repositorios"} onClick={() => updateControls({ kind: "repositorios" })}>Repositórios <span>{visibleRepos.length}</span></button></div>
          <label className="select-wrap">Categoria<select value={controls.category} onChange={(event) => updateControls({ category: event.target.value })}>{areas.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>
          <label className="select-wrap">Repositório<select value={controls.repo} onChange={(event) => updateControls({ repo: event.target.value })}><option value="todos">Todos os repositórios</option>{repoOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          <label className="select-wrap">Ordenar<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Relevância</option><option value="name">Nome</option></select></label>
          <button className="text-link clear-filters" onClick={clearFilters}>Limpar filtros</button>
        </div>
        <div className="personal-tabs"><button aria-pressed={controls.view === "todos"} onClick={() => updateControls({ view: "todos" })}>Todas</button><button aria-pressed={controls.view === "favoritos"} onClick={() => updateControls({ view: controls.view === "favoritos" ? "todos" : "favoritos", kind: "skills" })}>Favoritos ({favorites.length})</button><button aria-pressed={controls.view === "recentes"} onClick={() => updateControls({ view: controls.view === "recentes" ? "todos" : "recentes", kind: "skills" })}>Recentes ({recent.length})</button>{controls.view === "recentes" && <button onClick={() => { if (!clearRecent()) { setScopeError(true); setNotice("O histórico não pôde ser limpo neste navegador."); return; } setRecent([]); setScopeError(false); setNotice("Histórico local limpo."); }}>Limpar histórico</button>}</div>
        <p className="result-summary" aria-live="polite">{controls.kind === "skills" ? `${visibleSkills.length.toLocaleString("pt-BR")} skills` : `${visibleRepos.length} repositórios`} encontrados{controls.query ? ` para “${controls.query}”` : ""}.{scopeError ? " O armazenamento local está indisponível." : ""}</p>
        {notice && <p className="sr-only" role="status">{notice}</p>}
        {catalogError && <div className="empty-note" role="alert">Não foi possível carregar o catálogo. Atualize a página para tentar novamente.</div>}
        {!catalog.length && !catalogError && <div className="empty-note" role="status">Carregando o índice…</div>}
        {catalog.length > 0 && controls.kind === "skills" && <div className="skill-results">{visibleSkills.slice(0, visibleLimit).map((skill) => <SkillCard key={skill.id} skill={skill} query={controls.query} favorite={favorites.includes(skill.id)} compared={compareIds.includes(skill.id)} onOpen={openSkill} onFavorite={toggleSaved} onCompare={toggleCompared}/>)}</div>}
        {catalog.length > 0 && controls.kind === "repositorios" && <div className="repo-grid">{visibleRepos.slice(0, visibleLimit).map((repo) => <RepoCard key={repo.name} repo={repo} onOpen={openRepo}/>)}</div>}
        {catalog.length > 0 && !(controls.kind === "skills" ? visibleSkills.length : visibleRepos.length) && <div className="empty-note"><strong>Nenhum resultado.</strong> Tente termos mais curtos, remova filtros ou explore as sugestões acima.<button className="button button-outline" onClick={clearFilters}>Limpar busca e filtros</button></div>}
        {(controls.kind === "skills" ? visibleSkills.length : visibleRepos.length) > visibleLimit && <div className="load-more"><p className="more-results">Mostrando {visibleLimit} de {controls.kind === "skills" ? visibleSkills.length.toLocaleString("pt-BR") : visibleRepos.length} resultados.</p><button className="button button-outline" onClick={() => setVisibleLimit((limit) => limit + 72)}>Carregar mais {controls.kind === "skills" ? "skills" : "repositórios"}</button></div>}
        <div className="compare-entry"><button className="button button-outline" onClick={() => setShowCompare((open) => !open)}>Comparar selecionadas ({comparison.length}/3)</button></div>
        {showCompare && <ComparePanel skills={comparison} onRemove={toggleCompared} onClear={() => setCompareIds([])}/>}
      </section>
      <section className="commands-section" id="comandos"><div className="wrap commands-layout"><div className="commands-intro"><p className="eyebrow">PAINEL DE COMANDOS · 01</p><h2>Comece pela<br/><em>instrução certa.</em></h2><p>Use uma skill de forma explícita e dê contexto ao agente. Nomes e caminhos vêm do catálogo; confira sempre os requisitos no arquivo original.</p><a className="text-link" href="#como-usar">Ver guia de ativação ↗</a></div><div className="commands-board"><div className="board-top"><span>EXEMPLO / POWERSHELL</span><span className="board-leds"><i/><i/><i/><i/><i/></span></div><div className="command-title"><span>01</span><strong>LOCALIZAR NO CATÁLOGO</strong></div><div className="command-row"><code>Pesquise pelo nome, descrição, tecnologia ou objetivo.</code><span>Resultados de skills e repositórios são separados.</span></div><div className="command-title"><span>02</span><strong>ABRIR A FONTE</strong></div><div className="command-row"><code>Confira o arquivo SKILL.md e os pré-requisitos no GitHub.</code><span>A biblioteca não presume instalação nem compatibilidade.</span></div><div className="command-title"><span>03</span><strong>ADAPTAR O PEDIDO</strong></div><div className="prompt-line"><p>“Use as instruções de <b>[skill]</b> para <b>[objetivo]</b>. Contexto: <b>[contexto]</b>. Entregue: <b>[formato]</b>.”</p><CopyButton value="Use as instruções de [skill] para [objetivo]. Contexto: [contexto]. Entregue: [formato]."/></div><div className="board-footer"><span>FONTE: SKILL.MD</span><span>GUIA 01 / 04</span></div></div></div></section>
      <section className="how-section wrap" id="como-usar"><div className="how-copy"><p className="eyebrow">DO CATÁLOGO AO RESULTADO</p><h2>Um guia para<br/>cada skill.</h2><p className="muted">Confira descrição, origem e caminho. Abra o conteúdo original para confirmar instruções completas e requisitos.</p><div className="steps"><article><span>01</span><div><b>Encontre</b><p>Pesquise pelo objetivo ou escolha uma área.</p></div></article><article><span>02</span><div><b>Entenda</b><p>Confira a correspondência e a origem da skill.</p></div></article><article><span>03</span><div><b>Adapte</b><p>Abra o arquivo original e personalize um prompt de exemplo.</p></div></article></div></div><AnatomyFigure area={{label: areas.find((item) => item.id === controls.category)?.label || "Todas"}} areaIndex={Math.max(0, areas.slice(1).findIndex((item) => item.id === controls.category))} skillCount={controls.category === "todas" ? totalSkills : countByArea[controls.category] || 0}/></section>
      <section className="mobile-cloud"><div className="wrap cloud-inner"><div><p className="eyebrow">EDITÁVEL DE QUALQUER LUGAR</p><h2>A biblioteca no seu bolso.</h2><p>O catálogo é estático; favoritos e histórico ficam apenas neste navegador e não são enviados a serviços externos.</p></div><div className="cloud-steps"><div><span>01</span><p><b>Abra a fonte</b><small>Confira a documentação original no GitHub.</small></p></div><div><span>02</span><p><b>Salve preferências</b><small>Favoritos e histórico permanecem no dispositivo.</small></p></div><div><span>03</span><p><b>Compartilhe uma ficha</b><small>Copie a URL da skill e abra-a em outra sessão.</small></p></div></div></div></section>
      <footer className="footer wrap"><a className="brand" href="#topo"><span className="brand-mark">BT</span><span>Biblioteca <b>Total</b></span></a><span>Índice de Agent Skills · 2026</span><a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noreferrer">Código aberto ↗</a></footer>
      <AnimatePresence>{selectedSkill && <motion.div key={selectedSkill.id} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: reduced ? 0 : motionTokens.duration.fast }}><SkillDetail skill={selectedSkill} onClose={closeDetail}/></motion.div>}</AnimatePresence>
      <AnimatePresence>{selectedRepo && <motion.div key={selectedRepo.name} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: reduced ? 0 : motionTokens.duration.fast }}><RepoDetail repo={selectedRepo} onClose={closeDetail}/></motion.div>}</AnimatePresence>
    </main>
  </div>;
}
