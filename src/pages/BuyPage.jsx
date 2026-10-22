import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { track, trackingForCheckout } from "../lib/meta-pixel.js";

const isAsaas = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")); } catch { return false; }
};
const maskCpf = (value) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

// Compra sem cadastro: e-mail, nome e CPF (exigidos pelo Asaas para o Pix). O QR aparece aqui mesmo;
// cartão abre a fatura do Asaas em outra aba. Esta página confirma sozinha e leva para criar a senha.
export default function BuyPage({ signedIn, onEnter }) {
  const code = new URLSearchParams(location.search).get("edicao") || "edicao-1";
  const [edition, setEdition] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", document: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [charge, setCharge] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEdition(d.editions.find((e) => e.code === code) || d.editions[0] || null)).catch(() => setEdition(null));
  }, [code]);
  useEffect(() => { if (signedIn) onEnter(`/acesso-pendente`); }, [signedIn, onEnter]);

  // Enquanto o QR está na tela, consulta o pedido; pago, segue para criar a senha.
  useEffect(() => {
    if (!charge) return undefined;
    const id = window.setInterval(async () => {
      try {
        const response = await fetch("/api/checkout/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: charge.order, key: charge.key }) });
        const data = await response.json();
        if (data.status === "paid") navigate(`/checkout/retorno?resultado=sucesso&pedido=${encodeURIComponent(charge.order)}&chave=${encodeURIComponent(charge.key)}`);
      } catch { /* tenta de novo */ }
    }, 4000);
    return () => window.clearInterval(id);
  }, [charge]);

  const field = (name) => (event) => setForm((f) => ({ ...f, [name]: name === "document" ? maskCpf(event.target.value) : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setExists(false);
    try {
      track("InitiateCheckout", { currency: "BRL", content_ids: [code], content_type: "product" });
      const response = await fetch("/api/checkout/guest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, editionCode: code, tracking: trackingForCheckout() }) });
      const data = await response.json();
      if (!response.ok) { setExists(data.error === "account_exists"); throw new Error(data.message || "Não foi possível iniciar o pagamento."); }
      try { localStorage.setItem("vx-claim", JSON.stringify({ order: data.order, key: data.key })); } catch { /* sem armazenamento: o retorno usa a URL */ }
      if (data.pix || isAsaas(data.url)) { setCharge(data); setBusy(false); return; }
      throw new Error("Endereço de pagamento inesperado.");
    } catch (cause) { setError(cause.message); setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(charge.pix.payload); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* o código fica visível para copiar à mão */ }
  };

  return <main id="conteudo" className="auth-view">
    <div className="auth-card buy-card">
      <Brand/>
      {!charge ? <>
        <h1>Garanta seu acesso</h1>
        <p className="buy-price">{edition ? <><b>{formatPrice(edition.priceCents)}</b> pagamento único · acesso vitalício</> : "Carregando…"}</p>
        <ul className="buy-points"><li>2 mil skills organizadas por objetivo</li><li>Guias passo a passo em português</li><li>15 dias de garantia</li></ul>
        <form onSubmit={submit} className="stack">
          <label htmlFor="buy-email">Seu e-mail <span className="muted small">(é o seu login)</span></label>
          <input id="buy-email" className="input buy-input" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={field("email")} placeholder="voce@email.com"/>
          <label htmlFor="buy-name">Nome completo</label>
          <input id="buy-name" className="input buy-input" autoComplete="name" required minLength={3} value={form.name} onChange={field("name")}/>
          <label htmlFor="buy-cpf">CPF <span className="muted small">(exigido para o Pix)</span></label>
          <input id="buy-cpf" className="input buy-input" inputMode="numeric" autoComplete="off" required value={form.document} onChange={field("document")} placeholder="000.000.000-00"/>
          {error && <p className="notice" role="alert">{error} {exists && <Link className="link" to={`/entrar?next=${encodeURIComponent("/acesso-pendente")}`}>Entrar</Link>}</p>}
          <button type="submit" className="btn btn-primary buy-submit" disabled={busy || !edition}>{busy ? "Gerando pagamento…" : "Pagar com Pix ou cartão"}</button>
        </form>
        <p className="small muted">Pagamento seguro pelo Asaas. Depois do pagamento você cria sua senha na hora, sem esperar e-mail.</p>
        <button type="button" className="link small" onClick={() => navigate("/")}>← Conhecer a Voxelia</button>
      </> : <>
        <h1>Pague com Pix</h1>
        <p className="buy-price"><b>{formatPrice(charge.amountCents || edition?.priceCents || 0)}</b> · abra o app do banco e escaneie</p>
        {charge.pix ? <>
          <img className="buy-qr" src={`data:image/png;base64,${charge.pix.image}`} alt="QR Code do Pix" width="220" height="220"/>
          <button type="button" className="btn btn-primary buy-submit" onClick={copy}>{copied ? "Código copiado!" : "Copiar código Pix (copia e cola)"}</button>
        </> : <p className="notice">O QR não carregou. Use o botão abaixo para pagar pela fatura.</p>}
        <p className="waiting small"><span className="spinner" aria-hidden="true"/> Aguardando o pagamento. Esta página avança sozinha.</p>
        {isAsaas(charge.url) && <a className="btn btn-ghost buy-submit" href={charge.url} target="_blank" rel="noopener noreferrer">Prefiro pagar no cartão de crédito</a>}
        <p className="small muted">Pagou no cartão em outra aba? Volte para esta página: ela confirma sozinha.</p>
      </>}
    </div>
  </main>;
}
