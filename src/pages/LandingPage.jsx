import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import FloatingNavbar from "../components/layout/FloatingNavbar.jsx";
import InteractiveSkillExplorer from "../components/explorer/InteractiveSkillExplorer.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import useCharacterActivation from "../components/categories/useCharacterActivation.js";
import PlansSection from "../components/commerce/PlansSection.jsx";
import LegalFooter from "../components/commerce/LegalFooter.jsx";
import { motionTokens, reveal } from "../lib/motion-tokens.js";
import { areas } from "../lib/areas.js";
import { pickHeroSkills } from "../lib/featured.js";

const FloatingSkillLibrary = lazy(() => import("../components/hero/FloatingSkillLibrary.jsx"));

const landingLinks = [
  { id: "recursos", label: "Recursos" },
  { id: "demonstracao", label: "Demonstração" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "planos", label: "Planos" },
  { id: "faq", label: "Perguntas" },
];

const benefits = [
  { glyph: "⌕", title: "Busca unificada", text: "Nome, descrição e caminho de cada skill em uma única busca, com acentos ou sem." },
  { glyph: "▦", title: "Organização por áreas", text: "Software, Empreendedorismo, Conteúdo e Ciência, cada área com seu agente." },
  { glyph: "◎", title: "Pesquisa por objetivo", text: "Escreva “quero criar um site” e veja skills compatíveis pelo vocabulário local." },
  { glyph: "✦", title: "Curadoria e navegação", text: "Destaques editoriais, mosaico por relevância e repositórios de origem lado a lado." },
  { glyph: "★", title: "Favoritos", text: "Salve as skills que você usa; elas ficam neste navegador." },
  { glyph: "↺", title: "Histórico", text: "Volte às últimas skills abertas sem refazer a busca." },
  { glyph: "◆", title: "Comparação", text: "Até três skills lado a lado com os campos documentados no catálogo." },
  { glyph: "↗", title: "Referências originais", text: "Cada ficha aponta para o SKILL.md e o repositório no GitHub." },
  { glyph: "▭", title: "Desktop e celular", text: "Interface própria para telas pequenas, teclado e movimento reduzido." },
];

const steps = [
  { title: "Escolha sua área ou pesquise seu objetivo", text: "Comece por um dos quatro agentes ou descreva o que precisa fazer." },
  { title: "Encontre e compare skills relevantes", text: "O ranking local ordena os resultados; compare até três antes de decidir." },
  { title: "Consulte as instruções e use no seu projeto", text: "Abra a fonte original, copie o prompt e adapte ao seu agente." },
];

// Perguntas com respostas factuais. Itens comerciais aguardam aprovação do proprietário.
const faq = [
  { q: "O que é a Biblioteca Total?", a: "Uma plataforma de descoberta de Agent Skills: reúne skills de repositórios públicos do GitHub em um só lugar, com busca, organização por áreas, comparação e links para a fonte original." },
  { q: "O que está incluído na assinatura?", a: "Acesso ao sistema completo: busca em todo o índice, mosaico, filtros, fichas de skills e repositórios, favoritos, histórico e comparação. Os recursos de cada plano aparecem no próprio plano." },
  { q: "Preciso criar uma conta?", a: "Sim. A conta identifica sua assinatura; o cadastro pede apenas e-mail e senha." },
  { q: "Como funciona o pagamento?", a: "A contratação é feita no ambiente seguro do Asaas, com cobrança recorrente no cartão de crédito. A Biblioteca Total não armazena dados do cartão.", pending: true },
  { q: "Como acesso depois de contratar?", a: "Assim que o Asaas confirmar o pagamento, sua conta é liberada. Basta entrar com seu e-mail e senha; a página de retorno mostra quando a confirmação chegar." },
  { q: "Como gerencio ou cancelo a assinatura?", a: "Em “Minha assinatura” você vê a situação, a próxima cobrança e as faturas, e pode solicitar o cancelamento. As regras de cancelamento e reembolso estão na política de assinatura.", pending: true },
  { q: "Onde estão os arquivos originais das skills?", a: "Nos repositórios públicos de cada autor no GitHub. A Biblioteca Total organiza e aponta para essas fontes; não substitui nem altera os arquivos originais." },
];

export default function LandingPage({ account, onEnter }) {
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState(null);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const libraryY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const libraryRotate = useTransform(scrollYProgress, [0, 1], [0, -8]);
  const libraryOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);

  useEffect(() => { fetch("/data/demo.json").then((response) => response.ok ? response.json() : null).then(setDemo).catch(() => setDemo(null)); }, []);
  // Âncoras diretas (/#planos etc.) funcionam mesmo vindo de outra rota.
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id && /^[a-z-]+$/.test(id)) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);
  const heroSkills = useMemo(() => (demo ? pickHeroSkills(demo.skills, { count: 12 }) : []), [demo]);
  const emptySet = useMemo(() => new Set(), []);
  const scrollTo = (event, id) => {
    event?.preventDefault();
    history.replaceState(null, "", `/#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  };
  const access = account?.access;

  return <>
    <FloatingNavbar links={landingLinks} active="" onNavigate={scrollTo} skipTarget="recursos"
      actions={<>
        <button type="button" className="nav-action" onClick={() => onEnter()}>{access ? "Abrir biblioteca" : "Entrar"}</button>
        {!access && <a className="button button-primary nav-cta" href="#planos" onClick={(event) => scrollTo(event, "planos")}>Começar agora</a>}
      </>}/>
    <main id="conteudo" className="view landing">
      <section className="hero" id="topo" ref={heroRef} aria-labelledby="hero-title">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <motion.p className="sys-tag" {...reveal(reduced, 0)}><span className="status-dot"/> [ SYSTEM ONLINE ] · BIBLIOTECA DE AGENT SKILLS</motion.p>
            <motion.h1 id="hero-title" className="landing-title" {...reveal(reduced, 1)}>Encontre as skills certas. <span className="neon-text">Transforme ideias em resultados.</span></motion.h1>
            <motion.p className="hero-lead" {...reveal(reduced, 2)}>Explore uma biblioteca organizada de Agent Skills, descubra ferramentas para seus projetos e encontre as instruções certas para trabalhar com seus agentes de IA.</motion.p>
            <motion.div className="hero-actions" {...reveal(reduced, 3)}>
              <a className="button button-primary" href="#demonstracao" onClick={(event) => scrollTo(event, "demonstracao")}><span aria-hidden="true">&gt;</span> Explorar demonstração</a>
              <a className="button button-ghost" href="#planos" onClick={(event) => scrollTo(event, "planos")}>Conhecer planos</a>
            </motion.div>
            <motion.dl className="hero-counts" {...reveal(reduced, 4)}>
              <div><dt>REPOSITÓRIOS</dt><dd>{demo ? demo.stats.repos : "—"}</dd></div>
              <div><dt>SKILLS_INDEXED</dt><dd>{demo ? demo.stats.skills.toLocaleString("pt-BR") : "—"}</dd></div>
              <div><dt>CATEGORIAS</dt><dd>04</dd></div>
            </motion.dl>
          </div>
          <motion.div className="hero-visual" style={reduced ? undefined : { y: libraryY, rotate: libraryRotate, opacity: libraryOpacity }}
            initial={reduced ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.3, ease: motionTokens.easing.smooth }}>
            <Suspense fallback={<div className="holo-stage is-loading" aria-hidden="true"/>}>
              {heroSkills.length ? <FloatingSkillLibrary skills={heroSkills} category="todas" emphasisIds={emptySet} onOpen={() => scrollTo(null, "demonstracao")}/> : <div className="holo-stage is-loading" aria-hidden="true"/>}
            </Suspense>
          </motion.div>
        </div>
      </section>

      <section className="landing-section" id="recursos" aria-labelledby="recursos-title">
        <div className="wrap">
          <div className="section-head">
            <p className="sys-tag">FEATURES://PLATAFORMA</p>
            <h2 id="recursos-title">Tudo para achar a skill certa <span className="neon-text">mais rápido.</span></h2>
            <p className="section-lead">A Biblioteca Total organiza skills públicas em uma experiência de busca, comparação e consulta. Nada de promessas: só o que o sistema faz hoje.</p>
          </div>
          <div className="benefit-grid">
            {benefits.map((item, index) => <motion.article key={item.title} className="benefit-card"
              initial={reduced ? false : { opacity: 0, y: motionTokens.distance.md }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: motionTokens.duration.normal, delay: (index % 3) * motionTokens.stagger.normal, ease: motionTokens.easing.smooth }}>
              <span className="benefit-glyph" aria-hidden="true">{item.glyph}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </motion.article>)}
          </div>
        </div>
      </section>

      <section className="landing-section" id="agentes" aria-labelledby="agentes-title">
        <div className="wrap">
          <div className="section-head">
            <p className="sys-tag">CATEGORY://AGENTES</p>
            <h2 id="agentes-title">Quatro áreas, <span className="neon-text">quatro agentes.</span></h2>
            <p className="section-lead">Passe o mouse, use o teclado ou toque em um personagem para vê-lo trabalhar.</p>
          </div>
          <div className="agent-row">
            {areas.slice(1).map((area, index) => <AgentTile key={area.id} area={area} index={index} count={demo?.stats.byArea[area.id]} reduced={reduced} onClick={() => scrollTo(null, "demonstracao")}/>)}
          </div>
        </div>
      </section>

      <section className="landing-section" id="demonstracao" aria-labelledby="demo-title">
        <div className="wrap">
          <div className="section-head">
            <p className="sys-tag">DEMO://SKILL_EXPLORER</p>
            <h2 id="demo-title">Experimente antes de assinar</h2>
            <p className="section-lead">Uma prévia com uma amostra fixa de skills reais. A biblioteca completa traz todo o índice, busca, filtros, favoritos e comparação.</p>
          </div>
          <motion.div className="explorer-boot" initial={reduced ? false : { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" }} whileInView={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7, ease: motionTokens.easing.smooth }}>
            <InteractiveSkillExplorer onFullAccess={() => onEnter("/app")} fullAccessLabel={access ? "Abrir biblioteca completa" : "Acessar biblioteca completa"}/>
          </motion.div>
        </div>
      </section>

      <section className="landing-section" id="como-funciona" aria-labelledby="como-title">
        <div className="wrap">
          <div className="section-head">
            <p className="sys-tag">FLOW://COMO_FUNCIONA</p>
            <h2 id="como-title">Do objetivo à instrução em três passos</h2>
          </div>
          <ol className="flow-steps">
            {steps.map((step, index) => <motion.li key={step.title} className="flow-step"
              initial={reduced ? false : { opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: motionTokens.duration.normal, delay: index * motionTokens.stagger.normal, ease: motionTokens.easing.smooth }}>
              <span className="flow-index" aria-hidden="true">0{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
              <FlowVisual step={index}/>
            </motion.li>)}
          </ol>
        </div>
      </section>

      <PlansSection account={account}/>

      <section className="landing-section" id="faq" aria-labelledby="faq-title">
        <div className="wrap faq-wrap">
          <div className="section-head">
            <p className="sys-tag">HELP://FAQ</p>
            <h2 id="faq-title">Perguntas frequentes</h2>
          </div>
          <div className="faq-list">
            {faq.map((item) => <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
              {item.pending && <p className="pending-note">Texto comercial pendente de aprovação do proprietário antes da publicação.</p>}
            </details>)}
          </div>
        </div>
      </section>
      <LegalFooter stats={demo?.stats} onEnter={onEnter}/>
    </main>
  </>;
}

function AgentTile({ area, index, count, reduced, onClick }) {
  const { active, handlers } = useCharacterActivation();
  return <motion.button type="button" className={`agent-tile ${active ? "is-active" : ""}`} data-category={area.id} aria-label={`${area.label}: ${count ?? "…"} skills. Ver na demonstração`} {...handlers}
    initial={reduced ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: motionTokens.duration.normal, delay: index * 0.12, ease: motionTokens.easing.smooth }}
    onClick={onClick}>
    <span className="category-stage" aria-hidden="true"><span className="category-ring"/><CyberpunkCharacter category={area.id} active={active}/></span>
    <span className="category-code">CATEGORY://{area.code}</span>
    <span className="category-name">{area.label}</span>
    <span className="category-count"><b>{count?.toLocaleString("pt-BR") ?? "…"}</b> skills</span>
  </motion.button>;
}

function FlowVisual({ step }) {
  if (step === 0) return <div className="flow-visual" aria-hidden="true"><span className="chip" aria-pressed="true">Software</span><span className="chip">Ciência</span><code>&gt; quero criar um site</code></div>;
  if (step === 1) return <div className="flow-visual flow-compare" aria-hidden="true"><i/><i/><i/></div>;
  return <div className="flow-visual" aria-hidden="true"><code>Use as instruções de [skill] para [objetivo].</code></div>;
}
