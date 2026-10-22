import { useSyncExternalStore } from "react";

// Consentimento de cookies de marketing (LGPD). Sem escolha, nada de rastreio é carregado.
// Valores: "granted" | "denied" | null (ainda não respondeu).
const KEY = "voxelia:consent:v1";
const listeners = new Set();

export function getConsent() {
  try { const value = localStorage.getItem(KEY); return value === "granted" || value === "denied" ? value : null; } catch { return null; }
}

export function setConsent(value) {
  try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY); } catch { /* navegação privada: vale só nesta página */ }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const useConsent = () => useSyncExternalStore(subscribe, getConsent, () => null);
