import { Link } from "../../lib/router.jsx";
import { setConsent } from "../../lib/consent.js";
import { useT } from "../../i18n/index.js";
import { Brand } from "./SiteNav.jsx";
import LanguageSelect from "./LanguageSelect.jsx";

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;

export default function SiteFooter({ onEnter }) {
  const { t } = useT();
  return <footer className="site-footer">
    <div className="wrap site-footer-grid">
      <div className="site-footer-about">
        <Brand/>
        <p>{t("footer.about")}</p>
        <p>{t("footer.support")} {supportEmail ? <a className="link" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <span className="muted">{t("footer.supportPending")}</span>}</p>
      </div>
      <nav aria-label={t("footer.navLabel")}>
        <h3>{t("footer.product")}</h3>
        <ul><li><a href="/#recursos">{t("footer.resources")}</a></li><li><a href="/#acesso">{t("footer.lifetime")}</a></li><li><a href="/#faq">{t("footer.faq")}</a></li><li><button type="button" className="link" onClick={onEnter}>{t("common.enter")}</button></li></ul>
      </nav>
      <nav aria-label={t("footer.docs")}>
        <h3>{t("footer.docs")}</h3>
        <ul><li><Link to="/termos">{t("footer.terms")}</Link></li><li><Link to="/privacidade">{t("footer.privacy")}</Link></li><li><Link to="/compra-e-reembolso">{t("footer.refund")}</Link></li><li><button type="button" className="link" onClick={() => setConsent(null)}>{t("footer.cookies")}</button></li></ul>
      </nav>
    </div>
    <div className="wrap site-footer-base"><span>{t("footer.legal")}</span><LanguageSelect/><a href="https://github.com/guilhermesorrentine-creator/skills" target="_blank" rel="noopener noreferrer">{t("footer.github")}</a></div>
  </footer>;
}
