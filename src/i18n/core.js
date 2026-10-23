// Núcleo do i18n sem React (também usado nos testes do Node): idiomas, detecção e busca de textos.
import pt from "./pt.js";
import en from "./en.js";
import es from "./es.js";

export const DEFAULT_LANG = "pt-BR";
export const LANGS = [
  { id: "pt-BR", label: "Português" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];
export const DICTS = { "pt-BR": pt, en, es };

// Idioma do navegador: pt* → pt-BR, es* → es, qualquer outro → en. Sem informação, o padrão do site.
export function detectLang(languages = []) {
  const first = [languages].flat().find((value) => typeof value === "string" && value.trim());
  if (!first) return DEFAULT_LANG;
  const code = first.trim().toLowerCase();
  if (code.startsWith("pt")) return "pt-BR";
  if (code.startsWith("es")) return "es";
  return "en";
}

// A escolha gravada no seletor prevalece sobre o navegador.
export function pickLang(saved, languages) {
  return DICTS[saved] ? saved : detectLang(languages);
}

const lookup = (dict, key) => key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);

// Texto pela chave ("landing.hero.title"); falta no idioma → português → a própria chave.
// Strings aceitam {variavel}; funções recebem as variáveis (plurais e frases montadas).
export function translate(lang, key, vars = {}) {
  let value = lookup(DICTS[lang] || pt, key);
  if (value === undefined) value = lookup(pt, key);
  if (value === undefined) return key;
  if (typeof value === "function") return value(vars);
  if (typeof value === "string") return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
  return value;
}
