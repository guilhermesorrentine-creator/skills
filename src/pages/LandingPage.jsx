import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useReduced } from "../lib/motion-pref.jsx";
import SiteNav from "../components/site/SiteNav.jsx";
import SiteFooter from "../components/site/SiteFooter.jsx";
import HeroScene from "./landing/HeroScene.jsx";
import TerminalScene from "./landing/TerminalScene.jsx";
import { useFidgets } from "../components/categories/alive.js";
import CyberpunkCharacter from "../components/categories/CyberpunkCharacter.jsx";
import { cardReveal, motionTokens, reveal } from "../lib/motion-tokens.js";
import { CATEGORIES, categoryLabel, TYPES } from "../lib/resources.js";
import { buildResourceIndex, searchResources } from "../lib/search.js";
import { formatPrice, purchase } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { navigate } from "../lib/router.jsx";

// Copy de venda: cada bloco responde a uma objeção de quem está começando com IA.
// Só fatos verificáveis (números vêm do acervo); nada de depoimento ou escassez inventados.
const pains = [
  { title: "Horas garimpando o GitHub", text: "Você abre dez abas, lê READMEs em inglês e ainda não sabe qual skill resolve o seu problema." },
  { title: "Instalou e não funcionou", text: "Faltou um passo que ninguém explicou. A ferramenta fica parada e a ideia também." },
  { title: "Tudo espalhado", text: "Links salvos no WhatsApp, prints, favoritos do navegador. Quando precisa, não acha." },
];

const benefits = [
  { title: "Diga o objetivo, receba o caminho", text: "Escreva “quero criar um site” ou “editar vídeos” e veja na hora as skills e ferramentas que fazem isso, em português." },
  { title: "Guias passo a passo em português", text: "O que é, como instalar e o comando exato para copiar. Sem decifrar documentação." },
  { title: "Milhares de skills já organizadas", text: "Software, empreendedorismo, conteúdo e ciência, cada uma com a fonte original e o criador creditado." },
  { title: "Sua biblioteca, do seu jeito", text: "Favoritos, coleções e histórico na sua conta, em qualquer dispositivo." },
];

const fit = {
  yes: [
    "Quer usar IA para criar sites, vídeos, conteúdo ou automações sem perder dias pesquisando",
    "Usa ou quer começar a usar o Claude Code e outros agentes",
    "Empreende, cria conteúdo ou programa e precisa de resultado rápido",
    "Prefere pagar uma vez a assinar mais uma mensalidade",
  ],
  no: [
    "Procura um curso em vídeo com aulas ao vivo",
    "Quer uma ferramenta que faça tudo sozinha, sem você executar nada",
  ],
};

const steps = [
  { title: "Garanta o acesso", text: "Pix ou cartão. O acesso é liberado assim que o pagamento é confirmado." },
  { title: "Diga o que quer criar", text: "Busque pelo objetivo e escolha entre opções já filtradas." },
  { title: "Siga o guia", text: "Copie o comando, cole no seu agente e veja funcionando." },
  { title: "Volte quando precisar", text: "Tudo salvo na sua conta, para sempre, sem mensalidade." },
];

const goalChips = ["Quero criar um site", "Automatizar tarefas", "Editar vídeos", "Analisar dados", "Melhorar a segurança"];

// Perguntas com respostas factuais; o que depende de política comercial está sinalizado.
const faq = [
  { q: "O que é a Voxelia?", a: "Uma plataforma que organiza recursos para trabalhar com IA: Agent Skills de repositórios públicos, ferramentas e referências, e guias próprios, com busca por objetivo, coleções e páginas de consulta." },
  { q: "Como funciona o acesso vitalício?", a: "Você paga uma vez pela edição e mantém o acesso aos recursos e funcionalidades incluídos nela, sem mensalidade nem renovação." },
  { q: "Como é o pagamento?", a: "Pagamento único por Pix ou cartão de crédito, no ambiente seguro da Cakto. A Voxelia não armazena dados do cartão. O acesso é liberado quando a Cakto confirma o pagamento." },
  { q: "O que acontece quando sair uma nova edição?", a: "Novas edições podem trazer recursos extras. O upgrade é opcional: você paga só a diferença de preço e, se preferir não atualizar, continua com a edição que comprou." },
  { q: "O conteúdo das skills é exclusivo?", a: "Não. As Agent Skills vêm de repositórios públicos e cada página aponta para a fonte original. O valor da Voxelia está na curadoria, na organização, na busca, nos guias próprios e nas ferramentas de organização." },
  { q: "E se eu não gostar?", a: "Você tem 15 dias de garantia. Se a Voxelia não servir para você, peça o reembolso dentro desse prazo e devolvemos o valor pago." },
  { q: "Preciso saber programar?", a: "Não para começar. Os guias explicam cada passo em português, com o comando pronto para copiar. Quem programa vai mais longe, mas quem não programa também usa." },
  { q: "Por que pagar se as skills são públicas?", a: "Porque achar, entender e fazer funcionar é o que toma tempo. A Voxelia junta tudo, explica em português e mostra o caminho mais curto do objetivo até o resultado." },
];

export default function LandingPage({ account, signedIn, onEnter }) {
  const reduced = useReduced();
  const [demo, setDemo] = useState(null);
  const [stats, setStats] = useState(null);
  const [editions, setEditions] = useState(null);
  const [buyError, setBuyError] = useState("");
  const [busy, setBusy] = useState(false);
  const heroRef = useRef(null);
  const areasRef = useRef(null);
  const offerRef = useRef(null);
  const ids = CATEGORIES.map((c) => c.id);
  const areaFidgets = useFidgets(ids, { enabled: !reduced, rootRef: areasRef, every: 3000 });
  const offerFidgets = useFidgets(ids, { enabled: !reduced, rootRef: offerRef, every: 2400 });
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
          <motion.p className="eyebrow" {...reveal(reduced, 0)}><span className="pill-dot" aria-hidden="true"/> {demo ? `${demo.stats.skills.toLocaleString("pt-BR")} skills · ${demo.stats.repos} repositórios · guias em português` : "Skills · ferramentas · guias em português"}</motion.p>
          <motion.h1 id="hero-title" {...reveal(reduced, 1)}>Pare de caçar ferramentas de IA. <span className="hl">Comece a criar hoje.</span></motion.h1>
          <motion.p className="l-lead" {...reveal(reduced, 2)}>A Voxelia ajuda criadores e empreendedores a fazer sites, vídeos e automações com IA sem perder horas garimpando ferramentas em inglês. Você diz o objetivo; ela mostra a skill certa, o passo a passo em português e o comando pronto para copiar.</motion.p>
          <motion.div className="l-actions" {...reveal(reduced, 3)}>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? "Entrar na Voxelia" : edition ? `Quero meu acesso por ${formatPrice(edition.priceCents)}` : "Quero meu acesso"}</button>
            <button type="button" className="btn btn-secondary" onClick={(event) => scrollTo(event, "funcionando")}>Ver funcionando</button>
          </motion.div>
          <motion.p className="l-trust" {...reveal(reduced, 4)}>Pagamento único · Pix ou cartão · Garantia de 15 dias</motion.p>
          {buyError && <p className="form-error" role="alert">{buyError}</p>}
        </div>
        <div className="wrap"><HeroScene demo={demo}/></div>
      </section>

      <Section id="problema" eyebrow="Se isso soa familiar" title="A IA é poderosa. Achar o caminho é que cansa.">
        <div className="l-pains">
          {pains.map((item, index) => <Reveal key={item.title} index={index} className="l-pain"><h3>{item.title}</h3><p>{item.text}</p></Reveal>)}
        </div>
      </Section>

      <Section id="funcionando" eyebrow="Veja funcionando" title="Um comando. O agente trabalha." lead="Cada personagem mostra uma skill do acervo em ação, com o comando que está no guia.">
        <TerminalScene/>
      </Section>

      <Section id="recursos" eyebrow="O que muda" title="Do objetivo ao resultado, sem garimpo.">
        <div className="l-benefits">
          {benefits.map((item, index) => <Reveal key={item.title} index={index} className="l-benefit">
            <span className="l-benefit-n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3><p>{item.text}</p>
          </Reveal>)}
        </div>
      </Section>

      <Section id="demonstracao" eyebrow="Teste agora, de graça" title="Escreva o que você quer criar." lead="Esta é uma amostra pública com skills reais. Com o acesso, a busca cobre o acervo inteiro, com guias e comandos prontos.">
        <DemoSearch demo={demo}/>
      </Section>

      <Section id="conteudo-disponivel" eyebrow="Conteúdo" title="Tipos de recurso na plataforma." lead="A Voxelia foi feita para crescer. Os números abaixo são os publicados hoje.">
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
        <div className="l-areas" ref={areasRef}>
          {CATEGORIES.map((category, index) => <AreaTile key={category.id} category={category} count={demo?.stats.byArea[category.id]} index={index} fidget={areaFidgets[category.id]}/>)}
        </div>
      </Section>

      <Section id="como-funciona" eyebrow="Como funciona" title="Do pagamento ao primeiro resultado em minutos.">
        <ol className="l-steps">
          {steps.map((step, index) => <Reveal as="li" key={step.title} index={index} className="l-step">
            <span className="l-step-n" aria-hidden="true">{index + 1}</span>
            <h3>{step.title}</h3><p>{step.text}</p>
          </Reveal>)}
        </ol>
      </Section>

      <Section id="para-quem" eyebrow="Para quem é" title="Feita para quem quer resultado com IA.">
        <div className="l-fit">
          <Reveal index={0} className="l-fit-col l-fit-yes"><h3>É para você se…</h3><ul>{fit.yes.map((t) => <li key={t}>{t}</li>)}</ul></Reveal>
          <Reveal index={1} className="l-fit-col l-fit-no"><h3>Não é para você se…</h3><ul>{fit.no.map((t) => <li key={t}>{t}</li>)}</ul></Reveal>
        </div>
      </Section>

      <Section id="acesso" eyebrow="Acesso vitalício" title="Pague uma vez. Use para sempre.">
        <motion.div className="l-offer" onViewportEnter={() => edition && track("ViewContent", { currency: "BRL", value: edition.priceCents / 100, content_ids: [edition.code], content_type: "product" })} initial={reduced ? false : { opacity: 0, y: 60, scale: 1.06, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} viewport={{ once: true, amount: 0.3 }}
          transition={{ default: { duration: 0.75, ease: motionTokens.easing.snapSettle }, opacity: { duration: 0.2 } }}>
          <div className="l-offer-main">
            <p className="eyebrow">{edition ? edition.name : "Voxelia — Edição 1"}</p>
            {edition ? <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>pagamento único</span></p> : <p className="l-price-soon">{editions == null ? "Carregando…" : "Vendas em preparação. A compra será aberta em breve."}</p>}
            <ul className="l-offer-list">
              <li>{demo ? `${demo.stats.skills.toLocaleString("pt-BR")} skills organizadas por objetivo e área` : "Milhares de skills organizadas por objetivo e área"}</li>
              <li>Guias passo a passo em português, com comandos prontos</li>
              <li>Acesso vitalício aos recursos e funcionalidades da edição adquirida</li>
              <li>Sem mensalidade, anuidade ou renovação automática</li>
              <li>Pix ou cartão de crédito, pela Cakto</li>
              <li>Upgrades futuros opcionais, pagando só a diferença</li>
              {(edition?.features || []).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy || (!edition && !owned)}>{owned ? "Entrar na Voxelia" : busy ? "Abrindo pagamento…" : "Quero meu acesso agora"}</button>
            {buyError && <p className="form-error" role="alert">{buyError}</p>}
            <p className="l-guarantee"><b>Garantia de 15 dias.</b> Se não servir para você, devolvemos o valor pago. O risco é nosso.</p>
          </div>
          <div className="l-offer-art" aria-hidden="true" ref={offerRef}>{CATEGORIES.map((c) => <CyberpunkCharacter key={c.id} category={c.id} active={offerFidgets[c.id] === "act"} fidget={offerFidgets[c.id] === "hop" ? "hop" : null}/>)}</div>
        </motion.div>
      </Section>

      <Section id="faq" eyebrow="Dúvidas" title="Ainda pensando? Respostas diretas.">
        <div className="l-faq">
          {faq.map((item, index) => <motion.details key={item.q} className="l-faq-item" {...cardReveal(reduced, index, 0.6)}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
            {item.pending && <p className="pending-note">Política pendente de aprovação do proprietário antes da publicação.</p>}
          </motion.details>)}
        </div>
      </Section>

      <section className="l-final" aria-labelledby="final-title">
        <div className="wrap l-final-inner">
          <h2 id="final-title">Sua próxima ideia com IA começa aqui.</h2>
          <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? "Entrar na Voxelia" : "Quero meu acesso"}</button>
          <p className="l-trust">Pagamento único · Garantia de 15 dias</p>
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
  const reduced = useReduced();
  return <section className="l-section" id={id} aria-labelledby={`${id}-title`}>
    <div className="wrap">
      <motion.div className="l-head" initial={reduced ? false : { opacity: 0, y: 34, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, amount: 0.6 }}
        transition={{ default: { duration: 0.6, ease: motionTokens.easing.softLand }, opacity: { duration: 0.2 }, filter: { duration: 0.3 } }}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        {lead && <p className="l-lead-sm">{lead}</p>}
      </motion.div>
      {children}
    </div>
  </section>;
}

function Reveal({ as = "div", index = 0, className, children }) {
  const reduced = useReduced();
  const Tag = motion[as];
  return <Tag className={className} {...cardReveal(reduced, index)}>{children}</Tag>;
}

// Cada área leva ao kit da profissão correspondente (/kit/<slug>).
const KIT_BY_AREA = { software: "programadores", empreendedorismo: "empreendedores", conteudo: "criadores", ciencia: "pesquisadores" };

function AreaTile({ category, count, index, fidget }) {
  const [active, setActive] = useState(false);
  const kit = KIT_BY_AREA[category.id];
  return <Reveal index={index} className="l-area">
    <button type="button" className="l-area-btn" data-category={category.id} aria-label={`${category.label}: ${count ?? "…"} skills. Ver o kit`}
      onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)} onFocus={() => setActive(true)} onBlur={() => setActive(false)}
      onClick={() => (kit ? navigate(`/kit/${kit}`) : setActive((value) => !value))}>
      <span className="l-area-art" aria-hidden="true"><CyberpunkCharacter category={category.id} active={active || fidget === "act"} fidget={fidget === "hop" ? "hop" : null}/></span>
      <span className="l-area-name">{category.label}</span>
      <span className="tag-mono">{count == null ? "…" : `${count.toLocaleString("pt-BR")} skills`}</span>
      {kit && <span className="l-area-kit">Ver o kit →</span>}
    </button>
  </Reveal>;
}

function DemoSearch({ demo }) {
  const reduced = useReduced();
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
