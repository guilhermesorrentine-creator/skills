import { apiFetch } from "./auth.jsx";
import { navigate } from "./router.jsx";

export const formatPrice = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Compra ou upgrade de uma edição: sem login vai ao cadastro; com login o servidor calcula
// o valor, cria o pedido e o Checkout avulso no Asaas.
export async function purchase(editionCode, { signedIn }) {
  if (!signedIn) { navigate(`/cadastro?edicao=${encodeURIComponent(editionCode)}`); return; }
  const result = await apiFetch("/api/checkout", { method: "POST", body: { editionCode } });
  if (result.activated) { navigate("/app"); return; }
  const target = new URL(result.url);
  if (target.protocol !== "https:" || !(target.hostname === "asaas.com" || target.hostname.endsWith(".asaas.com"))) throw new Error("Endereço de pagamento inesperado.");
  location.assign(target.toString());
}
