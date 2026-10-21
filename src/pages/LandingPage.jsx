import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import SiteNav from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import HeroScene from "./landing/HeroScene.jsx";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { motionTokens, reveal } from "../lib/motion-tokens.js";
import { CATEGORIES, categoryLabel, TYPES } from "../lib/resources.js";
import { buildResourceIndex, searchResources } from "../lib/search.js";
import { formatPrice, purchase } from "../lib/billing-client.js";

const benefits = [
  { title: "Encontre ferramentas rápido", text: "Uma busca para skills, ferramentas, guias e referências, com sinônimos em português e inglês." },
  { title: "Pesquise pelo objetivo", text: "Escreva o que quer fazer, como “criar um site”, e veja recursos relacionados." },
  { title: "Descubra outras áreas", text: "Software, empreendedorismo, conteúdo e ciência organizados lado a lado." },
  { title: "Guias práticos selecionados", text: "Conteúdo próprio para os recursos mais importantes, publicado conforme fica pronto." },
  { title: "Salve o que importa", text: "Favoritos e histórico ficam na sua conta, em qualquer dispositivo." },
  { title: "Coleções pessoais", text: "Organize recursos em coleções privadas e compartilhe só para visualização, se quiser." },
  { title: "Compare opções", text: "Até três skills lado a lado com os campos documentados na fonte." },
];

const steps = [
  { title: "Encontre", text: "Busque por nome, tecnologia ou objetivo, ou explore por área e tipo." },
  { title: "Aprenda", text: "Abra a página do recurso: resumo, origem e, quando houver, guia e instruções." },
  { title: "Utilize", text: "Copie as instruções disponíveis e abra a referência original para aplicar no seu projeto." },
  { title: "Organize", text: "Favorite, monte coleções e retome do histórico quando voltar." },
];

const goalChips = ["Quero criar um site", "Automatizar tarefas", "Editar vídeos", "Analisar dados", "Melhorar a segurança"];

// Perguntas com respostas factuais; o que depende de política comercial está sinalizado.
const faq = [
  { q: "O que é o Arsenal IA?", a: "Uma plataforma que organiza recursos para trabalhar com IA: Agent Skills de repositórios públicos, ferramentas e referências, e guias próprios, com busca por objetivo, coleções e páginas de consulta." },
  { q: "Como funciona o acesso vitalício?", a: "Você paga uma vez pela edição e mantém o acesso aos recursos e funcionalidades incluídos nela, sem mensalidade nem renovação." },
  { q: "Como é o pagamento?", a: "Pagamento único por Pix ou cartão de crédito, no ambiente seguro do Asaas. O Arsenal IA não armazena dados do cartão. O acesso é liberado quando o Asaas confirma o pagamento." },
  { q: "O que acontece quando sair uma nova edição?", a: "Novas edições podem trazer recursos extras. O upgrade é opcional: você paga só a diferença de preço e, se preferir não atualizar, continua com a edição que comprou." },
  { q: "O conteúdo das skills é exclusivo?", a: "Não. As Agent Skills vêm de repositórios públicos e cada página aponta para a fonte original. O valor do Arsenal está na curadoria, na organização, na busca, nos guias próprios e nas ferramentas de organização." },
  { q: "Posso pedir reembolso?", a: "As regras de reembolso e cancelamento estão na política de compra.", pending: true },
];

export default function LandingPage({ account, signedIn, onEnter }) {
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState(null);
  const [stats, setStats] = useState(null);
  const [editions, setEditions] = useState(null);
  const [buyError, setBuyError] = useState("");
  const [busy, setBusy] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, -90]);

  useEffect(() => {
    fetch("/data/demo.json").then((r) => (r.ok ? r.json() : null)).then(setDemo).catch(() => setDemo(null));
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => setStats(null));
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((data) => setEditions(data.editions || [])).catch(() => setEditions([]));
    const id = location.hash.slice(1);
    if (id && /^[a-z-]+$/.test(id)) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }, []);

  const scrollTo = (event, id) => {
    event?.preventDefault();
    history.replaceState(null, "", `/#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
  };
  const edition = editions?.[0] || null;
  const owned = account?.access;
  const buy = async () => {
    if (owned) { onEnter("/app"); return; }
    if (!edition) { scrollTo(null, "acesso"); return; }
    setBusy(true); setBuyError("");
    try { await purchase(edition.code, { signedIn }); } catch (error) { setBuyError(error.message); setBusy(false); }
  };

  return <>
    <SiteNav signedIn={signedIn} onSection={scrollTo} onEnter={() => onEnter()} onBuy={() => (edition ? buy() : scrollTo(null, "acesso"))}/>
    <main id="conteudo" className="landing">
      <section className="l-hero" id="inicio" ref={heroRef} aria-labelledby="hero-title">
        <motion.span className="l-blob l-blob-a" style={reduced ? undefined : { y: blobY }} aria-hidden="true"/>
        <motion.span className="l-blob l-blob-b" style={reduced ? undefined : { y: blobY2 }} aria-hidden="true"/>
        <div className="wrap l-hero-copy">
          <motion.p className="eyebrow" {...reveal(reduced, 0)}><span className="pill-dot" aria-hidden="true"/> Skills · subagentes · ferramentas · guias</motion.p>
          <motion.h1 id="hero-title" {...reveal(reduced, 1)}>Tudo o que você precisa para criar com IA, <span className="hl">em um só lugar.</span></motion.h1>
          <motion.p className="l-lead" {...reveal(reduced, 2)}>Descubra skills, subagentes, ferramentas, guias e referências organizadas para transformar ideias em projetos.</motion.p>
          <motion.div className="l-actions" {...reveal(reduced, 3)}>
            <button type="button" className="btn btn-secondary" onClick={(event) => scrollTo(event, "demonstracao")}>Conhecer o Arsenal</button>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? "Entrar no Arsenal" : "Garantir acesso vitalício"}</button>
          </motion.div>
          {buyError && <p className="form-error" role="alert">{buyError}</p>}
        </div>
        <div className="wrap"><HeroScene demo={demo}/></div>
      </section>

      <Section id="recursos" eyebrow="Benefícios" title="Menos tempo procurando, mais tempo criando.">
        <div className="l-benefits">
          {benefits.map((item, index) => <Reveal key={item.title} index={index} className="l-benefit">
            <span className="l-benefit-n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3><p>{item.text}</p>
          </Reveal>)}
        </div>
      </Section>

      <Section id="demonstracao" eyebrow="Demonstração" title="Experimente a busca por objetivo." lead="Uma amostra pública com skills reais do acervo. No Arsenal completo a busca cobre todo o índice e todos os tipos de recurso.">
        <DemoSearch demo={demo}/>
      </Section>

      <Section id="conteudo-disponivel" eyebrow="Conteúdo" title="Tipos de recurso na plataforma." lead="O Arsenal foi feito para crescer. Os números abaixo são os publicados hoje.">
        <div className="l-types">
          {TYPES.map((type, index) => {
            const count = stats?.byType?.[type.id];
            return <Reveal key={type.id} index={index} className="l-type">
              <span className="badge badge-type">{type.label}</span>
              <h3>{type.plural}</h3>
              <p>{typeText[type.id]}</p>
              <span className="tag-mono">{count == null ? "…" : count > 0 ? `${count.toLocaleString("pt-BR")} publicados` : "em curadoria"}</span>
            </Reveal>;
          })}
        </div>
        <div className="l-areas">
          {CATEGORIES.map((category, index) => <AreaTile key={category.id} category={category} count={demo?.stats.byArea[category.id]} index={index}/>)}
        </div>
      </Section>

      <Section id="como-funciona" eyebrow="Como funciona" title="Encontre. Aprenda. Utilize. Organize.">
        <ol className="l-steps">
          {steps.map((step, index) => <Reveal as="li" key={step.title} index={index} className="l-step">
            <span className="l-step-n" aria-hidden="true">{index + 1}</span>
            <h3>{step.title}</h3><p>{step.text}</p>
          </Reveal>)}
        </ol>
      </Section>

      <Section id="acesso" eyebrow="Acesso vitalício" title="Pague uma vez. Use sem mensalidade.">
        <motion.div className="l-offer" initial={reduced ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: motionTokens.easing.smooth }}>
          <div className="l-offer-main">
            <p className="eyebrow">{edition ? edition.name : "Arsenal IA — Edição 1"}</p>
            {edition ? <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>pagamento único</span></p> : <p className="l-price-soon">{editions == null ? "Carregando…" : "Vendas em preparação. A compra será aberta em breve."}</p>}
            <ul className="l-offer-list">
              <li>Acesso vitalício aos recursos e funcionalidades da edição adquirida</li>
              <li>Sem mensalidade, anuidade ou renovação automática</li>
              <li>Pix ou cartão de crédito, pelo Asaas</li>
              <li>Upgrades futuros opcionais, pagando só a diferença</li>
              {(edition?.features || []).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy || (!edition && !owned)}>{owned ? "Entrar no Arsenal" : busy ? "Abrindo pagamento…" : "Garantir acesso"}</button>
            {buyError && <p className="form-error" role="alert">{buyError}</p>}
          </div>
          <div className="l-offer-art" aria-hidden="true">{CATEGORIES.map((c) => <CyberpunkCharacter key={c.id} category={c.id}/>)}</div>
        </motion.div>
      </Section>

      <Section id="faq" eyebrow="Perguntas frequentes" title="Antes de garantir o seu acesso.">
        <div className="l-faq">
          {faq.map((item) => <details key={item.q} className="l-faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
            {item.pending && <p className="pending-note">Política pendente de aprovação do proprietário antes da publicação.</p>}
          </details>)}
        </div>
      </Section>

      <section className="l-final" aria-labelledby="final-title">
        <div className="wrap l-final-inner">
          <h2 id="final-title">Comece a criar com os recursos certos.</h2>
          <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? "Entrar no Arsenal" : "Garantir acesso"}</button>
        </div>
      </section>
    </main>
    <SiteFooter onEnter={() => onEnter()}/>
  </>;
}

const typeText = {
  skill: "Instruções de Agent Skills com origem e caminho no repositório.",
  subagent: "Modelos e instruções de subagentes.",
  workflow: "Processos organizados para usar ferramentas e IA.",
  tool: "Ferramentas digitais e aplicativos.",
  reference: "Sites, componentes, templates e diretórios de referência.",
  guide: "Guias e tutoriais próprios, passo a passo.",
};

function Section({ id, eyebrow, title, lead, children }) {
  const reduced = useReducedMotion();
  return <section className="l-section" id={id} aria-labelledby={`${id}-title`}>
    <div className="wrap">
      <motion.div className="l-head" initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        {lead && <p className="l-lead-sm">{lead}</p>}
      </motion.div>
      {children}
    </div>
  </section>;
}

function Reveal({ as = "div", index = 0, className, children }) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return <Tag className={className} initial={reduced ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: motionTokens.duration.normal, delay: (index % 4) * 0.07, ease: motionTokens.easing.smooth }}>{children}</Tag>;
}

function AreaTile({ category, count, index }) {
  const [active, setActive] = useState(false);
  return <Reveal index={index} className="l-area">
    <button type="button" className="l-area-btn" data-category={category.id} aria-label={`${category.label}: ${count ?? "…"} skills. Ver animação`}
      onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)} onFocus={() => setActive(true)} onBlur={() => setActive(false)}
      onClick={() => setActive((value) => !value)}>
      <span className="l-area-art" aria-hidden="true"><CyberpunkCharacter category={category.id} active={active}/></span>
      <span className="l-area-name">{category.label}</span>
      <span className="tag-mono">{count == null ? "…" : `${count.toLocaleString("pt-BR")} skills`}</span>
    </button>
  </Reveal>;
}

function DemoSearch({ demo }) {
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("Quero criar um site");
  const records = useMemo(() => buildResourceIndex((demo?.skills || []).map((s) => ({ id: s.id, type: "skill", category: s.category, title: s.name, summary: s.description, source_name: s.repoName }))), [demo]);
  const results = useMemo(() => searchResources(records, query).slice(0, 6), [records, query]);
  return <div className="l-demo">
    <label className="l-demo-search"><span className="sr-only">Buscar na demonstração</span><span aria-hidden="true">⌕</span>
      <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Descreva seu objetivo…"/>
    </label>
    <div className="chip-row">{goalChips.map((goal) => <button key={goal} type="button" className="chip" aria-pressed={query === goal} onClick={() => setQuery(goal)}>{goal}</button>)}</div>
    <p className="muted small" aria-live="polite">{demo ? `${results.length} resultado(s) na amostra pública de ${records.length} skills.` : "Carregando amostra…"}</p>
    <div className="r-grid">
      {results.map((item, index) => <motion.article key={item.id} className="r-card" data-category={item.category} layout={reduced ? false : "position"}
        initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: reduced ? 0 : index * 0.04 }}>
        <div className="r-card-top"><span className="badge">{categoryLabel[item.category]}</span><span className="badge badge-type">Skill</span></div>
        <h3>{item.title}</h3><p>{item.summary || "Descrição não informada na fonte."}</p>
        <span className="r-card-source">{item.source_name}</span>
      </motion.article>)}
      {demo && !results.length && <p className="empty">Nenhum resultado na amostra. Tente outro objetivo; o acervo completo é bem maior.</p>}
    </div>
  </div>;
}
