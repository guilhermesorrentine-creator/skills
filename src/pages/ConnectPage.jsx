import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";

// Página de venda do Voxelia Pro (/conecta), destino dos anúncios: dor → antes/depois → como funciona →
// comparação com o vitalício (âncora) → garantia. Celular primeiro, CTA fixo no rodapé.
const PAINS = [
  ["Texto genérico", "Você pede e recebe a resposta \"de manual\", igual à de todo mundo."],
  ["Resposta incompleta", "Falta o passo que importa e você volta três vezes para completar."],
  ["Token desperdiçado", "Metade da conversa é você explicando para a IA como fazer o trabalho."],
];
const STEPS = [
  ["Conecte uma vez", "Cole o seu link pessoal no Claude, no ChatGPT ou no Claude Code. Leva um minuto."],
  ["Peça normalmente", "\"Quero criar uma landing page\", \"preciso prospectar clientes\", \"revise este artigo\"."],
  ["A IA usa a skill certa", "Ela consulta as 2 mil skills da Voxelia e traz o método, com fonte e autor."],
];

export default function ConnectPage({ onEnter }) {
  const [editions, setEditions] = useState([]);
  useEffect(() => {
    document.title = "Voxelia Pro: dê superpoderes à sua IA";
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions || [])).catch(() => setEditions([]));
    track("ViewContent", { content_ids: ["pro-anual"], content_type: "product" });
  }, []);
  const pro = editions.find((e) => e.mcp);
  const lifetime = editions.find((e) => !e.mcp);
  const monthly = pro ? formatPrice(Math.round(pro.priceCents / (pro.installments || 1))) : "";
  const buyPro = () => navigate(`/comprar?edicao=${pro?.code || "pro-anual"}`);
  const buyLifetime = () => navigate(`/comprar?edicao=${lifetime?.code || "edicao-1"}`);

  return <div className="repo-page kit-page connect-page">
    <header className="repo-top"><Brand/><button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter()}>Entrar</button></header>
    <main id="conteudo" className="repo-main">
      <section className="repo-hero area-software">
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category="software"/></span>
        <p className="eyebrow">Voxelia Pro</p>
        <h1>Conecte na sua IA. É como dar superpoderes a ela.</h1>
        <p>O Claude e o ChatGPT passam a usar 2 mil skills de especialistas, com o passo a passo certo para cada pedido.</p>
        <button type="button" className="btn btn-primary kit-cta" onClick={buyPro}>{pro ? `Quero o Pro por ${pro.installments}x de ${monthly}` : "Quero o Pro"}</button>
        <p className="small kit-terms">Cartão em 12x ou Pix à vista · 15 dias de garantia</p>
      </section>

      <section className="repo-block">
        <h2>Sua IA está no modo básico</h2>
        <ul className="connect-pains">{PAINS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
      </section>

      <section className="repo-block kit-ba">
        <div><b>Antes</b><p>"Faça uma landing page." Sai um layout genérico, sem método, e você gasta a tarde corrigindo.</p></div>
        <div><b>Com a Voxelia conectada</b><p>A IA encontra a skill de design, segue o sistema de design e entrega com estrutura, revisão e passo a passo.</p></div>
      </section>

      <section className="repo-block">
        <h2>Como funciona</h2>
        <ol className="kit-steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
      </section>

      <section className="repo-block">
        <h2>Escolha o seu plano</h2>
        <div className="connect-plans">
          <article className="connect-plan featured">
            <p className="eyebrow">Mais completo</p>
            <h3>Voxelia Pro</h3>
            <p className="connect-price">{pro ? <><b>{pro.installments}x {monthly}</b><small>ou {formatPrice(pro.priceCents)} no Pix</small></> : "…"}</p>
            <ul>{(pro?.features?.length ? pro.features : ["Conexão com a sua IA por 12 meses", "Acervo vitalício"]).map((f) => <li key={f}>{f}</li>)}</ul>
            <button type="button" className="btn btn-primary" onClick={buyPro}>Quero o Pro</button>
          </article>
          <article className="connect-plan">
            <h3>Acesso vitalício</h3>
            <p className="connect-price">{lifetime ? <b>{formatPrice(lifetime.priceCents)}</b> : "…"}<small>pagamento único</small></p>
            <ul><li>2 mil skills com guias em português</li><li>Você copia e cola o passo a passo</li><li>Sem conexão com a IA</li></ul>
            <button type="button" className="btn btn-ghost" onClick={buyLifetime}>Só o acervo</button>
          </article>
        </div>
      </section>

      <section className="repo-block">
        <h2>Garantia de 15 dias</h2>
        <p>Conectou e não viu diferença? Peça o reembolso dentro de Minha licença, em um clique, nos primeiros 15 dias.</p>
      </section>
    </main>
    <div className="repo-cta" role="region" aria-label="Comprar">
      <button type="button" className="btn btn-primary" onClick={buyPro}>{pro ? `Dar superpoderes à minha IA · ${pro.installments}x ${monthly}` : "Quero o Pro"}</button>
      <span className="small muted">12x no cartão ou Pix · 15 dias de garantia</span>
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}
