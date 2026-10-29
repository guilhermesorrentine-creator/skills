import { createHmac, timingSafeEqual } from "node:crypto";
import { checkoutUrl } from "./asaas.js";

const PLAN_CODE = "voxelia-mensal";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const error = (status, code, message) => Object.assign(new Error(message), { status, code });
const cents = (value) => Math.round(Number(value || 0) * 100);
const validId = (value) => /^[0-9a-f-]{36}$/i.test(String(value || ""));
const paid = (event) => ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event);
const checkoutDueDate = (date) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}).format(date);
const validPayment = (payment, plan, customer) => payment?.subscription && payment.customer === customer
  && cents(payment.value) === plan.price_cents && payment.billingType === "CREDIT_CARD";

// O prazo vem do vencimento da mensalidade paga. Reembolso retira somente aquele período.
function paidUntil(records) {
  const dates = records.filter((record) => ["CONFIRMED", "RECEIVED"].includes(record.status) && record.due_date)
    .map((record) => record.due_date).sort();
  if (!dates.length) return null;
  const [year, month, day] = dates.at(-1).split("-").map(Number);
  const daysInNextMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, daysInNextMonth), 12)).toISOString();
}

export function createSubscriptions({ store, asaas, config, conversions = null, now = () => new Date() }) {
  const keyFor = (id) => {
    if (!config.claimSecret) throw error(503, "not_configured", "Pagamento sem cadastro indisponível.");
    return createHmac("sha256", config.claimSecret).update(`subscription:${id}`).digest("base64url").slice(0, 32);
  };
  async function start(user, tracking = null, claim = false, attribution = null) {
    const plan = await store.getPlanByCode(PLAN_CODE);
    if (!plan?.active || plan.cycle !== "MONTHLY" || plan.price_cents !== 4990) throw error(503, "plan_unavailable", "Mensalidade indisponível neste momento.");
    const subscriptions = await store.listSubscriptions(user.id);
    if ((await status(user.id)).active)
      throw error(409, "already_subscribed", "Você já tem uma assinatura ativa.");
    if (subscriptions.some((item) => !item.canceled_at && item.asaas_subscription_id))
      throw error(409, "subscription_pending", "Já existe uma assinatura. Confira ou cancele em Minha licença antes de assinar novamente.");
    if ((await store.listCheckoutSessions(user.id)).some((item) => item.status === "paid" && !subscriptions.some((sub) => sub.checkout_session_id === item.id)
      && now().getTime() - new Date(item.created_at).getTime() < 86400000))
      throw error(409, "payment_pending", "O pagamento já foi enviado. Aguarde a confirmação antes de tentar de novo.");
    let open = await store.getOpenCheckoutSession(user.id, now());
    if (open?.checkout_url) return { url: open.checkout_url, session: open.id, ...(claim && { key: keyFor(open.id) }), reused: true };
    // O índice único considera também sessões vencidas; encerra antes de criar outra.
    for (const item of await store.listCheckoutSessions(user.id)) {
      if (["creating", "created"].includes(item.status) && new Date(item.expires_at) <= now()) await store.updateCheckoutSession(item.id, { status: "expired" });
    }
    const session = await store.insertCheckoutSession({ user_id: user.id, plan_id: plan.id, status: "creating",
      expires_at: new Date(now().getTime() + config.asaas.checkoutMinutes * 60000).toISOString(), ad_tracking: tracking, attribution });
    if (!session) throw error(409, "checkout_in_progress", "Há um pagamento em andamento. Tente novamente em instantes.");
    const suffix = claim ? `&sessao=${session.id}&chave=${keyFor(session.id)}` : "&tipo=mensal";
    try {
      const checkout = await asaas.createCheckout({
        billingTypes: ["CREDIT_CARD"], chargeTypes: ["RECURRENT"], minutesToExpire: config.asaas.checkoutMinutes,
        externalReference: session.id,
        subscription: { cycle: "MONTHLY", nextDueDate: checkoutDueDate(new Date(now().getTime() + 60000)) },
        callback: {
          successUrl: `${config.appUrl}/checkout/retorno?resultado=sucesso${suffix}`,
          cancelUrl: `${config.appUrl}/checkout/retorno?resultado=cancelado`,
          expiredUrl: `${config.appUrl}/checkout/retorno?resultado=expirado`,
        },
        items: [{ name: plan.name, description: "Acervo e conexão com IA enquanto a assinatura estiver paga", quantity: 1, value: plan.price_cents / 100 }],
      });
      const url = checkoutUrl(checkout, config.asaas.checkoutHost);
      await store.updateCheckoutSession(session.id, { status: "created", asaas_checkout_id: checkout.id, checkout_url: url });
      return { url, session: session.id, ...(claim && { key: keyFor(session.id) }), reused: false };
    } catch (cause) {
      await store.updateCheckoutSession(session.id, { status: "failed", error: String(cause.message).slice(0, 500) });
      throw cause.status ? cause : error(502, "asaas_error", "Não foi possível abrir o pagamento.");
    }
  }

  async function startGuest(email, tracking, attribution = null) {
    const address = String(email || "").trim().toLowerCase();
    if (!EMAIL.test(address) || address.length > 254) throw error(400, "invalid_email", "Informe um e-mail válido.");
    let profile = await store.findProfileByEmail(address);
    if (profile && await store.hasSignedIn(profile.id)) throw error(409, "account_exists", "Este e-mail já tem conta. Entre para assinar.");
    if (!profile) {
      const invited = await store.createInvitedUser(address, `${config.appUrl}/criar-senha`);
      profile = { id: invited.userId, email: address };
    }
    return start(profile, tracking, true, attribution);
  }

  async function claim(sessionId, key) {
    if (!validId(sessionId)) throw error(403, "invalid_claim", "Link inválido.");
    const given = Buffer.from(String(key || ""));
    const expected = Buffer.from(keyFor(sessionId));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw error(403, "invalid_claim", "Link inválido.");
    const session = await store.getCheckoutSession(sessionId);
    if (!session) throw error(404, "not_found", "Pagamento não encontrado.");
    const matching = (await store.listSubscriptions(session.user_id)).find((item) => item.checkout_session_id === session.id);
    const until = matching && paidUntil(await store.listSubscriptionPayments(matching.id));
    const active = until && new Date(until) > now();
    if (!active) return { status: "pending" };
    if (await store.hasSignedIn(session.user_id)) return { status: "paid", login: true };
    const profile = await store.getProfile(session.user_id);
    return { status: "paid", url: await store.createPasswordLink(profile.email, `${config.appUrl}/criar-senha`) };
  }

  async function status(userId) {
    const subscriptions = await store.listSubscriptions(userId);
    const periods = await Promise.all(subscriptions.map(async (item) => ({ item, until: paidUntil(await store.listSubscriptionPayments(item.id)) })));
    const active = periods.find(({ until }) => until && new Date(until) > now());
    const recent = subscriptions[0] || null;
    const first = active ? (await store.listSubscriptionPayments(active.item.id)).filter((item) => ["CONFIRMED", "RECEIVED"].includes(item.status))
      .sort((a, b) => new Date(a.confirmed_at) - new Date(b.confirmed_at))[0] : null;
    const refundUntil = first?.confirmed_at ? new Date(new Date(first.confirmed_at).getTime() + 15 * 86400000).toISOString() : null;
    return { active: Boolean(active), until: active?.until || periods[0]?.until || null,
      status: active?.item.status || recent?.status || null, canceled: Boolean(active?.item.canceled_at || recent?.canceled_at),
      id: active?.item.id || recent?.id || null, refundUntil: refundUntil && new Date(refundUntil) > now() ? refundUntil : null };
  }

  async function cancel(userId) {
    const subscriptions = await store.listSubscriptions(userId);
    const current = subscriptions.find((item) => !item.canceled_at && item.asaas_subscription_id && ["active", "past_due", "pending"].includes(item.status));
    if (!current) throw error(404, "subscription_not_found", "Não há assinatura para cancelar.");
    await asaas.deleteSubscription(current.asaas_subscription_id);
    await store.updateSubscription(current.id, { status: "canceled", canceled_at: now().toISOString(), status_changed_at: now().toISOString() });
    return { canceled: true, until: (await status(userId)).until };
  }

  async function refund(userId) {
    const state = await status(userId);
    const current = state.active ? await store.getSubscription(state.id) : null;
    if (!current) throw error(422, "refund_unavailable", "Não há mensalidade paga para reembolsar.");
    const records = await store.listSubscriptionPayments(current.id);
    const first = records.filter((item) => ["CONFIRMED", "RECEIVED"].includes(item.status)).sort((a, b) => new Date(a.confirmed_at) - new Date(b.confirmed_at))[0];
    if (!first?.confirmed_at || now().getTime() - new Date(first.confirmed_at).getTime() > 15 * 86400000)
      throw error(422, "refund_unavailable", "A garantia de 15 dias da primeira mensalidade terminou.");
    if (!current.canceled_at) await cancel(userId);
    await asaas.refundPayment(first.asaas_payment_id, { description: "Garantia de 15 dias Voxelia" });
    await store.upsertSubscriptionPayment({ ...first, status: "REFUNDED" });
    const until = paidUntil(await store.listSubscriptionPayments(current.id));
    await store.updateSubscription(current.id, { status: "canceled", current_period_end: until });
    return { refunded: true };
  }

  async function checkoutEvent(payload) {
    const checkout = payload.checkout || {};
    const session = (checkout.id && await store.findCheckoutSessionByAsaas(checkout.id))
      || (validId(checkout.externalReference) && await store.getCheckoutSession(checkout.externalReference));
    if (!session) return null;
    if (payload.event === "CHECKOUT_PAID") {
      const plan = await store.getPlanByCode(PLAN_CODE);
      const total = Array.isArray(checkout.items) && checkout.items.length
        ? cents(checkout.items.reduce((sum, item) => sum + Number(item.value || 0) * Number(item.quantity || 1), 0)) : null;
      if (total !== null && total !== plan.price_cents) throw error(422, "amount_mismatch", "Valor da assinatura divergente.");
      await store.updateCheckoutSession(session.id, { status: "paid", asaas_customer_id: checkout.customer || null });
      if (checkout.customer) await store.setCustomerId(session.user_id, checkout.customer);
    } else if ((payload.event === "CHECKOUT_CANCELED" || payload.event === "CHECKOUT_EXPIRED") && ["creating", "created"].includes(session.status)) {
      await store.updateCheckoutSession(session.id, { status: payload.event === "CHECKOUT_CANCELED" ? "canceled" : "expired" });
    }
    return { status: "processed", note: "Checkout da assinatura registrado; acesso depende da cobrança confirmada." };
  }

  async function linkSubscription(remote) {
    let local = await store.findSubscriptionByAsaas(remote.id);
    if (!local) {
      const session = (validId(remote.externalReference) && await store.getCheckoutSession(remote.externalReference))
        || (remote.checkout && await store.findCheckoutSessionByAsaas(remote.checkout))
        || (remote.customer && await store.findCheckoutSessionByCustomer(remote.customer));
      if (!session || session.status !== "paid" || (session.asaas_customer_id && session.asaas_customer_id !== remote.customer)) return null;
      const plan = await store.getPlanByCode(PLAN_CODE);
      if (remote.value !== undefined && cents(remote.value) !== plan.price_cents) throw error(422, "amount_mismatch", "Valor da assinatura divergente.");
      if (remote.cycle && remote.cycle !== "MONTHLY") throw error(422, "invalid_subscription", "Periodicidade da assinatura divergente.");
      if (remote.billingType && remote.billingType !== "CREDIT_CARD") throw error(422, "invalid_subscription", "Forma de cobrança divergente.");
      local = await store.insertSubscription({ user_id: session.user_id, plan_id: plan.id, checkout_session_id: session.id,
        asaas_subscription_id: remote.id, asaas_customer_id: remote.customer || session.asaas_customer_id,
        status: "pending", cycle: "MONTHLY", ad_tracking: session.ad_tracking, attribution: session.attribution, next_due_date: remote.nextDueDate || null });
      if (!local) local = await store.findSubscriptionByAsaas(remote.id);
      if (remote.customer) await store.setCustomerId(session.user_id, remote.customer);
    }
    return local;
  }

  async function subscriptionEvent(payload) {
    const remote = payload.subscription;
    if (!remote?.id) return null;
    const local = await linkSubscription(remote);
    if (!local) return { status: "unlinked", note: "Assinatura sem sessão correspondente." };
    if (payload.event === "SUBSCRIPTION_DELETED") await store.updateSubscription(local.id, { status: "canceled", canceled_at: local.canceled_at || now().toISOString() });
    return { status: "processed", note: "Assinatura vinculada; acesso depende da cobrança confirmada." };
  }

  async function paymentEvent(payload) {
    const payment = payload.payment;
    if (!payment?.subscription) return null;
    const subscription = await linkSubscription({ id: payment.subscription, customer: payment.customer,
      value: payment.value, billingType: payment.billingType });
    if (!subscription) return { status: "unlinked", note: "Cobrança de assinatura ainda não vinculada." };
    const plan = await store.getPlanByCode(PLAN_CODE);
    let customer = subscription.asaas_customer_id;
    if (!customer && (await store.findProfileByCustomer(payment.customer))?.id === subscription.user_id) {
      customer = payment.customer;
      await store.updateSubscription(subscription.id, { asaas_customer_id: customer });
    }
    if (!validPayment(payment, plan, customer)) throw error(422, "invalid_payment", "Cobrança não corresponde à assinatura mensal.");
    const existing = await store.getSubscriptionPayment(payment.id);
    const status = ["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED"].includes(payload.event) ? "REFUNDED"
      : existing?.status === "REFUNDED" ? "REFUNDED"
        : paid(payload.event) ? payment.status : ["CONFIRMED", "RECEIVED"].includes(existing?.status) ? existing.status : payment.status;
    await store.upsertSubscriptionPayment({ asaas_payment_id: payment.id, user_id: subscription.user_id, subscription_id: subscription.id,
      status, value_cents: plan.price_cents, billing_type: payment.billingType, due_date: payment.dueDate || existing?.due_date || null,
      confirmed_at: paid(payload.event) ? payment.confirmedDate || payment.paymentDate || now().toISOString() : existing?.confirmed_at || null,
      invoice_url: payment.invoiceUrl || null });
    const records = await store.listSubscriptionPayments(subscription.id);
    const until = paidUntil(records);
    await store.updateSubscription(subscription.id, { current_period_end: until,
      status: subscription.canceled_at ? "canceled" : until && new Date(until) > now() ? "active" : "past_due",
      ...(paid(payload.event) && { last_payment_at: now().toISOString() }) });
    const first = records.filter((record) => ["CONFIRMED", "RECEIVED"].includes(record.status))
      .sort((a, b) => new Date(a.confirmed_at) - new Date(b.confirmed_at))[0];
    if (paid(payload.event) && first?.asaas_payment_id === payment.id && conversions && subscription.ad_tracking?.consent) {
      const attemptedAt = now().toISOString();
      const staleBefore = new Date(now().getTime() - 5 * 60000).toISOString();
      const claimed = await store.claimSubscriptionPurchase(payment.id, attemptedAt, staleBefore);
      if (claimed) {
        try {
          const profile = await store.getProfile(subscription.user_id);
          await conversions.subscriptionPurchase({ subscription, payment: claimed, email: profile?.email,
            eventTime: new Date(claimed.confirmed_at || attemptedAt) });
          await store.finishSubscriptionPurchase(payment.id, { meta_purchase_sent_at: now().toISOString(), meta_purchase_error: null });
          console.info(`[meta] Purchase mensal enviado: purchase-subscription-${payment.id}`);
        } catch (cause) {
          await store.finishSubscriptionPurchase(payment.id, { meta_purchase_attempted_at: null, meta_purchase_error: String(cause.message).slice(0, 300) });
          console.error(`[meta] Purchase mensal não enviado: purchase-subscription-${payment.id}: ${cause.message}`);
          throw cause;
        }
      }
    }
    return { status: "processed", note: paid(payload.event) ? "Mensalidade confirmada." : "Cobrança da assinatura registrada." };
  }

  return { start, startGuest, claim, status, cancel, refund, checkoutEvent, subscriptionEvent, paymentEvent };
}
