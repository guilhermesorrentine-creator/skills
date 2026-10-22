import { useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANG, DICTS, LANGS, detectLang, pickLang, translate } from "./core.js";

export { LANGS, detectLang, pickLang, translate };

// Idioma atual: escolha salva no seletor ou idioma do navegador. Vale para a página inteira e
// atualiza `<html lang>` (o HTML pré-renderizado continua em pt-BR).
const KEY = "vx:lang";
const listeners = new Set();
const readSaved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
let current = typeof navigator === "undefined" ? DEFAULT_LANG : pickLang(readSaved(), navigator.languages?.length ? navigator.languages : [navigator.language]);
const apply = () => { if (typeof document !== "undefined") document.documentElement.lang = current; };
apply();

export const getLang = () => current;

export function setLang(next) {
  if (!DICTS[next] || next === current) return;
  current = next;
  try { localStorage.setItem(KEY, next); } catch { /* sem armazenamento: vale só nesta visita */ }
  apply();
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

// Fora de componentes (mensagens de erro do cliente): texto no idioma atual.
export const t = (key, vars) => translate(current, key, vars);

// Nos componentes: re-renderiza quando o idioma muda. `n` e `date` usam o locale do idioma.
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang, () => DEFAULT_LANG);
  return useMemo(() => ({
    lang,
    t: (key, vars) => translate(lang, key, vars),
    n: (value) => Number(value).toLocaleString(lang),
    date: (value, options = { day: "2-digit", month: "long", year: "numeric" }) => (value ? new Date(value).toLocaleDateString(lang, options) : "—"),
  }), [lang]);
}
