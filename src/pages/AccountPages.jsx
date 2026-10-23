import { useEffect, useRef, useState } from "react";
import { authActions, useAuth } from "../lib/auth.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice, purchase } from "../lib/billing-client.js";
import { useT } from "../i18n/index.js";
import { Brand } from "../components/site/SiteNav.jsx";
import LanguageSelect from "../components/site/LanguageSelect.jsx";

// Navegação das páginas simples: com sessão, Voxelia/Sair; sem sessão, Entrar/Criar conta.
function Shell({ title, eyebrow, children }) {
  const { user, devMode } = useAuth();
  const { t } = useT();
  return <main id="conteudo" className="simple">
    <div className="simple-wrap">
      <nav className="simple-nav" aria-label={t("account.nav")}><Brand/>{user || devMode
        ? <span className="row"><Link className="link" to="/app">Voxelia</Link><button type="button" className="link" onClick={async () => { await authActions.signOut(); navigate("/"); }}>{t("common.signOut")}</button></span>
        : <span className="row"><Link className="btn btn-ghost btn-sm" to="/entrar">{t("common.enter")}</Link><Link className="btn btn-primary btn-sm" to="/cadastro">{t("common.signup")}</Link></span>}</nav>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
      <LanguageSelect className="simple-lang"/>
    </div>
  </main>;
}

// Retorno do Asaas: nunca libera acesso pela URL; consulta o servidor até a confirmação chegar.
// Pedido e chave da compra sem cadastro: da URL de retorno ou, se faltar, do navegador que iniciou a compra.
export function claimFrom(search) {
  const params = new URLSearchParams(search);
  if (params.get("pedido") && params.get("chave")) return { order: params.get("pedido"), key: params.get("chave") };
  try { const saved = JSON.parse(localStorage.getItem("vx-claim") || "null"); return saved?.order && saved?.key ? saved : null; } catch { return null; }
}

// Compra sem cadastro: consulta o servidor até o pagamento confirmar e oferece o link para criar a senha.
function GuestReturn({ claim }) {
  const { t } = useT();
  const [state, setState] = useState({ status: "pending" });
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (state.status === "paid" || tries >= 60) return undefined;
    const id = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/checkout/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(claim) });
        const data = await response.json();
        if (!response.ok) setState({ status: "error", message: data.message }); else setState(data);
      } catch { /* tenta de novo */ }
      setTries((v) => v + 1);
    }, tries ? 3000 : 300);
    return () => window.clearTimeout(id);
  }, [claim, state.status, tries]);
  useEffect(() => { if (state.status === "paid") try { localStorage.removeItem("vx-claim"); } catch { /* ok */ } }, [state.status]);
  const paid = state.status === "paid";
  return <Shell eyebrow={t("account.payment")} title={paid ? t("account.guest.paid") : state.status === "error" ? t("account.guest.invalid") : t("account.guest.confirming")}>
    <div className="panel stack">
      {paid && state.url && <><p>{t("account.guest.createPassword")}</p><a className="btn btn-primary" href={state.url}>{t("account.guest.createButton")}</a></>}
      {paid && state.login && <><p>{t("account.guest.login")}</p><Link className="btn btn-primary" to="/entrar?next=/app">{t("common.enterVoxelia")}</Link></>}
      {state.status === "error" && <p>{state.message}</p>}
      {!paid && state.status !== "error" && <><p className="waiting"><span className="spinner" aria-hidden="true"/> {t("account.guest.waiting")}</p>
        {tries >= 60 && <p>{t("account.guest.late")}</p>}</>}
    </div>
  </Shell>;
}

export function CheckoutReturnPage({ account, reload }) {
  const claim = account?.access ? null : claimFrom(location.search);
  if (claim) return <GuestReturn claim={claim}/>;
  return <SignedReturn account={account} reload={reload}/>;
}

function SignedReturn({ account, reload }) {
  const { t } = useT();
  const result = new URLSearchParams(location.search).get("resultado");
  const [tries, setTries] = useState(0);
  const timer = useRef(0);
  const confirmed = account?.access;
  useEffect(() => {
    if (confirmed || result !== "sucesso" || tries >= 40) return;
    timer.current = window.setTimeout(async () => { await reload(); setTries((v) => v + 1); }, 3000);
    return () => window.clearTimeout(timer.current);
  }, [confirmed, result, tries, reload]);
  return <Shell eyebrow={t("account.payment")} title={confirmed ? t("account.signed.confirmed") : result === "sucesso" ? t("account.signed.awaiting") : result === "expirado" ? t("account.signed.expired") : t("account.signed.failed")}>
    <div className="panel stack">
      {confirmed && <><p>{t("account.signed.confirmedText")}</p><button type="button" className="btn btn-primary" onClick={() => navigate("/app")}>{t("common.enterVoxelia")}</button></>}
      {!confirmed && result === "sucesso" && <><p className="waiting"><span className="spinner" aria-hidden="true"/> {t("account.signed.waiting")}</p>
        {tries >= 40 && <p>{t("account.signed.late")}</p>}
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>{t("account.signed.check")}</button></>}
      {!confirmed && result !== "sucesso" && <><p>{t("account.signed.none")}</p><button type="button" className="btn btn-primary" onClick={() => navigate("/acesso-pendente")}>{t("account.signed.backToBuy")}</button></>}
    </div>
  </Shell>;
}

// Conta sem licença: mostra pedido pendente ou a oferta da edição à venda.
export function AccessPendingPage({ account, error, reload }) {
  const { t } = useT();
  const [editions, setEditions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState("");
  useEffect(() => { fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions || [])).catch(() => setEditions([])); }, []);
  const edition = editions?.[0];
  const buy = async () => { setBusy(true); setBuyError(""); try { await purchase(edition.code, { signedIn: true }); } catch (e) { setBuyError(e.message); setBusy(false); } };
  return <Shell eyebrow={t("account.pending.eyebrow")} title={account?.pendingOrder ? t("account.pending.inProgress") : t("account.pending.title")}>
    {error && <p className="form-error" role="alert">{t("account.pending.verifyFailed")} {error.message} <button type="button" className="link" onClick={() => reload()}>{t("account.pending.retry")}</button></p>}
    {account?.license && !account.access && <p className="notice">{t("account.pending.license", { status: account.license.statusLabel })}</p>}
    {account?.pendingOrder && <div className="panel stack"><p>{t("account.pending.started")}</p><a className="btn btn-primary" href={account.pendingOrder.url}>{t("account.pending.continue")}</a><button type="button" className="btn btn-secondary" onClick={() => reload()}>{t("account.pending.paidCheck")}</button></div>}
    {!account?.pendingOrder && <div className="panel stack">
      {editions == null ? <p className="muted">{t("common.loading")}</p> : edition ? <>
        <p className="eyebrow">{edition.name}</p>
        <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>{t("common.oneTime")}</span></p>
        <p className="muted">{t("account.pending.offer")}</p>
        <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{busy ? t("common.openingPayment") : t("account.pending.buy")}</button>
      </> : <p>{t("account.pending.closed")}</p>}
      {buyError && <p className="form-error" role="alert">{buyError}</p>}
    </div>}
  </Shell>;
}

// Visualização pública de coleção compartilhada: só títulos; não abre conteúdo pago.
export function SharedCollectionPage({ token }) {
  const { t } = useT();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const meta = document.createElement("meta"); meta.name = "robots"; meta.content = "noindex, nofollow"; document.head.append(meta);
    fetch(`/api/shared?token=${encodeURIComponent(token)}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); setState({ data: d }); }).catch((e) => setState({ error: e }));
    return () => meta.remove();
  }, [token]);
  return <Shell eyebrow={t("account.shared.eyebrow")} title={state.data?.name || (state.error ? t("account.shared.unavailable") : t("common.loading"))}>
    {state.error && <p className="muted">{state.error.message}</p>}
    {state.data && <>{state.data.description && <p className="muted">{state.data.description}</p>}
      <ol className="col-items">{state.data.items.map((item) => <li key={item.id} className="col-item"><div className="col-item-main"><b>{item.title}</b><span className="muted small">{t(`type.${item.type}`)} · {t(`cat.${item.category}`)}</span></div></li>)}</ol>
      <p className="small muted">{t("account.shared.needAccess")} <Link className="link" to="/">{t("account.shared.meet")}</Link></p></>}
  </Shell>;
}

// Documentos jurídicos: estrutura preparada, sem texto fictício.
export function LegalPage({ slug }) {
  const { t } = useT();
  const doc = t(`account.legal.${slug}`);
  return <Shell eyebrow={t("account.legal.eyebrow")} title={doc.title}>
    <p className="notice" role="note">{t("account.legal.pending")}</p>
    <ol className="legal-outline">{doc.sections.map((s) => <li key={s}>{s}</li>)}</ol>
    <Link className="link" to="/">{t("common.backHome")}</Link>
  </Shell>;
}

export function NotFound({ inApp = false }) {
  const { t } = useT();
  const body = <div className="empty"><h3>{t("account.notFound.heading")}</h3><p>{t("account.notFound.text")}</p><Link className="btn btn-secondary btn-sm" to={inApp ? "/app" : "/"}>{t("common.back")}</Link></div>;
  return inApp ? <div className="page">{body}</div> : <Shell title={t("account.notFound.title")}>{body}</Shell>;
}
