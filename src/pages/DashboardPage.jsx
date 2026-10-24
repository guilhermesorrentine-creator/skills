import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CreditCard, FileText, LayoutDashboard, Menu, RefreshCw, Search, Settings, ShoppingBag, Target, Wallet, X } from "lucide-react";
import { apiFetch } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import "../styles/dashboard.css";

const sections = [
  ["geral", "Visão geral", LayoutDashboard], ["analytics", "Analytics", BarChart3], ["meta", "Meta Ads", Activity],
  ["funil", "Funil do site", Target], ["financeiro", "Financeiro", Wallet], ["pedidos", "Clientes e pedidos", ShoppingBag], ["config", "Configurações", Settings],
];
const dateBR = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const pct = (value) => `${(Number(value || 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const money = (value) => value == null ? "Indisponível" : formatPrice(Math.round(value));
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const shifted = (days) => { const date = new Date(`${today()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - days); return date.toISOString().slice(0, 10); };
const defaults = () => ({ from: shifted(6), to: today() });
const inRange = (date, range) => date && date >= range.from && date <= range.to;

function Period({ value, onChange }) {
  return <div className="dash-period" aria-label="Período">
    <CalendarDays size={16}/>
    <label>De <input type="date" value={value.from} max={value.to} onChange={(event) => onChange({ ...value, from: event.target.value })}/></label>
    <label>até <input type="date" value={value.to} min={value.from} max={today()} onChange={(event) => onChange({ ...value, to: event.target.value })}/></label>
    <div className="dash-quick">{[["Hoje", 0], ["7 dias", 6], ["30 dias", 29]].map(([label, days]) => <button type="button" key={label} onClick={() => onChange({ from: shifted(days), to: today() })}>{label}</button>)}</div>
  </div>;
}

function Metric({ label, value, note }) { return <div className="dash-card dash-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>; }

function SalesChart({ daily }) {
  const values = daily.map((row) => row.salesCents);
  const max = Math.max(1, ...values);
  const points = values.length === 1 ? "0,100 100,100" : values.map((value, index) => `${index * 100 / Math.max(1, values.length - 1)},${100 - value * 88 / max}`).join(" ");
  return <div className="dash-sales-chart">
    {daily.length ? <><svg viewBox="0 0 100 110" preserveAspectRatio="none" role="img" aria-label="Evolução diária do faturamento"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg>
      <div className="dash-chart-labels"><span>{dateBR(daily[0].on)}</span><span>{dateBR(daily.at(-1).on)}</span></div></> : <p className="dash-empty">Nenhum recebimento no período.</p>}
  </div>;
}

function Donut({ metrics }) {
  const [selected, setSelected] = useState(null);
  if (metrics.adCents == null || metrics.metaSalesCents == null) return <div className="dash-card"><h2>Retorno dos anúncios</h2><p>Indisponível até as conexões voltarem.</p></div>;
  const parts = [
    ["Meta Ads", metrics.donut.adsCents, "#7445c7"], ["Taxas do Asaas", metrics.donut.feesCents, "#e79836"],
    ["Lucro atribuído", metrics.donut.profitCents, "#2b9b73"], ["Prejuízo", metrics.donut.lossCents, "#c55269"],
    ].filter((part) => part[1] > 0 && part[0] !== "Prejuízo");
  const total = parts.reduce((sum, part) => sum + part[1], 0);
  let offset = 0;
  return <div className="dash-donut-layout">
    <div className="dash-card dash-donut-card"><div className="dash-card-head"><h2>Retorno dos anúncios</h2><span>Vendas atribuídas: {money(metrics.metaSalesCents)}</span></div>
      <div className="dash-donut" role="img" aria-label="Composição do retorno dos anúncios">
        <svg viewBox="0 0 120 120">{parts.map(([name, value, color]) => { const length = total ? 314.16 * value / total : 0; const segment = <circle key={name} cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth={selected === name ? 18 : 14} strokeDasharray={`${length} 314.16`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" onMouseEnter={() => setSelected(name)} onMouseLeave={() => setSelected(null)}/>; offset += length; return segment; })}</svg>
        <div className="dash-donut-center">{selected ? <><b>{money(parts.find((part) => part[0] === selected)?.[1])}</b><small>{selected}</small></> : <><b>{metrics.roas?.toFixed(2) || "—"}×</b><small>ROAS</small></>}</div>
      </div></div>
    <div className="dash-card dash-donut-legend"><h2>Composição</h2>{parts.map(([name, value, color]) => <button key={name} type="button" onFocus={() => setSelected(name)} onBlur={() => setSelected(null)} onMouseEnter={() => setSelected(name)} onMouseLeave={() => setSelected(null)} className={selected === name ? "is-selected" : ""}><i style={{ background: color }}/><span>{name}</span><b>{money(value)}</b></button>)}{metrics.donut.lossCents > 0 && <p>Prejuízo atribuído: {money(metrics.donut.lossCents)}</p>}<p>Vendas atribuídas: {money(metrics.metaSalesCents)}</p></div>
  </div>;
}

function Table({ headers, rows, empty = "Nenhum dado no período." }) { return <div className="dash-table-wrap"><table><thead><tr>{headers.map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell ?? "—"}</td>)}</tr>) : <tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div>; }

function Overview({ data }) {
  const m = data.metrics;
  return <div className="dash-stack">
    <div className="dash-card dash-hero"><span>Vendas do período</span><strong>{money(m.salesCents)}</strong><small>Caixa: {money(m.cashCents)} · A receber: {money(m.receivableCents)}</small><SalesChart daily={m.daily}/></div>
    <div className="dash-pair"><Metric label="Lucro" value={money(m.profitCents)} note="Vendas menos anúncios, taxas e despesas"/><Metric label="Custo total" value={money(m.adCents == null ? null : m.adCents + m.feesCents + m.expenseCents)} note={`Meta ${money(m.adCents)} · Asaas ${money(m.feesCents)} · outros ${money(m.expenseCents)}`}/></div>
    <Donut metrics={m}/>
    <div className="dash-card dash-goal"><div><span>Meta de lucro até {dateBR(m.goal.goal_ends_on)}</span><strong>{money(m.goal.profitCents)} <small>de {money(m.goal.goal_cents)}</small></strong></div><progress max={m.goal.goal_cents} value={Math.max(0, Math.min(m.goal.profitCents || 0, m.goal.goal_cents))}/><p>Consolidado: {money(m.goal.consolidatedCents)} · Em garantia: {money(m.goal.guaranteeCents)} · Faltam {money(m.goal.remainingCents)}</p><p>{m.goal.daysLeft} dias · lucro diário necessário: {money(m.goal.neededPerDayCents)} · projeção no ritmo dos últimos 7 dias: {money(m.goal.projectedCents)} {m.goal.projectedDate && `(meta em ${dateBR(m.goal.projectedDate)})`}</p><p>{m.goal.averageByProduct.map((item) => `${item.product}: ${item.salesPerDayNeeded ?? "—"} vendas/dia`).join(" · ")}</p></div>
  </div>;
}

function Analytics({ data }) {
  const m = data.metrics;
  return <div className="dash-stack"><div className="dash-metric-grid">
    <Metric label="Vendas" value={money(m.salesCents)}/><Metric label="Caixa" value={money(m.cashCents)}/><Metric label="Gasto Meta" value={money(m.adCents)}/><Metric label="Lucro" value={money(m.profitCents)}/><Metric label="ROAS" value={m.roas === null ? "Indisponível" : `${m.roas.toFixed(2)}×`}/>
    <Metric label="Vendas" value={m.sales}/><Metric label="Custo por venda" value={m.costPerSaleCents === null ? "—" : money(m.costPerSaleCents)}/><Metric label="Conversão" value={m.conversion === null ? "—" : pct(m.conversion)}/><Metric label="Falta para meta" value={money(m.goal.remainingCents)}/>
  </div><div className="dash-card"><h2>Vendas por dia</h2><SalesChart daily={m.daily}/><Table headers={["Dia", "Vendas", "Valor"]} rows={m.daily.map((row) => [dateBR(row.on), row.sales, money(row.salesCents)])}/></div>
  <div className="dash-card"><h2>Origem · campanha · criativo · produto</h2><Table headers={["Origem", "Campanha", "Criativo", "Produto", "Vendas", "Valor"]} rows={m.breakdown.map((row) => [row.source, row.campaign || "—", row.content || "—", row.product, row.sales, money(row.salesCents)])}/><p className="dash-note">Visitas e pagamentos podem cair em dias diferentes.</p></div></div>;
}

function aggregateAds(rows, level, range) {
  const map = new Map();
  for (const row of rows.filter((item) => inRange(item.on, range))) {
    const id = level === "campaign" ? row.campaignId : level === "adset" ? row.adsetId : row.adId;
    const name = level === "campaign" ? row.campaign : level === "adset" ? row.adset : row.ad;
    const item = map.get(id) || { id, name, campaignId: row.campaignId, adsetId: row.adsetId, spendCents: 0, impressions: 0, clicks: 0, landingViews: 0 };
    item.spendCents += row.spendCents; item.impressions += row.impressions; item.clicks += row.clicks; item.landingViews += row.landingViews || 0; map.set(id, item);
  }
  return [...map.values()].sort((a, b) => b.spendCents - a.spendCents);
}

function MetaAds({ data, range, refresh }) {
  const [level, setLevel] = useState("campaign");
  const [campaignId, setCampaignId] = useState("");
  const [adsetId, setAdsetId] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ utmCampaign: "", utmContent: "", notePaths: [] });
  const [status, setStatus] = useState("");
  const campaigns = useMemo(() => aggregateAds(data.ads, "campaign", range), [data.ads, range]);
  const adsets = useMemo(() => aggregateAds(data.ads.filter((row) => row.campaignId === campaignId), "adset", range), [data.ads, campaignId, range]);
  const ads = useMemo(() => aggregateAds(data.ads.filter((row) => row.adsetId === adsetId), "ad", range), [data.ads, adsetId, range]);
  const current = level === "campaign" ? campaigns : level === "adset" ? adsets : ads;
  const match = (item) => data.links.find((link) => link.entity_kind === level && link.entity_id === item.id);
  const selectItem = (item) => { setSelected(item); const link = match(item); setForm({ utmCampaign: link?.utm_campaign || "", utmContent: link?.utm_content || "", notePaths: link?.note_paths || [] }); };
  const save = async (event) => { event.preventDefault(); if (!selected) return; try { await apiFetch("/api/admin/dashboard/links", { method: "POST", body: { entityKind: level, entityId: selected.id, ...form } }); setStatus("Vínculo salvo."); await refresh(false); } catch (error) { setStatus(error.message); } };
  return <div className="dash-stack"><div className="dash-card"><div className="dash-levels">
    <button type="button" aria-pressed={level === "campaign"} onClick={() => { setLevel("campaign"); setCampaignId(""); setAdsetId(""); }}>Campanhas</button>
    <ChevronRight size={15}/><button type="button" aria-pressed={level === "adset"} disabled={!campaignId} onClick={() => { setLevel("adset"); setAdsetId(""); }}>Conjuntos</button>
    <ChevronRight size={15}/><button type="button" aria-pressed={level === "ad"} disabled={!adsetId} onClick={() => setLevel("ad")}>Anúncios individuais</button>
  </div><p className="dash-note">Selecione uma linha para ler a estratégia ao lado. O botão de nível abre os conjuntos ou anúncios.</p>
  {data.connections.meta.error && <p role="status" className="dash-error">Meta Ads indisponível: {data.connections.meta.error}</p>}
  <Table headers={[level === "campaign" ? "Campanha" : level === "adset" ? "Conjunto" : "Anúncio", "Estratégia", "Gasto", "Impressões", "Cliques", "CTR", "CPC", "Visitas Meta", "Visitas site", "Cliques comprar", "Vendas", "Valor", "Custo/venda"]} rows={current.map((item) => {
    const link = match(item); const linked = link?.utm_campaign && (level !== "ad" || link?.utm_content);
    const hits = linked ? data.funnel.filter((event) => inRange(event.on, range) && event.source?.toLowerCase() === "meta" && event.campaign === link.utm_campaign && (level === "campaign" || event.content === link.utm_content)) : [];
    const sold = linked ? data.salesLedger.filter((sale) => inRange(sale.on, range) && sale.source?.toLowerCase() === "meta" && sale.campaign === link.utm_campaign && (level === "campaign" || sale.content === link.utm_content)) : [];
    const refundedCount = linked ? data.orders.filter((order) => inRange(order.refundedOn, range) && order.refundedCents >= order.amountCents && order.source?.toLowerCase() === "meta" && order.campaign === link.utm_campaign && (level === "campaign" || order.content === link.utm_content)).length : 0;
    const count = sold.reduce((total, sale) => total + sale.count, 0) - refundedCount;
    return [<div><button className="dash-row-link" type="button" onClick={() => selectItem(item)}>{item.name}</button>{level !== "ad" && <button type="button" className="dash-row-link" onClick={() => { if (level === "campaign") { setCampaignId(item.id); setLevel("adset"); } else { setAdsetId(item.id); setLevel("ad"); } setSelected(null); }}>Abrir nível</button>}</div>, link?.note_paths?.length ? `${link.note_paths.length} nota(s)` : "Sem nota", money(item.spendCents), item.impressions, item.clicks,
      item.impressions ? pct(item.clicks / item.impressions) : "—", item.clicks ? money(item.spendCents / item.clicks) : "—", item.landingViews, linked ? new Set(hits.filter((hit) => hit.name === "view").map((hit) => hit.sid)).size : "Sem UTM vinculada", linked ? new Set(hits.filter((hit) => hit.name === "buy_click").map((hit) => hit.sid)).size : "—", linked ? count : "—", linked ? money(sold.reduce((sum, sale) => sum + sale.amountCents, 0)) : "—", linked && count ? money(item.spendCents / count) : "—"];
  })}/></div>
  {selected && <div className="dash-card"><h2>{selected.name}</h2><form className="dash-form" onSubmit={save}><label>UTM campanha<input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}/></label>{level === "ad" && <label>UTM criativo<input value={form.utmContent} onChange={(e) => setForm({ ...form, utmContent: e.target.value })}/></label>}<fieldset className="dash-notes"><legend>Notas do Obsidian</legend>{data.notes.map((note) => <label key={note.path}><input type="checkbox" checked={form.notePaths.includes(note.path)} onChange={(e) => setForm({ ...form, notePaths: e.target.checked ? [...form.notePaths, note.path] : form.notePaths.filter((path) => path !== note.path) })}/>{note.title}</label>)}</fieldset><button className="btn btn-primary" type="submit">Salvar vínculo</button>{status && <p role="status">{status}</p>}</form>{(match(selected)?.note_paths || []).map((path) => { const note = data.notes.find((entry) => entry.path === path); return note && <article key={path} className="dash-imported-note"><h3>{note.title}</h3><small>Importada em {new Date(note.imported_at).toLocaleString("pt-BR")} · Atualizada na origem: {dateBR(note.source_updated_on)}</small><pre>{note.content}</pre></article>; })}</div>}</div>;
}

function Funnel({ data, range }) {
  const [filter, setFilter] = useState({ path: "", source: "", campaign: "", content: "", product: "" });
  const choices = (field) => [...new Set(data.funnel.map((event) => event[field]).filter(Boolean))].sort();
  const events = data.funnel.filter((event) => inRange(event.on, range) && ["path", "source", "campaign", "content"].every((field) => !filter[field] || event[field] === filter[field]));
  const orders = data.orders.filter((order) => !filter.product || order.product === filter.product);
  const sessions = (name) => new Set(events.filter((event) => event.name === name).map((event) => event.sid)).size;
  const linked = new Set(events.filter((event) => event.name === "checkout").map((event) => event.orderId));
  const paid = orders.filter((order) => linked.has(order.id) && ["paid", "refunded"].includes(order.status)).length;
  const abandoned = orders.filter((order) => linked.has(order.id) && order.status === "pending" && Date.now() - new Date(`${order.createdOn}T12:00:00-03:00`).getTime() >= 86400000).length;
  const refunded = orders.filter((order) => linked.has(order.id) && order.refundedCents > 0).length;
  const stages = [["Visitas", sessions("view")], ["Clique comprar", sessions("buy_click")], ["Página de compra", sessions("buy_page")], ["Pagamento gerado", sessions("checkout")], ["Pedido pago", paid], ["Abandono 24 h", abandoned], ["Reembolso", refunded]];
  const days = [...new Set(events.map((event) => event.on))].sort();
  return <div className="dash-stack"><div className="dash-card"><h2>Funil por origem</h2><div className="dash-filters">{[["path", "Página"], ["source", "Origem"], ["campaign", "Campanha"], ["content", "Criativo"]].map(([field, label]) => <label key={field}>{label}<select value={filter[field]} onChange={(e) => setFilter({ ...filter, [field]: e.target.value })}><option value="">Todas</option>{choices(field).map((choice) => <option key={choice}>{choice}</option>)}</select></label>)}<label>Produto<select value={filter.product} onChange={(e) => setFilter({ ...filter, product: e.target.value })}><option value="">Todos</option>{[...new Set(data.orders.map((order) => order.product))].map((item) => <option key={item}>{item}</option>)}</select></label></div>
  {filter.product && <p className="dash-note">Produto identificado no pedido; visitas anteriores à compra não têm produto conhecido.</p>}
  <p className="dash-note">Etapas iniciais contam sessões; pagamentos, abandonos e reembolsos contam pedidos.</p><div className="dash-stage-grid">{stages.map(([label, value], index) => <div key={label}><span>{label}</span><strong>{value}</strong>{index > 0 && index < 5 && <small>{stages[index - 1][1] ? pct(value / stages[index - 1][1]) : "—"} da etapa anterior</small>}</div>)}</div></div>
  <div className="dash-card"><h2>Etapas por dia</h2><Table headers={["Dia", "Visitas", "Clique", "Compra", "Pagamento"]} rows={days.map((on) => [dateBR(on), ...["view", "buy_click", "buy_page", "checkout"].map((stage) => new Set(events.filter((event) => event.on === on && event.name === stage).map((event) => event.sid)).size)])}/></div></div>;
}

function Finance({ data, range, refresh }) {
  const [form, setForm] = useState({ title: "", category: "Sistema", amount: "", startsOn: today(), recurring: false, endsOn: "" });
  const [status, setStatus] = useState("");
  const save = async (event) => { event.preventDefault(); try { await apiFetch("/api/admin/dashboard/expenses", { method: "POST", body: { ...form, amountCents: Math.round(Number(form.amount) * 100) } }); setForm({ title: "", category: "Sistema", amount: "", startsOn: today(), recurring: false, endsOn: "" }); setStatus("Despesa salva."); await refresh(); } catch (error) { setStatus(error.message); } };
  const remove = async (id) => { if (!window.confirm("Excluir esta despesa e suas próximas recorrências?")) return; try { await apiFetch("/api/admin/dashboard/expenses/delete", { method: "POST", body: { id } }); await refresh(); } catch (error) { setStatus(error.message); } };
  return <div className="dash-stack"><div className="dash-metric-grid"><Metric label="Vendas" value={money(data.metrics.salesCents)}/><Metric label="Caixa no Asaas" value={money(data.metrics.cashCents)}/><Metric label="A receber" value={money(data.metrics.receivableCents)}/><Metric label="Reembolsos" value={money(data.metrics.refundsCents)}/><Metric label="Taxas Asaas" value={money(data.metrics.feesCents)}/><Metric label="Despesas" value={money(data.metrics.expenseCents)}/></div>
    <div className="dash-card"><h2>Cobranças e parcelas</h2><Table headers={["Confirmação", "Crédito", "Previsto", "Produto", "Forma", "Situação", "Bruto", "Taxa", "Líquido", "Reembolso"]} rows={data.payments.filter((payment) => inRange(payment.confirmedOn || payment.creditOn, range)).map((payment) => [dateBR(payment.confirmedOn), dateBR(payment.creditOn), dateBR(payment.expectedOn), payment.product, payment.billingType, payment.status, money(payment.grossCents), payment.feeCents == null ? "Estimada" : money(payment.feeCents), money(payment.netCents), money(payment.refundedCents)])}/></div>
    <div className="dash-card"><h2>Despesas cadastradas</h2><Table headers={["Nome", "Categoria", "Valor", "Início", "Recorrência", "Ações"]} rows={data.expenses.map((expense) => [expense.title, expense.category, money(expense.amount_cents), dateBR(expense.starts_on), expense.recurring ? "Mensal" : "Avulsa", <div className="dash-actions"><button type="button" onClick={() => setForm({ id: expense.id, title: expense.title, category: expense.category, amount: String(expense.amount_cents / 100), startsOn: expense.starts_on, endsOn: expense.ends_on || "", recurring: expense.recurring })}>Editar</button><button type="button" onClick={() => remove(expense.id)}>Excluir</button></div>])}/>
      <form className="dash-form" onSubmit={save}><h3>{form.id ? "Editar despesa" : "Nova despesa"}</h3><label>Nome<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required/></label><label>Categoria<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required/></label><label>Valor (R$)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required/></label><label>Início<input type="date" value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} required/></label><label className="dash-check"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })}/> Mensal</label>{form.recurring && <label>Fim (opcional)<input type="date" value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })}/></label>}<button className="btn btn-primary" type="submit">Salvar despesa</button>{status && <p role="status">{status}</p>}</form></div>
  </div>;
}

function Orders({ data, range }) { return <div className="dash-card"><h2>Pedidos e clientes</h2><p className="dash-note">Consulta. Conciliação e estorno permanecem na <Link to="/admin">Administração</Link>.</p><Table headers={["Data", "Comprador", "Produto", "Valor", "Forma", "Status", "Garantia", "Origem", "Campanha", "Criativo", "Reembolso"]} rows={data.orders.filter((order) => inRange(order.createdOn, range)).map((order) => [dateBR(order.createdOn), order.email, order.product, money(order.amountCents), order.billingType, order.status, order.confirmedOn && Date.now() - new Date(`${order.confirmedOn}T12:00:00-03:00`).getTime() < 15 * 86400000 ? "Sim" : "Não", order.source, order.campaign || "—", order.content || "—", order.refundedCents ? money(order.refundedCents) : "—"])}/></div>; }

function Config({ data, refresh }) {
  const [form, setForm] = useState({ goalCents: data.goal.goal_cents / 100, startsOn: data.goal.goal_starts_on, endsOn: data.goal.goal_ends_on });
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState([]);
  const [noteFolder, setNoteFolder] = useState("Marketing/");
  const save = async (event) => { event.preventDefault(); try { await apiFetch("/api/admin/dashboard/goal", { method: "POST", body: { goalCents: Math.round(Number(form.goalCents) * 100), startsOn: form.startsOn, endsOn: form.endsOn } }); setStatus("Meta salva."); await refresh(); } catch (error) { setStatus(error.message); } };
  const importNotes = async (event) => { event.preventDefault(); try { for (const file of files) { const path = `${noteFolder.replace(/\/?$/, "/")}${file.name}`; if (!path.startsWith("Marketing/")) throw new Error("Informe a pasta relativa dentro de Marketing."); await apiFetch("/api/admin/dashboard/notes", { method: "POST", body: { path, content: await file.text() } }); } setStatus(`${files.length} nota(s) importada(s).`); await refresh(false); } catch (error) { setStatus(error.message); } };
  return <div className="dash-stack"><div className="dash-card"><h2>Meta de lucro</h2><form className="dash-form" onSubmit={save}><label>Valor (R$)<input type="number" min="0.01" step="0.01" value={form.goalCents} onChange={(e) => setForm({ ...form, goalCents: e.target.value })} required/></label><label>Começa<input type="date" value={form.startsOn} onChange={(e) => setForm({ ...form, startsOn: e.target.value })} required/></label><label>Termina<input type="date" value={form.endsOn} onChange={(e) => setForm({ ...form, endsOn: e.target.value })} required/></label><button className="btn btn-primary" type="submit">Salvar meta</button>{status && <p role="status">{status}</p>}</form></div>
    <div className="dash-card"><h2>Importar notas do Obsidian</h2><p className="dash-note">Informe a pasta relativa do cofre e selecione os arquivos Markdown. Reimportar substitui a versão anterior.</p><form className="dash-form" onSubmit={importNotes}><label>Pasta no cofre<input value={noteFolder} onChange={(event) => setNoteFolder(event.target.value)} placeholder="Marketing/Campanhas/2026-10 Teste R$60 - Trafego oferta/"/></label><label>Arquivos<input type="file" accept=".md,text/markdown" multiple onChange={(event) => setFiles([...event.target.files])}/></label><button className="btn btn-primary" type="submit" disabled={!files.length}>Importar</button></form><Table headers={["Nota", "Importada", "Atualizada na origem"]} rows={data.notes.map((note) => [note.path, new Date(note.imported_at).toLocaleString("pt-BR"), dateBR(note.source_updated_on)])}/></div>
    <div className="dash-card"><h2>Conexões</h2><div className="dash-connections">{[["Asaas", data.connections.asaas], ["Meta Ads", data.connections.meta], ["Funil próprio", data.connections.funnel]].map(([name, connection]) => <div key={name}><strong>{name}</strong><span className={connection.error ? "dash-bad" : "dash-good"}>{connection.error ? "Atenção" : "Conectado"}</span><small>{connection.checkedAt ? `Atualizado ${new Date(connection.checkedAt).toLocaleString("pt-BR")}` : "Sem atualização"}{connection.ageSeconds != null ? ` · cache: ${Math.round(connection.ageSeconds / 60)} min` : ""}</small>{connection.error && <p>{connection.error}</p>}</div>)}</div><button className="btn btn-ghost" type="button" onClick={() => refresh(true)}><RefreshCw size={16}/> Atualizar agora</button></div></div>;
}

export default function DashboardPage() {
  const [section, setSection] = useState("geral");
  const [range, setRange] = useState(defaults);
  const [metaRange, setMetaRange] = useState(defaults);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const current = section === "meta" ? metaRange : range;
  const refresh = useCallback(async (force = false) => { setLoading(true); try { const active = section === "meta" ? metaRange : range; const params = new URLSearchParams(active); if (force) params.set("refresh", "1"); const next = await apiFetch(`/api/admin/dashboard?${params}`); setData(next); setError(""); } catch (cause) { setError(cause.status === 403 ? "Acesso restrito à administração." : cause.message); } finally { setLoading(false); } }, [range, metaRange, section]);
  useEffect(() => { refresh(false); }, [refresh]);
  const select = (id) => { setSection(id); setMobileOpen(false); setSearch(false); };
  useEffect(() => { const handler = (event) => { if (event.key === "Escape") { setSearch(false); setMobileOpen(false); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearch(true); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, []);
  return <main id="conteudo" className={`dashboard ${collapsed ? "dash-collapsed" : ""} ${mobileOpen ? "dash-mobile-open" : ""}`}>
    <button className="dash-scrim" type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}/>
    <aside className="dash-sidebar"><div className="dash-workspace"><div className="dash-logo">V</div><div><strong>Voxelia</strong><small>Resultados do negócio</small></div><ChevronDown size={15}/></div>
      <button className="dash-search-button" type="button" onClick={() => setSearch(true)}><Search size={17}/><span>Buscar janela</span><kbd>Ctrl K</kbd></button>
      <nav aria-label="Painel">{sections.map(([id, title, Icon], i) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => select(id)}><Icon size={18}/><span>{title}</span>{i === 2 && data?.connections.meta.error && <span className="dash-alert-dot" aria-label="Conexão Meta pendente"/>}</button>)}</nav>
      <div className="dash-side-bottom"><Link to="/admin"><FileText size={18}/><span>Administração</span></Link><Link to="/app"><ChevronLeft size={18}/><span>Voltar ao site</span></Link></div></aside>
    <div className="dash-main"><header className="dash-top"><button type="button" className="dash-icon dash-desktop-toggle" aria-label={collapsed ? "Abrir menu" : "Recolher menu"} onClick={() => setCollapsed(!collapsed)}><Menu size={19}/></button><button type="button" className="dash-icon dash-mobile-toggle" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><span>Voxelia <ChevronRight size={14}/> <b>{sections.find(([id]) => id === section)?.[1]}</b></span><button type="button" className="dash-icon" aria-label="Atualizar dados" onClick={() => refresh(true)}><RefreshCw size={18}/></button></header>
      <div className="dash-content"><div className="dash-heading"><div><small>PAINEL PRIVADO</small><h1>{sections.find(([id]) => id === section)?.[1]}</h1></div><Period value={current} onChange={section === "meta" ? setMetaRange : setRange}/></div>
      {loading && <p role="status" className="dash-status">Atualizando Asaas e Meta Ads…</p>}{error && <p role="alert" className="dash-error">{error}</p>}
      {data && <><p className="dash-updated">Última consulta: {new Date(data.updatedAt).toLocaleString("pt-BR")} · {data.connections.asaas.error ? "Asaas indisponível" : "Asaas atualizado"} · {data.connections.meta.error ? "Meta Ads indisponível" : "Meta Ads atualizado"}</p>
        {section === "geral" && <Overview data={data}/>}{section === "analytics" && <Analytics data={data}/>}{section === "meta" && <MetaAds data={data} range={metaRange} refresh={refresh}/>}{section === "funil" && <Funnel data={data} range={range}/>}{section === "financeiro" && <Finance data={data} range={range} refresh={refresh}/>}{section === "pedidos" && <Orders data={data} range={range}/>}{section === "config" && <Config data={data} refresh={refresh}/>}</>}
      </div></div>
    {search && <div className="dash-search-overlay" role="dialog" aria-modal="true" aria-label="Buscar janela"><button type="button" aria-label="Fechar busca" className="dash-search-backdrop" onClick={() => setSearch(false)}/><div className="dash-search-modal"><div><Search size={19}/><input autoFocus placeholder="Buscar janela…" value={query} onChange={(event) => setQuery(event.target.value)}/><button type="button" aria-label="Fechar" onClick={() => setSearch(false)}><X size={18}/></button></div>{sections.filter(([, title]) => title.toLowerCase().includes(query.toLowerCase())).map(([id, title, Icon]) => <button key={id} type="button" onClick={() => { select(id); setQuery(""); }}><Icon size={17}/>{title}</button>)}</div></div>}
  </main>;
}
