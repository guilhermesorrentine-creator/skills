import { useEffect, useRef, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import Checkout from "../components/checkout/Checkout.jsx";
import { Link } from "../lib/router.jsx";
import { track } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";
import { seller, sellerLine } from "../lib/seller.js";
import { OFFER_PRICE } from "../lib/billing-client.js";

// A oferta vitalícia dá acesso ao acervo. A pessoa usa os guias manualmente na IA de sua escolha.
const SERVICES = [
  ["Crie páginas de vendas", "Use guias de design e escrita para estruturar páginas comerciais e revisar sua apresentação."],
  ["Produza conteúdo", "Encontre métodos para ideias, legendas e roteiros de redes sociais."],
  ["Escreva textos comerciais", "Organize anúncios, descrições de produtos e e-mails com instruções mais específicas."],
  ["Pesquise possíveis clientes", "Siga roteiros de pesquisa e organize oportunidades antes de oferecer seus serviços."],
  ["Desenvolva projetos com IA", "Use passos prontos para transformar uma ideia em um projeto mais claro."],
];
const STEPS = [
  ["Escolha o que quer fazer", "Busque pelo seu objetivo no acervo."],
  ["Encontre a skill certa", "Leia o guia em português e copie as instruções."],
  ["Use com sua IA", "Cole o comando em uma ferramenta compatível e revise o resultado."],
];
const FAQ = [
  ["O que é uma skill?", "É um conjunto de instruções para orientar a IA em uma tarefa. Na Voxelia, você encontra os guias organizados por objetivo e pode copiar os comandos."],
  ["Preciso saber programar?", "Não. Você pode escolher um guia, copiar as instruções e usar em uma IA que aceite texto."],
  ["A IA se conecta automaticamente?", "Não. Esta compra dá acesso vitalício ao acervo; você consulta e usa as skills manualmente. Ferramentas de IA podem exigir conta própria."],
  ["Quando recebo o acesso?", "Crie sua conta antes de pagar. Quando a Cakto confirmar o pagamento, o acervo será liberado automaticamente nessa conta. Entre com o mesmo e-mail usado no checkout."],
  ["Existe mensalidade?", `Não. São ${OFFER_PRICE} em pagamento único pelo acesso vitalício ao acervo.`],
  ["E se eu não gostar?", "A compra tem 15 dias de garantia. Você pode pedir o reembolso em Minha licença ou pelo suporte."],
];

export default function OfferPage({ signedIn, authReady = true }) {
  const params = new URLSearchParams(location.search);
  const autoCheckout = params.get("comprar") === "1";
  const variant = String(params.get("utm_content") || "").toUpperCase();
  const heroRef = useRef(null);
  const checkoutRef = useRef(null);
  const autoStarted = useRef(false);
  const [atCheckout, setAtCheckout] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    document.title = "Voxelia: skills para criar com IA";
    track("ViewContent", { content_ids: ["voxelia-vitalicio"], content_type: "product" });
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
    const form = checkoutRef.current?.querySelector("form");
    if (form) form.requestSubmit();
    else checkoutRef.current?.scrollIntoView({ block: "start" });
  };

  useEffect(() => {
    if (!autoCheckout || !authReady || autoStarted.current) return;
    autoStarted.current = true;
    goCheckout();
  }, [autoCheckout, authReady]);

  return <div className="offer-page">
    <header className="offer-top"><Brand/></header>
    <main id="conteudo" className="offer-main">
      <section ref={heroRef} className="offer-hero">
        <p className="eyebrow">Mais de 2 mil skills em português</p>
        <h1>Ganhe dinheiro com IA usando as skills certas.</h1>
        <p className="offer-lead">Encontre métodos para criar páginas, produzir conteúdo, pesquisar clientes e desenvolver serviços que você pode oferecer. A Voxelia organiza os guias para você usar com a IA de sua escolha.</p>
        {variant === "C" && <p className="small">Dê superpoderes à sua IA com instruções mais específicas para cada tarefa.</p>}
        <ol className="offer-flow" aria-label="Como a Voxelia ajuda">{["Escolha seu objetivo", "Encontre uma skill", "Use o comando na sua IA"].map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
        <p className="offer-hero-price"><b>{OFFER_PRICE}</b><span>pagamento único · acesso vitalício ao acervo</span></p>
        <button type="button" className="btn btn-primary offer-cta" onClick={goCheckout}>Quero acessar as skills por {OFFER_PRICE}</button>
        <p className="small offer-assure">Sem mensalidade · 15 dias de garantia</p>
      </section>

      <section id="checkout" ref={checkoutRef} className="offer-checkout" aria-label="Pagamento">
        <h2>Um pagamento. Acesso vitalício.</h2>
        <p>Mais de 2 mil skills organizadas em português para consultar, copiar e usar na sua IA. Esta compra não inclui conexão automática.</p>
        {signedIn ? <Checkout codes={["edicao-1"]} signedIn hosted/> : <div className="stack">
          <p>Crie ou acesse sua conta antes de pagar. Assim, o acesso será liberado automaticamente após a confirmação da Cakto, sem depender de um segundo e-mail.</p>
          <Link className="btn btn-primary" to="/cadastro?next=/oferta">Criar conta e continuar</Link>
          <Link className="link" to="/entrar?next=/oferta">Já tenho conta</Link>
        </div>}
        <p className="small muted">Se o pagamento for aprovado e o acesso não aparecer, escreva para <a className="link" href="mailto:zack74522@gmail.com">zack74522@gmail.com</a> usando o e-mail da compra.</p>
      </section>

      <section className="repo-block">
        <h2>O que você pode criar com as skills</h2>
        <p>Os guias ajudam você a trabalhar com mais método. O resultado depende da sua prática, revisão e das ferramentas que usar.</p>
        <div className="offer-cases">{SERVICES.map(([title, description]) => <article key={title} className="offer-case">
          <p className="offer-ask">{title}</p><div className="offer-after"><p>{description}</p></div>
        </article>)}</div>
      </section>

      <section className="repo-block">
        <h2>Como funciona</h2>
        <ol className="kit-steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
        <button type="button" className="btn btn-secondary offer-cta" onClick={goCheckout}>Quero acessar o acervo vitalício</button>
      </section>

      <section className="repo-block offer-guarantee">
        <h2>Garantia de 15 dias</h2>
        <p>Explore o acervo com calma. Você pode pedir o reembolso da compra vitalícia em até 15 dias, pela área Minha licença ou pelo suporte.</p>
      </section>

      <section className="repo-block">
        <h2>Perguntas frequentes</h2>
        <div className="offer-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
    </main>

    {pastHero && !atCheckout && <div className="repo-cta offer-sticky" role="region" aria-label="Comprar">
      <button type="button" className="btn btn-primary" onClick={goCheckout}>Quero o acervo vitalício · {OFFER_PRICE}</button>
    </div>}

    <footer className="offer-foot">
      <nav aria-label="Documentos"><Link to="/termos">Termos de uso</Link><Link to="/privacidade">Privacidade</Link><Link to="/compra-e-reembolso">Compra e reembolso</Link></nav>
      <p className="small muted">{sellerLine() || "Voxelia"}{seller.email && <> · <a className="link" href={`mailto:${seller.email}`}>{seller.email}</a></>}</p>
    </footer>
  </div>;
}
