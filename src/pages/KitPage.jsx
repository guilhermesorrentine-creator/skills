import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { KITS, localizeKit } from "../lib/kits.js";
import { useT } from "../i18n/index.js";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { NotFound } from "./AccountPages.jsx";

const buy = () => navigate("/comprar?edicao=edicao-1");

// Página de venda por profissão (/kit/<slug>), destino de anúncios. Celular primeiro, CTA fixo.
export default function KitPage({ slug, onEnter }) {
  const { t, n, lang } = useT();
  const base = KITS.find((k) => k.slug === slug);
  const kit = base && localizeKit(base, lang);
  const [repos, setRepos] = useState([]);
  const [stats, setStats] = useState(null);
  const [edition, setEdition] = useState(null);
  useEffect(() => {
    if (!base) return;
    fetch("/data/repos.json").then((r) => (r.ok ? r.json() : [])).then((list) => setRepos(base.repos.map((n) => list.find((r) => r.name === n)).filter(Boolean))).catch(() => setRepos([]));
    fetch("/data/demo.json").then((r) => (r.ok ? r.json() : null)).then((d) => setStats(d?.stats || null)).catch(() => setStats(null));
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEdition(d.editions?.[0] || null)).catch(() => setEdition(null));
    track("ViewContent", { content_ids: [`kit-${base.slug}`], content_type: "product" });
  }, [base]);
  useEffect(() => { if (kit) document.title = t("kit.title", { name: kit.name }); }, [kit?.name, t]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!kit) return <NotFound/>;

  const kitSkills = repos.reduce((sum, r) => sum + (r.skills || 0), 0);
  const price = edition ? formatPrice(edition.priceCents) : "";
  const buyLabel = price ? t("kit.buyFor", { price }) : t("kit.buy");
  return <div className="repo-page kit-page">
    <header className="repo-top"><Brand/><button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter()}>{t("common.enter")}</button></header>
    <main id="conteudo" className="repo-main">
      <section className={`repo-hero area-${kit.category}`}>
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category={kit.category}/></span>
        <p className="eyebrow">{t("kit.eyebrow", { name: kit.name })}</p>
        <h1>{kit.promise}</h1>
        <ul className="repo-chips">
          {kitSkills > 0 && <li>{t("kit.skills", { count: n(kitSkills) })}</li>}
          <li>{t("kit.tools", { count: repos.length })}</li>
          <li>{t("kit.guides")}</li>
        </ul>
        <button type="button" className="btn btn-primary kit-cta" onClick={buy}>{buyLabel}</button>
        <p className="small kit-terms">{t("kit.terms")}</p>
      </section>

      <section className="repo-block kit-ba">
        <div><b>{t("kit.before")}</b><p>{kit.before}</p></div>
        <div><b>{t("kit.after")}</b><p>{kit.after}</p></div>
      </section>

      <section className="repo-block">
        <h2>{t("kit.notPrompts")}</h2>
        <p>{t("kit.notPromptsText")}</p>
        <ol className="repo-locked">{kit.tasks.map((t) => <li key={t}><span aria-hidden="true">✓</span>{t}</li>)}</ol>
      </section>

      <section className="repo-block">
        <h2>{t("kit.inKit")}</h2>
        <ul className="kit-repos">{repos.map((r) => <li key={r.name}><Link to={`/r/${encodeURIComponent(r.name)}`}><b>{r.title.split(":")[0]}</b><span>{r.title.split(":").slice(1).join(":").trim() || r.summary}</span></Link></li>)}</ul>
        <p className="repo-note">{t("kit.more", { count: stats ? n(stats.skills) : t("kit.moreFallback") })}</p>
      </section>

      <section className="repo-block">
        <h2>{t("kit.how")}</h2>
        <ol className="kit-steps">{t("kit.howSteps").map(([lead, rest]) => <li key={lead}><b>{lead}</b>{rest}</li>)}</ol>
      </section>
    </main>
    <div className="repo-cta" role="region" aria-label={t("kit.ctaRegion")}>
      <button type="button" className="btn btn-primary" onClick={buy}>{buyLabel}</button>
      <span className="small muted">{t("kit.ctaNote")}</span>
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}

// Página do link da bio (/links): compra em um toque e os repositórios dos Reels recentes.
export function LinksPage() {
  const { t, lang } = useT();
  const [repos, setRepos] = useState([]);
  useEffect(() => { document.title = t("links.title"); }, [t]);
  useEffect(() => {
    fetch("/data/reels.json").then((r) => (r.ok ? r.json() : [])).then(async (names) => {
      const list = await fetch("/data/repos.json").then((r) => (r.ok ? r.json() : []));
      setRepos(names.map((n) => list.find((r) => r.name === n)).filter(Boolean));
    }).catch(() => setRepos([]));
  }, []);
  return <main id="conteudo" className="links-page">
    <Brand/>
    <p className="links-lead">{t("links.lead")}</p>
    <button type="button" className="btn btn-primary links-buy" onClick={buy}>{t("links.buy")}</button>
    <h2>{t("links.kits")}</h2>
    <div className="links-grid">{KITS.map((k) => <Link key={k.slug} className={`links-kit area-${k.category}`} to={`/kit/${k.slug}`}>{localizeKit(k, lang).name}</Link>)}</div>
    {repos.length > 0 && <><h2>{t("links.reels")}</h2>
      <ul className="links-list">{repos.map((r) => <li key={r.name}><Link to={`/r/${encodeURIComponent(r.name)}`}>{r.title.split(":")[0]} →</Link></li>)}</ul></>}
    <Link className="link small" to="/">{t("links.about")}</Link>
  </main>;
}
