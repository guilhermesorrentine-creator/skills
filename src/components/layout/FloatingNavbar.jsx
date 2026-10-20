import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { springs } from "../../lib/motion-tokens.js";

export const navLinks = [
  { id: "topo", label: "Início" },
  { id: "catalogo", label: "Explorar" },
  { id: "categorias", label: "Categorias" },
  { id: "repositorios", label: "Repositórios" },
  { id: "como-usar", label: "Como usar" },
];

// Barra holográfica flutuante; no celular vira menu compacto com painel expansível.
export default function FloatingNavbar({ active, onNavigate, onOpenPalette, links = navLinks, actions, brandHref = "#topo", skipTarget = "catalogo" }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const go = (event, id, href) => { setOpen(false); onNavigate(event, id, href); };

  return <header className={`holo-nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
    <a className="skip-link" href={`#${skipTarget}`} onClick={(event) => go(event, skipTarget)}>Pular para o conteúdo</a>
    <div className="holo-nav-inner">
      <a className="brand" href={brandHref} onClick={(event) => go(event, "topo")} aria-label="Biblioteca Total, início"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></a>
      <nav aria-label="Navegação principal" id="nav-links">
        <ul>{links.map((link) => <li key={link.id}>
          <a href={link.href || `#${link.id}`} aria-current={active === link.id ? "location" : undefined} onClick={(event) => go(event, link.id, link.href)}>
            {active === link.id && <motion.span layoutId="nav-active" className="nav-active" transition={reduced ? { duration: 0 } : springs.snappy} aria-hidden="true"/>}
            <span>{link.label}</span>
          </a>
        </li>)}</ul>
      </nav>
      <div className="nav-tools">
        {onOpenPalette && <button type="button" className="nav-search" onClick={onOpenPalette} aria-label="Abrir busca rápida (Ctrl K)"><span aria-hidden="true">⌕</span><span className="nav-search-label">Buscar</span><kbd aria-hidden="true">Ctrl K</kbd></button>}
        {actions}
        <button type="button" className="nav-menu" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen((value) => !value)}><span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span><i aria-hidden="true"/><i aria-hidden="true"/></button>
      </div>
    </div>
  </header>;
}
