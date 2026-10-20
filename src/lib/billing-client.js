import { apiFetch } from "./auth.jsx";
import { navigate } from "./router.jsx";

export const formatPrice = (cents, currency = "BRL") => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency });
export const cycleLabel = { MONTHLY: "por mês", YEARLY: "por ano" };

// Inicia a contratação: sem login vai para o cadastro; com login o servidor cria o checkout no Asaas.
export async function subscribe(planCode, { signedIn }) {
  if (!signedIn) { navigate(`/cadastro?plano=${encodeURIComponent(planCode)}`); return; }
  const { url } = await apiFetch("/api/billing/checkout", { method: "POST", body: { planCode } });
  const target = new URL(url);
  if (target.protocol !== "https:" || !(target.hostname === "asaas.com" || target.hostname.endsWith(".asaas.com"))) throw new Error("Endereço de pagamento inesperado.");
  try { sessionStorage.setItem("bt:checkout-plan", planCode); } catch { /* opcional */ }
  location.assign(target.toString());
}
