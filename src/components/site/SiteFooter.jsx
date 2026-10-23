import { Link } from "../../lib/router.jsx";
import { setConsent } from "../../lib/consent.js";
import { Brand } from "./SiteNav.jsx";

import { seller, sellerLine } from "../../lib/seller.js";

const supportEmail = seller.email;

export default function SiteFooter({ onEnter }) {
  return <footer className="site-footer">
    <div className="wrap site-footer-grid">
      <div className="site-footer-about">
        <Brand/>
        <p>Recursos organizados para criar com inteligência artificial: skills, ferramentas, guias e referências.</p>
        <p>Suporte: {supportEmail ? <a className="link" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <span className="muted">contato em definição</span>}</p>
      </div>
      <nav aria-label="Navegação do rodapé">
        <h3>Produto</h3>
        <ul><li><a href="/#recursos">Recursos</a></li><li><a href="/#acesso">Acesso vitalício</a></li><li><a href="/#faq">Perguntas</a></li><li><button type="button" className="link" onClick={onEnter}>Entrar</button></li></ul>
      </nav>
      <nav aria-label="Documentos">
        <h3>Documentos</h3>
        <ul><li><Link to="/termos">Termos de uso</Link></li><li><Link to="/privacidade">Privacidade</Link></li><li><Link to="/compra-e-reembolso">Compra e reembolso</Link></li><li><button type="button" className="link" onClick={() => setConsent(null)}>Preferências de cookies</button></li></ul>
      </nav>
    </div>
    <div className="wrap site-footer-base"><span>{sellerLine() || "Voxelia"}</span><a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noopener noreferrer">Código no GitHub ↗</a></div>
  </footer>;
}
