import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";
import { useT } from "../i18n/index.js";

// Página de venda do Voxelia Pro (/conecta), destino dos anúncios: dor → antes/depois → como funciona →
// comparação com o vitalício (âncora) → garantia. Celular primeiro, CTA fixo no rodapé. Textos em src/i18n (connect).

export default function ConnectPage({ onEnter }) {
  const { t } = useT();
  const [editions, setEditions] = useState([]);
  useEffect(() => { document.title = t("connect.docTitle"); }, [t]);
  useEffect(() => {
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions || [])).catch(() => setEditions([]));
    track("ViewContent", { content_ids: ["pro-anual"], content_type: "product" });
  }, []);
  const pro = editions.find((e) => e.mcp);
  const lifetime = editions.find((e) => !e.mcp);
  const monthly = pro ? formatPrice(Math.round(pro.priceCents / (pro.installments || 1))) : "";
  const buyPro = () => { funnel("buy_click"); navigate(`/comprar?edicao=${pro?.code || "pro-anual"}`); };
  const buyLifetime = () => { funnel("buy_click"); navigate(`/comprar?edicao=${lifetime?.code || "edicao-1"}`); };

  return <div className="repo-page kit-page connect-page">
    <header className="repo-top"><Brand/><button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter()}>{t("common.enter")}</button></header>
    <main id="conteudo" className="repo-main">
      <section className="repo-hero area-software">
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category="software"/></span>
        <p className="eyebrow">Voxelia Pro</p>
        <h1>{t("connect.title")}</h1>
        <p>{t("connect.lead")}</p>
        <button type="button" className="btn btn-primary kit-cta" onClick={buyPro}>{pro ? t("connect.ctaFor", { n: pro.installments, price: monthly }) : t("connect.cta")}</button>
        <p className="small kit-terms">{t("connect.terms")}</p>
      </section>

      <section className="repo-block">
        <h2>{t("connect.painsTitle")}</h2>
        <ul className="connect-pains">{t("connect.pains").map(([title, text]) => <li key={title}><b>{title}</b><span>{text}</span></li>)}</ul>
      </section>

      <section className="repo-block kit-ba">
        <div><b>{t("kit.before")}</b><p>{t("connect.before")}</p></div>
        <div><b>{t("connect.afterLabel")}</b><p>{t("connect.after")}</p></div>
      </section>

      <section className="repo-block">
        <h2>{t("kit.how")}</h2>
        <ol className="kit-steps">{t("connect.steps").map(([title, text]) => <li key={title}><b>{title}.</b> {text}</li>)}</ol>
      </section>

      <section className="repo-block">
        <h2>{t("connect.plansTitle")}</h2>
        <div className="connect-plans">
          <article className="connect-plan featured">
            <p className="eyebrow">{t("connect.featured")}</p>
            <h3>Voxelia Pro</h3>
            <p className="connect-price">{pro ? <><b>{t("connect.perMonth", { n: pro.installments, price: monthly })}</b><small>{t("connect.orPix", { price: formatPrice(pro.priceCents) })}</small></> : "…"}</p>
            <ul>{(pro?.features?.length ? pro.features : t("connect.proFallback")).map((f) => <li key={f}>{f}</li>)}</ul>
            <button type="button" className="btn btn-primary" onClick={buyPro}>{t("connect.cta")}</button>
          </article>
          <article className="connect-plan">
            <h3>{t("connect.lifetimeTitle")}</h3>
            <p className="connect-price">{lifetime ? <b>{formatPrice(lifetime.priceCents)}</b> : "…"}<small>{t("common.oneTime")}</small></p>
            <ul>{t("connect.lifetimeList").map((item) => <li key={item}>{item}</li>)}</ul>
            <button type="button" className="btn btn-ghost" onClick={buyLifetime}>{t("connect.onlyLibrary")}</button>
          </article>
        </div>
      </section>

      <section className="repo-block">
        <h2>{t("connect.guaranteeTitle")}</h2>
        <p>{t("connect.guarantee")}</p>
        {t("landing.offer.currency") && <p className="small muted">{t("landing.offer.currency")}</p>}
      </section>
    </main>
    <div className="repo-cta" role="region" aria-label={t("kit.ctaRegion")}>
      <button type="button" className="btn btn-primary" onClick={buyPro}>{pro ? t("connect.ctaBar", { n: pro.installments, price: monthly }) : t("connect.cta")}</button>
      <span className="small muted">{t("connect.ctaNote")}</span>
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}
