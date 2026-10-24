// Métricas privadas da Voxelia. Valores em centavos; datas de negócio em America/Sao_Paulo.
const zone = "America/Sao_Paulo";
const day = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const cents = (value) => Math.round(Number(value || 0) * 100);
const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0);
const between = (value, from, to) => value && value >= from && value <= to;

export function expenseOccurrences(expenses, from, to) {
  const result = [];
  for (const expense of expenses) {
    if (!expense.recurring) {
      if (between(expense.starts_on, from, to)) result.push({ ...expense, on: expense.starts_on });
      continue;
    }
    const start = new Date(`${expense.starts_on}T12:00:00Z`);
    const current = new Date(`${from.slice(0, 7)}-01T12:00:00Z`);
    const last = new Date(`${to.slice(0, 7)}-01T12:00:00Z`);
    while (current <= last) {
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth();
      const lastDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const on = `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(start.getUTCDate(), lastDate)).padStart(2, "0")}`;
      if (between(on, from, to) && on >= expense.starts_on && (!expense.ends_on || on <= expense.ends_on)) result.push({ ...expense, on });
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  }
  return result;
}

export function paymentRows(remote, orders, localPayments, profiles, editions, funnel) {
  const byId = new Map(orders.map((order) => [order.id, order]));
  const byPayment = new Map(localPayments.map((payment) => [payment.asaas_payment_id, payment.order_id]));
  const email = new Map(profiles.map((profile) => [profile.id, profile.email]));
  const product = new Map(editions.map((edition) => [edition.id, edition.name]));
  const origin = new Map(funnel.filter((event) => event.name === "checkout" && event.order_id).map((event) => [event.order_id, event]));
  return remote.flatMap((payment) => {
    const order = byId.get(payment.externalReference || byPayment.get(payment.id));
    if (!order) return [];
    const received = payment.status === "RECEIVED" && !order.refunded_at && order.status !== "refunded";
    const tracking = origin.get(order.id);
    return [{ id: payment.id, orderId: order.id, email: email.get(order.user_id) || "—", product: product.get(order.edition_id) || "—",
      status: payment.status, receivedOn: received && payment.creditDate ? payment.creditDate.slice(0, 10) : null,
      grossCents: received ? cents(payment.value) : 0, feeCents: received ? Math.max(0, cents(payment.value) - cents(payment.netValue)) : 0,
      source: tracking?.source || "não identificada", campaign: tracking?.campaign || "", content: tracking?.content || "",
      refunded: Boolean(order.refunded_at || order.status === "refunded") }];
  });
}

export function summarizeDashboard({ payments, expenses, ads, funnel, orders, from, to, goal }) {
  const received = payments.filter((payment) => between(payment.receivedOn, from, to));
  const costs = expenseOccurrences(expenses, from, to);
  const revenueCents = sum(received, "grossCents");
  const feeCents = sum(received, "feeCents");
  const expenseCents = sum(costs, "amount_cents");
  const adCents = sum(ads.filter((ad) => between(ad.on, from, to)), "spendCents");
  const profitCents = revenueCents - feeCents - expenseCents - adCents;
  const visits = new Set(funnel.filter((event) => event.name === "view" && between(day(event.at), from, to)).map((event) => event.sid)).size;
  const byDay = new Map();
  for (const payment of received) {
    const item = byDay.get(payment.receivedOn) || { on: payment.receivedOn, revenueCents: 0, sales: 0 };
    item.revenueCents += payment.grossCents; item.sales++; byDay.set(payment.receivedOn, item);
  }
  const grouped = new Map();
  for (const payment of received) {
    const key = [payment.source, payment.campaign, payment.content, payment.product].join("\u0000");
    const item = grouped.get(key) || { source: payment.source, campaign: payment.campaign, content: payment.content, product: payment.product, sales: 0, revenueCents: 0 };
    item.sales++; item.revenueCents += payment.grossCents; grouped.set(key, item);
  }
  const metaRevenueCents = sum(received.filter((payment) => payment.source.toLowerCase() === "meta"), "grossCents");
  const metaFeeCents = sum(received.filter((payment) => payment.source.toLowerCase() === "meta"), "feeCents");
  const metaProfitCents = metaRevenueCents - metaFeeCents - adCents;
  const donutAds = Math.min(metaRevenueCents, adCents);
  const donutFees = Math.min(metaRevenueCents - donutAds, metaFeeCents);
  const goalReceived = payments.filter((payment) => between(payment.receivedOn, goal.goal_starts_on, goal.goal_ends_on));
  const goalExpenses = expenseOccurrences(expenses, goal.goal_starts_on, goal.goal_ends_on);
  const goalAdCents = sum(ads.filter((ad) => between(ad.on, goal.goal_starts_on, goal.goal_ends_on)), "spendCents");
  const goalProfitCents = sum(goalReceived, "grossCents") - sum(goalReceived, "feeCents") - sum(goalExpenses, "amount_cents") - goalAdCents;
  return { revenueCents, feeCents, expenseCents, adCents, profitCents, sales: received.length, visits,
    roas: adCents ? metaRevenueCents / adCents : null, costPerSaleCents: received.length && adCents ? Math.round(adCents / received.length) : null,
    conversion: visits ? received.length / visits : null, metaRevenueCents, metaProfitCents,
    donut: { adsCents: donutAds, feesCents: donutFees, profitCents: Math.max(0, metaProfitCents), lossCents: Math.max(0, -metaProfitCents) },
    goal: { ...goal, profitCents: goalProfitCents, remainingCents: Math.max(0, goal.goal_cents - goalProfitCents) },
    daily: [...byDay.values()].sort((a, b) => a.on.localeCompare(b.on)), breakdown: [...grouped.values()].sort((a, b) => b.revenueCents - a.revenueCents), expenses: costs };
}

export function summarizeStages(events, orders, from, to) {
  const inRange = events.filter((event) => between(day(event.at), from, to));
  const stages = ["view", "buy_click", "buy_page", "checkout"];
  const counted = Object.fromEntries(stages.map((stage) => [stage, new Set(inRange.filter((event) => event.name === stage).map((event) => event.sid)).size]));
  const checkoutOrders = new Set(inRange.filter((event) => event.name === "checkout" && event.order_id).map((event) => event.order_id));
  counted.paid = orders.filter((order) => checkoutOrders.has(order.id) && order.status === "paid").length;
  counted.abandoned = orders.filter((order) => checkoutOrders.has(order.id) && order.status === "pending" && Date.now() - new Date(order.created_at).getTime() >= 86400000).length;
  counted.refunded = orders.filter((order) => checkoutOrders.has(order.id) && order.status === "refunded").length;
  const daily = new Map();
  for (const event of inRange) {
    const on = day(event.at); const row = daily.get(on) || { on, view: new Set(), buy_click: new Set(), buy_page: new Set(), checkout: new Set() };
    row[event.name]?.add(event.sid); daily.set(on, row);
  }
  return { stages: counted, daily: [...daily.values()].map((row) => ({ on: row.on, ...Object.fromEntries(stages.map((stage) => [stage, row[stage].size])) })).sort((a, b) => a.on.localeCompare(b.on)) };
}

export async function loadAsaasPayments(asaas) {
  if (!asaas?.listPaymentsPage) return { rows: [], error: "Asaas não configurado para consulta.", checkedAt: null };
  try {
    const rows = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await asaas.listPaymentsPage(offset);
      rows.push(...(page.data || []));
      if (!page.hasMore) return { rows, error: null, checkedAt: new Date().toISOString() };
    }
    return { rows, error: "Mais de 1.000 cobranças: período incompleto.", checkedAt: new Date().toISOString() };
  } catch (error) { return { rows: [], error: error.message, checkedAt: null }; }
}

export async function loadMetaAds(config, from, to, fetchImpl = fetch) {
  if (!config.adsToken || !/^\d+$/.test(config.adsAccountId)) return { rows: [], error: "Configure META_ADS_TOKEN e META_AD_ACCOUNT_ID no servidor.", checkedAt: null };
  try {
    const rows = [];
    let next = `https://graph.facebook.com/${config.graphVersion}/act_${config.adsAccountId}/insights?${new URLSearchParams({
      level: "ad", time_increment: "1", limit: "500", fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,actions,date_start",
      time_range: JSON.stringify({ since: from, until: to }), access_token: config.adsToken,
    })}`;
    for (let page = 0; page < 20 && next; page++) {
      const response = await fetchImpl(next);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Meta respondeu ${response.status}.`);
      rows.push(...(data.data || []).map((row) => ({ on: row.date_start, campaignId: row.campaign_id, campaign: row.campaign_name,
        adsetId: row.adset_id, adset: row.adset_name, adId: row.ad_id, ad: row.ad_name, spendCents: cents(row.spend),
        impressions: Number(row.impressions || 0), clicks: Number(row.clicks || 0), linkClicks: row.inline_link_clicks == null ? null : Number(row.inline_link_clicks), landingViews: Number(row.actions?.find((action) => action.action_type === "landing_page_view")?.value || 0) })));
      next = data.paging?.next || null;
      if (next && !next.startsWith("https://graph.facebook.com/")) throw new Error("Paginação inesperada da Meta.");
    }
    return { rows, error: next ? "Mais de 20 páginas de anúncios: período incompleto." : null, checkedAt: new Date().toISOString() };
  } catch (error) { return { rows: [], error: error.message, checkedAt: null }; }
}
