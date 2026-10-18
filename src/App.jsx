import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AnatomyFigure from "./components/AnatomyFigure.jsx";
import { motionTokens, springs } from "./lib/motion-tokens.js";

const areas = [
  { id: "todas", label: "Todas", title: "Biblioteca total" },
  { id: "software", label: "Software", title: "Software" },
  { id: "empreendedorismo", label: "Empreendedorismo", title: "Empreendedorismo" },
  { id: "conteudo", label: "Conteúdo", title: "Conteúdo" },
  { id: "ciencia", label: "Ciência", title: "Ciência" },
];
const totalAreas = areas.slice(1);
const slug = (value) => encodeURIComponent(value);
const safeRepoUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : null;
  } catch {
    return null;
  }
};

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement("textarea");
    field.value = value;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

function CopyButton({ value, children = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await copyText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <button className="copy-button" onClick={onCopy}>{copied ? "Copiado ✓" : children}<span className="sr-only" role="status">{copied ? "Texto copiado para a área de transferência" : ""}</span></button>;
}

function RepoGuide({ repo, onBack }) {
  const [shown, setShown] = useState(36);
  const prompt = `Use a skill do repositório ${repo.name} para me ajudar com [objetivo].\nContexto: [contexto do projeto]\nRestrições: [limites, formato, tom]\nAntes de concluir, indique dúvidas e valide o resultado.`;
  useEffect(() => setShown(36), [repo.name]);
  return <section className="guide-panel" id="guia" aria-labelledby="guide-title">
    <button className="back-link" onClick={onBack}>← Voltar ao catálogo</button>
    <div className="guide-top"><div><p className="eyebrow">GUIA DE REPOSITÓRIO · {repo.category.toUpperCase()}</p><h2 id="guide-title">{repo.name}</h2><p className="lead">{repo.summary || "Repositório de recursos e ferramentas para agentes. Consulte a documentação de origem para conhecer o escopo completo."}</p></div>{safeRepoUrl(repo.url)&&<a className="button button-outline" href={safeRepoUrl(repo.url)} target="_blank" rel="noopener noreferrer">Abrir repositório ↗</a>}</div>
    <div className="guide-stats"><div><strong>{repo.skills.length}</strong><span>skills catalogadas</span></div><div><strong>{repo.skills.length ? "SKILL.md" : "—"}</strong><span>{repo.skills.length ? "formato encontrado" : "sem SKILL.md no inventário"}</span></div><div><strong>{repo.readme || "README não informado"}</strong><span>documentação inicial</span></div></div>
    <div className="prompt-box"><div><p className="eyebrow">PROMPT DE EXEMPLO</p><pre>{prompt}</pre></div><CopyButton value={prompt}/></div>
    <div className="section-heading"><div><p className="eyebrow">ÍNDICE DE SKILLS</p><h3>O que este repositório oferece</h3></div><span className="muted">{repo.skills.length} itens</span></div>
    {repo.skills.length ? <div className="skill-list">{repo.skills.slice(0,shown).map((skill,index)=><article className="skill-row" key={`${skill.name}-${skill.path}-${index}`}><div className="skill-name"><code>{skill.name}</code><p>{skill.description || "Descrição não informada na fonte."}</p>{skill.path && <small>{skill.path}</small>}</div><CopyButton value={`Leia ${skill.path || `a skill ${skill.name}`} e use as instruções relevantes para: [descreva sua tarefa].`}/></article>)}</div> : <div className="empty-note">Este repositório aparece no inventário, mas não tinha arquivos SKILL.md na data da coleta. O guia não inventa comandos.</div>}
    {shown < repo.skills.length && <button className="button button-outline show-more" onClick={()=>setShown((n)=>n+36)}>Mostrar mais skills</button>}
  </section>;
}

export default function App() {
  const reduced = useReducedMotion();
  const [area, setArea] = useState("todas");
  const [query, setQuery] = useState("");
  const [repoName, setRepoName] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState(false);
  const [visible, setVisible] = useState(42);
  const [copiedCommand, setCopiedCommand] = useState(false);
  useEffect(() => {
    fetch("/data/catalog.json").then((response) => {
      if (!response.ok) throw new Error("Não foi possível carregar o catálogo");
      return response.json();
    }).then(setCatalog).catch(() => setCatalogError(true));
  }, []);
  useEffect(() => {
    const readHash = () => {
      const match = location.hash.match(/^#repo\/(.+)$/);
      if (match) {
        try { setRepoName(decodeURIComponent(match[1])); } catch { setRepoName(""); }
      }
      else if (location.hash === "#catalogo" || location.hash === "#comandos" || !location.hash) setRepoName("");
    };
    readHash(); window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);
  useEffect(() => {
    if (!repoName) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setRepoName("");
        history.replaceState(null,"",location.pathname+location.search+"#catalogo");
      } else if (event.key === "Tab") {
        const dialog = document.querySelector(".guide-dialog");
        const items = dialog?.querySelectorAll("button,a,[tabindex]:not([tabindex='-1'])");
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => document.querySelector(".guide-dialog")?.focus());
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [repoName]);
  useEffect(()=>setVisible(42),[area,query]);
  const selectedRepo = catalog.find((repo)=>repo.name===repoName);
  const totalSkills = catalog.reduce((sum, repo) => sum + repo.skills.length, 0);
  const areaCounts = useMemo(()=>Object.fromEntries(totalAreas.map((item)=>[item.id,catalog.filter((r)=>r.category===item.id).reduce((n,r)=>n+r.skills.length,0)])),[catalog]);
  const filteredRepos = useMemo(()=>catalog.filter((repo)=>area==="todas"||repo.category===area).filter((repo)=>{
    if (!query.trim()) return true;
    const q=query.trim().toLocaleLowerCase("pt-BR");
    return repo.name.toLocaleLowerCase("pt-BR").includes(q)||repo.summary.toLocaleLowerCase("pt-BR").includes(q)||repo.skills.some((skill)=>`${skill.name} ${skill.description} ${skill.path}`.toLocaleLowerCase("pt-BR").includes(q));
  }),[area,query]);
  const visibleRepos=filteredRepos.slice(0,visible);
  const openRepo=(name)=>{setRepoName(name);location.hash=`repo/${slug(name)}`;window.scrollTo({top:0,behavior:reduced?"instant":"smooth"});};
  const closeRepo=()=>{setRepoName("");history.replaceState(null,"",location.pathname+location.search+"#catalogo");window.scrollTo({top:0,behavior:reduced?"instant":"smooth"});};
  const command=`& (Join-Path '[caminho-da-biblioteca]' 'ativar-skills.ps1') -Repositorio '[caminho-do-repositorio]' -Listar\n& (Join-Path '[caminho-da-biblioteca]' 'ativar-skills.ps1') -Repositorio '[caminho-do-repositorio]' -Skill '[nome-da-skill]'`;
  return <div className="site-shell">
    <header className="topbar"><a className="brand" href="#topo" aria-label="Biblioteca Total, início"><span className="brand-mark">BT</span><span>Biblioteca <b>Total</b></span></a><nav aria-label="Navegação principal"><a href="#catalogo">Biblioteca</a><a href="#comandos">Comandos</a><a href="#como-usar">Como usar</a></nav><a className="top-cta" href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noreferrer">Projeto aberto ↗</a></header>
    <main id="topo">
      <section className="hero wrap"><div className="hero-copy"><p className="eyebrow"><span className="status-dot"/> ÍNDICE DE AGENT SKILLS · EDIÇÃO 2026</p><h1>Uma biblioteca.<br/><em>Mil maneiras</em> de criar.</h1><p className="hero-lead">Encontre a instrução certa, entenda de onde ela vem e leve o próximo passo para o seu agente.</p><div className="hero-actions"><a className="button button-primary" href="#catalogo">Explorar biblioteca <span>↓</span></a><a className="text-link" href="#como-usar">Como funciona <span>↗</span></a></div><div className="hero-counts"><div><strong>{catalog.length.toString().padStart(2,"0")}</strong><span>repositórios</span></div><div><strong>{totalSkills.toLocaleString("pt-BR")}</strong><span>skills indexadas</span></div><div><strong>04</strong><span>áreas de conhecimento</span></div></div></div><div className="hero-art"><img src="/assets/personagens-pixel-art.png" alt="Quatro personagens originais em pixel art representando a equipe da biblioteca"/><div className="art-caption"><span className="status-dot"/> equipe pronta para ajudar <span className="caption-line"/></div><div className="art-sticker">SKILLS<br/><b>LOADED!</b></div></div></section>
      <section className="areas-strip" aria-label="Áreas da biblioteca"><div className="wrap area-grid">{totalAreas.map((item,index)=><button key={item.id} className={`area-tile area-${item.id} ${area===item.id?"is-active":""}`} onClick={()=>{setArea(area===item.id?"todas":item.id);location.hash="catalogo";}}><span className="area-index">0{index+1} / 04</span><strong>{item.label}</strong><span>{areaCounts[item.id].toLocaleString("pt-BR")} skills <b>↗</b></span></button>)}</div></section>
      <section className="catalog-section wrap" id="catalogo"><div className="section-heading catalog-heading"><div><p className="eyebrow">O ACERVO</p><h2>O que você está criando?</h2><p className="muted">Busque pelo nome de uma skill, repositório ou pelo que precisa fazer.</p></div><div className="collection-stamp"><span>37</span><small>REPOS<br/>MAPPED</small></div></div>
        <div className="search-row"><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Ex.: escrever testes, estratégia, revisão…" aria-label="Buscar skills e repositórios"/><kbd>BUSCAR</kbd></label></div>
        <div className="filter-row" role="tablist" aria-label="Filtrar por área">{areas.map((item)=><button role="tab" aria-selected={area===item.id} key={item.id} onClick={()=>setArea(item.id)} className={`filter-chip ${area===item.id?"selected":""}`}>{item.label}<span>{item.id==="todas"?catalog.length:catalog.filter((r)=>r.category===item.id).length}</span></button>)}<span className="results-count">{filteredRepos.length} repositórios · {filteredRepos.reduce((n,r)=>n+r.skills.length,0).toLocaleString("pt-BR")} skills</span></div>
        {catalogError&&<div className="empty-note" role="alert">Não foi possível carregar o catálogo agora. Atualize a página para tentar novamente.</div>}
        {!catalog.length&&!catalogError&&<div className="empty-note" role="status">Carregando os repositórios…</div>}
        <AnimatePresence mode="wait" initial={false}><motion.div key={`${area}-${query}`} className="repo-grid" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={reduced?undefined:{opacity:0,y:-5}} transition={reduced?{duration:0}:springs.gentle}>{visibleRepos.map((repo,index)=><motion.button key={repo.name} className="repo-card" onClick={()=>openRepo(repo.name)} whileHover={reduced?undefined:{y:-3}} whileTap={reduced?undefined:{scale:motionTokens.scale.press}} transition={springs.snappy}><span className="repo-card-top"><span className={`repo-glyph glyph-${repo.category}`}>{repo.name.slice(0,2).toUpperCase()}</span><span className="repo-category">{areas.find((x)=>x.id===repo.category)?.label||repo.category}</span></span><strong>{repo.name}</strong><p>{repo.summary||"Coleção de recursos e ferramentas para agentes."}</p><span className="repo-card-foot"><span>{repo.skills.length} {repo.skills.length===1?"skill":"skills"}</span><span>{repo.skills.length?"Abrir guia ↗":"Ver repositório ↗"}</span></span></motion.button>)}</motion.div></AnimatePresence>
        {!filteredRepos.length&&<div className="empty-note">Nenhum resultado. Tente outro termo ou área.</div>}{visible<filteredRepos.length&&<div className="load-more"><button className="button button-outline" onClick={()=>setVisible((n)=>n+42)}>Carregar mais repositórios</button></div>}
        {selectedRepo&&<div className="guide-overlay" role="dialog" aria-modal="true" aria-label={`Guia de ${selectedRepo.name}`}><div className="guide-dialog" tabIndex={-1}><button className="dialog-close" onClick={closeRepo} aria-label="Fechar guia">×</button><RepoGuide repo={selectedRepo} onBack={closeRepo}/></div></div>}
      </section>
      <section className="commands-section" id="comandos"><div className="wrap commands-layout"><div className="commands-intro"><p className="eyebrow">PAINEL DE COMANDOS · 01</p><h2>Comece pela<br/><em>instrução certa.</em></h2><p>Use a skill de forma explícita e dê contexto ao agente. Os caminhos são placeholders: preencha com os diretórios do seu computador.</p><a className="text-link" href="#como-usar">Ver guia de ativação ↗</a></div><div className="commands-board"><div className="board-top"><span>INVENTÁRIO / POWERSHELL</span><span className="board-leds"><i/><i/><i/><i/><i/></span></div><div className="command-title"><span>01</span><strong>LISTAR SKILLS</strong></div><div className="command-row"><code>&amp; (Join-Path '[caminho-da-biblioteca]' 'ativar-skills.ps1') -Repositorio '[caminho-do-repositorio]' -Listar</code><span>Mostra os repositórios e skills disponíveis</span><CopyButton value={command.split("\n")[0]}/></div><div className="command-title"><span>02</span><strong>ATIVAR UMA SKILL</strong></div><div className="command-row"><code>&amp; (Join-Path '[caminho-da-biblioteca]' 'ativar-skills.ps1') -Repositorio '[caminho-do-repositorio]' -Skill '[nome-da-skill]'</code><span>Carrega uma instrução específica no contexto</span><CopyButton value={command.split("\n")[1]}/></div><div className="command-title"><span>03</span><strong>FAÇA UM PEDIDO COM CONTEXTO</strong></div><div className="prompt-line"><p>“Use <b>[nome-da-skill]</b> para <b>[objetivo]</b>. Considere <b>[contexto]</b> e entregue em <b>[formato]</b>.”</p><CopyButton value="Use [nome-da-skill] para [objetivo]. Considere [contexto] e entregue em [formato]."/></div><div className="board-footer"><span>⏎ ENTER PARA CONTINUAR</span><span>GUIA 01 / 04</span></div></div></div></section>
      <section className="how-section wrap" id="como-usar"><div className="how-copy"><p className="eyebrow">DO CATÁLOGO AO RESULTADO</p><h2>Um guia para<br/>cada repositório.</h2><p className="muted">Abra uma ficha para consultar a proposta, o README e as skills disponíveis. Cada instrução leva um exemplo de uso que você pode copiar e adaptar.</p><div className="steps"><article><span>01</span><div><b>Encontre</b><p>Busque por uma tarefa ou escolha uma área.</p></div></article><article><span>02</span><div><b>Entenda</b><p>Abra o guia e confira a origem e o caminho da skill.</p></div></article><article><span>03</span><div><b>Adapte</b><p>Copie o prompt de exemplo e preencha os campos.</p></div></article></div></div><AnatomyFigure area={area} areaIndex={Math.max(0,totalAreas.findIndex((a)=>a.id===area))} skillCount={area==="todas"?totalSkills:areaCounts[area]}/></section>
      <section className="mobile-cloud"><div className="wrap cloud-inner"><div><p className="eyebrow">EDITÁVEL DE QUALQUER LUGAR</p><h2>A biblioteca no seu bolso.</h2><p>O projeto fica no GitHub com dados, personagens, estilos e código. No celular, edite arquivos pelo app ou navegador do GitHub; a Vercel publica a nova versão quando conectada ao repositório.</p></div><div className="cloud-steps"><div><span>01</span><p><b>Abra o repositório</b><small>github.com/guilhermesorrentine-creator/skills</small></p></div><div><span>02</span><p><b>Edite e salve</b><small>Altere dados, conteúdo ou interface no GitHub.</small></p></div><div><span>03</span><p><b>Veja no celular</b><small>Conecte o projeto à Vercel e receba a URL publicada.</small></p></div></div></div></section>
      <footer className="footer wrap"><a className="brand" href="#topo"><span className="brand-mark">BT</span><span>Biblioteca <b>Total</b></span></a><span>Índice de Agent Skills · 2026</span><a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noreferrer">Código aberto ↗</a></footer>
    </main>
  </div>;
}
