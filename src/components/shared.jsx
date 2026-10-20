import { useState } from "react";
import { queryTerms } from "../lib/search.js";

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* continue to local fallback */ }
  }
  const field = document.createElement("textarea");
  field.value = text; field.style.position = "fixed"; field.style.opacity = "0";
  document.body.append(field); field.select();
  const copied = document.execCommand("copy"); field.remove(); return copied;
}

export function CopyButton({ value, children = "Copiar", className = "" }) {
  const [state, setState] = useState("idle");
  const onCopy = async () => {
    setState(await copyText(value) ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1800);
  };
  const label = state === "copied" ? "Copiado ✓" : state === "failed" ? "Falha ao copiar" : children;
  return <button type="button" className={`copy-button ${state === "copied" ? "is-copied" : ""} ${className}`} onClick={onCopy}>{label}<span className="sr-only" role="status">{state === "copied" ? "Copiado para a área de transferência" : state === "failed" ? "Não foi possível copiar; selecione o texto manualmente." : ""}</span></button>;
}

export function Highlight({ text = "", query = "" }) {
  const terms = queryTerms(query).filter((term) => term.length > 1);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return String(text).split(pattern).map((part, index) => index % 2 === 1 ? <mark key={`${index}-${part}`}>{part}</mark> : part);
}

export function promptFor(skill) {
  return `Consulte a skill ${skill.name}${skill.path ? ` (${skill.path})` : ""} em ${skill.repoName}. Use as instruções documentadas que se aplicarem a [objetivo]. Contexto: [contexto]. Entrega esperada: [formato].`;
}

export function detailPromptFor(skill) {
  return `Use as instruções da skill ${skill.name} para [objetivo].\nContexto: [contexto do projeto]\nResultado esperado: [formato]\nConsidere somente os requisitos confirmados no conteúdo original.`;
}

export function FavoriteButton({ skill, active, onToggle, compact = false }) {
  return <button type="button" className={`icon-action ${active ? "is-on" : ""}`} aria-pressed={active} aria-label={active ? `Remover ${skill.name} dos favoritos` : `Favoritar ${skill.name}`} title={active ? "Favoritada" : "Favoritar"} onClick={(event) => { event.stopPropagation(); onToggle(skill.id); }}>
    <span aria-hidden="true">{active ? "★" : "☆"}</span>{!compact && <span className="icon-action-label">{active ? "Favoritada" : "Favoritar"}</span>}
  </button>;
}

export function CompareButton({ skill, active, onToggle, compact = false }) {
  return <button type="button" className={`icon-action ${active ? "is-on" : ""}`} aria-pressed={active} aria-label={active ? `Remover ${skill.name} da comparação` : `Comparar ${skill.name}`} title={active ? "Na comparação" : "Comparar"} onClick={(event) => { event.stopPropagation(); onToggle(skill.id); }}>
    <span aria-hidden="true">{active ? "◆" : "◇"}</span>{!compact && <span className="icon-action-label">{active ? "Comparando" : "Comparar"}</span>}
  </button>;
}
