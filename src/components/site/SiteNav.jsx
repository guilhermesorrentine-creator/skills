import { useEffect, useState } from "react";
import { Link } from "../../lib/router.jsx";

export const landingLinks = [
  { id: "inicio", label: "Início" },
  { id: "recursos", label: "Recursos" },
  { id: "demonstracao", label: "Demonstração" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "acesso", label: "Acesso vitalício" },
  { id: "faq", label: "Perguntas" },
];

export function Brand({ to = "/" }) {
  return <Link className="brand" to={to} aria-label="Voxelia, início"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span className="brand-name">Voxelia</span></Link>;
}

// Barra em cápsula da landing; vira menu compacto acessível no celular.
export default function SiteNav({ onSection, onEnter, onBuy, signedIn }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const go = (event, id) => { setOpen(false); onSection(event, id); };

  return <header className={`site-nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="site-nav-inner">
      <Brand/>
      <nav aria-label="Seções" id="site-links">
        <ul>{landingLinks.map((link) => <li key={link.id}><a href={`#${link.id}`} onClick={(event) => go(event, link.id)}>{link.label}</a></li>)}</ul>
      </nav>
      <div className="site-nav-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); onEnter(); }}>{signedIn ? "Entrar na Voxelia" : "Entrar"}</button>
        <button type="button" className="btn btn-primary btn-sm nav-cta" onClick={() => { setOpen(false); onBuy(); }}>Quero meu acesso</button>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="site-links" onClick={() => setOpen((value) => !value)}><span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span><i aria-hidden="true"/><i aria-hidden="true"/></button>
      </div>
    </div>
  </header>;
}
