// Regras puras de assinatura e acesso. Nenhuma chamada de rede ou banco aqui.
//
// Estados internos: pending, active, past_due, canceled, expired, suspended.
// Acesso pago só existe com pagamento confirmado pelo Asaas (PAYMENT_CONFIRMED/RECEIVED)
// ou concessão excepcional registrada por um administrador.

export const STATUSES = ["pending", "active", "past_due", "canceled", "expired", "suspended"];
const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const REVERSED_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"]);

export function addCycle(date, cycle) {
  const next = new Date(date);
  if (cycle === "YEARLY") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

const later = (a, b) => (!a ? b : !b ? a : new Date(a) > new Date(b) ? a : b);
const iso = (value) => (value ? new Date(value).toISOString() : null);
// Datas do Asaas chegam como "2026-10-20" ou "2026-10-20 15:02:38" (horário de Brasília).
export function parseAsaasDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T23:59:59-03:00`) : new Date(text.replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? "" : "-03:00"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function hasAccess({ subscription, grants = [], now = new Date() }) {
  const time = new Date(now).getTime();
  const grant = grants.find((item) => !item.revoked_at && new Date(item.starts_at).getTime() <= time && (!item.ends_at || new Date(item.ends_at).getTime() > time));
  if (grant) return { access: true, reason: "grant", until: grant.ends_at || null };
  if (!subscription) return { access: false, reason: "no_subscription", until: null };
  const status = effectiveStatus(subscription, now);
  const until = subscription.current_period_end;
  const covered = until && new Date(until).getTime() > time;
  if (["active", "past_due", "canceled"].includes(status) && covered) return { access: true, reason: status, until };
  return { access: false, reason: status, until: until || null };
}

// Assinatura cancelada ou ativa cujo período terminou é apresentada como expirada.
export function effectiveStatus(subscription, now = new Date()) {
  if (!subscription) return null;
  const ended = !subscription.current_period_end || new Date(subscription.current_period_end) <= new Date(now);
  if (["active", "canceled", "past_due"].includes(subscription.status) && ended && subscription.current_period_end) return "expired";
  return subscription.status;
}

// Aplica um evento do Asaas ao estado atual da assinatura e devolve o patch e a decisão.
// Eventos mais antigos que a última mudança de status não alteram o status (somente estendem
// o período pago, que é monotônico); a divergência fica para a reconciliação.
export function applyAsaasEvent(current, event) {
  const at = parseAsaasDate(event.dateCreated) || new Date().toISOString();
  const state = current || { status: "pending", current_period_end: null, cycle: "MONTHLY", status_changed_at: null };
  const stale = state.status_changed_at && new Date(at) < new Date(state.status_changed_at);
  const patch = {};
  const setStatus = (status) => {
    if (stale || status === state.status) return;
    patch.status = status;
    patch.status_changed_at = at;
  };
  const payment = event.payment;
  const subscription = event.subscription;

  switch (event.event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      if (!payment?.subscription) return { patch, effect: "ignored_not_subscription" };
      const due = parseAsaasDate(payment.dueDate) || at;
      const periodEnd = addCycle(due, state.cycle).toISOString();
      const nextEnd = later(state.current_period_end, periodEnd);
      if (nextEnd !== state.current_period_end) patch.current_period_end = nextEnd;
      if (state.status !== "suspended") setStatus("active");
      patch.last_payment_at = later(state.last_payment_at, parseAsaasDate(payment.confirmedDate || payment.paymentDate) || at);
      return { patch, effect: stale ? "period_only_stale" : "activated" };
    }
    case "PAYMENT_OVERDUE":
      if (!payment?.subscription) return { patch, effect: "ignored_not_subscription" };
      if (state.status === "active") setStatus("past_due");
      return { patch, effect: stale ? "stale" : "past_due" };
    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
    case "PAYMENT_CHARGEBACK_DISPUTE":
    case "PAYMENT_AWAITING_CHARGEBACK_REVERSAL":
      if (!payment?.subscription) return { patch, effect: "ignored_not_subscription" };
      setStatus("suspended");
      if (!stale) patch.current_period_end = at;
      return { patch, effect: stale ? "stale" : "suspended" };
    case "SUBSCRIPTION_CREATED":
    case "SUBSCRIPTION_UPDATED":
      if (subscription?.nextDueDate) patch.next_due_date = parseAsaasDate(subscription.nextDueDate);
      if (subscription?.cycle) patch.cycle = subscription.cycle === "YEARLY" ? "YEARLY" : "MONTHLY";
      if (subscription?.status === "INACTIVE" || subscription?.deleted) setStatus("canceled");
      return { patch, effect: "subscription_synced" };
    case "SUBSCRIPTION_INACTIVATED":
    case "SUBSCRIPTION_DELETED":
      setStatus("canceled");
      patch.canceled_at = state.canceled_at || at;
      return { patch, effect: stale ? "stale" : "canceled" };
    default:
      return { patch, effect: "recorded_only" };
  }
}

export const isReversal = (name) => REVERSED_EVENTS.has(name);

// Reconciliação: recalcula o estado a partir da assinatura e das cobranças atuais no Asaas.
export function reconcileState({ subscription, payments = [], cycle = "MONTHLY", now = new Date() }) {
  const paid = payments.filter((payment) => PAID_STATUSES.has(payment.status));
  const reversed = payments.some((payment) => ["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"].includes(payment.status));
  const periodEnd = paid.reduce((end, payment) => later(end, addCycle(parseAsaasDate(payment.dueDate), cycle).toISOString()), null);
  const overdue = payments.some((payment) => payment.status === "OVERDUE");
  let status = "pending";
  if (reversed) status = "suspended";
  else if (subscription?.deleted || subscription?.status === "INACTIVE") status = "canceled";
  else if (overdue) status = paid.length ? "past_due" : "pending";
  else if (periodEnd) status = "active";
  return {
    status,
    current_period_end: reversed ? iso(now) : periodEnd,
    next_due_date: parseAsaasDate(subscription?.nextDueDate),
  };
}

export const statusLabels = {
  pending: "Aguardando confirmação do pagamento",
  active: "Ativa",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada (acesso até o fim do período pago)",
  expired: "Expirada",
  suspended: "Suspensa",
};
