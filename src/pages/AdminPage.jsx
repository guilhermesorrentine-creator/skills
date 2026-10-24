import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { CATEGORIES, TYPES } from "../lib/resources.js";
import { Brand } from "../components/site/SiteNav.jsx";
import { CopyButton } from "../components/shared.jsx";

const tabs = [["funil", "Funil"], ["recursos", "Recursos e guias"], ["caminhos", "Caminhos"], ["relacoes", "Relações"], ["edicoes", "Edições"], ["pedidos", "Pedidos"], ["licencas", "Licenças"], ["eventos", "Webhooks"], ["usuarios", "Usuários e acessos"], ["auditoria", "Auditoria"]];
const when = (value) => (value ? new Date(value).toLocaleString("pt-BR") : "—");
const emptyResource = { id: "", type: "guide", category: "software", title: "", summary: "", body_md: "", instructions: "", tags: "", source_name: "", source_url: "", author: "", license: "", visibility: "edition", min_edition_rank: 1, status: "draft" };
const emptyEdition = { code: "", name: "", rank: "", priceCents: "", description: "", features: "", onSale: false };
const emptyPath = { id: "", goal: "", description: "", keywords: "", steps: "", status: "draft" };

// Administração: conteúdo, edições e operação financeira. Toda permissão é checada no servidor.
export default function AdminPage() {
  const [tab, setTab] = useState("funil");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try { setData(await apiFetch("/api/admin/overview")); setError(""); }
    catch (cause) { setError(cause.status === 403 ? "Sua conta não tem permissão de administração." : cause.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const act = async (path, body, ok) => {
    setMessage("");
    try { await apiFetch(path, { method: "POST", body }); setMessage(ok); await load(); return true; }
    catch (cause) { setMessage(`Erro: ${cause.message}`); return false; }
  };
  const emailOf = (id) => data?.profiles.find((p) => p.id === id)?.email || id || "—";
  const editionName = (id) => data?.editions.find((e) => e.id === id)?.name || "—";

  return <main id="conteudo" className="admin">
    <div className="admin-wrap">
      <nav className="simple-nav" aria-label="Administração"><Brand/><Link className="link" to="/admin/painel">Painel de resultados</Link><Link className="link" to="/app">Voltar à Voxelia</Link></nav>
      <h1>Administração</h1>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className={message.startsWith("Erro") ? "form-error" : "form-ok"} role="status">{message}</p>}
      {data && <>
        <div className="chip-row admin-tabs" role="tablist" aria-label="Seções">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" className="chip" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => { setTab(id); setMessage(""); }}>{label}</button>)}</div>
        <div className="panel">
          {tab === "funil" && <FunnelTab/>}
          {tab === "recursos" && <ResourcesTab data={data} act={act}/>}
          {tab === "caminhos" && <PathsTab data={data} act={act}/>}
          {tab === "relacoes" && <RelationsTab data={data} act={act}/>}
          {tab === "edicoes" && <EditionsTab data={data} act={act}/>}
          {tab === "pedidos" && <Table head={["Data", "Usuário", "Edição", "Tipo", "Valor", "Situação", ""]} rows={data.orders.map((o) => [when(o.created_at), emailOf(o.user_id), editionName(o.edition_id), o.kind, formatPrice(o.amount_cents), o.error ? `${o.status} · ${o.error}` : o.status,
            o.status === "pending" ? <button key="r" type="button" className="link" onClick={() => act("/api/admin/orders/reconcile", { orderId: o.id }, "Conciliação executada.")}>Conciliar</button>
              : o.status === "paid" ? <button key="e" type="button" className="link" onClick={() => window.confirm(`Estornar ${formatPrice(o.amount_cents)} de ${emailOf(o.user_id)}? O acesso é encerrado.`) && act("/api/admin/orders/refund", { orderId: o.id }, "Estorno feito.")}>Estornar</button> : "—"])}/>}
          {tab === "licencas" && <LicensesTab data={data} act={act} emailOf={emailOf} editionName={editionName}/>}
          {tab === "eventos" && <Table head={["Recebido", "Evento", "Status", "Nota", ""]} rows={data.events.map((e) => [when(e.received_at), e.event, e.status, e.note || "—",
            e.status !== "processed" ? <button key="p" type="button" className="link" onClick={() => act("/api/admin/events/reprocess", { id: e.id }, "Evento reprocessado.")}>Reprocessar</button> : "—"])}/>}
          {tab === "usuarios" && <UsersTab data={data} act={act} emailOf={emailOf} reload={load}/>}
          {tab === "auditoria" && <Table head={["Quando", "Quem", "Ação", "Alvo", "Detalhes"]} rows={data.audit.map((a) => [when(a.created_at), emailOf(a.actor_id), a.action, a.target_user_id ? emailOf(a.target_user_id) : "—", <code key="d">{JSON.stringify(a.details)}</code>])}/>}
        </div>
      </>}
    </div>
  </main>;
}

function ResourcesTab({ data, act }) {
  const [form, setForm] = useState(emptyResource);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  const edit = (r) => setForm({ ...emptyResource, ...r, tags: (r.tags || []).join(", "), source_url: r.source_url || "" });
  return <>
    <h2>Recursos cadastrados ({data.resources.length})</h2>
    <p className="small muted">As Agent Skills vêm de <code>src/data/catalog.json</code>. Aqui entram guias, subagentes, workflows, ferramentas e referências.</p>
    <Table head={["ID", "Título", "Tipo", "Status", "Visibilidade", ""]} rows={data.resources.map((r) => [<code key="i">{r.id}</code>, r.title, r.type, r.status, `${r.visibility}${r.visibility === "edition" ? ` ≥ ${r.min_edition_rank}` : ""}`, <button key="e" type="button" className="link" onClick={() => edit(r)}>Editar</button>])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); if (await act("/api/admin/resources", { ...form, tags: form.tags }, "Recurso salvo.")) setForm(emptyResource); }}>
      <h2>{data.resources.some((r) => r.id === form.id) ? `Editar ${form.id}` : "Novo recurso"}</h2>
      <label className="field">Identificador<input value={form.id} onChange={set("id")} required placeholder="ex.: guia-criar-subagente"/></label>
      <label className="field">Título<input value={form.title} onChange={set("title")} required/></label>
      <label className="field">Tipo<select value={form.type} onChange={set("type")}>{TYPES.filter((t) => t.id !== "skill").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
      <label className="field">Área<select value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <label className="field wide">Resumo<textarea value={form.summary} onChange={set("summary")} maxLength={600}/></label>
      <label className="field wide">Conteúdo (Markdown seguro: ## títulos, listas, ```código```, [links](https://…))<textarea className="tall" value={form.body_md} onChange={set("body_md")}/></label>
      <label className="field wide">Instruções copiáveis (opcional)<textarea value={form.instructions} onChange={set("instructions")}/></label>
      <label className="field">Tags (separadas por vírgula)<input value={form.tags} onChange={set("tags")}/></label>
      <label className="field">Fonte (nome)<input value={form.source_name} onChange={set("source_name")}/></label>
      <label className="field">Link original (HTTPS)<input value={form.source_url} onChange={set("source_url")} inputMode="url"/></label>
      <label className="field">Autoria<input value={form.author} onChange={set("author")}/></label>
      <label className="field">Licença do conteúdo<input value={form.license} onChange={set("license")}/></label>
      <label className="field">Visibilidade<select value={form.visibility} onChange={set("visibility")}><option value="edition">Incluído em edição</option><option value="demo">Demonstrativo</option><option value="public">Público</option></select></label>
      <label className="field">Edição mínima (ordem)<input type="number" min="1" value={form.min_edition_rank} onChange={set("min_edition_rank")}/></label>
      <label className="field">Status<select value={form.status} onChange={set("status")}><option value="draft">Rascunho</option><option value="published">Publicado</option><option value="hidden">Oculto</option></select></label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Salvar recurso</button><button type="button" className="btn btn-ghost" onClick={() => setForm(emptyResource)}>Limpar</button></div>
    </form>
  </>;
}

function PathsTab({ data, act }) {
  const [form, setForm] = useState(emptyPath);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const parseSteps = (text) => text.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter(([id]) => id).map(([resource_id, reason = ""]) => ({ resource_id, reason }));
  return <>
    <h2>Caminhos por objetivo</h2>
    <p className="small muted">Aparecem na busca quando publicados e quando todos os passos são recursos acessíveis ao usuário. Cada passo exige justificativa.</p>
    <Table head={["Objetivo", "Passos", "Status", "Versão", ""]} rows={data.paths.map((p) => [p.goal, p.steps.length, p.status, p.version, <button key="e" type="button" className="link" onClick={() => setForm({ id: p.id, goal: p.goal, description: p.description, keywords: (p.keywords || []).join(", "), steps: p.steps.map((s) => `${s.resource_id} | ${s.reason}`).join("\n"), status: p.status })}>Editar</button>])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); if (await act("/api/admin/paths", { ...form, steps: parseSteps(form.steps) }, "Caminho salvo.")) setForm(emptyPath); }}>
      <h2>{form.id ? "Editar caminho" : "Novo caminho"}</h2>
      <label className="field">Objetivo<input value={form.goal} onChange={set("goal")} required placeholder="Criar um site com IA"/></label>
      <label className="field">Palavras-chave (vírgula)<input value={form.keywords} onChange={set("keywords")} placeholder="site, landing, web"/></label>
      <label className="field wide">Descrição<textarea value={form.description} onChange={set("description")}/></label>
      <label className="field wide">Passos — um por linha: <code>id-do-recurso | justificativa</code><textarea className="tall" value={form.steps} onChange={set("steps")}/></label>
      <label className="field">Status<select value={form.status} onChange={set("status")}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Salvar caminho</button><button type="button" className="btn btn-ghost" onClick={() => setForm(emptyPath)}>Limpar</button></div>
    </form>
  </>;
}

function RelationsTab({ data, act }) {
  const [fromId, setFromId] = useState("");
  const [lines, setLines] = useState("");
  return <>
    <h2>Relações entre recursos</h2>
    <Table head={["De", "Para", "Tipo"]} rows={data.relations.map((r) => [<code key="f">{r.from_id}</code>, <code key="t">{r.to_id}</code>, r.kind])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); const items = lines.split("\n").map((l) => l.split("|").map((p) => p.trim())).filter(([id]) => id).map(([toId, kind = "related"]) => ({ toId, kind })); await act("/api/admin/relations", { fromId, items }, "Relações salvas."); }}>
      <h2>Definir relações de um recurso</h2>
      <label className="field">Recurso de origem (id)<input value={fromId} onChange={(e) => setFromId(e.target.value)} required/></label>
      <label className="field wide">Destinos — um por linha: <code>id | related|requires|next</code> (substitui as relações atuais)<textarea value={lines} onChange={(e) => setLines(e.target.value)}/></label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Salvar relações</button></div>
    </form>
  </>;
}

function EditionsTab({ data, act }) {
  const [form, setForm] = useState(emptyEdition);
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value });
  return <>
    <h2>Edições comerciais</h2>
    <p className="small muted">Preço aprovado: Edição 1 — R$ 97,90. Valores de edições futuras dependem de aprovação. Mudar o preço não altera pedidos já pagos.</p>
    <Table head={["Ordem", "Código", "Nome", "Preço", "À venda", ""]} rows={data.editions.map((e) => [e.rank, e.code, e.name, formatPrice(e.price_cents), e.on_sale ? "sim" : "não",
      <button key="e" type="button" className="link" onClick={() => setForm({ code: e.code, name: e.name, rank: e.rank, priceCents: e.price_cents, description: e.description, features: (e.features || []).join("\n"), onSale: e.on_sale })}>Editar</button>])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); if (await act("/api/admin/editions", { ...form, priceCents: Number(form.priceCents), rank: Number(form.rank) }, "Edição salva.")) setForm(emptyEdition); }}>
      <h2>Criar ou atualizar edição</h2>
      <label className="field">Código<input value={form.code} onChange={set("code")} required/></label>
      <label className="field">Nome<input value={form.name} onChange={set("name")} required/></label>
      <label className="field">Ordem (1, 2, 3…)<input type="number" min="1" value={form.rank} onChange={set("rank")} required/></label>
      <label className="field">Preço em centavos<input inputMode="numeric" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value.replace(/\D/g, "") })} required/></label>
      <label className="field wide">Descrição<input value={form.description} onChange={set("description")}/></label>
      <label className="field wide">Recursos incluídos (um por linha)<textarea value={form.features} onChange={set("features")}/></label>
      <label className="check wide"><input type="checkbox" checked={form.onSale} onChange={set("onSale")}/> À venda (aparece na landing)</label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Salvar edição</button></div>
    </form>
  </>;
}

function LicensesTab({ data, act, emailOf, editionName }) {
  const [form, setForm] = useState({ userId: "", status: "active", reason: "" });
  return <>
    <h2>Licenças vitalícias</h2>
    <Table head={["Usuário", "Edição", "Situação", "Ativação"]} rows={data.licenses.map((l) => [emailOf(l.user_id), editionName(l.edition_id), l.status, when(l.activated_at)])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); if (await act("/api/admin/licenses/status", form, "Situação atualizada e auditada.")) setForm({ userId: "", status: "active", reason: "" }); }}>
      <h2>Decidir sobre uma licença (contestações, revogação)</h2>
      <label className="field">Usuário<select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required><option value="">Selecione</option>{data.licenses.map((l) => <option key={l.id} value={l.user_id}>{emailOf(l.user_id)} — {l.status}</option>)}</select></label>
      <label className="field">Nova situação<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Ativa</option><option value="revoked">Revogada</option></select></label>
      <label className="field wide">Justificativa (mín. 10 caracteres)<textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required minLength={10}/></label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Aplicar</button></div>
    </form>
  </>;
}

// Convite: cria a conta (se não existir), libera o acesso e envia as boas-vindas com o link para a
// pessoa criar a própria senha. Sem envio de e-mail configurado, mostra o link para enviar à mão.
function InviteForm({ data, reload }) {
  const [form, setForm] = useState({ email: "", editionId: "", reason: "Acesso completo cortesia autorizado pelo proprietário." });
  const [state, setState] = useState({ busy: false, error: "", result: null });
  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: "", result: null });
    try {
      const result = await apiFetch("/api/admin/invite", { method: "POST", body: form });
      setState({ busy: false, error: "", result });
      await reload();
    } catch (cause) { setState({ busy: false, error: cause.message, result: null }); }
  };
  const result = state.result;
  return <form className="admin-form invite-form" onSubmit={submit}>
    <h2>Convidar e liberar acesso</h2>
    <p className="small muted wide">A pessoa recebe um e-mail de boas-vindas com o botão para criar a própria senha. Nenhuma senha é criada ou enviada por aqui.</p>
    <label className="field">E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off"/></label>
    <label className="field">Acesso<select value={form.editionId} onChange={(e) => setForm({ ...form, editionId: e.target.value })}><option value="">Completo (todas as edições)</option>{data.editions.map((ed) => <option key={ed.id} value={ed.id}>{ed.name}</option>)}</select></label>
    <label className="field wide">Justificativa (mín. 10 caracteres)<textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required minLength={10}/></label>
    <div className="row wide"><button type="submit" className="btn btn-primary" disabled={state.busy} aria-busy={state.busy}>{state.busy ? "Convidando…" : "Convidar e liberar"}</button></div>
    {state.error && <p className="form-error wide" role="alert">{state.error}</p>}
    {result && <div className="wide invite-result" role="status">
      <p className="form-ok">{result.created ? "Conta criada" : "Conta já existia"}{result.alreadyHadAccess ? " · já tinha acesso ativo" : " · acesso liberado"}{result.sent ? " · e-mail de boas-vindas enviado." : "."}</p>
      {!result.sent && <>
        <p className="notice">O e-mail não foi enviado{result.mailError ? ` (${result.mailError})` : " porque o envio ainda não está configurado (RESEND_API_KEY e EMAIL_FROM)"}. Envie este link só para {result.email}: ele é pessoal e dá acesso à conta.</p>
        <p className="row"><code className="share-url">{result.link}</code><CopyButton value={result.link}>Copiar link</CopyButton></p>
      </>}
    </div>}
  </form>;
}

function UsersTab({ data, act, emailOf, reload }) {
  const [grant, setGrant] = useState({ userId: "", reason: "", endsAt: "", editionId: "" });
  return <>
    <InviteForm data={data} reload={reload}/>
    <h2>Usuários</h2>
    <Table head={["E-mail", "Admin", "Cliente Asaas", "Cadastro"]} rows={data.profiles.map((p) => [p.email, p.is_admin ? "sim" : "—", p.asaas_customer_id || "—", when(p.created_at)])}/>
    <h2>Acessos excepcionais</h2>
    <Table head={["Usuário", "Justificativa", "Até", "Situação", ""]} rows={data.grants.map((g) => [emailOf(g.user_id), g.reason, when(g.ends_at), g.revoked_at ? "revogado" : "ativo",
      !g.revoked_at ? <button key="v" type="button" className="link" onClick={() => act("/api/admin/grants/revoke", { id: g.id }, "Acesso revogado.")}>Revogar</button> : "—"])}/>
    <form className="admin-form" onSubmit={async (e) => { e.preventDefault(); await act("/api/admin/grants", grant, "Acesso concedido e auditado."); }}>
      <h2>Conceder acesso</h2>
      <label className="field">Usuário<select value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} required><option value="">Selecione</option>{data.profiles.map((p) => <option key={p.id} value={p.id}>{p.email}</option>)}</select></label>
      <label className="field">Edição<select value={grant.editionId} onChange={(e) => setGrant({ ...grant, editionId: e.target.value })}><option value="">Mais recente</option>{data.editions.map((ed) => <option key={ed.id} value={ed.id}>{ed.name}</option>)}</select></label>
      <label className="field">Até (opcional)<input type="date" value={grant.endsAt} onChange={(e) => setGrant({ ...grant, endsAt: e.target.value })}/></label>
      <label className="field wide">Justificativa (mín. 10 caracteres)<textarea value={grant.reason} onChange={(e) => setGrant({ ...grant, reason: e.target.value })} required minLength={10}/></label>
      <div className="row wide"><button type="submit" className="btn btn-primary">Conceder</button></div>
    </form>
  </>;
}

function Table({ head, rows }) {
  if (!rows.length) return <p className="muted">Nenhum registro.</p>;
  return <div className="table-wrap"><table className="table"><thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

// Funil por origem (fonte · campanha · criativo): visitas → clique em comprar → página de compra →
// pagamento gerado → venda. Taxas sobre as visitas da mesma origem.
function FunnelTab() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { setData(null); apiFetch(`/api/admin/funnel?days=${days}`).then(setData).catch((e) => setError(e.message)); }, [days]);
  const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="muted">Carregando…</p>;
  const total = data.rows.reduce((t, r) => ({ views: t.views + r.views, buyClicks: t.buyClicks + r.buyClicks, buyPage: t.buyPage + r.buyPage, checkouts: t.checkouts + r.checkouts, sales: t.sales + r.sales, revenueCents: t.revenueCents + r.revenueCents }), { views: 0, buyClicks: 0, buyPage: 0, checkouts: 0, sales: 0, revenueCents: 0 });
  return <div className="stack">
    <div className="chip-row">{[1, 2, 7, 30].map((d) => <button key={d} type="button" className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>{d === 1 ? "Hoje" : `${d} dias`}</button>)}</div>
    <p>Visitas <b>{total.views}</b> · cliques em comprar <b>{total.buyClicks}</b> ({pct(total.buyClicks, total.views)}) · pagamentos gerados <b>{total.checkouts}</b> · vendas <b>{total.sales}</b> ({pct(total.sales, total.views)}) · receita <b>{formatPrice(total.revenueCents)}</b></p>
    <Table head={["Origem (fonte · campanha · criativo)", "Visitas", "Clique comprar", "Pág. compra", "Pagamento gerado", "Vendas", "Conversão", "Receita"]}
      rows={data.rows.map((r) => [r.origin, r.views, `${r.buyClicks} (${pct(r.buyClicks, r.views)})`, r.buyPage, `${r.checkouts} (${pct(r.checkouts, r.buyPage)})`, r.sales, pct(r.sales, r.views), formatPrice(r.revenueCents)])}/>
    <h3>Páginas mais vistas</h3>
    <Table head={["Página", "Visitas"]} rows={data.pages.map((p) => [p.path, p.views])}/>
  </div>;
}
