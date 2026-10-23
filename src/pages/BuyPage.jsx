import { useEffect, useState } from "react";
import { Brand } from "../components/site/SiteNav.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { apiFetch } from "../lib/auth.jsx";
import { track, trackingForCheckout } from "../lib/meta-pixel.js";
import { funnel } from "../lib/funnel.js";
import { useT } from "../i18n/index.js";

const isAsaas = (value) => {
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")); } catch { return false; }
};
const maskCpf = (value) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

// Compra direta: e-mail (sem login), nome e CPF (exigidos pelo Asaas). Pix mostra o QR aqui; cartão abre a
// fatura do Asaas em outra aba (o Pro parcela em 12x). Esta página confirma sozinha o pagamento.
export default function BuyPage({ signedIn }) {
  const { t } = useT();
  const code = new URLSearchParams(location.search).get("edicao") || "edicao-1";
  const [edition, setEdition] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", document: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [charge, setCharge] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { funnel("buy_page"); }, []);
  useEffect(() => {
    fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEdition(d.editions.find((e) => e.code === code) || d.editions[0] || null)).catch(() => setEdition(null));
  }, [code]);

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
  // Texto de venda por produto: vitalício (acervo) ou Pro (acervo + conexão com a IA por 12 meses).
  const copy = edition?.mcp ? { title: t("buy.proTitle"), points: t("buy.proPoints") } : { title: t("buy.title"), points: t("buy.points") };
  const perMonth = edition ? Math.round(edition.priceCents / installments) : 0;

  const pay = async (method, event) => {
    event?.preventDefault();
    const form_ = document.getElementById("buy-form");
    if (form_ && !form_.reportValidity()) return;
    setBusy(method); setError(""); setExists(false);
    try {
      track("InitiateCheckout", { currency: "BRL", value: (edition?.priceCents || 0) / 100, content_ids: [code], content_type: "product" });
      const payload = { name: form.name, document: form.document, editionCode: code, method, tracking: trackingForCheckout() };
      let data;
      if (signedIn) data = await apiFetch("/api/checkout", { method: "POST", body: payload });
      else {
        const response = await fetch("/api/checkout/guest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, email: form.email }) });
        data = await response.json();
        if (!response.ok) { setExists(data.error === "account_exists"); throw new Error(data.message || t("buy.startFailed")); }
      }
      try { localStorage.setItem("vx-claim", JSON.stringify({ order: data.order, key: data.key })); } catch { /* sem armazenamento: o retorno usa a URL */ }
      funnel("checkout", { order: data.order });
      if (data.pix || isAsaas(data.url)) { setCharge(data); setBusy(""); return; }
      throw new Error(t("common.unexpectedPayment"));
    } catch (cause) { setError(cause.message); setBusy(""); }
  };

  const copyPix = async () => {
    try { await navigator.clipboard.writeText(charge.pix.payload); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } catch { /* o código fica visível para copiar à mão */ }
  };

  const cardCharge = charge && !charge.pix && charge.installments > 1;
  return <main id="conteudo" className="auth-view">
    <div className="auth-card buy-card">
      <Brand/>
      {!charge ? <>
        <h1>{copy.title}</h1>
        <p className="buy-price">{!edition ? t("common.loading") : installments > 1
          ? <><b>{t("buy.installments", { n: installments, price: formatPrice(perMonth) })}</b> {t("buy.installmentsNote", { price: formatPrice(edition.priceCents) })}</>
          : <><b>{formatPrice(edition.priceCents)}</b> {t("buy.priceNote")}</>}</p>
        {edition && t("buy.currencyNote") && <p className="small muted">{t("buy.currencyNote")}</p>}
        {edition?.mcp && signedIn && <p className="small muted">{t("buy.credit")}</p>}
        <ul className="buy-points">{copy.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <form id="buy-form" onSubmit={(e) => pay(installments > 1 ? "card" : "pix", e)} className="stack">
          {!signedIn && <><label htmlFor="buy-email">{t("buy.email")} <span className="muted small">{t("buy.emailHint")}</span></label>
            <input id="buy-email" className="input buy-input" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={field("email")} placeholder={t("buy.emailPlaceholder")}/></>}
          <label htmlFor="buy-name">{t("buy.name")}</label>
          <input id="buy-name" className="input buy-input" autoComplete="name" required minLength={3} value={form.name} onChange={field("name")}/>
          <label htmlFor="buy-cpf">{t("buy.cpf")} <span className="muted small">{t("buy.cpfHint")}</span></label>
          <input id="buy-cpf" className="input buy-input" inputMode="numeric" autoComplete="off" required value={form.document} onChange={field("document")} placeholder="000.000.000-00"/>
          {error && <p className="notice" role="alert">{error} {exists && <Link className="link" to={`/entrar?next=${encodeURIComponent(`/comprar?edicao=${code}`)}`}>{t("common.enter")}</Link>}</p>}
          {installments > 1 ? <>
            <button type="submit" className="btn btn-primary buy-submit" disabled={Boolean(busy) || !edition}>{busy === "card" ? t("buy.busy") : t("buy.payCard", { n: installments, price: formatPrice(perMonth) })}</button>
            <button type="button" className="btn btn-ghost buy-submit" disabled={Boolean(busy) || !edition} onClick={(e) => pay("pix", e)}>{busy === "pix" ? t("buy.busyPix") : t("buy.payPix", { price: formatPrice(edition?.priceCents || 0) })}</button>
          </> : <button type="submit" className="btn btn-primary buy-submit" disabled={Boolean(busy) || !edition}>{busy ? t("buy.busy") : t("buy.submit")}</button>}
        </form>
        <p className="small muted">{t("buy.secure")} {signedIn ? t("buy.autoRelease") : t("buy.afterPay")}</p>
        <button type="button" className="link small" onClick={() => navigate("/")}>{t("buy.about")}</button>
      </> : cardCharge ? <>
        <h1>{t("buy.cardTitle")}</h1>
        <p className="buy-price"><b>{t("buy.installments", { n: charge.installments, price: formatPrice(Math.round(charge.amountCents / charge.installments)) })}</b> · {t("buy.total", { price: formatPrice(charge.amountCents) })}</p>
        <a className="btn btn-primary buy-submit" href={charge.url} target="_blank" rel="noopener noreferrer">{t("buy.openCard")}</a>
        <p className="waiting small"><span className="spinner" aria-hidden="true"/> {t("buy.waiting")}</p>
        <button type="button" className="link small" onClick={() => pay("pix")}>{t("buy.preferPix")}</button>
      </> : <>
        <h1>{t("buy.pixTitle")}</h1>
        <p className="buy-price"><b>{formatPrice(charge.amountCents || edition?.priceCents || 0)}</b> · {t("buy.pixHint")}</p>
        {charge.pix ? <>
          <img className="buy-qr" src={`data:image/png;base64,${charge.pix.image}`} alt={t("buy.qrAlt")} width="220" height="220"/>
          <button type="button" className="btn btn-primary buy-submit" onClick={copyPix}>{copied ? t("buy.pixCopied") : t("buy.copyPix")}</button>
        </> : <p className="notice">{t("buy.noQr")}</p>}
        <p className="waiting small"><span className="spinner" aria-hidden="true"/> {t("buy.waiting")}</p>
        {installments > 1
          ? <button type="button" className="btn btn-ghost buy-submit" onClick={() => pay("card")}>{t("buy.preferCard", { n: installments })}</button>
          : isAsaas(charge.url) && <a className="btn btn-ghost buy-submit" href={charge.url} target="_blank" rel="noopener noreferrer">{t("buy.card")}</a>}
        <p className="small muted">{t("buy.cardReturn")}</p>
      </>}
    </div>
  </main>;
}
