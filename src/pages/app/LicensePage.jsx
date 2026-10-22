import { useState } from "react";
import { formatPrice, purchase } from "../../lib/billing-client.js";
import { apiFetch } from "../../lib/auth.jsx";
import AiConnect from "./AiConnect.jsx";
import { useT } from "../../i18n/index.js";


// Minha licença: edição adquirida, histórico e upgrade opcional (pagando a diferença).
export default function LicensePage({ account }) {
  const { t, date: when } = useT();
  const kinds = t("app.license.kinds"), orderStatus = t("app.license.orderStatus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMsg, setRefundMsg] = useState("");
  if (!account) return <div className="page"><p className="muted">{t("common.loading")}</p></div>;
  const paid = account.orders.filter((order) => order.status === "paid");
  const upgrade = async () => {
    setBusy(true); setError("");
    try { await purchase(account.upgrade.edition.code, { signedIn: true }); } catch (e) { setError(e.message); setBusy(false); }
  };
  const refund = async () => {
    setBusy(true); setError("");
    try {
      const data = await apiFetch("/api/account/refund", { method: "POST", body: { reason } });
      if (data.refunded) { setRefundMsg(t("app.license.refundDone")); window.setTimeout(() => window.location.assign("/"), 4000); }
      else setRefundMsg(t("app.license.refundQueued"));
      setAsking(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="page">
    <header className="page-head"><h1>{t("app.license.title")}</h1></header>
    <section className="license-hero">
      <p className="eyebrow">{account.edition?.name || t("app.license.noEdition")}</p>
      <h2>{account.access ? t("app.license.lifetime") : t("app.license.inactive")}</h2>
      <p className="muted">{t("app.license.upgradeNote")}</p>
      <dl className="license-facts">
        <div><dt>{t("app.license.status")}</dt><dd>{account.license?.statusLabel || (account.accessReason === "grant" ? t("app.license.grant") : account.accessReason === "dev" ? t("app.license.dev") : "—")}</dd></div>
        <div><dt>{t("app.license.activation")}</dt><dd>{when(account.license?.activatedAt)}</dd></div>
        <div><dt>{t("app.license.acquisition")}</dt><dd>{when(paid.at(-1)?.paidAt)}</dd></div>
        <div><dt>{t("app.license.total")}</dt><dd>{formatPrice(paid.reduce((sum, order) => sum + order.amountCents, 0))}</dd></div>
      </dl>
    </section>

    {account.edition?.features?.length > 0 && <section className="panel"><h2>{t("app.license.included")}</h2><ul className="check-list">{account.edition.features.map((f) => <li key={f}>{f}</li>)}</ul></section>}

    {account.access && account.license && <AiConnect/>}

    {account.upgrade && <section className="panel upgrade-panel"><h2>{t("app.license.available", { name: account.upgrade.edition.name })}</h2>
      <p>{t("app.license.price", { price: formatPrice(account.upgrade.listPrice), credit: formatPrice(account.upgrade.credit) })}</p>
      <p className="upgrade-amount">{t("app.license.upgradeFor")} <b>{formatPrice(account.upgrade.amount)}</b></p>
      <p className="small muted">{t("app.license.optional")}</p>
      <button type="button" className="btn btn-primary" onClick={upgrade} disabled={busy}>{busy ? t("common.openingPayment") : t("app.license.upgrade")}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>}
    {!account.upgrade && account.latestEdition && account.access && <p className="muted">{t("app.license.latest", { name: account.latestEdition.name })}</p>}
    {account.pendingOrder && <p className="notice">{t("app.license.pending")} <a className="link" href={account.pendingOrder.url}>{t("app.license.continue")}</a></p>}

    <section className="panel"><h2>{t("app.license.orders")}</h2>
      {account.orders.length === 0 ? <p className="muted">{t("app.license.noOrders")}</p> : <div className="table-wrap"><table className="table"><thead><tr><th scope="col">{t("app.license.date")}</th><th scope="col">{t("app.license.edition")}</th><th scope="col">{t("app.license.kind")}</th><th scope="col">{t("app.license.amount")}</th><th scope="col">{t("app.license.state")}</th></tr></thead>
        <tbody>{account.orders.map((order) => <tr key={order.id}><td>{when(order.createdAt)}</td><td>{order.edition?.name}</td><td>{order.kind === "upgrade" ? t("app.license.upgradeKind", { credit: formatPrice(order.creditCents) }) : t("app.license.purchase")}</td><td>{formatPrice(order.amountCents)}</td><td>{orderStatus[order.status] || order.status}</td></tr>)}</tbody></table></div>}
    </section>
    {account.refund && <section className="panel"><h2>{t("app.license.guarantee")}</h2>
      {refundMsg ? <p className="form-ok" role="status">{refundMsg}</p>
        : account.refund.requested ? <p>{t("app.license.refundRequested")}</p>
        : !asking ? <><p>{t("app.license.refundUntil", { date: when(account.refund.until), amount: formatPrice(account.refund.amountCents) })}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)}>{t("app.license.askRefund")}</button></>
        : <div className="stack">
          <label htmlFor="refund-reason">{t("app.license.reason")} <span className="muted small">{t("app.license.reasonHint")}</span></label>
          <textarea id="refund-reason" className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}/>
          <p className="small muted">{t("app.license.refundNote")}</p>
          <div className="row"><button type="button" className="btn btn-primary" onClick={refund} disabled={busy}>{busy ? t("app.license.processing") : t("app.license.confirmRefund")}</button><button type="button" className="link" onClick={() => setAsking(false)}>{t("common.back")}</button></div>
        </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>}
    {account.history.length > 0 && <section className="panel"><h2>{t("app.license.history")}</h2><ul className="timeline">{account.history.map((event, i) => <li key={i}><b>{kinds[event.kind] || event.kind}</b>{event.to && <> · {event.to}</>}<span className="muted small"> · {when(event.createdAt)}</span></li>)}</ul></section>}
  </div>;
}
