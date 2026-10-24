import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clapperboard, CreditCard, FileText, LayoutDashboard, Menu, RefreshCw, Search, Settings, ShoppingBag, Target, Wallet, X } from "lucide-react";
import { apiFetch } from "../lib/auth.jsx";
import { Link } from "../lib/router.jsx";
import { formatPrice } from "../lib/billing-client.js";
import { paidSignal, reelSignal } from "../lib/dashboard-signals.js";
import "../styles/dashboard.css";

const sections = [
  ["geral", "Visão geral", LayoutDashboard], ["analytics", "Analytics", BarChart3], ["meta", "Meta Ads", Activity], ["organico", "Orgânico", Clapperboard],
  ["funil", "Funil do site", Target], ["financeiro", "Financeiro", Wallet], ["pedidos", "Clientes e pedidos", ShoppingBag], ["indices", "Índices", BookOpen], ["config", "Configurações", Settings],
];
const definitions = {
  "Vendas": "Valor integral dos pedidos confirmados no período, menos reembolsos lançados no período. Uma compra em 12x conta pelo valor total.",
  "Vendas do período": "Valor integral dos pedidos confirmados no período, menos reembolsos lançados no período. Uma compra em 12x conta pelo valor total.",
  "Pedidos pagos": "Quantidade de pedidos com pagamento confirmado, descontados os totalmente reembolsados.",
  "Caixa": "Valor líquido das parcelas que ficou disponível no saldo do Asaas no período.",
  "Caixa no Asaas": "Valor líquido das parcelas que ficou disponível no saldo do Asaas no período.",
  "A receber": "Parcelas confirmadas que ainda não ficaram disponíveis no saldo do Asaas.",
  "Lucro": "Vendas menos gasto Meta, taxas Asaas e despesas cadastradas no período.",
  "Custo total": "Soma de gasto Meta Ads, taxas Asaas e despesas cadastradas.",
  "ROAS": "Vendas atribuídas à Meta pelas UTM divididas pelo gasto com anúncios no mesmo período. Não representa o lucro.",
  "Gasto Meta": "Valor gasto nos anúncios da Meta no período selecionado.",
  "Gasto": "Valor gasto em anúncios da Meta no período selecionado.",
  "Impressões": "Quantidade de vezes que a Meta exibiu o anúncio. Uma pessoa pode gerar várias impressões.",
  "Cliques": "Todos os cliques registrados pela Meta no anúncio, inclusive interações que não abrem o site.",
  "Cliques no link": "Cliques que a Meta registrou no link de destino do anúncio.",
  "CTR": "Percentual de impressões que geraram um clique no anúncio. Pode incluir cliques fora do link.",
  "CTR de link": "Cliques no link divididos pelas impressões. Ajuda a avaliar o gancho do criativo.",
  "CPC": "Gasto Meta dividido pelo número de cliques do anúncio.",
  "Visitas Meta": "Visualizações da página de destino medidas pela Meta; podem ser menores que as visitas do site.",
  "Visitas site": "Sessões que a Voxelia mediu no próprio site para a UTM vinculada.",
  "Clique comprar": "Sessões que tocaram no botão para iniciar a compra.",
  "Cliques comprar": "Sessões que tocaram no botão para iniciar a compra.",
  "Página de compra": "Sessões que chegaram à página de compra. Não significa pedidos pagos.",
  "Pagamento gerado": "Sessões com checkout criado no Asaas; o pagamento pode continuar pendente.",
  "Pedido pago": "Pedidos cujo pagamento foi confirmado.",
  "Abandono 24 h": "Pedidos com pagamento gerado que continuaram sem pagamento após 24 horas.",
  "Reembolso": "Pedidos que tiveram valor estornado, total ou parcialmente.",
  "Custo por venda": "Gasto Meta dividido apenas pelas vendas atribuídas à Meta.",
  "Custo/venda": "Gasto Meta dividido apenas pelas vendas atribuídas à Meta pela UTM vinculada.",
  "Conversão": "Pedidos pagos divididos pelas visitas do funil. Visita e pagamento podem cair em dias diferentes.",
  "Visualizações": "Número de vezes que o Reel foi reproduzido ou exibido, informado pelo Instagram. Uma pessoa pode contar mais de uma vez.",
  "Horas assistidas": "Tempo total de reprodução informado pelo Instagram para os Reels. O dado original vem em milissegundos e é exibido em horas.",
  "Curtidas": "Curtidas registradas pelo Instagram no Reel.",
  "Comentários": "Comentários registrados pelo Instagram no Reel.",
  "Leitura": "Resumo automático dos sinais da campanha. Usa somente dados suficientes e regras documentadas; não altera os anúncios.",
  "Visitas": "Sessões medidas pelo funil próprio da Voxelia no período.",
  "Reels publicados": "Quantidade de Reels publicados pela conta @voxelia.ia no período escolhido.",
  "Mais visto": "Visualizações do Reel com maior número de visualizações no período escolhido.",
};
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

function MetricTerm({ label }) { const meaning = definitions[label]; return meaning ? <details className="dash-term"><summary title={meaning}>{label} <CircleHelp size={13} aria-hidden="true"/></summary><span>{meaning}</span></details> : label; }
function Metric({ label, value, note, tone }) { return <div className={`dash-card dash-metric${tone ? ` dash-metric-${tone}` : ""}`}><MetricTerm label={label}/><strong>{value}</strong>{note && <small>{note}</small>}</div>; }

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

function Table({ headers, rows, empty = "Nenhum dado no período." }) { return <div className="dash-table-wrap"><table><thead><tr>{headers.map((head, index) => <th key={index} scope="col">{typeof head === "string" ? <MetricTerm label={head}/> : head}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell ?? "—"}</td>)}</tr>) : <tr><td colSpan={headers.length}>{empty}</td></tr>}</tbody></table></div>; }

function campaignSignalFor(data, campaign, link, range, level = "campaign") {
  const linked = Boolean(link?.utm_campaign);
  const matched = (row) => row.campaign === link?.utm_campaign && (level === "ad" ? row.content === link?.utm_content : true);
  const visits = linked ? new Set(data.funnel.filter((event) => event.name === "view" && inRange(event.on, range) && event.source?.toLowerCase() === "meta" && matched(event)).map((event) => event.sid)).size : null;
  const buyClicks = linked ? new Set(data.funnel.filter((event) => event.name === "buy_click" && inRange(event.on, range) && event.source?.toLowerCase() === "meta" && matched(event)).map((event) => event.sid)).size : null;
  const salesCents = linked ? data.salesLedger.filter((sale) => inRange(sale.on, range) && sale.source?.toLowerCase() === "meta" && matched(sale)).reduce((sum, sale) => sum + sale.amountCents, 0) : null;
  const feesCents = linked ? data.payments.filter((payment) => inRange(payment.confirmedOn, range) && payment.source?.toLowerCase() === "meta" && matched(payment)).reduce((sum, payment) => sum + (payment.feeCents || 0), 0) : 0;
  return paidSignal({ error: data.connections.meta.error, spendCents: campaign.spendCents, impressions: campaign.impressions,
    linkClicks: campaign.linkClicks, landingViews: campaign.landingViews, siteVisits: visits, buyClicks, salesCents,
    profitCents: linked && !data.connections.asaas.error ? salesCents - feesCents - campaign.spendCents : null,
    trafficTest: link?.utm_campaign === "teste60" || /teste\s*r\$\s*60/i.test(campaign.name || "") });
}

function SignalCard({ title, signal, children }) { return <section className={`dash-card dash-signal dash-signal-${signal.tone}`}><div><span className="dash-signal-label">{title}</span><strong>{signal.title}</strong><small>{signal.detail}</small></div>{children}</section>; }

function Overview({ data }) {
  const m = data.metrics;
  const range = { from: data.from, to: data.to };
  const campaigns = aggregateAds(data.ads, "campaign", range);
  const lead = campaigns[0];
  const link = data.links.find((item) => item.entity_kind === "campaign" && item.entity_id === lead?.id);
  const signal = lead ? campaignSignalFor(data, lead, link, range) : paidSignal({ error: data.connections.meta.error });
  return <div className="dash-stack">
    <div className="dash-card dash-hero"><MetricTerm label="Vendas do período"/><strong>{money(m.salesCents)}</strong><small>Caixa: {money(m.cashCents)} · A receber: {money(m.receivableCents)}</small><SalesChart daily={m.daily}/></div>
    <div className="dash-pair"><Metric label="Lucro" value={money(m.profitCents)} tone={m.profitCents == null ? undefined : m.profitCents < 0 ? "bad" : "good"} note="Vendas menos anúncios, taxas e despesas"/><Metric label="Custo total" value={money(m.adCents == null ? null : m.adCents + m.feesCents + m.expenseCents)} note={`Meta ${money(m.adCents)} · Asaas ${money(m.feesCents)} · outros ${money(m.expenseCents)}`}/></div>
    <Donut metrics={m}/>
    <div className="dash-card dash-goal"><div><span>Meta de lucro até {dateBR(m.goal.goal_ends_on)}</span><strong>{money(m.goal.profitCents)} <small>de {money(m.goal.goal_cents)}</small></strong></div><progress max={m.goal.goal_cents} value={Math.max(0, Math.min(m.goal.profitCents || 0, m.goal.goal_cents))}/><div className="dash-goal-facts"><span>Falta <b>{money(m.goal.remainingCents)}</b></span><span>Por dia <b>{money(m.goal.neededPerDayCents)}</b></span><span>Projeção <b>{money(m.goal.projectedCents)}</b></span><span>Prazo <b>{m.goal.daysLeft} dias</b></span></div><details className="dash-more"><summary>Ver garantia e planejamento</summary><p>Consolidado: {money(m.goal.consolidatedCents)} · Em garantia: {money(m.goal.guaranteeCents)}{m.goal.projectedDate && ` · Data projetada: ${dateBR(m.goal.projectedDate)}`}</p><p>{m.goal.averageByProduct.map((item) => `${item.product}: ${item.salesPerDayNeeded ?? "—"} vendas/dia`).join(" · ")}</p></details></div>
    <SignalCard title={lead ? `Campanha: ${lead.name}` : "Campanhas Meta"} signal={signal}><div className="dash-signal-facts"><span>Gasto <b>{money(lead?.spendCents ?? m.adCents)}</b></span><span>Visitas Meta <b>{lead?.landingViews ?? "—"}</b></span><span>Vendas atribuídas <b>{money(m.metaSalesCents)}</b></span></div></SignalCard>
  </div>;
}

function Analytics({ data }) {
  const m = data.metrics;
  return <div className="dash-stack"><div className="dash-metric-grid">
    <Metric label="Vendas" value={money(m.salesCents)}/><Metric label="Caixa" value={money(m.cashCents)}/><Metric label="Gasto Meta" value={money(m.adCents)}/><Metric label="Lucro" value={money(m.profitCents)}/><Metric label="ROAS" value={m.roas === null ? "Indisponível" : `${m.roas.toFixed(2)}×`}/>
    <Metric label="Pedidos pagos" value={m.sales}/><Metric label="Custo por venda" value={m.costPerSaleCents === null ? "—" : money(m.costPerSaleCents)}/><Metric label="Conversão" value={m.conversion === null ? "—" : pct(m.conversion)}/><Metric label="Falta para meta" value={money(m.goal.remainingCents)}/>
  </div><div className="dash-card"><h2>Vendas por dia</h2><SalesChart daily={m.daily}/><Table headers={["Dia", "Vendas", "Valor"]} rows={m.daily.map((row) => [dateBR(row.on), row.sales, money(row.salesCents)])}/></div>
  <div className="dash-card"><h2>Origem · campanha · criativo · produto</h2><Table headers={["Origem", "Campanha", "Criativo", "Produto", "Vendas", "Valor"]} rows={m.breakdown.map((row) => [row.source, row.campaign || "—", row.content || "—", row.product, row.sales, money(row.salesCents)])}/><p className="dash-note">Visitas e pagamentos podem cair em dias diferentes.</p></div></div>;
}

function aggregateAds(rows, level, range) {
  const map = new Map();
  for (const row of rows.filter((item) => inRange(item.on, range))) {
    const id = level === "campaign" ? row.campaignId : level === "adset" ? row.adsetId : row.adId;
    const name = level === "campaign" ? row.campaign : level === "adset" ? row.adset : row.ad;
    const item = map.get(id) || { id, name, campaignId: row.campaignId, adsetId: row.adsetId, spendCents: 0, impressions: 0, clicks: 0, linkClicks: 0, linkClicksKnown: true, landingViews: 0 };
    item.spendCents += row.spendCents; item.impressions += row.impressions; item.clicks += row.clicks; item.landingViews += row.landingViews || 0;
    if (row.linkClicks == null) item.linkClicksKnown = false; else item.linkClicks += row.linkClicks;
    map.set(id, item);
  }
  return [...map.values()].map((item) => ({ ...item, linkClicks: item.linkClicksKnown ? item.linkClicks : null })).sort((a, b) => b.spendCents - a.spendCents);
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
  <Table headers={[level === "campaign" ? "Campanha" : level === "adset" ? "Conjunto" : "Anúncio", "Leitura", "Estratégia", "Gasto", "Impressões", "Cliques", "CTR", "CTR de link", "CPC", "Visitas Meta", "Visitas site", "Cliques comprar", "Vendas", "Valor", "Custo/venda"]} rows={current.map((item) => {
    const link = match(item); const linked = link?.utm_campaign && (level !== "ad" || link?.utm_content);
    const hits = linked ? data.funnel.filter((event) => inRange(event.on, range) && event.source?.toLowerCase() === "meta" && event.campaign === link.utm_campaign && (level === "campaign" || event.content === link.utm_content)) : [];
    const sold = linked ? data.salesLedger.filter((sale) => inRange(sale.on, range) && sale.source?.toLowerCase() === "meta" && sale.campaign === link.utm_campaign && (level === "campaign" || sale.content === link.utm_content)) : [];
    const refundedCount = linked ? data.orders.filter((order) => inRange(order.refundedOn, range) && order.refundedCents >= order.amountCents && order.source?.toLowerCase() === "meta" && order.campaign === link.utm_campaign && (level === "campaign" || order.content === link.utm_content)).length : 0;
    const count = sold.reduce((total, sale) => total + sale.count, 0) - refundedCount;
    const signal = campaignSignalFor(data, item, link, range, level);
    return [<div><button className="dash-row-link" type="button" onClick={() => selectItem(item)}>{item.name}</button>{level !== "ad" && <button type="button" className="dash-row-link" onClick={() => { if (level === "campaign") { setCampaignId(item.id); setLevel("adset"); } else { setAdsetId(item.id); setLevel("ad"); } setSelected(null); }}>Abrir nível</button>}</div>, <span className={`dash-pill dash-pill-${signal.tone}`} title={signal.detail}>{signal.title}</span>, link?.note_paths?.length ? `${link.note_paths.length} nota(s)` : "Sem nota", money(item.spendCents), item.impressions, item.clicks,
      item.impressions ? pct(item.clicks / item.impressions) : "—", item.impressions && item.linkClicks != null ? pct(item.linkClicks / item.impressions) : "—", item.clicks ? money(item.spendCents / item.clicks) : "—", item.landingViews, linked ? new Set(hits.filter((hit) => hit.name === "view").map((hit) => hit.sid)).size : "Sem UTM vinculada", linked ? new Set(hits.filter((hit) => hit.name === "buy_click").map((hit) => hit.sid)).size : "—", linked ? count : "—", linked ? money(sold.reduce((sum, sale) => sum + sale.amountCents, 0)) : "—", linked && count ? money(item.spendCents / count) : "—"];
  })}/></div>
  {selected && <div className="dash-card"><h2>{selected.name}</h2><form className="dash-form" onSubmit={save}><label>UTM campanha<input value={form.utmCampaign} onChange={(e) => setForm({ ...form, utmCampaign: e.target.value })}/></label>{level === "ad" && <label>UTM criativo<input value={form.utmContent} onChange={(e) => setForm({ ...form, utmContent: e.target.value })}/></label>}<fieldset className="dash-notes"><legend>Notas do Obsidian</legend>{data.notes.map((note) => <label key={note.path}><input type="checkbox" checked={form.notePaths.includes(note.path)} onChange={(e) => setForm({ ...form, notePaths: e.target.checked ? [...form.notePaths, note.path] : form.notePaths.filter((path) => path !== note.path) })}/>{note.title}</label>)}</fieldset><button className="btn btn-primary" type="submit">Salvar vínculo</button>{status && <p role="status">{status}</p>}</form>{(match(selected)?.note_paths || []).map((path) => { const note = data.notes.find((entry) => entry.path === path); return note && <article key={path} className="dash-imported-note"><h3>{note.title}</h3><small>Importada em {new Date(note.imported_at).toLocaleString("pt-BR")} · Atualizada na origem: {dateBR(note.source_updated_on)}</small><pre>{note.content}</pre></article>; })}</div>}</div>;
}

function Organic({ range, refreshKey }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const previousRefresh = useRef(refreshKey);
  useEffect(() => {
    let active = true;
    const force = refreshKey !== previousRefresh.current;
    previousRefresh.current = refreshKey;
    const params = new URLSearchParams(range);
    if (force) params.set("refresh", "1");
    setLoading(true);
    apiFetch(`/api/admin/dashboard/organic?${params}`).then((data) => { if (active) { setResult(data); setError(""); } })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range.from, range.to, refreshKey]);
  if (loading && !result) return <p role="status" className="dash-status">Consultando Reels do Instagram…</p>;
  if (error) return <p role="alert" className="dash-error">{error}</p>;
  const rows = result?.rows || [];
  const known = rows.filter((row) => row.views != null);
  const total = known.reduce((sum, row) => sum + row.views, 0);
  const knownWatch = rows.filter((row) => row.watchMs != null);
  const watchHours = knownWatch.reduce((sum, row) => sum + row.watchMs, 0) / 3600000;
  const best = known.length ? [...known].sort((a, b) => b.views - a.views)[0] : null;
  const mature = known.filter((row) => Math.floor((Date.parse(`${today()}T12:00:00Z`) - Date.parse(`${row.on}T12:00:00Z`)) / 86400000) >= 7);
  const sorted = mature.map((row) => row.views).sort((a, b) => a - b);
  const referenceViews = sorted.length >= 5 ? sorted[Math.floor(sorted.length / 2)] : null;
  return <div className="dash-stack">
    {result?.connection.error && <div className="dash-card dash-connection-message" role="status"><strong>Instagram ainda não conectado</strong><span>{result.connection.error}</span><small>O painel exibirá as visualizações assim que a credencial de Insights for configurada no servidor.</small></div>}
    {result?.warning && <p className="dash-status" role="status">{result.warning}</p>}
    <div className="dash-organic-stats"><Metric label="Reels publicados" value={result?.connection.error ? "Indisponível" : rows.length}/><Metric label="Visualizações" value={known.length ? total.toLocaleString("pt-BR") : result?.connection.error ? "Indisponível" : "—"}/><Metric label="Horas assistidas" value={knownWatch.length ? `${watchHours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h` : "Indisponível"}/><Metric label="Mais visto" value={best ? best.views.toLocaleString("pt-BR") : "—"} note={best ? dateBR(best.on) : ""}/></div>
    {rows.length > 0 && <section className="dash-card"><h2>Visualizações e horas dos Reels</h2><p className="dash-note">Cada linha representa um Reel publicado no período. Os números são acumulados até a última atualização do Instagram.</p><div className="dash-organic-chart">{[...rows].reverse().slice(0, 12).map((row) => <div className="dash-organic-chart-row" key={row.id}><span>{dateBR(row.on)}</span><div><span>Visualizações</span><div className="dash-organic-track"><i style={{ width: `${row.views == null ? 0 : Math.max(2, row.views / Math.max(1, ...known.map((item) => item.views)) * 100)}%` }}/></div><b>{row.views == null ? "—" : row.views.toLocaleString("pt-BR")}</b></div><div><span>Horas</span><div className="dash-organic-track dash-organic-track-hours"><i style={{ width: `${row.watchMs == null ? 0 : Math.max(2, row.watchMs / Math.max(1, ...knownWatch.map((item) => item.watchMs)) * 100)}%` }}/></div><b>{row.watchMs == null ? "—" : (row.watchMs / 3600000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</b></div></div>)}</div></section>}
    <section className="dash-card"><div className="dash-card-head"><h2>Reels de @voxelia.ia</h2><span>{result?.connection.checkedAt ? `Atualizado ${new Date(result.connection.checkedAt).toLocaleString("pt-BR")}` : "Sem atualização"}</span></div>
      {!rows.length ? <p className="dash-empty">{result?.connection.error ? "Conecte o Instagram para consultar os Reels." : "Nenhum Reel encontrado no período."}</p> : <div className="dash-reel-list">{rows.map((row) => {
        const ageDays = Math.floor((Date.parse(`${today()}T12:00:00Z`) - Date.parse(`${row.on}T12:00:00Z`)) / 86400000);
        const signal = reelSignal({ views: row.views, ageDays, referenceViews });
        return <article key={row.id} className="dash-reel"><div><span className="dash-reel-date">{dateBR(row.on)}</span><h3>{row.caption || "Reel sem legenda"}</h3><span className={`dash-pill dash-pill-${signal.tone}`}>{signal.title}</span></div><div className="dash-reel-metrics"><div><MetricTerm label="Visualizações"/><strong>{row.views == null ? "Indisponível" : row.views.toLocaleString("pt-BR")}</strong></div><div><MetricTerm label="Horas assistidas"/><strong>{row.watchMs == null ? "Indisponível" : `${(row.watchMs / 3600000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`}</strong></div><div><MetricTerm label="Curtidas"/><strong>{row.likes.toLocaleString("pt-BR")}</strong></div><div><MetricTerm label="Comentários"/><strong>{row.comments.toLocaleString("pt-BR")}</strong></div></div>{row.permalink && <a href={row.permalink} target="_blank" rel="noreferrer">Abrir Reel ↗</a>}</article>;
      })}</div>}
    </section>
  </div>;
}

function Indices() {
  const groups = [
    ["Resultado do negócio", ["Vendas", "Pedidos pagos", "Caixa", "A receber", "Lucro", "Custo total", "ROAS", "Custo por venda", "Conversão"]],
    ["Meta Ads", ["Gasto Meta", "Impressões", "Cliques", "Cliques no link", "CTR", "CTR de link", "CPC", "Visitas Meta", "Visitas site", "Leitura"]],
    ["Funil e orgânico", ["Clique comprar", "Página de compra", "Pagamento gerado", "Pedido pago", "Abandono 24 h", "Reembolso", "Visualizações", "Horas assistidas", "Curtidas", "Comentários"]],
  ];
  return <div className="dash-stack"><p className="dash-note">Passe o mouse no símbolo de ajuda em qualquer métrica. No celular, toque no nome para ver a explicação.</p>{groups.map(([group, terms]) => <section className="dash-card" key={group}><h2>{group}</h2><dl className="dash-glossary">{terms.map((term) => <div key={term}><dt>{term}</dt><dd>{definitions[term]}</dd></div>)}</dl></section>)}</div>;
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
  <p className="dash-note">Etapas iniciais contam sessões; pagamentos, abandonos e reembolsos contam pedidos.</p><div className="dash-stage-grid">{stages.map(([label, value], index) => <div key={label}><MetricTerm label={label}/><strong>{value}</strong>{index > 0 && index < 5 && <small>{stages[index - 1][1] ? pct(value / stages[index - 1][1]) : "—"} da etapa anterior</small>}</div>)}</div></div>
  <div className="dash-card"><h2>Etapas por dia</h2><Table headers={["Dia", "Visitas", "Clique comprar", "Página de compra", "Pagamento gerado"]} rows={days.map((on) => [dateBR(on), ...["view", "buy_click", "buy_page", "checkout"].map((stage) => new Set(events.filter((event) => event.on === on && event.name === stage).map((event) => event.sid)).size)])}/></div></div>;
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
  const [organicRange, setOrganicRange] = useState(() => ({ from: shifted(29), to: today() }));
  const [organicRefresh, setOrganicRefresh] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const current = section === "meta" ? metaRange : section === "organico" ? organicRange : range;
  const refresh = useCallback(async (force = false) => { setLoading(true); try { const active = section === "meta" ? metaRange : range; const params = new URLSearchParams(active); if (force) params.set("refresh", "1"); const next = await apiFetch(`/api/admin/dashboard?${params}`); setData(next); setError(""); } catch (cause) { setError(cause.status === 403 ? "Acesso restrito à administração." : cause.message); } finally { setLoading(false); } }, [range, metaRange, section]);
  useEffect(() => { if (section !== "organico" && section !== "indices") refresh(false); }, [refresh, section]);
  const refreshCurrent = () => section === "organico" ? setOrganicRefresh((value) => value + 1) : section === "indices" ? null : refresh(true);
  const select = (id) => { setSection(id); setMobileOpen(false); setSearch(false); };
  useEffect(() => { const handler = (event) => { if (event.key === "Escape") { setSearch(false); setMobileOpen(false); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearch(true); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, []);
  return <main id="conteudo" className={`dashboard ${collapsed ? "dash-collapsed" : ""} ${mobileOpen ? "dash-mobile-open" : ""}`}>
    <button className="dash-scrim" type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}/>
    <aside className="dash-sidebar"><div className="dash-workspace"><div className="dash-logo">V</div><div><strong>Voxelia</strong><small>Resultados do negócio</small></div><ChevronDown size={15}/></div>
      <button className="dash-search-button" type="button" onClick={() => setSearch(true)}><Search size={17}/><span>Buscar janela</span><kbd>Ctrl K</kbd></button>
      <nav aria-label="Painel">{sections.map(([id, title, Icon], i) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => select(id)}><Icon size={18}/><span>{title}</span>{i === 2 && data?.connections.meta.error && <span className="dash-alert-dot" aria-label="Conexão Meta pendente"/>}</button>)}</nav>
      <div className="dash-side-bottom"><Link to="/admin"><FileText size={18}/><span>Administração</span></Link><Link to="/app"><ChevronLeft size={18}/><span>Voltar ao site</span></Link></div></aside>
    <div className="dash-main"><header className="dash-top"><button type="button" className="dash-icon dash-desktop-toggle" aria-label={collapsed ? "Abrir menu" : "Recolher menu"} onClick={() => setCollapsed(!collapsed)}><Menu size={19}/></button><button type="button" className="dash-icon dash-mobile-toggle" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><span>Voxelia <ChevronRight size={14}/> <b>{sections.find(([id]) => id === section)?.[1]}</b></span>{section !== "indices" && <button type="button" className="dash-icon" aria-label="Atualizar dados" onClick={refreshCurrent}><RefreshCw size={18}/></button>}</header>
      <div className="dash-content"><div className="dash-heading"><div><small>PAINEL PRIVADO</small><h1>{sections.find(([id]) => id === section)?.[1]}</h1></div>{section !== "indices" && <Period value={current} onChange={section === "meta" ? setMetaRange : section === "organico" ? setOrganicRange : setRange}/>}</div>
      {section !== "organico" && section !== "indices" && loading && <p role="status" className="dash-status">Atualizando Asaas e Meta Ads…</p>}{section !== "organico" && section !== "indices" && error && <p role="alert" className="dash-error">{error}</p>}
      {section === "organico" && <Organic range={organicRange} refreshKey={organicRefresh}/>}{section === "indices" && <Indices/>}
      {data && section !== "organico" && section !== "indices" && <><p className="dash-updated">Última consulta: {new Date(data.updatedAt).toLocaleString("pt-BR")} · {data.connections.asaas.error ? "Asaas indisponível" : "Asaas atualizado"} · {data.connections.meta.error ? "Meta Ads indisponível" : "Meta Ads atualizado"}</p>
        {section === "geral" && <Overview data={data}/>}{section === "analytics" && <Analytics data={data}/>}{section === "meta" && <MetaAds data={data} range={metaRange} refresh={refresh}/>}{section === "funil" && <Funnel data={data} range={range}/>}{section === "financeiro" && <Finance data={data} range={range} refresh={refresh}/>}{section === "pedidos" && <Orders data={data} range={range}/>}{section === "config" && <Config data={data} refresh={refresh}/>}</>}
      </div></div>
    {search && <div className="dash-search-overlay" role="dialog" aria-modal="true" aria-label="Buscar janela"><button type="button" aria-label="Fechar busca" className="dash-search-backdrop" onClick={() => setSearch(false)}/><div className="dash-search-modal"><div><Search size={19}/><input autoFocus placeholder="Buscar janela…" value={query} onChange={(event) => setQuery(event.target.value)}/><button type="button" aria-label="Fechar" onClick={() => setSearch(false)}><X size={18}/></button></div>{sections.filter(([, title]) => title.toLowerCase().includes(query.toLowerCase())).map(([id, title, Icon]) => <button key={id} type="button" onClick={() => { select(id); setQuery(""); }}><Icon size={17}/>{title}</button>)}</div></div>}
  </main>;
}
