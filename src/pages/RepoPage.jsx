import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { useT } from "../i18n/index.js";
import { Link, navigate } from "../lib/router.jsx";
import { track } from "../lib/meta-pixel.js";
import { NotFound } from "./AccountPages.jsx";
import { funnel } from "../lib/funnel.js";

// Vitrine pública de um repositório (/r/<nome>), destino dos links dos Reels. Mostra o começo do guia;
// o passo a passo completo fica no sistema. Pensada primeiro para celular: CTA fixo no rodapé.
export default function RepoPage({ name, account, onEnter }) {
  const { t } = useT();
  const [repo, setRepo] = useState(undefined);
  useEffect(() => {
    fetch("/data/repos.json").then((r) => (r.ok ? r.json() : [])).then((list) => setRepo(list.find((r) => r.name === name) || null)).catch(() => setRepo(null));
  }, [name]);
  useEffect(() => {
    if (!repo) return;
    const previous = document.title;
    document.title = `${repo.title} · Voxelia`;
    track("ViewContent", { content_ids: [repo.guideId], content_type: "product", content_name: repo.name });
    return () => { document.title = previous; };
  }, [repo]);

  if (repo === null) return <NotFound/>;
  if (!repo) return <main className="loading-line" role="status">{t("common.loading")}</main>;

  const guidePath = `/app/recursos/${encodeURIComponent(repo.guideId)}`;
  const owned = Boolean(account?.access);
  const primary = owned
    ? { label: t("repo.openGuide"), run: () => navigate(guidePath) }
    : { label: t("repo.buyGuide"), run: () => { funnel("buy_click"); navigate("/comprar?edicao=edicao-1"); } };

  return <div className="repo-page">
    <header className="repo-top"><Brand/>{!owned && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter(guidePath)}>{t("common.enter")}</button>}</header>
    <main id="conteudo" className="repo-main">
      <section className={`repo-hero area-${repo.category}`}>
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category={repo.category}/></span>
        <p className="eyebrow">{t("repo.eyebrow", { area: t(`cat.${repo.category}`) })}</p>
        <h1>{repo.title}</h1>
        <p className="repo-summary">{repo.summary}</p>
        <ul className="repo-chips">
          {repo.skills > 0 && <li>{t("repo.skills", { n: repo.skills })}</li>}
          {repo.license && <li>{t("repo.license", { license: repo.license })}</li>}
          <li>{t("repo.guide")}</li>
        </ul>
      </section>

      <section className="repo-block">
        <h2>{t("repo.what")}</h2>
        {repo.intro.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
      </section>

      <section className="repo-block">
        <h2>{t("repo.inGuide")}</h2>
        <ol className="repo-locked">{repo.sections.map((s) => <li key={s}><span aria-hidden="true">{owned ? "→" : "🔒"}</span>{s}</li>)}</ol>
        {!owned && <p className="repo-note">{t("repo.note")}</p>}
      </section>

      <section className="repo-block repo-credit">
        <h2>{t("repo.credits")}</h2>
        <p>{t("repo.createdBy")} <a className="link" href={repo.owner?.url} target="_blank" rel="noopener noreferrer">{repo.owner?.name}</a>. <a className="link" href={repo.url} target="_blank" rel="noopener noreferrer">{t("repo.github")}</a></p>
        <p className="small muted">{t("repo.belongs")}</p>
      </section>
      <p className="repo-more"><Link className="link" to="/">{t("repo.more")}</Link></p>
    </main>
    <div className="repo-cta" role="region" aria-label={t("repo.ctaRegion")}>
      <button type="button" className="btn btn-primary" onClick={primary.run}>{primary.label}</button>
      {!owned && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter(guidePath)}>{t("repo.haveAccess")}</button>}
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}
