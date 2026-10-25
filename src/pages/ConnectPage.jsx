import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";

// Página de venda do Voxelia Pro (/conecta): dor → antes/depois → como funciona →
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
    track("ViewContent", { content_ids: ["voxelia-mensal"], content_type: "product" });
  }, []);
  const lifetime = editions.find((e) => !e.mcp);
  const buyPro = () => { funnel("buy_click"); navigate("/oferta?plano=mensal"); };
  const buyLifetime = () => { funnel("buy_click"); navigate(`/comprar?edicao=${lifetime?.code || "edicao-1"}`); };

  return <div className="repo-page kit-page connect-page">
    <header className="repo-top"><Brand/><button type="button" className="btn btn-ghost btn-sm" onClick={() => onEnter()}>Entrar</button></header>
    <main id="conteudo" className="repo-main">
      <section className="repo-hero area-software">
        <span className="repo-art" aria-hidden="true"><CyberpunkCharacter category="software"/></span>
        <p className="eyebrow">Voxelia Pro</p>
        <h1>Conecte na sua IA. É como dar superpoderes a ela.</h1>
        <p>O Claude e o ChatGPT passam a usar 2 mil skills de especialistas, com o passo a passo certo para cada pedido.</p>
        <button type="button" className="btn btn-primary kit-cta" onClick={buyPro}>Quero o Pro por R$ 49,90/mês</button>
        <p className="small kit-terms">Cobrança mensal automática no cartão · cancele quando quiser</p>
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
            <p className="connect-price"><b>R$ 49,90/mês</b><small>cobrança automática no cartão</small></p>
            <ul><li>Acervo e conexão com sua IA enquanto a assinatura estiver paga</li><li>Cancele quando quiser</li></ul>
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
      <button type="button" className="btn btn-primary" onClick={buyPro}>Dar superpoderes à minha IA · R$ 49,90/mês</button>
      <span className="small muted">Cartão · cancele quando quiser</span>
    </div>
    <SiteFooter onEnter={() => onEnter()}/>
  </div>;
}
