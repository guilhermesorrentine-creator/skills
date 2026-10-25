import { useEffect, useRef, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import Checkout from "../components/checkout/Checkout.jsx";
import SubscriptionCheckout from "../components/checkout/SubscriptionCheckout.jsx";
import { Link } from "../lib/router.jsx";
import { track } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";
import { seller, sellerLine } from "../lib/seller.js";

// Página do tráfego pago (/oferta): D destaca o vitalício anunciado; os demais destacam a mensalidade.
const HOOKS = {
  A: { eyebrow: "Para quem usa IA todo dia", title: "Pare de pagar a sua IA para adivinhar.", lead: "Toda conversa você explica de novo o que quer, e ela gasta tokens tentando. Com a Voxelia conectada, a IA segue o método certo desde a primeira resposta." },
  B: { eyebrow: "Chega de texto com cara de IA", title: "Sua IA escreve igual a todo mundo?", lead: "O problema não é a IA. É que ela não tem o método. Com a Voxelia conectada, ela usa skills de especialistas em cada pedido." },
  C: { eyebrow: "Claude · ChatGPT · Claude Code", title: "Sua IA com um método para cada tarefa.", lead: "Conecte a Voxelia e deixe sua IA consultar mais de 2 mil skills com guias em português, em vez de começar cada pedido do zero." },
  // D é o vídeo do dono ("eu organizei..."), que vende o vitalício: pagamento único, acervo para sempre.
  D: { eyebrow: "Mais de 2 mil skills · acesso vitalício", title: "Encontre a skill certa para o que você quer criar.", lead: "Busque pelo seu objetivo, abra um guia em português e copie o comando pronto para usar na sua IA. O acervo fica seu com um pagamento único." },
};
const CASES = [
  ["\"Faça uma landing page.\"", "Layout genérico, sem método. Você gasta a tarde corrigindo.", "A IA encontra a skill de design, segue um sistema de design e entrega com estrutura e revisão."],
  ["\"Escreva a legenda do meu post.\"", "\"Descubra o poder transformador da IA e eleve seu negócio a outro nível.\"", "Gancho, lista e chamada para ação, com as fórmulas de gancho da skill de Instagram."],
  ["\"Encontre clientes para mim.\"", "Uma lista inventada, que você não pode usar.", "O Google Maps Scraper monta a lista real de empresas, com telefone e site, numa planilha."],
];
const LIFETIME_RESULTS = [
  "Você encontra a skill de design, copia o comando e usa o método para estruturar e revisar a página.",
  "Você copia as fórmulas de gancho da skill de Instagram para escrever uma legenda mais específica.",
  "Você segue o guia do Google Maps Scraper para montar uma lista real de empresas, com telefone e site.",
];
const STEPS = [
  ["Conecte uma vez", "Cole o seu link pessoal no Claude, no ChatGPT ou no Claude Code. O guia mostra cada clique."],
  ["Peça normalmente", "\"Quero criar uma landing page\", \"preciso prospectar clientes\", \"revise este artigo\"."],
  ["A IA usa a skill certa", "Ela consulta o acervo da Voxelia e traz o método, com fonte e autor."],
];
const LIFETIME_STEPS = [
  ["Encontre a skill", "Busque pelo que você quer criar e escolha um guia do acervo."],
  ["Copie o comando", "Use o passo a passo em português e copie o comando pronto."],
  ["Use na sua IA", "Cole o comando no seu app de IA. O plano vitalício não inclui conexão automática."],
];
const FAQ = [
  ["Preciso saber programar?", "Não. Você conversa com a IA como sempre. Para conectar, copia um link e cola no app; o guia mostra o passo a passo."],
  ["Em quais IAs funciona?", "No Claude (conector personalizado), no ChatGPT (conector no modo desenvolvedor) e no Claude Code. Os apps de IA são de terceiros e podem exigir um plano próprio para usar conectores."],
  ["Quando recebo o acesso?", "Na hora. No Pix, assim que o banco confirma; no cartão, em instantes. Você cria a sua senha na mesma página."],
  ["A mensalidade é automática?", "Sim. R$ 49,90 são cobrados a cada mês no cartão pelo Asaas. Você pode cancelar em Minha licença; o acesso continua até o fim do período pago."],
  ["Qual a diferença entre as opções?", "A mensalidade inclui acervo e conexão com IA enquanto estiver paga. O vitalício custa R$ 97,90 uma vez e inclui o acervo, sem conexão com IA."],
  ["E se eu não gostar?", "A primeira mensalidade e a compra vitalícia têm 15 dias de garantia. Peça o reembolso em Minha licença."],
];
const LABELS = {
  "edicao-1": { name: "Só o acervo", note: "Você copia e cola os guias. Sem conexão com a IA." },
};

export default function OfferPage({ signedIn }) {
  const params = new URLSearchParams(location.search);
  const variant = String(params.get("utm_content") || "").toUpperCase();
  const lifetimeFirst = params.get("plano") === "vitalicio" || variant === "D";
  const [choice, setChoice] = useState(lifetimeFirst ? "lifetime" : "monthly");
  const hook = choice === "lifetime" ? HOOKS.D : variant !== "D" ? HOOKS[variant] || HOOKS.C : HOOKS.C;
  const flow = choice === "lifetime" ? ["Diga o que quer fazer", "Encontre a skill", "Copie o comando"] : ["Diga o que quer fazer", "A IA consulta a skill", "Receba um resultado com método"];
  const heroRef = useRef(null);
  const checkoutRef = useRef(null);
  const [atCheckout, setAtCheckout] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    document.title = "Voxelia: dê superpoderes para a sua IA";
    track("ViewContent", { content_ids: [lifetimeFirst ? "edicao-1" : "voxelia-mensal"], content_type: "product" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chegar ao checkout conta como "página de compra" no funil; o botão fixo some enquanto ele está na tela.
  useEffect(() => {
    const node = checkoutRef.current;
    if (!node || !("IntersectionObserver" in window)) return undefined;
    let counted = false;
    const observer = new IntersectionObserver(([entry]) => {
      setAtCheckout(entry.isIntersecting);
      if (entry.isIntersecting && !counted) { counted = true; funnel("buy_page"); }
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = heroRef.current;
    if (!node || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const goCheckout = () => {
    funnel("buy_click");
    checkoutRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return <div className="offer-page">
    <header className="offer-top"><Brand/></header>
    <main id="conteudo" className="offer-main">
      <section ref={heroRef} className="offer-hero">
        <p className="eyebrow">{hook.eyebrow}</p>
        <h1>{hook.title}</h1>
        <p className="offer-lead">{hook.lead}</p>
        <ol className="offer-flow" aria-label="Como a Voxelia ajuda">{flow.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
        <p className="offer-hero-price"><b>{choice === "lifetime" ? "R$ 97,90" : "R$ 49,90/mês"}</b><span>{choice === "lifetime" ? "pagamento único · acervo vitalício" : "cartão · acervo e conexão enquanto pagar"}</span></p>
        <button type="button" className="btn btn-primary offer-cta" onClick={goCheckout}>{choice === "lifetime" ? "Quero o acesso vitalício" : "Quero começar por R$ 49,90/mês"}</button>
        <p className="small offer-assure">Acesso na hora · 15 dias de garantia</p>
      </section>

      {videoOk && <section className="offer-video" aria-label="Vídeo: como a Voxelia funciona">
        <div className="offer-video-head"><h2>Veja a Voxelia em ação</h2><p>Assista antes de escolher seu plano.</p></div>
        <video controls playsInline preload="none" poster="/video/oferta-poster.jpg" onError={() => setVideoOk(false)}>
          <source src="/video/oferta.mp4" type="video/mp4" onError={() => setVideoOk(false)}/>
        </video>
      </section>}

      <section id="checkout" ref={checkoutRef} className="offer-checkout" aria-label="Pagamento">
        <h2>Escolha seu acesso</h2>
        <div className="offer-plan-choices" role="radiogroup" aria-label="Forma de acesso">
          <label className={`plan-option${choice === "monthly" ? " is-on" : ""}`}><input type="radio" name="offer-plan" checked={choice === "monthly"} onChange={() => setChoice("monthly")}/><span className="plan-name">Mensal com IA</span><span className="plan-price"><b>R$ 49,90/mês</b> no cartão</span><span className="plan-note">Acervo e conexão com IA enquanto pagar. Cancelamento quando quiser.</span></label>
          <label className={`plan-option${choice === "lifetime" ? " is-on" : ""}`}><input type="radio" name="offer-plan" checked={choice === "lifetime"} onChange={() => setChoice("lifetime")}/><span className="plan-name">Acervo vitalício</span><span className="plan-price"><b>R$ 97,90</b> pagamento único</span><span className="plan-note">Guias para consultar e copiar. Sem conexão direta com IA.</span></label>
        </div>
        {choice === "monthly" ? <SubscriptionCheckout signedIn={signedIn}/> : <Checkout codes={["edicao-1"]} signedIn={signedIn} labels={LABELS}/>}
      </section>

      <section className="repo-block">
        <h2>Como sair disso para isso</h2>
        <div className="offer-cases">{CASES.map(([ask, before, after], index) => <article key={ask} className="offer-case">
          <p className="offer-ask">{ask}</p>
          <div className="offer-before"><b>Sem a Voxelia</b><p>{before}</p></div>
          <div className="offer-after"><b>{choice === "lifetime" ? "Com o acervo Voxelia" : "Com a Voxelia conectada"}</b><p>{choice === "lifetime" ? LIFETIME_RESULTS[index] : after}</p></div>
        </article>)}</div>
      </section>

      <section className="repo-block">
        <h2>Como funciona</h2>
        <ol className="kit-steps">{(choice === "lifetime" ? LIFETIME_STEPS : STEPS).map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
        <button type="button" className="btn btn-secondary offer-cta" onClick={goCheckout}>Quero começar agora</button>
      </section>

      <section className="repo-block offer-guarantee">
        <h2>Garantia de 15 dias</h2>
        <p>Teste com calma. A primeira mensalidade ou a compra vitalícia pode ser reembolsada em até 15 dias. Peça em Minha licença; o dinheiro volta pelo mesmo meio de pagamento.</p>
      </section>

      <section className="repo-block">
        <h2>Perguntas frequentes</h2>
        <div className="offer-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{choice === "lifetime" && q === "Preciso saber programar?" ? "Não. O acervo traz guias em português e comandos prontos para copiar e usar na sua IA."
          : choice === "lifetime" && q === "Em quais IAs funciona?" ? "Os guias podem ser copiados para qualquer IA que aceite texto. A conexão automática com Claude, ChatGPT e Claude Code está no plano mensal." : a}</p></details>)}</div>
      </section>
    </main>

    {pastHero && !atCheckout && <div className="repo-cta offer-sticky" role="region" aria-label="Comprar">
      <button type="button" className="btn btn-primary" onClick={goCheckout}>{choice === "lifetime" ? "Quero o acervo vitalício · R$ 97,90" : "Assinar · R$ 49,90/mês"}</button>
    </div>}

    <footer className="offer-foot">
      <nav aria-label="Documentos"><Link to="/termos">Termos de uso</Link><Link to="/privacidade">Privacidade</Link><Link to="/compra-e-reembolso">Compra e reembolso</Link></nav>
      <p className="small muted">{sellerLine() || "Voxelia"}{seller.email && <> · <a className="link" href={`mailto:${seller.email}`}>{seller.email}</a></>}</p>
    </footer>
  </div>;
}
