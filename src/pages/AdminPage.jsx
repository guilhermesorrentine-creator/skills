import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import { cycleLabel, formatPrice } from "../lib/billing-client.js";

const tabs = [["usuarios", "Usuários"], ["assinaturas", "Assinaturas"], ["pagamentos", "Pagamentos"], ["eventos", "Webhooks"], ["planos", "Planos"], ["acessos", "Acessos"], ["auditoria", "Auditoria"]];
const when = (value) => (value ? new Date(value).toLocaleString("pt-BR") : "—");
const emptyPlan = { code: "", name: "", description: "", priceCents: "", cycle: "MONTHLY", features: "", rules: "", active: false };

// Painel operacional. Toda permissão é verificada no servidor (`profiles.is_admin`).
export default function AdminPage() {
  const [tab, setTab] = useState("usuarios");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState(emptyPlan);
  const [grant, setGrant] = useState({ userId: "", reason: "", endsAt: "" });

  const load = useCallback(async () => {
    try { setData(await apiFetch("/api/admin/overview")); setError(""); }
    catch (cause) { setError(cause.status === 403 ? "Sua conta não tem permissão de administração." : cause.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (path, body, ok) => {
    setMessage("");
    try { await apiFetch(path, { method: "POST", body }); setMessage(ok); await load(); }
    catch (cause) { setMessage(cause.message); }
  };
  const emailOf = (id) => data?.profiles.find((profile) => profile.id === id)?.email || id;

  return <main id="conteudo" className="view account-view admin-view"><div className="wrap account-wrap">
    <nav className="account-nav" aria-label="Administração"><Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">ADMIN<b>_TOTAL</b></span></Link><span className="account-nav-links"><Link to="/app">Biblioteca</Link></span></nav>
    <h1 className="account-title">Administração</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="form-ok" role="status">{message}</p>}
    {data && <>
      <div className="segmented admin-tabs" role="tablist" aria-label="Seções">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
      <div className="admin-panel term-panel"><div className="term-body">
        {tab === "usuarios" && <Table head={["E-mail", "Admin", "Cliente Asaas", "Criado em", ""]} rows={data.profiles.map((item) => [item.email, item.is_admin ? "sim" : "—", item.asaas_customer_id || "—", when(item.created_at),
          <button key="r" type="button" className="text-link" onClick={() => act("/api/admin/reconcile", { userId: item.id }, "Reconciliação concluída.")}>Reconciliar</button>])}/>}
        {tab === "assinaturas" && <Table head={["Usuário", "Status", "Período até", "Próx. cobrança", "Asaas"]} rows={data.subscriptions.map((item) => [item.profiles?.email || emailOf(item.user_id), item.status, when(item.current_period_end), when(item.next_due_date), item.asaas_subscription_id || "—"])}/>}
        {tab === "pagamentos" && <Table head={["Usuário", "Status", "Valor", "Vencimento", "Fatura"]} rows={data.payments.map((item) => [emailOf(item.user_id), item.status, formatPrice(item.value_cents), item.due_date || "—", item.invoice_url ? <a key="f" className="text-link" href={item.invoice_url} target="_blank" rel="noopener noreferrer">abrir ↗</a> : "—"])}/>}
        {tab === "eventos" && <Table head={["Recebido", "Evento", "Status", "Nota", ""]} rows={data.events.map((item) => [when(item.received_at), item.event, item.status, item.note || "—",
          item.status !== "processed" ? <button key="p" type="button" className="text-link" onClick={() => act("/api/admin/events/reprocess", { id: item.id }, "Evento reprocessado.")}>Reprocessar</button> : "—"])}/>}
        {tab === "planos" && <>
          <Table head={["Código", "Nome", "Preço", "Ativo"]} rows={data.plans.map((item) => [item.code, item.name, `${formatPrice(item.price_cents)} ${cycleLabel[item.cycle]}`, item.active ? "sim" : "não"])}/>
          <form className="admin-form" onSubmit={(event) => { event.preventDefault(); act("/api/admin/plans", { ...plan, priceCents: Number(plan.priceCents) }, "Plano salvo."); }}>
            <h2>Criar ou atualizar plano</h2>
            <label>Código<input value={plan.code} onChange={(e) => setPlan({ ...plan, code: e.target.value })} required/></label>
            <label>Nome<input value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} required/></label>
            <label>Preço em centavos<input inputMode="numeric" value={plan.priceCents} onChange={(e) => setPlan({ ...plan, priceCents: e.target.value.replace(/\D/g, "") })} required/></label>
            <label>Periodicidade<select value={plan.cycle} onChange={(e) => setPlan({ ...plan, cycle: e.target.value })}><option value="MONTHLY">Mensal</option><option value="YEARLY">Anual</option></select></label>
            <label className="wide">Descrição<input value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })}/></label>
            <label className="wide">Recursos (um por linha)<textarea rows={4} value={plan.features} onChange={(e) => setPlan({ ...plan, features: e.target.value })}/></label>
            <label className="wide">Regras aplicáveis<textarea rows={2} value={plan.rules} onChange={(e) => setPlan({ ...plan, rules: e.target.value })}/></label>
            <label className="check"><input type="checkbox" checked={plan.active} onChange={(e) => setPlan({ ...plan, active: e.target.checked })}/> Ativo (aparece na landing)</label>
            <button type="submit" className="button button-primary">Salvar plano</button>
          </form>
        </>}
        {tab === "acessos" && <>
          <Table head={["Usuário", "Justificativa", "Até", "Situação", ""]} rows={data.grants.map((item) => [emailOf(item.user_id), item.reason, when(item.ends_at), item.revoked_at ? "revogado" : "ativo",
            !item.revoked_at ? <button key="v" type="button" className="text-link" onClick={() => act("/api/admin/grants/revoke", { id: item.id }, "Concessão revogada.")}>Revogar</button> : "—"])}/>
          <form className="admin-form" onSubmit={(event) => { event.preventDefault(); act("/api/admin/grants", grant, "Acesso concedido e registrado na auditoria."); }}>
            <h2>Conceder acesso excepcional</h2>
            <label>Usuário<select value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} required><option value="">Selecione</option>{data.profiles.map((item) => <option key={item.id} value={item.id}>{item.email}</option>)}</select></label>
            <label>Até (opcional)<input type="date" value={grant.endsAt} onChange={(e) => setGrant({ ...grant, endsAt: e.target.value })}/></label>
            <label className="wide">Justificativa (mín. 10 caracteres)<textarea rows={2} value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} required minLength={10}/></label>
            <button type="submit" className="button button-primary">Conceder</button>
          </form>
        </>}
        {tab === "auditoria" && <Table head={["Quando", "Quem", "Ação", "Alvo", "Detalhes"]} rows={data.audit.map((item) => [when(item.created_at), emailOf(item.actor_id), item.action, item.target_user_id ? emailOf(item.target_user_id) : "—", <code key="d">{JSON.stringify(item.details)}</code>])}/>}
      </div></div>
    </>}
  </div></main>;
}

function Table({ head, rows }) {
  if (!rows.length) return <p className="muted">Nenhum registro.</p>;
  return <div className="table-wrap"><table className="admin-table"><thead><tr>{head.map((cell, i) => <th key={i} scope="col">{cell}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
