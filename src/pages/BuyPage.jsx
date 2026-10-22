import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track, trackingForCheckout } from "../lib/meta-pixel.js";

// Compra sem cadastro: só o e-mail, direto para o Pix ou cartão do Asaas. A senha é criada no retorno.
export default function BuyPage({ signedIn, onEnter }) {
  const code = new URLSearchParams(location.search).get("edicao") || "edicao-1";
  const [edition, setEdition] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);

  useEffect(() => {
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEdition(d.editions.find((e) => e.code === code) || d.editions[0] || null)).catch(() => setEdition(null));
  }, [code]);
  useEffect(() => { if (signedIn) onEnter(`/acesso-pendente`); }, [signedIn, onEnter]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setExists(false);
    try {
      track("InitiateCheckout", { currency: "BRL", content_ids: [code], content_type: "product" });
      const response = await fetch("/api/checkout/guest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, editionCode: code, tracking: trackingForCheckout() }) });
      const data = await response.json();
      if (!response.ok) { setExists(data.error === "account_exists"); throw new Error(data.message || "Não foi possível iniciar o pagamento."); }
      try { localStorage.setItem("vx-claim", JSON.stringify({ order: data.order, key: data.key })); } catch { /* sem armazenamento: o retorno usa a URL */ }
      const target = new URL(data.url);
      if (target.protocol !== "https:" || !(target.hostname === "asaas.com" || target.hostname.endsWith(".asaas.com"))) throw new Error("Endereço de pagamento inesperado.");
      location.assign(target.toString());
    } catch (cause) { setError(cause.message); setBusy(false); }
  };

  return <main id="conteudo" className="auth-view">
    <div className="auth-card buy-card">
      <Brand/>
      <h1>Garanta seu acesso</h1>
      <p className="buy-price">{edition ? <><b>{formatPrice(edition.priceCents)}</b> pagamento único · acesso vitalício</> : "Carregando…"}</p>
      <ul className="buy-points"><li>2 mil skills organizadas por objetivo</li><li>Guias passo a passo em português</li><li>15 dias de garantia</li></ul>
      <form onSubmit={submit} className="stack">
        <label htmlFor="buy-email">Seu e-mail <span className="muted small">(é o seu login)</span></label>
        <input id="buy-email" className="input buy-input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com"/>
        {error && <p className="notice" role="alert">{error} {exists && <Link className="link" to={`/entrar?next=${encodeURIComponent("/acesso-pendente")}`}>Entrar</Link>}</p>}
        <button type="submit" className="btn btn-primary buy-submit" disabled={busy || !edition}>{busy ? "Abrindo pagamento…" : "Pagar com Pix ou cartão"}</button>
      </form>
      <p className="small muted">Pagamento seguro no Asaas. Depois do pagamento você cria sua senha na hora, sem esperar e-mail.</p>
      <button type="button" className="link small" onClick={() => navigate("/")}>← Conhecer a Voxelia</button>
    </div>
  </main>;
}
