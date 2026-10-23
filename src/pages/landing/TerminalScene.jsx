import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useReduced } from "../../lib/motion-pref.jsx";
import { motionTokens } from "../../lib/motion-tokens.js";
import { Link } from "../../lib/router.jsx";
import { resourcePath } from "../../lib/resources.js";
import { useT } from "../../i18n/index.js";
import CyberpunkCharacter from "../../components/categories/CyberpunkCharacter.jsx";
import { CELLS, finalFrame, frameAt, localizeScenario, SCENARIOS, sceneAt } from "./terminal-script.js";

// Terminal guiado pelo scroll: o bloco fica fixo enquanto a página rola; o progresso do scroll
// escreve o terminal, avança as etapas e troca de área. O personagem é o professor da etapa atual.
// Com movimento reduzido, mostra a cena completa e as abas trocam de área.

const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function Spinner({ seed = 0 }) {
  return <span className="term-spin">{SPIN[Math.abs(Math.floor(seed)) % SPIN.length]}</span>;
}

function Line({ line, seed }) {
  if (line.kind === "cmd") return <p className="term-line term-cmd"><span className="term-prompt">{line.prompt}</span> {line.text}</p>;
  if (line.kind === "out") return <p className="term-line term-out"><span className="term-ok">✓</span> {line.text}</p>;
  if (line.kind === "done") return <p className="term-line term-done"><span className="term-ok">✓</span> <b>{line.text}</b></p>;
  return <p className={`term-line term-run ${line.state === "busy" ? "is-busy" : ""}`}>{line.state === "busy" ? <Spinner seed={seed}/> : <span className="term-ok">✓</span>} {line.text}</p>;
}

export default function TerminalScene() {
  const reduced = useReduced();
  const { t, lang } = useT();
  const categoryLabel = (id) => t(`cat.${id}`);
  const trackRef = useRef(null);
  const bodyRef = useRef(null);
  const [p, setP] = useState(0);
  const [picked, setPicked] = useState(0);
  const [cheer, setCheer] = useState(false);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (value) => { if (!reduced) setP(Math.round(value * 2000) / 2000); });

  const { index, q } = reduced ? { index: picked, q: 1 } : sceneAt(p);
  const scenario = localizeScenario(SCENARIOS[index], lang);
  const frame = reduced ? finalFrame(scenario) : frameAt(scenario, q);
  const running = frame.status === "running";

  // Ao concluir uma cena, o professor comemora com um pulo.
  const doneKey = frame.status === "done" ? index : -1;
  useEffect(() => {
    if (reduced || doneKey < 0) return undefined;
    setCheer(true);
    const id = window.setTimeout(() => setCheer(false), 900);
    return () => window.clearTimeout(id);
  }, [doneKey, reduced]);

  useEffect(() => { const body = bodyRef.current; if (body) body.scrollTop = body.scrollHeight; }, [frame.lines.length, frame.typing?.text, frame.progress?.value]);

  // Abas: no modo animado, rolam até a cena; no reduzido, trocam a cena mostrada.
  const goTo = (target) => {
    if (reduced) { setPicked(target); return; }
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const span = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((target + 0.04) / SCENARIOS.length), behavior: "smooth" });
  };

  const lesson = scenario.lessons[frame.lesson];
  const spinSeed = p * 900;
  return <div ref={trackRef} className={`term-track ${reduced ? "is-static" : ""}`} style={{ "--scenes": SCENARIOS.length }}>
    <div className="term-sticky" data-category={scenario.category}>
      <aside className="term-teacher">
        <div className="term-coach">
          <span className="term-coach-art" aria-hidden="true">
            <CyberpunkCharacter category={scenario.category} active={running} fidget={cheer ? "hop" : null} look={{ x: 1, y: 0 }}/>
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${index}-${frame.lesson}`} className="term-bubble" aria-live="polite"
              initial={reduced ? false : { opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -6, transition: { duration: 0.14, ease: motionTokens.easing.accelExit } }}
              transition={{ duration: 0.3, ease: motionTokens.easing.snapSettle }}>
              <b>{categoryLabel(scenario.category)}</b> {lesson.say}
            </motion.p>
          </AnimatePresence>
        </div>
        <ol className="term-steps" aria-label={t("terminal.steps", { title: scenario.title })}>
          {scenario.lessons.map((item, i) => {
            const state = frame.status === "done" || i < frame.lesson ? "done" : i === frame.lesson && frame.status !== "idle" ? "now" : "next";
            return <li key={item.title} className={`term-step is-${state}`} aria-current={state === "now" ? "step" : undefined}>
              <span className="term-step-n" aria-hidden="true">{state === "done" ? "✓" : i + 1}</span>
              <span>{item.title}</span>
            </li>;
          })}
        </ol>
      </aside>

      <motion.div className="term-window" data-done={frame.status === "done" || undefined}
        initial={reduced ? false : { opacity: 0, y: 56, scale: 1.08, filter: "blur(10px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} viewport={{ once: true, amount: 0.3 }}
        transition={{ default: { duration: 0.7, ease: motionTokens.easing.snapSettle }, opacity: { duration: 0.18 } }}>
        <div className="term-bar">
          <span className="term-dots" aria-hidden="true"><i/><i/><i/></span>
          <div className="term-tabs" role="group" aria-label={t("terminal.tabs")}>
            {SCENARIOS.map((item, i) => <button key={item.category} type="button" className={`term-tab ${i === index ? "is-on" : ""} ${!reduced && i < index ? "is-past" : ""}`} aria-pressed={i === index} onClick={() => goTo(i)}>
              {i === index && <motion.span layoutId="term-tab-pill" className="term-tab-pill" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} aria-hidden="true"/>}
              <span>{categoryLabel(item.category)}</span>
            </button>)}
          </div>
        </div>
        {!reduced && <div className="term-meter" aria-hidden="true"><span style={{ transform: `scaleX(${p})` }}/></div>}

        <p className="sr-only">{t("terminal.sr", { title: scenario.title, lines: finalFrame(scenario).lines.map((line) => line.text).join(". ") })}</p>
        <div className="term-body" ref={bodyRef} aria-hidden="true" style={reduced ? undefined : { transform: `scale(${1 + q * 0.02})` }}>
          <p className="term-title"><span>{scenario.title}</span></p>
          {frame.lines.map((line, i) => <Line key={i} line={line} seed={spinSeed}/>)}
          {frame.typing && <p className="term-line term-cmd"><span className="term-prompt">{frame.typing.prompt}</span> {frame.typing.text}<span className="term-caret"/></p>}
          {frame.progress && <p className="term-line term-progress"><Spinner seed={spinSeed}/> {frame.progress.label} <span className="term-bar-cells">{"▰".repeat(frame.progress.value)}{"▱".repeat(CELLS - frame.progress.value)}</span> {Math.round((frame.progress.value / CELLS) * 100)}%</p>}
          {frame.status === "idle" && <p className="term-line term-idle"><span className="term-caret"/></p>}
        </div>

        <AnimatePresence>
          {frame.status === "done" && <motion.div key={`r-${index}`} className="term-result" initial={reduced ? false : { opacity: 0, y: 28, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 16, transition: { duration: 0.18, ease: motionTokens.easing.accelExit } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}>
            <span className="badge">{categoryLabel(scenario.category)}</span>
            <span>{t("terminal.full")} <b>{scenario.guideTitle}</b></span>
            <Link className="btn btn-primary btn-sm" to={resourcePath(scenario.guide)}>{t("terminal.guide")}</Link>
          </motion.div>}
        </AnimatePresence>
      </motion.div>
      <p className="term-note">{reduced ? t("terminal.noteReduced") : t("terminal.note")}</p>
    </div>
  </div>;
}
