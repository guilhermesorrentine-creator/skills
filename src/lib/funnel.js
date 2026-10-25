// Funil próprio, sem dados pessoais: sessão anônima + campanha/criativo (utm) da primeira visita da aba.
// Complementa o Pixel do Meta, que só carrega com consentimento de cookies.
const SID = "vx-sid", ORIGIN = "vx-origin";

function sid() {
  try {
    let value = localStorage.getItem(SID);
    if (!value) { value = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem(SID, value); }
    return value;
  } catch { return null; }
}

function origin() {
  const params = new URLSearchParams(location.search);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(ORIGIN) || "null"); } catch { /* sem armazenamento */ }
  if (saved && !params.get("utm_source")) return saved;
  let ref = "";
  try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* referrer inválido */ }
  const value = { source: params.get("utm_source") || (ref && !ref.endsWith(location.hostname) ? ref : "direto"), campaign: params.get("utm_campaign") || "", content: params.get("utm_content") || "" };
  try { sessionStorage.setItem(ORIGIN, JSON.stringify(value)); } catch { /* sem armazenamento */ }
  return value;
}

export const attributionForCheckout = () => origin();

export function funnel(name, extra = {}) {
  const id = sid();
  if (!id) return;
  const body = JSON.stringify({ name, sid: id, path: location.pathname, ...origin(), ...extra });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/funnel", new Blob([body], { type: "application/json" }))) return;
  } catch { /* cai no fetch */ }
  fetch("/api/funnel", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
}
