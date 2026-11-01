import { navigate } from "./router.jsx";
import { funnel } from "./funnel.js";

export const formatPrice = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Preço da oferta vitalícia (Cakto). Igual a CAKTO_PRICE_CENTS em server/cakto.js.
export const OFFER_PRICE = formatPrice(3990);
// Preço de lançamento real: em 16/11/2026 o preço sobe para R$ 59,90 (Cakto, servidor e esta tela).
// O aviso some sozinho na data; o novo preço precisa ser aplicado nos três lugares.
const LAUNCH_ENDS = Date.parse("2026-11-16T00:00:00-03:00");
export const launchNote = (now = Date.now()) => now < LAUNCH_ENDS ? "Preço de lançamento até 15/11 · depois R$ 59,90" : null;

// Compra ou upgrade de uma edição: tudo passa pela página de compra direta (Pix ou cartão), com ou sem login;
// o servidor calcula o valor (no upgrade, desconta o que já foi pago).
export async function purchase(editionCode) {
  if (editionCode === "edicao-1") { navigate("/oferta?comprar=1"); return; }
  funnel("buy_click");
  navigate(`/comprar?edicao=${encodeURIComponent(editionCode)}`);
}
