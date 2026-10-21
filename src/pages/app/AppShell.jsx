import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, navigate } from "../../lib/router.jsx";
import { Brand } from "../../components/site/SiteNav.jsx";
import { authActions } from "../../lib/auth.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { searchResources } from "../../lib/search.js";
import { categoryLabel, resourcePath, typeLabel } from "../../lib/resources.js";

const menu = [
  { to: "/app", label: "Início", icon: "M4 11l8-7 8 7v9h-5v-6H9v6H4z" },
  { to: "/app/skills", label: "Skills", icon: "M5 5h14v14H5zM9 9h6M9 13h6" },
  { to: "/app/subagentes", label: "Subagentes", icon: "M12 4a4 4 0 110 8 4 4 0 010-8zM5 20c1-4 4-6 7-6s6 2 7 6" },
  { to: "/app/workflows", label: "Workflows", icon: "M5 6h5v5H5zM14 13h5v5h-5zM10 8.5h4v7" },
  { to: "/app/ferramentas", label: "Ferramentas", icon: "M14 6l4 4-8 8H6v-4z" },
  { to: "/app/guias", label: "Guias", icon: "M5 4h10l4 4v12H5zM9 12h6M9 16h4" },
  { to: "/app/colecoes", label: "Minhas coleções", icon: "M6 4h12v16l-6-4-6 4z" },
  { to: "/app/favoritos", label: "Favoritos", icon: "M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8z" },
  { to: "/app/recentes", label: "Recentes", icon: "M12 5a7 7 0 107 7M12 8v4l3 2" },
];

// Layout autenticado: menu lateral compacto (recolhido no celular) e barra superior com busca global.
export default function AppShell({ path, account, children }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const { localPending, actions } = useLibrary();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPalette((v) => !v); }
      if (event.key === "Escape") { setOpen(false); setAccountMenu(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const active = (to) => (to === "/app" ? path === "/app" : path.startsWith(to));

  return <div className={`app ${open ? "nav-open" : ""}`}>
    <a className="skip-link" href="#app-main">Pular para o conteúdo</a>
    <aside className="app-side" aria-label="Menu do Arsenal">
      <div className="app-side-head"><Brand to="/app"/></div>
      <nav><ul>{menu.map((item) => <li key={item.to}><Link to={item.to} className="app-link" aria-current={active(item.to) ? "page" : undefined}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"/></svg>{item.label}
      </Link></li>)}</ul></nav>
      <div className="app-side-foot">
        <Link to="/app/minha-licenca" className="app-license" aria-current={active("/app/minha-licenca") ? "page" : undefined}>
          <span className="tag-mono">Licença</span><b>{account?.edition?.name || (account?.accessReason === "dev" ? "Modo desenvolvimento" : "Edição")}</b>
        </Link>
      </div>
    </aside>
    {open && <button type="button" className="app-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)}/>}
    <div className="app-main-col">
      <header className="app-top">
        <button type="button" className="icon-btn app-menu-btn" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button>
        <button type="button" className="app-search-trigger" onClick={() => setPalette(true)}><span aria-hidden="true">⌕</span><span>Buscar recursos, objetivos, ferramentas…</span><kbd aria-hidden="true">Ctrl K</kbd></button>
        <div className="app-account">
          <button type="button" className="app-avatar" aria-haspopup="true" aria-expanded={accountMenu} onClick={() => setAccountMenu((v) => !v)}><span aria-hidden="true">{(account?.email || "?").slice(0, 1).toUpperCase()}</span><span className="sr-only">Menu da conta</span></button>
          {accountMenu && <div className="app-account-pop" role="menu">
            <p className="muted small">{account?.email}</p>
            <Link role="menuitem" to="/app/minha-licenca">Minha licença</Link>
            {account?.isAdmin && <Link role="menuitem" to="/admin">Administração</Link>}
            <Link role="menuitem" to="/">Página inicial</Link>
            <button role="menuitem" type="button" onClick={async () => { await authActions.signOut(); navigate("/"); }}>Sair</button>
          </div>}
        </div>
      </header>
      {localPending && <div className="sync-banner" role="status">
        <span>Encontramos {localPending.favorites.length} favorito(s) e {localPending.recent.length} item(ns) de histórico salvos neste navegador.</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.importLocal().catch(() => {})}>Sincronizar com a conta</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={actions.dismissLocal}>Agora não</button>
      </div>}
      <main id="app-main" className="app-content">{children}</main>
    </div>
    <AnimatePresence>{palette && <SearchPalette onClose={() => setPalette(false)}/>}</AnimatePresence>
  </div>;
}

// Busca global (Ctrl/Cmd + K) sobre o índice autorizado.
function SearchPalette({ onClose }) {
  const reduced = useReducedMotion();
  const { index } = useLibrary();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const results = useMemo(() => (query.trim() ? searchResources(index, query).slice(0, 8) : []), [index, query]);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => setActive(0), [query]);
  const open = (item) => { onClose(); navigate(item ? resourcePath(item.id) : `/app/buscar?q=${encodeURIComponent(query)}`); };
  return <div className="palette-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Busca global" initial={reduced ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        else if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(results.length, i + 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
        else if (event.key === "Enter") { event.preventDefault(); open(active < results.length ? results[active] : null); }
        else if (event.key === "Tab") { event.preventDefault(); input.current?.focus(); }
      }}>
      <div className="palette-input"><span aria-hidden="true">⌕</span>
        <input ref={input} role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={`pal-${active}`} aria-label="Buscar" placeholder="Busque por nome, tecnologia ou objetivo" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"/>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Esc</button>
      </div>
      <ul id="palette-list" role="listbox" aria-label="Resultados" className="palette-list">
        {results.map((item, i) => <li key={item.id} id={`pal-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => open(item)}>
          <span className="palette-title">{item.title}</span><span className="palette-meta">{typeLabel[item.type]} · {categoryLabel[item.category]}</span>
        </li>)}
        {query.trim() && <li id={`pal-${results.length}`} role="option" aria-selected={active === results.length} onMouseEnter={() => setActive(results.length)} onMouseDown={(e) => e.preventDefault()} onClick={() => open(null)}>
          <span className="palette-title">Ver todos os resultados para “{query}”</span><span className="palette-meta">Enter</span>
        </li>}
        {!query.trim() && <li className="palette-hint" role="presentation">Dica: escreva um objetivo, como “criar um site”.</li>}
      </ul>
    </motion.div>
  </div>;
}
