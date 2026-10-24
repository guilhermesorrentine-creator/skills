// Livro de Vendas (competência) e Caixa (crédito), em centavos e dias de Brasília.
const zone = "America/Sao_Paulo";
export const businessDay = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const normalized = String(value).replace(" ", "T");
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}-03:00`;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
};
const cents = (value) => Math.round(Number(value || 0) * 100);
const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
const between = (date, from, to) => date && date >= from && date <= to;
const iso = (value) => String(value || "").replace(" ", "T");

export function buildLedger({ orders, remotePayments, localPayments, profiles, editions, funnel }) {
  const byOrder = new Map(orders.map((order) => [order.id, order]));
  const byLocalPayment = new Map(localPayments.map((payment) => [payment.asaas_payment_id, payment.order_id]));
  const installmentOrder = new Map();
  for (const payment of remotePayments) if (payment.installment && byOrder.has(payment.externalReference || byLocalPayment.get(payment.id)))
    installmentOrder.set(payment.installment, payment.externalReference || byLocalPayment.get(payment.id));
  const orderPayments = new Map();
  for (const payment of remotePayments) {
    const orderId = payment.externalReference || byLocalPayment.get(payment.id) || installmentOrder.get(payment.installment);
    if (!byOrder.has(orderId)) continue;
    if (!orderPayments.has(orderId)) orderPayments.set(orderId, []);
    orderPayments.get(orderId).push(payment);
  }
  const origin = new Map(funnel.filter((event) => event.name === "checkout" && event.order_id).map((event) => [event.order_id, event]));
  const emails = new Map(profiles.map((profile) => [profile.id, profile.email || "—"]));
  const products = new Map(editions.map((edition) => [edition.id, edition.name]));
  const sales = [], cash = [], refunds = [], fees = [], receivable = [], paymentRows = [], orderRows = [];
  let incomplete = false;
  for (const order of orders) {
    const payments = orderPayments.get(order.id) || [];
    const link = origin.get(order.id);
    const common = { orderId: order.id, source: link?.source || "não identificada", campaign: link?.campaign || "", content: link?.content || "", product: products.get(order.edition_id) || "—" };
    const confirmedOn = businessDay(payments.map((payment) => payment.confirmedDate || payment.paymentDate).filter(Boolean).sort()[0]) || businessDay(order.paid_at);
    const paid = ["paid", "refunded"].includes(order.status);
    if (paid && (!payments.length || payments.some((payment) => payment.netValue == null))) incomplete = true;
    if (paid && confirmedOn) sales.push({ ...common, on: confirmedOn, amountCents: order.amount_cents, count: 1, guaranteed: true });
    let feeTotal = 0, feeKnown = 0;
    const refundRows = [];
    for (const payment of payments) {
      const gross = cents(payment.value);
      const fee = payment.netValue == null ? null : Math.max(0, gross - cents(payment.netValue));
      if (fee !== null) { feeTotal += fee; feeKnown += gross; }
      const creditedOn = businessDay(payment.creditDate);
      const credited = Boolean(creditedOn) && ["RECEIVED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(payment.status);
      const completedRefunds = (Array.isArray(payment.refunds) ? payment.refunds : []).filter((refund) => refund.status === "DONE");
      for (const refund of completedRefunds) refundRows.push({ ...common, on: businessDay(refund.dateCreated) || businessDay(order.refunded_at), amountCents: cents(refund.value), paymentId: payment.id });
      const refundedCents = sum(completedRefunds.map((refund) => ({ value: cents(refund.value) })), "value");
      if (credited) cash.push({ ...common, on: creditedOn, amountCents: payment.netValue == null ? gross : cents(payment.netValue), feeCents: fee || 0, paymentId: payment.id });
      if (paid && order.status !== "refunded" && !credited && !["REFUNDED", "DELETED", "CANCELED"].includes(payment.status) && gross > refundedCents)
        receivable.push({ ...common, on: businessDay(payment.estimatedCreditDate), amountCents: gross - refundedCents, paymentId: payment.id });
      paymentRows.push({ ...common, id: payment.id, status: payment.status, billingType: payment.billingType, confirmedOn: businessDay(payment.confirmedDate || payment.paymentDate),
        creditOn: creditedOn, expectedOn: businessDay(payment.estimatedCreditDate), grossCents: gross, feeCents: fee, netCents: payment.netValue == null ? null : cents(payment.netValue), refundedCents });
    }
    const completed = Math.min(order.amount_cents, sum(refundRows, "amountCents"));
    const remainingRefund = Math.max(0, Math.min(order.amount_cents, Number(order.refunded_cents || (order.status === "refunded" ? order.amount_cents : 0))) - completed);
    if (remainingRefund && order.refunded_at) refundRows.push({ ...common, on: businessDay(order.refunded_at), amountCents: remainingRefund, estimated: true });
    for (const refund of refundRows) {
      if (!refund.on) continue;
      refunds.push(refund);
      sales.push({ ...common, on: refund.on, amountCents: -refund.amountCents, count: 0, refund: true });
      if (payments.some((payment) => payment.id === refund.paymentId && payment.creditDate)) cash.push({ ...common, on: refund.on, amountCents: -refund.amountCents, refund: true });
    }
    if (paid && confirmedOn && feeKnown) {
      const remaining = Math.max(0, order.amount_cents - feeKnown);
      const estimated = remaining ? Math.round(remaining * feeTotal / feeKnown) : 0;
      fees.push({ ...common, on: confirmedOn, amountCents: feeTotal + estimated, estimated: remaining > 0 });
    }
    orderRows.push({ ...common, id: order.id, email: emails.get(order.user_id) || "—", amountCents: order.amount_cents, status: order.status,
      confirmedOn, createdOn: businessDay(order.created_at), refundedOn: businessDay(order.refunded_at), refundedCents: Math.min(order.amount_cents, sum(refundRows, "amountCents")),
      billingType: payments[0]?.billingType || "—", installments: payments[0]?.installment ? payments.length : 1 });
  }
  return { sales, cash, refunds, fees, receivable, paymentRows, orderRows, incomplete };
}

export function summarizeLedger({ ledger, expenses, ads, funnel, from, to, goal, now = new Date() }) {
  const saleRows = ledger.sales.filter((row) => between(row.on, from, to));
  const cashRows = ledger.cash.filter((row) => between(row.on, from, to));
  const refundRows = ledger.refunds.filter((row) => between(row.on, from, to));
  const feeRows = ledger.fees.filter((row) => between(row.on, from, to));
  const expenseRows = expenses.filter((row) => between(row.on, from, to));
  const adRows = ads.filter((row) => between(row.on, from, to));
  const salesCents = sum(saleRows, "amountCents");
  const cashCents = sum(cashRows, "amountCents");
  const refundsCents = sum(refundRows, "amountCents");
  const feesCents = sum(feeRows, "amountCents");
  const expenseCents = sum(expenseRows, "amount_cents");
  const adCents = sum(adRows, "spendCents");
  const metaSales = saleRows.filter((row) => row.source.toLowerCase() === "meta");
  const metaSalesCents = sum(metaSales, "amountCents");
  const metaCount = sum(metaSales, "count") - ledger.orderRows.filter((row) => row.source.toLowerCase() === "meta" && row.refundedCents >= row.amountCents && between(row.refundedOn, from, to)).length;
  const count = sum(saleRows, "count") - ledger.orderRows.filter((row) => row.refundedCents >= row.amountCents && between(row.refundedOn, from, to)).length;
  const visits = new Set(funnel.filter((event) => event.name === "view" && between(businessDay(event.at), from, to)).map((event) => event.sid)).size;
  const breakdown = new Map();
  const daily = new Map();
  for (const row of saleRows) {
    const key = [row.source, row.campaign, row.content, row.product].join("\0");
    const item = breakdown.get(key) || { source: row.source, campaign: row.campaign, content: row.content, product: row.product, sales: 0, salesCents: 0 };
    item.sales += row.count; item.salesCents += row.amountCents; breakdown.set(key, item);
    const day = daily.get(row.on) || { on: row.on, salesCents: 0, sales: 0 };
    day.salesCents += row.amountCents; day.sales += row.count; daily.set(row.on, day);
  }
  const today = businessDay(now.toISOString());
  const warrantyStart = businessDay(new Date(now.getTime() - 15 * 86400000).toISOString());
  const goalThrough = goal.goal_ends_on < today ? goal.goal_ends_on : today;
  const goalSales = ledger.sales.filter((row) => between(row.on, goal.goal_starts_on, goalThrough));
  const goalFees = ledger.fees.filter((row) => between(row.on, goal.goal_starts_on, goalThrough));
  const goalAds = ads.filter((row) => between(row.on, goal.goal_starts_on, goalThrough));
  const goalExpenses = expenses.filter((row) => between(row.on, goal.goal_starts_on, goalThrough));
  const profitBy = (predicate) => sum(goalSales.filter(predicate), "amountCents") - sum(goalFees.filter(predicate), "amountCents") - sum(goalAds.filter(predicate), "spendCents") - sum(goalExpenses.filter(predicate), "amount_cents");
  const consolidatedCents = profitBy((row) => row.on < warrantyStart);
  const guaranteeCents = profitBy((row) => row.on >= warrantyStart);
  const goalProfitCents = consolidatedCents + guaranteeCents;
  const recentFrom = businessDay(new Date(now.getTime() - 6 * 86400000).toISOString());
  const recentProfit = sum(ledger.sales.filter((row) => between(row.on, recentFrom, today)), "amountCents") - sum(ledger.fees.filter((row) => between(row.on, recentFrom, today)), "amountCents") - sum(ads.filter((row) => between(row.on, recentFrom, today)), "spendCents") - sum(expenses.filter((row) => between(row.on, recentFrom, today)), "amount_cents");
  const pace = recentProfit / 7;
  const daysLeft = Math.max(0, Math.ceil((Date.parse(`${goal.goal_ends_on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000));
  const metaFees = sum(feeRows.filter((row) => row.source.toLowerCase() === "meta"), "amountCents");
  const coveredAds = Math.min(Math.max(0, metaSalesCents), adCents);
  const coveredFees = Math.min(Math.max(0, metaSalesCents - coveredAds), metaFees);
  const averageByProduct = [...new Set(ledger.orderRows.map((row) => row.product))].map((product) => {
    const rows = ledger.orderRows.filter((row) => row.product === product && row.confirmedOn);
    const gross = sum(rows, "amountCents");
    const productFees = sum(ledger.fees.filter((row) => row.product === product), "amountCents");
    return { product, netPerSaleCents: rows.length ? Math.round((gross - productFees) / rows.length) : 0,
      salesPerDayNeeded: rows.length && daysLeft ? Math.ceil(Math.max(0, goal.goal_cents - goalProfitCents) / ((gross - productFees) / rows.length) / daysLeft * 10) / 10 : null };
  });
  return { salesCents, cashCents, receivableCents: sum(ledger.receivable, "amountCents"), refundsCents, feesCents, expenseCents, adCents,
    profitCents: salesCents - feesCents - expenseCents - adCents, sales: count, metaSales: metaCount, visits,
    roas: adCents ? metaSalesCents / adCents : null, costPerSaleCents: metaCount > 0 ? Math.round(adCents / metaCount) : null,
    conversion: visits ? count / visits : null, metaSalesCents, metaProfitCents: metaSalesCents - metaFees - adCents,
    donut: { adsCents: coveredAds, feesCents: coveredFees, profitCents: Math.max(0, metaSalesCents - metaFees - adCents), lossCents: Math.max(0, adCents + metaFees - metaSalesCents) },
    daily: [...daily.values()].sort((a, b) => a.on.localeCompare(b.on)), breakdown: [...breakdown.values()].sort((a, b) => b.salesCents - a.salesCents),
    goal: { ...goal, profitCents: goalProfitCents, consolidatedCents, guaranteeCents, remainingCents: Math.max(0, goal.goal_cents - goalProfitCents),
      daysLeft, neededPerDayCents: daysLeft ? Math.ceil(Math.max(0, goal.goal_cents - goalProfitCents) / daysLeft) : null,
      projectedCents: Math.round(goalProfitCents + pace * daysLeft), projectedDate: pace > 0 ? new Date(now.getTime() + Math.ceil(Math.max(0, goal.goal_cents - goalProfitCents) / pace) * 86400000).toISOString().slice(0, 10) : null,
      averageByProduct } };
}
