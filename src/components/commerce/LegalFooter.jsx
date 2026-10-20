import { motion, useReducedMotion } from "motion/react";
import { Link } from "../../lib/router.jsx";

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

export default function LegalFooter({ stats, onEnter }) {
  const reduced = useReducedMotion();
  return <motion.footer className="site-footer" initial={reduced ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
    <div className="wrap footer-grid">
      <div>
        <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></Link>
        <p>Plataforma de descoberta, busca e comparação de Agent Skills publicadas em repositórios públicos.{stats ? ` ${stats.repos} repositórios e ${stats.skills.toLocaleString("pt-BR")} skills indexadas.` : ""}</p>
        <p>Suporte: {supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : <span className="pending-inline">contato a definir</span>}</p>
      </div>
      <nav className="footer-links" aria-label="Documentos">
        <Link to="/termos">Termos de uso</Link>
        <Link to="/privacidade">Política de privacidade</Link>
        <Link to="/assinatura-e-cancelamento">Assinatura e cancelamento</Link>
      </nav>
      <div className="footer-links">
        <button type="button" className="text-link" onClick={() => onEnter?.()}>Entrar</button>
        <a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noopener noreferrer">Código no GitHub ↗</a>
        <span className="footer-sys">Dados legais do fornecedor: pendentes</span>
      </div>
    </div>
  </motion.footer>;
}
