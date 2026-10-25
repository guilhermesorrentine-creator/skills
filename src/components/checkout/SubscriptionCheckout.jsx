import { useState } from "react";
import { apiFetch } from "../../lib/auth.jsx";
import { trackingForCheckout, track } from "../../lib/meta-pixel.js";
import { funnel, attributionForCheckout } from "../../lib/funnel.js";
import { Link } from "../../lib/router.jsx";

export default function SubscriptionCheckout({ signedIn }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const pay = async (event) => {
    const form = event.currentTarget;
    event.preventDefault(); setBusy(true); setError(""); setExists(false);
    try {
      track("InitiateCheckout", { currency: "BRL", value: 49.9, content_ids: ["voxelia-mensal"], content_type: "product" });
      const body = { email, tracking: trackingForCheckout(), attribution: attributionForCheckout() };
      let data;
      if (signedIn) data = await apiFetch("/api/subscription/checkout", { method: "POST", body });
      else {
        const response = await fetch("/api/subscription/guest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        data = await response.json();
        if (!response.ok) { setExists(data.error === "account_exists"); throw new Error(data.message || "Não foi possível iniciar a assinatura."); }
      }
      const url = new URL(data.url);
      if (url.protocol !== "https:" || !(url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com"))) throw new Error("Endereço de pagamento inesperado.");
      if (data.session && data.key) try { localStorage.setItem("vx-claim", JSON.stringify({ session: data.session, key: data.key })); } catch { /* retorno contém a chave */ }
      funnel("checkout");
      location.assign(data.url);
    } catch (cause) { setError(cause.message); setBusy(false); form.scrollIntoView({ block: "start" }); }
  };
  return <form className="stack" onSubmit={pay}>
    <p className="buy-price"><b>R$ 49,90 por mês</b> no cartão · cobrança automática</p>
    {!signedIn && <><label htmlFor="monthly-email">Seu e-mail <span className="muted small">(será seu login)</span></label>
      <input id="monthly-email" className="input buy-input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com"/></>}
    {error && <p className="notice" role="alert">{error} {exists && <Link className="link" to="/entrar?next=/oferta">Entrar</Link>}</p>}
    <button type="submit" className="btn btn-primary buy-submit" disabled={busy}>{busy ? "Abrindo pagamento…" : "Assinar por R$ 49,90/mês"}</button>
    <p className="small muted">Acervo e conexão com IA enquanto a assinatura estiver paga. Cancele quando quiser em Minha licença; o acesso segue até o fim do período pago. Pagamento seguro no Asaas. Ao assinar, você concorda com os <a className="link" href="/termos" target="_blank" rel="noopener">Termos de uso</a>.</p>
  </form>;
}
