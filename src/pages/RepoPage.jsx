import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { categoryLabel } from "../lib/resources.js";
import { Link, navigate } from "../lib/router.jsx";
import { track } from "../lib/meta-pixel.js";
import { NotFound } from "./AccountPages.jsx";

// Vitrine pública de um repositório (/r/<nome>), destino dos links dos Reels. Mostra o começo do guia;
// o passo a passo completo fica no sistema. Pensada primeiro para celular: CTA fixo no rodapé.
export default function RepoPage({ name, account, onEnter }) {
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
  if (!repo) return <main className="loading-line" role="status">Carregando…</main>;

  const guidePath = `/app/recursos/${encodeURIComponent(repo.guideId)}`;
  const owned = Boolean(account?.access);
  const primary = owned
    ? { label: "Abrir o guia completo", run: () => navigate(guidePath) }
    : { label: "Quero o passo a passo completo", run: () => navigate("/#acesso") };

  return <div className="repo-page">
    <header className="repo-top"><Brand/>{!owned && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter(guidePath)}>Entrar</button>}</header>
    <main id="conteudo" className="repo-main">
      <section className={`repo-hero area-${repo.category}`}>
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category={repo.category}/></span>
        <p className="eyebrow">{categoryLabel[repo.category]} · repositório do Reel</p>
        <h1>{repo.title}</h1>
        <p className="repo-summary">{repo.summary}</p>
        <ul className="repo-chips">
          {repo.skills > 0 && <li>{repo.skills} {repo.skills === 1 ? "skill" : "skills"}</li>}
          {repo.license && <li>Licença {repo.license}</li>}
          <li>Guia em português</li>
        </ul>
      </section>

      <section className="repo-block">
        <h2>O que é</h2>
        {repo.intro.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}
      </section>

      <section className="repo-block">
        <h2>No guia completo da Voxelia</h2>
        <ol className="repo-locked">{repo.sections.map((s) => <li key={s}><span aria-hidden="true">{owned ? "→" : "🔒"}</span>{s}</li>)}</ol>
        {!owned && <p className="repo-note">Comandos prontos para copiar, na ordem certa, explicados em português. Pagamento único, acesso vitalício e 15 dias de garantia.</p>}
      </section>

      <section className="repo-block repo-credit">
        <h2>Créditos</h2>
        <p>Projeto de código aberto criado por <a className="link" href={repo.owner?.url} target="_blank" rel="noopener noreferrer">{repo.owner?.name}</a>. <a className="link" href={repo.url} target="_blank" rel="noopener noreferrer">Ver no GitHub</a></p>
        <p className="small muted">A Voxelia organiza e explica; o projeto pertence ao autor.</p>
      </section>
      <p className="repo-more"><Link className="link" to="/">Conheça a Voxelia: 2 mil skills organizadas por objetivo →</Link></p>
    </main>
    <div className="repo-cta" role="region" aria-label="Acesso ao guia">
      <button type="button" className="btn btn-primary" onClick={primary.run}>{primary.label}</button>
      {!owned && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter(guidePath)}>Já tenho acesso</button>}
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}
