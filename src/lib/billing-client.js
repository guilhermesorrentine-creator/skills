import { navigate } from "./router.jsx";
import { funnel } from "./funnel.js";

export const formatPrice = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Compra ou upgrade de uma edição: tudo passa pela página de compra direta (Pix ou cartão), com ou sem login;
// o servidor calcula o valor (no upgrade, desconta o que já foi pago).
export async function purchase(editionCode) {
  if (editionCode === "edicao-1") { navigate("/oferta?comprar=1"); return; }
  funnel("buy_click");
  navigate(`/comprar?edicao=${encodeURIComponent(editionCode)}`);
}
