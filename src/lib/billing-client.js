import { apiFetch } from "./auth.jsx";
import { navigate } from "./router.jsx";
import { track, trackingForCheckout } from "./meta-pixel.js";
import { getLang, t } from "../i18n/index.js";

// Sempre em reais (o Asaas só cobra em BRL); a escrita do número segue o idioma da página.
export const formatPrice = (cents) => (cents / 100).toLocaleString(getLang(), { style: "currency", currency: "BRL" });

// Compra ou upgrade de uma edição: sem login vai à compra rápida (só e-mail); com login o servidor calcula
// o valor, cria o pedido e o Checkout avulso no Asaas.
export async function purchase(editionCode, { signedIn }) {
  if (!signedIn) { navigate(`/comprar?edicao=${encodeURIComponent(editionCode)}`); return; }
  track("InitiateCheckout", { currency: "BRL", content_ids: [editionCode], content_type: "product" });
  const result = await apiFetch("/api/checkout", { method: "POST", body: { editionCode, tracking: trackingForCheckout() } });
  if (result.activated) { navigate("/app"); return; }
  const target = new URL(result.url);
  if (target.protocol !== "https:" || !(target.hostname === "asaas.com" || target.hostname.endsWith(".asaas.com"))) throw new Error(t("common.unexpectedPayment"));
  location.assign(target.toString());
}
