import { navigate } from "./router.jsx";
import { getLang } from "../i18n/index.js";
import { funnel } from "./funnel.js";

// Sempre em reais (o Asaas só cobra em BRL); a escrita do número segue o idioma da página.
export const formatPrice = (cents) => (cents / 100).toLocaleString(getLang(), { style: "currency", currency: "BRL" });

// Compra ou upgrade de uma edição: tudo passa pela página de compra direta (Pix ou cartão), com ou sem login;
// o servidor calcula o valor (no upgrade, desconta o que já foi pago).
export async function purchase(editionCode) {
  funnel("buy_click");
  navigate(`/comprar?edicao=${encodeURIComponent(editionCode)}`);
}
