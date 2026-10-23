import { useState } from "react";
import { queryTerms } from "../lib/search.js";
import { useT } from "../i18n/index.js";

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* continue to local fallback */ }
  }
  const field = document.createElement("textarea");
  field.value = text; field.style.position = "fixed"; field.style.opacity = "0";
  document.body.append(field); field.select();
  const copied = document.execCommand("copy"); field.remove(); return copied;
}

export function CopyButton({ value, children, className = "" }) {
  const { t } = useT();
  const [state, setState] = useState("idle");
  const onCopy = async () => {
    setState(await copyText(value) ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1800);
  };
  const label = state === "copied" ? t("common.copied") : state === "failed" ? t("common.copyFailed") : children ?? t("common.copy");
  return <button type="button" className={`copy-button ${state === "copied" ? "is-copied" : ""} ${className}`} onClick={onCopy}>{label}<span className="sr-only" role="status">{state === "copied" ? t("common.copiedSr") : state === "failed" ? t("common.copyFailedSr") : ""}</span></button>;
}

export function Highlight({ text = "", query = "" }) {
  const terms = queryTerms(query).filter((term) => term.length > 1);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return String(text).split(pattern).map((part, index) => index % 2 === 1 ? <mark key={`${index}-${part}`}>{part}</mark> : part);
}
