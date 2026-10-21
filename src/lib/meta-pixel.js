import { getConsent } from "./consent.js";

// Pixel do Meta: só carrega com VITE_META_PIXEL_ID e consentimento. O Purchase não sai daqui:
// é enviado pelo servidor (API de Conversões) quando o Asaas confirma o pagamento.
const PIXEL_ID = /^\d{5,20}$/.test(import.meta.env.VITE_META_PIXEL_ID || "") ? import.meta.env.VITE_META_PIXEL_ID : "";
let loaded = false;

export const pixelConfigured = Boolean(PIXEL_ID);
export const pixelEnabled = () => pixelConfigured && getConsent() === "granted";

// Equivalente ao snippet oficial, sem script inline (a CSP só permite scripts por arquivo).
function load() {
  if (loaded || !pixelEnabled()) return loaded;
  const fbq = function (...args) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
  if (!window.fbq) {
    Object.assign(fbq, { push: fbq, loaded: true, version: "2.0", queue: [] });
    window.fbq = window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq("init", PIXEL_ID);
  loaded = true;
  return true;
}

export function track(event, params, eventId) {
  if (!load()) return;
  window.fbq("track", event, params || {}, eventId ? { eventID: eventId } : undefined);
}

export const pageView = () => track("PageView");

const cookie = (name) => document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || null;

// Enviado com o pedido para a API de Conversões ligar a compra ao clique no anúncio.
export function trackingForCheckout() {
  if (!pixelEnabled()) return { consent: false };
  return { consent: true, fbp: cookie("_fbp"), fbc: cookie("_fbc"), pageUrl: location.href.startsWith("https://") ? location.href.split("#")[0] : null };
}
