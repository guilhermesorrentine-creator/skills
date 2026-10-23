import { useEffect, useState } from "react";
import { Link } from "../../lib/router.jsx";
import { useT } from "../../i18n/index.js";

export const landingLinks = ["inicio", "recursos", "demonstracao", "como-funciona", "acesso", "faq"];

export function Brand({ to = "/" }) {
  const { t } = useT();
  return <Link className="brand" to={to} aria-label={t("nav.brand")}><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span className="brand-name">Voxelia</span></Link>;
}

// Barra em cápsula da landing; vira menu compacto acessível no celular.
export default function SiteNav({ onSection, onEnter, onBuy, signedIn }) {
  const { t } = useT();
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
    <a className="skip-link" href="#conteudo">{t("common.skipToContent")}</a>
    <div className="site-nav-inner">
      <Brand/>
      <nav aria-label={t("nav.sections")} id="site-links">
        <ul>{landingLinks.map((id) => <li key={id}><a href={`#${id}`} onClick={(event) => go(event, id)}>{t(`nav.links.${id}`)}</a></li>)}</ul>
      </nav>
      <div className="site-nav-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); onEnter(); }}>{signedIn ? t("nav.enterSigned") : t("common.enter")}</button>
        <button type="button" className="btn btn-primary btn-sm nav-cta" onClick={() => { setOpen(false); onBuy(); }}>{t("nav.cta")}</button>
        <button type="button" className="nav-toggle" aria-expanded={open} aria-controls="site-links" onClick={() => setOpen((value) => !value)}><span className="sr-only">{open ? t("nav.closeMenu") : t("nav.openMenu")}</span><i aria-hidden="true"/><i aria-hidden="true"/></button>
      </div>
    </div>
  </header>;
}
