import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Copy, Layers3, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "../components/site/SiteNav.jsx";
import Checkout from "../components/checkout/Checkout.jsx";
import { Link } from "../lib/router.jsx";
import { track } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";
import { seller, sellerLine } from "../lib/seller.js";
import { launchNote, OFFER_PRICE } from "../lib/billing-client.js";
import "../styles/offer.css";

// A oferta vitalícia dá acesso ao acervo. A pessoa usa os guias manualmente na IA de sua escolha.
const BENEFITS = [
  { icon: Search, title: "Encontre pelo objetivo", text: "Descreva o que quer fazer e descubra skills relacionadas, sem garimpar repositórios." },
  { icon: BookOpen, title: "Guias em português", text: "Entenda quando usar cada skill e siga o passo a passo com a fonte original indicada." },
  { icon: Copy, title: "Copie e aplique", text: "Leve as instruções para a IA que você já usa e adapte o resultado ao seu trabalho." },
  { icon: Layers3, title: "Acervo vitalício", text: "Pague uma vez para consultar os recursos incluídos na Edição 1, sem mensalidade." },
];
const USES = [
  ["Páginas e sites", "Guias de estrutura, design e revisão para tirar uma página do rascunho."],
  ["Conteúdo e criativos", "Métodos para organizar ideias, legendas, roteiros e peças visuais."],
  ["Textos comerciais", "Referências para anúncios, descrições e comunicação com clientes."],
  ["Projetos e pesquisa", "Passos para planejar, pesquisar e executar tarefas com mais clareza."],
];
const STEPS = [
  ["Escolha o que quer criar", "Pesquise por um objetivo ou explore as áreas do acervo."],
  ["Abra o guia certo", "Leia as instruções em português e confira a fonte da skill."],
  ["Use na sua IA", "Copie o comando, adapte ao seu caso e revise a resposta."],
];
const FAQ = [
  ["O que é uma skill?", "É um conjunto de instruções para orientar a IA em uma tarefa. A Voxelia organiza essas instruções por objetivo, com guias em português."],
  ["Preciso saber programar?", "Não. Você pode consultar os guias e copiar as instruções para uma IA que aceite texto."],
  ["A Voxelia conecta automaticamente à minha IA?", "Não nesta oferta. A Edição 1 dá acesso vitalício ao acervo para consulta e uso manual. A ferramenta de IA pode exigir conta própria."],
  ["Quando recebo o acesso?", "Logo após o pagamento. Você volta para a Voxelia, cria sua senha e entra no acervo. Não precisa criar conta antes de pagar."],
  ["Há mensalidade ou parcelas?", `Não. Esta oferta custa ${OFFER_PRICE} em pagamento único pelo acesso vitalício ao acervo.`],
  ["Posso pedir reembolso?", "Sim. A compra tem garantia de 15 dias. Solicite o reembolso em Minha licença ou pelo suporte."],
];

// O título e o texto de abertura continuam a promessa do anúncio de origem (utm_content); sem anúncio, vale o padrão.
const DEFAULT_LEAD = "Encontre a skill certa para criar páginas, conteúdo e projetos com mais método. Abra o guia, copie as instruções e use na IA de sua escolha.";
const ANGLES = {
  A: { title: <>Pare de pagar a sua IA para <em>adivinhar</em>.</> },
  C: { title: <>Dê <em>superpoderes</em> à sua IA para vender mais.</>, lead: "Encontre a skill certa para criar propostas, anúncios, páginas de venda e conteúdo com método, em vez de texto genérico. Abra o guia, copie as instruções e use na IA que você já tem." },
  E1: { title: <>Chega de texto <em>genérico</em> da sua IA.</>, lead: "Com a skill certa, a IA segue um método: problema do cliente, oferta, prazo, garantia e próximo passo. Abra o guia, copie as instruções e use na IA que você já tem." },
};
// A imagem E2 repete a promessa do anúncio C.
ANGLES.E2 = ANGLES.C;

function CTA({ onClick, children = `Quero o acervo por ${OFFER_PRICE}`, secondary = false }) {
  return <button type="button" className={`vx-offer-cta${secondary ? " is-secondary" : ""}`} onClick={onClick}>{children}<ArrowRight size={19} aria-hidden="true"/></button>;
}

function ProductPreview() {
  return <div className="vx-preview" role="img" aria-label="Prévia ilustrativa do acervo Voxelia com busca por objetivo e guias de skills">
    <div className="vx-preview-top"><span className="vx-preview-mark">V</span><span>Voxelia <small>/ acervo</small></span><span className="vx-preview-dots" aria-hidden="true">•••</span></div>
    <div className="vx-preview-body"><span className="vx-preview-label">ENCONTRE UM MÉTODO PARA CADA TAREFA</span><strong>O que você quer criar?</strong>
      <div className="vx-preview-search"><Search size={17} aria-hidden="true"/> Uma página de vendas para meu produto <span>↵</span></div>
      <div className="vx-preview-tags"><span>Software</span><span>Conteúdo</span><span>Empreendedorismo</span><span>Ciência</span></div>
      <div className="vx-preview-results"><div><small>GUIA EM PORTUGUÊS</small><b>Estruture sua página</b><p>Planeje conteúdo, hierarquia e revisão visual.</p></div><div><small>PASSO A PASSO</small><b>Refine a comunicação</b><p>Transforme uma ideia em uma mensagem mais clara.</p></div></div>
    </div><span className="vx-preview-caption">Prévia ilustrativa da experiência de busca</span>
  </div>;
}

export default function OfferPage({ signedIn, authReady = true }) {
  const params = new URLSearchParams(location.search);
  const angle = ANGLES[String(params.get("utm_content") || "").toUpperCase()] || {};
  const headline = angle.title || <>Pare de começar <em>do zero</em> toda vez que usar IA.</>;
  const autoCheckout = params.get("comprar") === "1";
  const heroRef = useRef(null);
  const checkoutRef = useRef(null);
  const autoStarted = useRef(false);
  const [atCheckout, setAtCheckout] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => { document.title = "Voxelia: acervo de skills em português"; track("ViewContent", { content_ids: ["voxelia-vitalicio"], content_type: "product" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chegar ao checkout conta como "página de compra" no funil; o botão fixo some enquanto ele está na tela.
  useEffect(() => {
    const node = checkoutRef.current;
    if (!node || !("IntersectionObserver" in window)) return undefined;
    let counted = false;
    const observer = new IntersectionObserver(([entry]) => { setAtCheckout(entry.isIntersecting); if (entry.isIntersecting && !counted) { counted = true; funnel("buy_page"); } }, { threshold: 0.2 });
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

  // Sem conta, o botão leva ao campo de e-mail; com o e-mail preenchido (ou logado), já abre a Cakto.
  const goCheckout = ({ counted = true } = {}) => {
    if (counted) funnel("buy_click");
    const form = checkoutRef.current?.querySelector("form");
    const email = form?.querySelector('input[type="email"]');
    if (form && (!email || email.value)) { form.requestSubmit(); return; }
    // Desce até o formulário (não ao topo da seção): no celular, o campo de e-mail fica na tela.
    (checkoutRef.current?.querySelector(".vx-offer-checkout") || checkoutRef.current)?.scrollIntoView({ block: "start", behavior: "smooth" });
    email?.focus({ preventScroll: true });
  };
  // Link de anúncio com ?comprar=1 abre direto no pagamento; não conta como clique em comprar.
  useEffect(() => { if (!autoCheckout || !authReady || autoStarted.current) return; autoStarted.current = true; goCheckout({ counted: false }); }, [autoCheckout, authReady]);

  return <div className="vx-offer">
    <header className="vx-offer-header"><Brand/><span>Acesso vitalício · pagamento único</span><CTA onClick={() => goCheckout()}>Acessar por {OFFER_PRICE}</CTA></header>
    <main id="conteudo">
      <section ref={heroRef} className="vx-offer-hero vx-offer-shell"><p className="vx-offer-kicker"><Sparkles size={15} aria-hidden="true"/> 2.281 skills organizadas em português</p><h1>{headline}</h1><p className="vx-offer-lead">{angle.lead || DEFAULT_LEAD}</p><div className="vx-offer-hero-actions"><CTA onClick={() => goCheckout()}/><span>{OFFER_PRICE} uma vez · sem mensalidade</span>{launchNote() && <span className="vx-offer-launch">{launchNote()}</span>}</div><div className="vx-offer-benefits">{BENEFITS.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} aria-hidden="true"/><h2>{title}</h2><p>{text}</p></article>)}</div><ProductPreview/></section>
      <div className="vx-offer-marquee" aria-hidden="true"><span>BUSQUE PELO OBJETIVO <i/> LEIA EM PORTUGUÊS <i/> COPIE O COMANDO <i/> USE NA SUA IA <i/> ACESSO VITALÍCIO</span></div>
      <section className="vx-offer-section vx-offer-shell vx-offer-split"><div><p className="vx-offer-kicker">DO OBJETIVO À EXECUÇÃO</p><h2>Você sabe o que quer criar. A Voxelia ajuda a encontrar <em>como fazer.</em></h2><p>Em vez de procurar instruções soltas, você explora um acervo organizado por tarefa, área e fonte.</p><CTA onClick={() => goCheckout()} secondary>Ver a oferta</CTA></div><div className="vx-offer-checklist">{USES.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div><Check size={18} aria-hidden="true"/></article>)}</div></section>
      <section className="vx-offer-section vx-offer-method"><div className="vx-offer-shell"><p className="vx-offer-kicker">COMO FUNCIONA</p><h2>Três passos. Um acervo para voltar sempre.</h2><div className="vx-offer-steps">{STEPS.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div><p className="vx-offer-method-note">A Edição 1 oferece consulta e uso manual das skills. Não inclui conexão automática com Claude, ChatGPT ou outras IAs.</p></div></section>
      <section className="vx-offer-section vx-offer-shell"><p className="vx-offer-kicker">O QUE ESTÁ INCLUÍDO</p><h2>Uma biblioteca prática para as tarefas que aparecem no seu dia.</h2><div className="vx-offer-included"><article><b>2.281</b><span>skills no acervo</span></article><article><b>37</b><span>repositórios com fonte indicada</span></article><article><b>4</b><span>áreas para explorar</span></article></div><img className="vx-offer-characters" src="/email/personagens.png" alt="Personagens da Voxelia representando as áreas do acervo" width="976" height="220" loading="lazy"/><p className="vx-offer-subnote">As skills vêm de repositórios públicos. Você paga pela organização, busca e guias em português da Voxelia.</p></section>
      <section className="vx-offer-section vx-offer-compare"><div className="vx-offer-shell"><p className="vx-offer-kicker">MENOS PROCURA. MAIS CLAREZA.</p><h2>O seu próximo projeto merece um ponto de partida melhor.</h2><div className="vx-offer-compare-grid"><article><span>SEM UM ACERVO ORGANIZADO</span><ul><li>Procurar recursos em várias fontes.</li><li>Interpretar instruções dispersas.</li><li>Repetir a mesma pesquisa na próxima tarefa.</li></ul></article><article><span>COM A VOXELIA</span><ul><li>Buscar pelo objetivo em um só lugar.</li><li>Seguir um guia em português com fonte.</li><li>Salvar e voltar aos recursos úteis.</li></ul></article></div></div></section>
      <section id="checkout" ref={checkoutRef} className="vx-offer-section vx-offer-shell vx-offer-sale" aria-label="Pagamento"><div className="vx-offer-sale-copy"><p className="vx-offer-kicker">ACESSO VITALÍCIO À EDIÇÃO 1</p><h2>O acervo da Voxelia pode ser seu.</h2><p>Busque, consulte e copie os guias sempre que precisar. Pagamento único, sem mensalidade.</p><ul><li><Check size={17}/> 2.281 skills organizadas</li><li><Check size={17}/> Guias em português</li><li><Check size={17}/> Busca por objetivo</li><li><Check size={17}/> Garantia de 15 dias</li></ul><p className="vx-offer-sale-price"><strong>{OFFER_PRICE}</strong><span>pagamento único</span></p>{launchNote() && <p className="vx-offer-launch">{launchNote()}</p>}<p className="vx-offer-fine">Acesso ao acervo. Conexão automática com IA não incluída.</p></div><div className="vx-offer-checkout"><h3>{signedIn ? "Continue para o pagamento" : "Comece pelo seu e-mail"}</h3><p>{signedIn ? "Após a confirmação da Cakto, o acesso será liberado nesta conta." : "Sem cadastro antes de pagar. Depois do pagamento, você volta para a Voxelia e cria sua senha."}</p><Checkout codes={["edicao-1"]} signedIn={signedIn} hosted expectedPriceCents={3990}/>{!signedIn && <Link className="vx-offer-signin" to="/entrar?next=/oferta">Já tenho conta</Link>}<p className="vx-offer-fine"><ShieldCheck size={15} aria-hidden="true"/> Pagamento processado pela Cakto. Use no checkout o mesmo e-mail informado aqui.</p></div></section>
      <section className="vx-offer-section vx-offer-shell vx-offer-guarantee"><ShieldCheck size={34} aria-hidden="true"/><div><p className="vx-offer-kicker">GARANTIA DE 15 DIAS</p><h2>Explore com calma.</h2><p>Se a compra não fizer sentido para você, solicite o reembolso em Minha licença ou pelo suporte dentro do prazo de garantia.</p></div></section>
      <section className="vx-offer-section vx-offer-shell vx-offer-faq"><p className="vx-offer-kicker">PERGUNTAS FREQUENTES</p><h2>O que você precisa saber.</h2><div>{FAQ.map(([question, answer], index) => <details key={question}><summary><span>0{index + 1}</span>{question}<b aria-hidden="true">+</b></summary><p>{answer}</p></details>)}</div></section>
    </main>
    {pastHero && !atCheckout && <div className="vx-offer-sticky" role="region" aria-label="Comprar"><span>Acervo vitalício · {OFFER_PRICE}</span><CTA onClick={() => goCheckout()}>Quero acessar</CTA></div>}
    <footer className="vx-offer-footer"><Brand/><nav aria-label="Documentos"><Link to="/termos">Termos de uso</Link><Link to="/privacidade">Privacidade</Link><Link to="/compra-e-reembolso">Compra e reembolso</Link></nav><p>{sellerLine() || "Voxelia"}{seller.email && <> · <a href={`mailto:${seller.email}`}>{seller.email}</a></>}</p></footer>
  </div>;
}
