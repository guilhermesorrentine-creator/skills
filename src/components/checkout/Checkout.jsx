import { useEffect, useState } from "react";
import { Link, navigate } from "../../lib/router.jsx";
import { formatPrice } from "../../lib/billing-client.js";
import { apiFetch } from "../../lib/auth.jsx";
import { track, trackingForCheckout } from "../../lib/meta-pixel.js";
import { funnel } from "../../lib/funnel.js";

const isAsaas = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")); } catch { return false; }
};
const isCakto = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "pay.cakto.com.br"; } catch { return false; }
};
const maskCpf = (value) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

// Pagamento direto: e-mail (sem login), nome e CPF (exigidos pelo Asaas). Pix mostra o QR aqui; cartão abre a
// fatura do Asaas em outra aba (o Pro parcela em 12x). Confirma sozinho o pagamento.
// Com mais de uma edição em `codes`, mostra a escolha do plano; `intro(edition)` vem antes do preço.
export default function Checkout({ codes, signedIn, intro = null, labels = {}, hosted = false, expectedPriceCents = null }) {
  const [code, setCode] = useState(codes[0]);
  const [editions, setEditions] = useState([]);
  const [form, setForm] = useState({ email: "", name: "", document: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [charge, setCharge] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions)).catch(() => setEditions([]));
  }, []);
  const edition = editions.find((e) => e.code === code) || (codes.length === 1 ? editions[0] : null) || null;
  const priceMismatch = expectedPriceCents != null && edition && edition.priceCents !== expectedPriceCents;

  // Enquanto a cobrança está aberta, consulta o pedido; pago, segue para criar a senha (ou para a licença).
  useEffect(() => {
    if (!charge) return undefined;
    const id = window.setInterval(async () => {
      try {
        const response = await fetch("/api/checkout/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order: charge.order, key: charge.key }) });
        const data = await response.json();
        if (data.status !== "paid") return;
        if (signedIn) location.assign("/app/minha-licenca");
        else navigate(`/checkout/retorno?resultado=sucesso&pedido=${encodeURIComponent(charge.order)}&chave=${encodeURIComponent(charge.key)}`);
      } catch { /* tenta de novo */ }
    }, 4000);
    return () => window.clearInterval(id);
  }, [charge, signedIn]);

  const field = (name) => (event) => setForm((f) => ({ ...f, [name]: name === "document" ? maskCpf(event.target.value) : event.target.value }));
  const installments = edition?.installments || 1;
  const perMonth = edition ? Math.round(edition.priceCents / installments) : 0;
  const formId = `buy-${codes.join("-")}`;

  const pay = async (method, event) => {
    event?.preventDefault();
    if (expectedPriceCents != null && edition?.priceCents !== expectedPriceCents) return;
    const form_ = document.getElementById(formId);
    if (form_ && !form_.reportValidity()) return;
    const target = edition?.code || code;
    setBusy(method); setError(""); setExists(false);
    try {
      track("InitiateCheckout", { currency: "BRL", value: (edition?.priceCents || 0) / 100, content_ids: [target], content_type: "product" });
      const payload = { name: form.name, document: form.document, editionCode: target, method, tracking: trackingForCheckout() };
      let data;
      if (signedIn) data = await apiFetch("/api/checkout", { method: "POST", body: payload });
      else {
        const response = await fetch("/api/checkout/guest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, email: form.email }) });
        data = await response.json();
        if (!response.ok) { setExists(data.error === "account_exists"); throw new Error(data.message || "Não foi possível iniciar o pagamento."); }
      }
      try { localStorage.setItem("vx-claim", JSON.stringify({ order: data.order, key: data.key })); } catch { /* sem armazenamento: o retorno usa a URL */ }
      funnel("checkout", { order: data.order });
      if (isCakto(data.url) || hosted && isAsaas(data.url)) { location.assign(data.url); return; }
      if (data.pix || isAsaas(data.url)) { setCharge(data); setBusy(""); return; }
      throw new Error("Endereço de pagamento inesperado.");
    } catch (cause) { setError(cause.message); setBusy(""); if (hosted) form_?.scrollIntoView({ block: "start" }); }
  };

  const copyPix = async () => {
    try { await navigator.clipboard.writeText(charge.pix.payload); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* o código fica visível para copiar à mão */ }
  };

  if (charge && !charge.pix && charge.installments > 1) return <>
    <h2 className="buy-title">Finalize no cartão</h2>
    <p className="buy-price"><b>{charge.installments}x de {formatPrice(Math.round(charge.amountCents / charge.installments))}</b> · total {formatPrice(charge.amountCents)}</p>
    <a className="btn btn-primary buy-submit" href={charge.url} target="_blank" rel="noopener noreferrer">Abrir pagamento no cartão</a>
    <p className="waiting small"><span className="spinner" aria-hidden="true"/> Aguardando o pagamento. Esta página avança sozinha.</p>
    <button type="button" className="link small" onClick={() => pay("pix")}>Prefiro pagar à vista no Pix</button>
  </>;
  if (charge) return <>
    <h2 className="buy-title">Pague com Pix</h2>
    <p className="buy-price"><b>{formatPrice(charge.amountCents || edition?.priceCents || 0)}</b> · abra o app do banco e escaneie</p>
    {charge.pix ? <>
      <img className="buy-qr" src={`data:image/png;base64,${charge.pix.image}`} alt="QR Code do Pix" width="220" height="220"/>
      <button type="button" className="btn btn-primary buy-submit" onClick={copyPix}>{copied ? "Código copiado!" : "Copiar código Pix (copia e cola)"}</button>
    </> : <p className="notice">O QR não carregou. Use o botão abaixo para pagar pela fatura.</p>}
    <p className="waiting small"><span className="spinner" aria-hidden="true"/> Aguardando o pagamento. Esta página avança sozinha.</p>
    {installments > 1
      ? <button type="button" className="btn btn-ghost buy-submit" onClick={() => pay("card")}>Prefiro {installments}x no cartão</button>
      : isAsaas(charge.url) && <a className="btn btn-ghost buy-submit" href={charge.url} target="_blank" rel="noopener noreferrer">Prefiro pagar no cartão de crédito</a>}
    <p className="small muted">Pagou no cartão em outra aba? Volte para esta página: ela confirma sozinha.</p>
  </>;

  const choices = codes.map((c) => editions.find((e) => e.code === c)).filter(Boolean);
  if (priceMismatch) return <p className="notice" role="status">A oferta está sendo preparada. O pagamento por este valor ainda não está disponível.</p>;
  return <>
    {intro?.(edition)}
    {choices.length > 1 ? <div className="plan-choice" role="radiogroup" aria-label="Escolha o plano">{choices.map((e) => <label key={e.code} className={`plan-option${e.code === code ? " is-on" : ""}`}>
      <input type="radio" name={`${formId}-plan`} checked={e.code === code} onChange={() => setCode(e.code)}/>
      <span className="plan-name">{labels[e.code]?.name || e.name}{labels[e.code]?.badge && <em>{labels[e.code].badge}</em>}</span>
      <span className="plan-price">{e.installments > 1 ? <><b>{e.installments}x de {formatPrice(Math.round(e.priceCents / e.installments))}</b> ou {formatPrice(e.priceCents)} no Pix</> : <><b>{formatPrice(e.priceCents)}</b> pagamento único</>}</span>
      {labels[e.code]?.note && <span className="plan-note">{labels[e.code].note}</span>}
    </label>)}</div>
      : <p className="buy-price">{!edition ? "Carregando…" : installments > 1
        ? <><b>{installments}x de {formatPrice(perMonth)}</b> no cartão · ou {formatPrice(edition.priceCents)} à vista no Pix</>
        : <><b>{formatPrice(edition.priceCents)}</b> pagamento único · acesso vitalício</>}</p>}
    {edition?.mcp && signedIn && <p className="small muted">Já tem o acesso vitalício? O valor que você pagou é descontado.</p>}
    <form id={formId} onSubmit={(e) => pay(installments > 1 ? "card" : "pix", e)} className="stack">
      {!signedIn && <><label htmlFor={`${formId}-email`}>Seu e-mail <span className="muted small">(é o seu login)</span></label>
        <input id={`${formId}-email`} className="input buy-input" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={field("email")} placeholder="voce@email.com"/></>}
      {!hosted && <><label htmlFor={`${formId}-name`}>Nome completo</label>
      <input id={`${formId}-name`} className="input buy-input" autoComplete="name" required minLength={3} value={form.name} onChange={field("name")}/>
      <label htmlFor={`${formId}-cpf`}>CPF <span className="muted small">(exigido pelo meio de pagamento)</span></label>
      <input id={`${formId}-cpf`} className="input buy-input" inputMode="numeric" autoComplete="off" required value={form.document} onChange={field("document")} placeholder="000.000.000-00"/></>}
      {error && <p className="notice" role="alert">{error} {exists && <Link className="link" to={`/entrar?next=${encodeURIComponent(`/comprar?edicao=${edition?.code || code}`)}`}>Entrar</Link>}</p>}
      {installments > 1 ? <>
        <button type="submit" className="btn btn-primary buy-submit" disabled={Boolean(busy) || !edition}>{busy === "card" ? "Gerando pagamento…" : `Pagar ${installments}x de ${formatPrice(perMonth)} no cartão`}</button>
        <button type="button" className="btn btn-ghost buy-submit" disabled={Boolean(busy) || !edition} onClick={(e) => pay("pix", e)}>{busy === "pix" ? "Gerando Pix…" : `Pagar à vista no Pix (${formatPrice(edition.priceCents)})`}</button>
      </> : <button type="submit" className="btn btn-primary buy-submit" disabled={Boolean(busy) || !edition}>{busy ? "Abrindo checkout…" : hosted ? "Continuar para pagamento" : "Pagar com Pix ou cartão"}</button>}
    </form>
    <p className="small muted">Pagamento seguro pela {edition?.code === "edicao-1" ? "Cakto" : "Asaas"}. O acesso é liberado quando a compra é confirmada. Use no pagamento o mesmo e-mail {signedIn ? "desta conta" : "informado acima"}. {signedIn ? "Depois, entre com sua conta." : "Você receberá o link para criar sua senha no e-mail informado."}</p>
    <p className="small muted">Ao pagar, você concorda com os <a className="link" href="/termos" target="_blank" rel="noopener">Termos de uso</a> e a política de <a className="link" href="/compra-e-reembolso" target="_blank" rel="noopener">Compra e reembolso</a>. Garantia de 15 dias.</p>
  </>;
}
