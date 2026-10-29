import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { KITS } from "../lib/kits.js";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice, OFFER_PRICE } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { NotFound } from "./AccountPages.jsx";

const buy = () => navigate("/oferta?comprar=1");

// Página de venda por profissão (/kit/<slug>), destino de anúncios. Celular primeiro, CTA fixo.
export default function KitPage({ slug, onEnter }) {
  const kit = KITS.find((k) => k.slug === slug);
  const [repos, setRepos] = useState([]);
  const [stats, setStats] = useState(null);
  const [edition, setEdition] = useState(null);
  useEffect(() => {
    if (!kit) return;
    fetch("/data/repos.json").then((r) => (r.ok ? r.json() : [])).then((list) => setRepos(kit.repos.map((n) => list.find((r) => r.name === n)).filter(Boolean))).catch(() => setRepos([]));
    fetch("/data/demo.json").then((r) => (r.ok ? r.json() : null)).then((d) => setStats(d?.stats || null)).catch(() => setStats(null));
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEdition(d.editions?.[0] || null)).catch(() => setEdition(null));
    document.title = `Voxelia para ${kit.name}`;
    track("ViewContent", { content_ids: [`kit-${kit.slug}`], content_type: "product" });
  }, [kit]);
  if (!kit) return <NotFound/>;

  const kitSkills = repos.reduce((sum, r) => sum + (r.skills || 0), 0);
  const price = edition ? formatPrice(edition.priceCents) : "";
  return <div className="repo-page kit-page">
    <header className="repo-top"><Brand/><button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter()}>Entrar</button></header>
    <main id="conteudo" className="repo-main">
      <section className={`repo-hero area-${kit.category}`}>
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category={kit.category}/></span>
        <p className="eyebrow">Voxelia para {kit.name}</p>
        <h1>{kit.promise}</h1>
        <ul className="repo-chips">
          {kitSkills > 0 && <li>{kitSkills.toLocaleString("pt-BR")} skills do kit</li>}
          <li>{repos.length} ferramentas abertas</li>
          <li>Guias em português</li>
        </ul>
        <button type="button" className="btn btn-primary kit-cta" onClick={buy}>Quero o kit{price ? ` por ${price}` : ""}</button>
        <p className="small kit-terms">Pagamento único · acesso imediato · 15 dias de garantia</p>
      </section>

      <section className="repo-block kit-ba">
        <div><b>Antes</b><p>{kit.before}</p></div>
        <div><b>Depois</b><p>{kit.after}</p></div>
      </section>

      <section className="repo-block">
        <h2>Isso não é pack de prompts</h2>
        <p>São ferramentas de código aberto, de criadores do mundo todo, que o Claude instala e usa. A Voxelia organiza, credita a fonte e explica cada passo em português, com o comando pronto para copiar.</p>
        <ol className="repo-locked">{kit.tasks.map((t) => <li key={t}><span aria-hidden="true">✓</span>{t}</li>)}</ol>
      </section>

      <section className="repo-block">
        <h2>O que vem no kit</h2>
        <ul className="kit-repos">{repos.map((r) => <li key={r.name}><Link to={`/r/${encodeURIComponent(r.name)}`}><b>{r.title.split(":")[0]}</b><span>{r.title.split(":").slice(1).join(":").trim() || r.summary}</span></Link></li>)}</ul>
        <p className="repo-note">E mais: acesso a todas as {stats ? stats.skills.toLocaleString("pt-BR") : "2 mil"} skills da Voxelia, de todas as áreas.</p>
      </section>

      <section className="repo-block">
        <h2>Como funciona</h2>
        <ol className="kit-steps"><li><b>Escolha o objetivo</b> na busca da Voxelia.</li><li><b>Copie o comando</b> do guia e cole no Claude.</li><li><b>Use a ferramenta</b> e revise o resultado.</li></ol>
      </section>
    </main>
    <div className="repo-cta" role="region" aria-label="Comprar">
      <button type="button" className="btn btn-primary" onClick={buy}>Quero o kit{price ? ` por ${price}` : ""}</button>
      <span className="small muted">Pix ou cartão · 15 dias de garantia</span>
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}

// Página do link da bio (/links): compra em um toque e os repositórios dos Reels recentes.
export function LinksPage() {
  const [repos, setRepos] = useState([]);
  useEffect(() => {
    document.title = "Voxelia · links";
    fetch("/data/reels.json").then((r) => (r.ok ? r.json() : [])).then(async (names) => {
      const list = await fetch("/data/repos.json").then((r) => (r.ok ? r.json() : []));
      setRepos(names.map((n) => list.find((r) => r.name === n)).filter(Boolean));
    }).catch(() => setRepos([]));
  }, []);
  return <main id="conteudo" className="links-page">
    <Brand/>
    <p className="links-lead">2 mil skills de IA organizadas, com passo a passo em português.</p>
    <button type="button" className="btn btn-primary links-buy" onClick={buy}>Acesso vitalício · {OFFER_PRICE}</button>
    <h2>Kits por profissão</h2>
    <div className="links-grid">{KITS.map((k) => <Link key={k.slug} className={`links-kit area-${k.category}`} to={`/kit/${k.slug}`}>{k.name}</Link>)}</div>
    {repos.length > 0 && <><h2>Dos nossos Reels</h2>
      <ul className="links-list">{repos.map((r) => <li key={r.name}><Link to={`/r/${encodeURIComponent(r.name)}`}>{r.title.split(":")[0]} →</Link></li>)}</ul></>}
    <Link className="link small" to="/">Conhecer a Voxelia</Link>
  </main>;
}
