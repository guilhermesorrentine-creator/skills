import { useState } from "react";
import { formatPrice, purchase } from "../../lib/billing-client.js";
import { apiFetch } from "../../lib/auth.jsx";
import AiConnect from "./AiConnect.jsx";

const when = (value) => (value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—");
const kinds = { activated: "Licença ativada", upgraded: "Upgrade", refunded: "Estorno", disputed: "Contestação de pagamento", reconciled: "Confirmada por conciliação", admin_active: "Restaurada pela administração", admin_revoked: "Revogada pela administração", upgrade_without_charge: "Upgrade sem cobrança" };
const orderStatus = { pending: "Aguardando pagamento", paid: "Pago", canceled: "Cancelado", expired: "Expirado", failed: "Falhou", refunded: "Estornado" };

// Minha licença: edição adquirida, histórico e upgrade opcional (pagando a diferença).
export default function LicensePage({ account }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMsg, setRefundMsg] = useState("");
  if (!account) return <div className="page"><p className="muted">Carregando…</p></div>;
  const paid = account.orders.filter((order) => order.status === "paid");
  const buy = async (code) => {
    setBusy(true); setError("");
    try { await purchase(code, { signedIn: true }); } catch (e) { setError(e.message); setBusy(false); }
  };
  const upgrade = () => buy(account.upgrade.edition.code);
  const refund = async () => {
    setBusy(true); setError("");
    try {
      const data = await apiFetch("/api/account/refund", { method: "POST", body: { reason } });
      if (data.refunded) { setRefundMsg("Reembolso feito. O valor volta pelo mesmo meio de pagamento (Pix na hora; cartão na próxima fatura)."); window.setTimeout(() => window.location.assign("/"), 4000); }
      else setRefundMsg("Pedido de reembolso registrado. O estorno será concluído em até 2 dias úteis.");
      setAsking(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const cancelMonthly = async () => {
    setBusy(true); setError("");
    try { await apiFetch("/api/subscription/cancel", { method: "POST" }); window.location.reload(); }
    catch (cause) { setError(cause.message); setBusy(false); }
  };
  const refundMonthly = async () => {
    setBusy(true); setError("");
    try { await apiFetch("/api/subscription/refund", { method: "POST" }); window.location.reload(); }
    catch (cause) { setError(cause.message); setBusy(false); }
  };
  return <div className="page">
    <header className="page-head"><h1>Minha licença</h1></header>
    <section className="license-hero">
      <p className="eyebrow">{account.subscription?.active ? "Voxelia mensal" : account.edition?.name || "Sem edição"}</p>
      <h2>{account.subscription?.active ? "Seu acervo e conexão com IA estão ativos." : account.access ? "Seu acesso à edição adquirida é vitalício." : "Sua conta ainda não tem acesso ativo."}</h2>
      <p className="muted">{account.subscription?.active ? "O acesso acompanha o período pago da mensalidade." : "Novas edições podem oferecer recursos extras mediante upgrade opcional."}</p>
      {!account.subscription?.active && <dl className="license-facts">
        <div><dt>Situação</dt><dd>{account.license?.statusLabel || (account.accessReason === "grant" ? "Acesso concedido pela administração" : account.accessReason === "dev" ? "Modo desenvolvimento" : "—")}</dd></div>
        <div><dt>Ativação</dt><dd>{when(account.license?.activatedAt)}</dd></div>
        <div><dt>Aquisição</dt><dd>{when(paid.at(-1)?.paidAt)}</dd></div>
        <div><dt>Total pago</dt><dd>{formatPrice(paid.reduce((sum, order) => sum + order.amountCents, 0))}</dd></div>
      </dl>}
    </section>

    {account.subscription?.id && <section className="panel stack">
      <h2>Assinatura mensal</h2>
      <p>R$ 49,90 por mês no cartão. {account.subscription.active ? `Acesso pago até ${when(account.subscription.until)}.` : "Sem período pago ativo."}</p>
      {account.subscription.canceled ? <p>Assinatura cancelada. Não haverá novas cobranças.</p>
        : <button type="button" className="btn btn-ghost" onClick={cancelMonthly} disabled={busy}>{busy ? "Cancelando…" : "Cancelar cobrança automática"}</button>}
      {account.subscription.refundUntil && <button type="button" className="link" onClick={refundMonthly} disabled={busy}>Pedir reembolso da primeira mensalidade (até {when(account.subscription.refundUntil)})</button>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>}

    {account.edition?.features?.length > 0 && <section className="panel"><h2>Incluído na sua edição</h2><ul className="check-list">{account.edition.features.map((f) => <li key={f}>{f}</li>)}</ul></section>}

    {account.mcp?.active && <AiConnect until={account.mcp.until}/>}

    {!account.mcp?.active && !account.subscription?.active && <section className="panel stack">
      <h2>Conecte a Voxelia à sua IA</h2>
      <p>Assine por R$ 49,90 por mês para usar o acervo e a conexão no Claude, ChatGPT ou Claude Code enquanto pagar. Seu acesso vitalício, se houver, continua válido.</p>
      <a className="btn btn-primary" href="/oferta?plano=mensal&comprar=1">Assinar por R$ 49,90/mês</a>
    </section>}

    {account.renewal && <section className="panel upgrade-panel">
      <h2>{account.mcp?.active ? "Sua conexão com a IA vence em breve" : "Sua conexão com a IA venceu"}</h2>
      <p>{account.mcp?.until && <>{account.mcp.active ? "Válida até" : "Venceu em"} {when(account.mcp.until)}. </>}Renove por mais 12 meses e a sua IA continua consultando o acervo da Voxelia.{account.mcp?.active && " Os dias que faltam somam ao novo prazo."} O acervo continua vitalício de qualquer forma.</p>
      <p className="upgrade-amount">Renovação por <b>{formatPrice(account.renewal.amount)}</b>{account.renewal.edition.installments > 1 && <> ou {account.renewal.edition.installments}x de {formatPrice(Math.round(account.renewal.amount / account.renewal.edition.installments))} no cartão</>}</p>
      <button type="button" className="btn btn-primary" onClick={() => buy(account.renewal.edition.code)} disabled={busy}>{busy ? "Abrindo pagamento…" : "Renovar a conexão"}</button>
    </section>}

    {account.upgrade && <section className="panel upgrade-panel">{account.upgrade.edition.mcp
      ? <><h2>Conecte a Voxelia na sua IA</h2>
        <p>É como dar superpoderes a ela: no Claude, no ChatGPT ou no Claude Code, a IA consulta o acervo e usa a skill certa. Menos resposta genérica, menos token desperdiçado. Por 12 meses, no {account.upgrade.edition.name}.</p></>
      : <h2>{account.upgrade.edition.name} disponível</h2>}
      <p>Preço: {formatPrice(account.upgrade.listPrice)} · Crédito do que você já pagou: {formatPrice(account.upgrade.credit)}</p>
      <p className="upgrade-amount">Upgrade por <b>{formatPrice(account.upgrade.amount)}</b>{account.upgrade.edition.installments > 1 && <> ou {account.upgrade.edition.installments}x de {formatPrice(Math.round(account.upgrade.amount / account.upgrade.edition.installments))} no cartão</>}</p>
      <p className="small muted">Opcional. Se não atualizar, você continua com a edição atual.</p>
      <button type="button" className="btn btn-primary" onClick={upgrade} disabled={busy}>{busy ? "Abrindo pagamento…" : "Fazer upgrade"}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>}
    {!account.subscription?.active && !account.upgrade && account.latestEdition && account.access && <p className="muted">Você já tem a edição mais recente disponível ({account.latestEdition.name}).</p>}
    {account.pendingOrder && <p className="notice">Há um pagamento em andamento. <a className="link" href={account.pendingOrder.url}>Continuar pagamento</a></p>}

    <section className="panel"><h2>Pedidos</h2>
      {account.orders.length === 0 ? <p className="muted">Nenhum pedido.</p> : <div className="table-wrap"><table className="table"><thead><tr><th scope="col">Data</th><th scope="col">Edição</th><th scope="col">Tipo</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>
        <tbody>{account.orders.map((order) => <tr key={order.id}><td>{when(order.createdAt)}</td><td>{order.edition?.name}</td><td>{order.kind === "upgrade" ? `Upgrade (crédito ${formatPrice(order.creditCents)})` : "Compra"}</td><td>{formatPrice(order.amountCents)}</td><td>{orderStatus[order.status] || order.status}</td></tr>)}</tbody></table></div>}
    </section>
    {account.refund && <section className="panel"><h2>Garantia de 15 dias</h2>
      {refundMsg ? <p className="form-ok" role="status">{refundMsg}</p>
        : account.refund.requested ? <p>Seu pedido de reembolso foi registrado e está sendo processado.</p>
        : !asking ? <><p>Até {when(account.refund.until)} você pode pedir o reembolso integral de {formatPrice(account.refund.amountCents)}, sem burocracia.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setAsking(true)}>Pedir reembolso</button></>
        : <div className="stack">
          <label htmlFor="refund-reason">O que faltou para você? <span className="muted small">(opcional, nos ajuda a melhorar)</span></label>
          <textarea id="refund-reason" className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)}/>
          <p className="small muted">O valor é devolvido pelo mesmo meio de pagamento e o acesso à Voxelia é encerrado.</p>
          <div className="row"><button type="button" className="btn btn-primary" onClick={refund} disabled={busy}>{busy ? "Processando…" : "Confirmar reembolso"}</button><button type="button" className="link" onClick={() => setAsking(false)}>Voltar</button></div>
        </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>}
    {account.history.length > 0 && <section className="panel"><h2>Histórico da licença</h2><ul className="timeline">{account.history.map((event, i) => <li key={i}><b>{kinds[event.kind] || event.kind}</b>{event.to && <> · {event.to}</>}<span className="muted small"> · {when(event.createdAt)}</span></li>)}</ul></section>}
  </div>;
}
