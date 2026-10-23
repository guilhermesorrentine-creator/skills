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
import { CATEGORIES, TYPES } from "../lib/resources.js";
import { buildResourceIndex, searchResources } from "../lib/search.js";
import { formatPrice, purchase } from "../lib/billing-client.js";
import { track } from "../lib/meta-pixel.js";
import { navigate } from "../lib/router.jsx";
import { useT } from "../i18n/index.js";

// Copy de venda (src/i18n): cada bloco responde a uma objeção de quem está começando com IA.
// Só fatos verificáveis (números vêm do acervo); nada de depoimento ou escassez inventados.

export default function LandingPage({ account, signedIn, onEnter }) {
  const reduced = useReduced();
  const { t, n } = useT();
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
          <motion.p className="eyebrow" {...reveal(reduced, 0)}><span className="pill-dot" aria-hidden="true"/> {demo ? t("landing.eyebrow", { skills: n(demo.stats.skills), repos: n(demo.stats.repos) }) : t("landing.eyebrowFallback")}</motion.p>
          <motion.h1 id="hero-title" {...reveal(reduced, 1)}>{t("landing.heroTitle")} <span className="hl">{t("landing.heroHighlight")}</span></motion.h1>
          <motion.p className="l-lead" {...reveal(reduced, 2)}>{t("landing.heroLead")}</motion.p>
          <motion.div className="l-actions" {...reveal(reduced, 3)}>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? t("common.enterVoxelia") : edition ? t("landing.buyFor", { price: formatPrice(edition.priceCents) }) : t("landing.buy")}</button>
            <button type="button" className="btn btn-secondary" onClick={(event) => scrollTo(event, "funcionando")}>{t("landing.seeIt")}</button>
          </motion.div>
          <motion.p className="l-trust" {...reveal(reduced, 4)}>{t("landing.trust")}</motion.p>
          {buyError && <p className="form-error" role="alert">{buyError}</p>}
        </div>
        <div className="wrap"><HeroScene demo={demo}/></div>
      </section>

      <Section id="problema" eyebrow={t("landing.problem.eyebrow")} title={t("landing.problem.title")}>
        <div className="l-pains">
          {t("landing.pains").map((item, index) => <Reveal key={item.title} index={index} className="l-pain"><h3>{item.title}</h3><p>{item.text}</p></Reveal>)}
        </div>
      </Section>

      <Section id="funcionando" eyebrow={t("landing.working.eyebrow")} title={t("landing.working.title")} lead={t("landing.working.lead")}>
        <TerminalScene/>
      </Section>

      <Section id="recursos" eyebrow={t("landing.benefitsHead.eyebrow")} title={t("landing.benefitsHead.title")}>
        <div className="l-benefits">
          {t("landing.benefits").map((item, index) => <Reveal key={item.title} index={index} className="l-benefit">
            <span className="l-benefit-n" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{item.title}</h3><p>{item.text}</p>
          </Reveal>)}
        </div>
      </Section>

      <Section id="demonstracao" eyebrow={t("landing.demoHead.eyebrow")} title={t("landing.demoHead.title")} lead={t("landing.demoHead.lead")}>
        <DemoSearch demo={demo}/>
      </Section>

      <Section id="conteudo-disponivel" eyebrow={t("landing.content.eyebrow")} title={t("landing.content.title")} lead={t("landing.content.lead")}>
        <div className="l-types">
          {TYPES.map((type, index) => {
            const count = stats?.byType?.[type.id];
            return <Reveal key={type.id} index={index} className="l-type">
              <span className="badge badge-type">{t(`type.${type.id}`)}</span>
              <h3>{t(`type.plural.${type.id}`)}</h3>
              <p>{t(`landing.typeText.${type.id}`)}</p>
              <span className="tag-mono">{count == null ? "…" : count > 0 ? t("landing.content.published", { count: n(count) }) : t("landing.content.curating")}</span>
            </Reveal>;
          })}
        </div>
        <div className="l-areas" ref={areasRef}>
          {CATEGORIES.map((category, index) => <AreaTile key={category.id} category={category} count={demo?.stats.byArea[category.id]} index={index} fidget={areaFidgets[category.id]}/>)}
        </div>
      </Section>

      <Section id="como-funciona" eyebrow={t("landing.stepsHead.eyebrow")} title={t("landing.stepsHead.title")}>
        <ol className="l-steps">
          {t("landing.steps").map((step, index) => <Reveal as="li" key={step.title} index={index} className="l-step">
            <span className="l-step-n" aria-hidden="true">{index + 1}</span>
            <h3>{step.title}</h3><p>{step.text}</p>
          </Reveal>)}
        </ol>
      </Section>

      <Section id="para-quem" eyebrow={t("landing.fitHead.eyebrow")} title={t("landing.fitHead.title")}>
        <div className="l-fit">
          <Reveal index={0} className="l-fit-col l-fit-yes"><h3>{t("landing.fitHead.yes")}</h3><ul>{t("landing.fit.yes").map((item) => <li key={item}>{item}</li>)}</ul></Reveal>
          <Reveal index={1} className="l-fit-col l-fit-no"><h3>{t("landing.fitHead.no")}</h3><ul>{t("landing.fit.no").map((item) => <li key={item}>{item}</li>)}</ul></Reveal>
        </div>
      </Section>

      <Section id="acesso" eyebrow={t("landing.offer.eyebrow")} title={t("landing.offer.title")}>
        <motion.div className="l-offer" onViewportEnter={() => edition && track("ViewContent", { currency: "BRL", value: edition.priceCents / 100, content_ids: [edition.code], content_type: "product" })} initial={reduced ? false : { opacity: 0, y: 60, scale: 1.06, filter: "blur(10px)" }} whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} viewport={{ once: true, amount: 0.3 }}
          transition={{ default: { duration: 0.75, ease: motionTokens.easing.snapSettle }, opacity: { duration: 0.2 } }}>
          <div className="l-offer-main">
            <p className="eyebrow">{edition ? edition.name : t("landing.offer.editionFallback")}</p>
            {edition ? <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>{t("common.oneTime")}</span></p> : <p className="l-price-soon">{editions == null ? t("common.loading") : t("landing.offer.soon")}</p>}
            {edition && t("landing.offer.currency") && <p className="small muted">{t("landing.offer.currency")}</p>}
            <ul className="l-offer-list">
              <li>{demo ? t("landing.offer.skills", { count: n(demo.stats.skills) }) : t("landing.offer.skillsFallback")}</li>
              {t("landing.offer.list").map((item) => <li key={item}>{item}</li>)}
              {(edition?.features || []).map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button type="button" className="btn btn-primary" onClick={buy} disabled={busy || (!edition && !owned)}>{owned ? t("common.enterVoxelia") : busy ? t("common.openingPayment") : t("landing.offer.cta")}</button>
            {buyError && <p className="form-error" role="alert">{buyError}</p>}
            <p className="l-guarantee"><b>{t("landing.offer.guaranteeTitle")}</b> {t("landing.offer.guarantee")}</p>
          </div>
          <div className="l-offer-art" aria-hidden="true" ref={offerRef}>{CATEGORIES.map((c) => <CyberpunkCharacter key={c.id} category={c.id} active={offerFidgets[c.id] === "act"} fidget={offerFidgets[c.id] === "hop" ? "hop" : null}/>)}</div>
        </motion.div>
      </Section>

      <Section id="faq" eyebrow={t("landing.faqHead.eyebrow")} title={t("landing.faqHead.title")}>
        <div className="l-faq">
          {t("landing.faq").map((item, index) => <motion.details key={item.q} className="l-faq-item" {...cardReveal(reduced, index, 0.6)}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
            {item.pending && <p className="pending-note">{t("landing.faqPending")}</p>}
          </motion.details>)}
        </div>
      </Section>

      <section className="l-final" aria-labelledby="final-title">
        <div className="wrap l-final-inner">
          <h2 id="final-title">{t("landing.final.title")}</h2>
          <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{owned ? t("common.enterVoxelia") : t("landing.buy")}</button>
          <p className="l-trust">{t("landing.final.trust")}</p>
        </div>
      </section>
    </main>
    <SiteFooter onEnter={() => onEnter()}/>
  </>;
}

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
  const { t, n } = useT();
  const name = t(`cat.${category.id}`);
  const [active, setActive] = useState(false);
  const kit = KIT_BY_AREA[category.id];
  return <Reveal index={index} className="l-area">
    <button type="button" className="l-area-btn" data-category={category.id} aria-label={t("landing.area.label", { name, count: count == null ? "…" : n(count) })}
      onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)} onFocus={() => setActive(true)} onBlur={() => setActive(false)}
      onClick={() => (kit ? navigate(`/kit/${kit}`) : setActive((value) => !value))}>
      <span className="l-area-art" aria-hidden="true"><CyberpunkCharacter category={category.id} active={active || fidget === "act"} fidget={fidget === "hop" ? "hop" : null}/></span>
      <span className="l-area-name">{name}</span>
      <span className="tag-mono">{count == null ? "…" : t("landing.area.skills", { count: n(count) })}</span>
      {kit && <span className="l-area-kit">{t("landing.area.kit")}</span>}
    </button>
  </Reveal>;
}

function DemoSearch({ demo }) {
  const reduced = useReduced();
  const { t } = useT();
  const [query, setQuery] = useState(() => t("landing.demo.initial"));
  const records = useMemo(() => buildResourceIndex((demo?.skills || []).map((s) => ({ id: s.id, type: "skill", category: s.category, title: s.name, summary: s.description, source_name: s.repoName }))), [demo]);
  const results = useMemo(() => searchResources(records, query).slice(0, 6), [records, query]);
  return <div className="l-demo">
    <label className="l-demo-search"><span className="sr-only">{t("landing.demo.label")}</span><span aria-hidden="true">⌕</span>
      <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("landing.demo.placeholder")}/>
    </label>
    <div className="chip-row">{t("landing.demo.goals").map((goal) => <button key={goal} type="button" className="chip" aria-pressed={query === goal} onClick={() => setQuery(goal)}>{goal}</button>)}</div>
    <p className="muted small" aria-live="polite">{demo ? t("landing.demo.count", { n: results.length, total: records.length }) : t("landing.demo.loading")}</p>
    <div className="r-grid">
      {results.map((item, index) => <motion.article key={item.id} className="r-card" data-category={item.category} layout={reduced ? false : "position"}
        initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: reduced ? 0 : index * 0.04 }}>
        <div className="r-card-top"><span className="badge">{t(`cat.${item.category}`)}</span><span className="badge badge-type">{t("type.skill")}</span></div>
        <h3>{item.title}</h3><p>{item.summary || t("common.noDescription")}</p>
        <span className="r-card-source">{item.source_name}</span>
      </motion.article>)}
      {demo && !results.length && <p className="empty">{t("landing.demo.empty")}</p>}
    </div>
  </div>;
}
