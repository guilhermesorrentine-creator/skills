import { useState } from "react";

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* continue to local fallback */ }
  }
  const field = document.createElement("textarea");
  field.value = text; field.style.position = "fixed"; field.style.opacity = "0";
  document.body.append(field); field.select();
  const copied = document.execCommand("copy"); field.remove(); return copied;
}

export function CopyButton({ value, children = "Copiar" }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (await copyText(value)) {
      setCopied(true); window.setTimeout(() => setCopied(false), 1600);
    }
  };
  return <button className={`copy-button ${copied ? "is-copied" : ""}`} onClick={onCopy}>{copied ? "Copiado ✓" : children}<span className="sr-only" role="status">{copied ? "Copiado para a área de transferência" : ""}</span></button>;
}
