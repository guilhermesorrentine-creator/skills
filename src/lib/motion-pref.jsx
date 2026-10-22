import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { resolveReduced } from "./motion-pref-core.js";
import { useT } from "../i18n/index.js";

export { resolveReduced };

// Preferência de movimento: segue o sistema por padrão; a pessoa pode ligar ou reduzir as animações
// só neste site. O resultado vai para `html[data-motion]` (CSS) e para o MotionConfig (motion/react).
const KEY = "arsenal:motion:v1";
const CHOICES = ["system", "full", "reduced"];
const media = () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null);
const readChoice = () => { try { const value = localStorage.getItem(KEY); return CHOICES.includes(value) ? value : "system"; } catch { return "system"; } };

const MotionContext = createContext({ reduced: false, systemReduced: false, choice: "system", setChoice: () => {} });


export function MotionPreferenceProvider({ children }) {
  const [choice, setChoiceState] = useState(readChoice);
  const [systemReduced, setSystemReduced] = useState(() => Boolean(media()?.matches));
  useEffect(() => {
    const query = media();
    if (!query) return undefined;
    const update = () => setSystemReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const reduced = resolveReduced(choice, systemReduced);
  useEffect(() => { document.documentElement.dataset.motion = reduced ? "reduced" : "full"; }, [reduced]);
  const value = useMemo(() => ({
    reduced, systemReduced, choice,
    setChoice: (next) => {
      setChoiceState(next);
      try { if (next === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, next); } catch { /* armazenamento indisponível: vale só nesta visita */ }
    },
  }), [reduced, systemReduced, choice]);
  return <MotionContext.Provider value={value}><MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig></MotionContext.Provider>;
}

export const useMotionPreference = () => useContext(MotionContext);
export const useReduced = () => useContext(MotionContext).reduced;

// Aviso discreto quando o sistema pede menos movimento: a pessoa pode ver as animações mesmo assim.
export function MotionToggle({ className = "" }) {
  const { reduced, systemReduced, choice, setChoice } = useMotionPreference();
  const { t } = useT();
  if (!systemReduced && choice === "system") return null;
  return <div className={`motion-toggle ${className}`} role="group" aria-label={t("motion.group")}>
    <span>{reduced ? t("motion.reduced") : t("motion.on")}</span>
    <button type="button" className="link" onClick={() => setChoice(reduced ? "full" : systemReduced ? "system" : "reduced")}>{reduced ? t("motion.show") : t("motion.reduce")}</button>
  </div>;
}
