import { timingSafeEqual } from "node:crypto";
import { applyAsaasEvent, effectiveStatus, hasAccess, reconcileState, statusLabels } from "./access.js";
import { asaasDateTime, checkoutUrl } from "./asaas.js";

const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });

// Regras comerciais. `store` persiste dados; `asaas` fala com a API; `now` facilita testes.
export function createBilling({ store, asaas, config, now = () => new Date() }) {
  async function accountState(user) {
    const [profile, subscription, grants, payment] = await Promise.all([
      store.getProfile(user.id), store.getSubscriptionByUser(user.id), store.listGrants(user.id), store.getLatestPayment(user.id),
    ]);
    const access = hasAccess({ subscription, grants, now: now() });
    const plan = subscription?.plan_id ? await store.getPlanById(subscription.plan_id) : null;
    const status = effectiveStatus(subscription, now());
    const checkout = await store.findOpenCheckout(user.id, now());
    return {
      email: user.email,
      isAdmin: Boolean(profile?.is_admin),
      access: access.access,
      accessReason: access.reason,
      accessUntil: access.until,
      subscription: subscription ? {
        status, statusLabel: statusLabels[status] || status,
        currentPeriodEnd: subscription.current_period_end, nextDueDate: subscription.next_due_date,
        canceledAt: subscription.canceled_at, cancelable: config.cancelEnabled && Boolean(subscription.asaas_subscription_id) && ["active", "past_due", "pending"].includes(status),
      } : null,
      plan: plan ? publicPlan(plan) : null,
      latestInvoiceUrl: safeInvoiceUrl(payment?.invoice_url),
      pendingCheckout: checkout ? { url: checkout.checkout_url, expiresAt: checkout.expires_at } : null,
    };
  }

  // Cria (ou reaproveita) um checkout recorrente no Asaas para o plano escolhido.
  async function startCheckout(user, planCode) {
    const plan = await store.getPlanByCode(String(planCode || ""));
    if (!plan || !plan.active) throw httpError(404, "plan_not_found", "Plano indisponível.");
    const state = await accountState(user);
    if (state.access && state.accessReason !== "grant") throw httpError(409, "already_active", "Sua assinatura já está ativa.");
    const open = await store.findOpenCheckout(user.id, now());
    if (open?.checkout_url) return { url: open.checkout_url, reused: true };
    if (open) throw httpError(409, "checkout_in_progress", "Já existe uma contratação sendo criada. Aguarde alguns segundos.");

    const expiresAt = new Date(now().getTime() + config.asaas.checkoutMinutes * 60000).toISOString();
    // O índice único parcial em checkout_sessions impede duas intenções abertas simultâneas.
    const session = await store.insertCheckout({ user_id: user.id, plan_id: plan.id, status: "creating", expires_at: expiresAt });
    if (!session) return startCheckout(user, planCode);
    try {
      const checkout = await asaas.createCheckout({
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: config.asaas.checkoutMinutes,
        callback: {
          successUrl: `${config.appUrl}/checkout/retorno?resultado=sucesso`,
          cancelUrl: `${config.appUrl}/checkout/retorno?resultado=cancelado`,
          expiredUrl: `${config.appUrl}/checkout/retorno?resultado=expirado`,
        },
        items: [{ name: plan.name, description: plan.description || plan.name, quantity: 1, value: plan.price_cents / 100 }],
        subscription: { cycle: plan.cycle, nextDueDate: asaasDateTime(now()) },
      });
      const url = checkoutUrl(checkout, config.asaas.checkoutHost);
      await store.updateCheckout(session.id, { status: "created", asaas_checkout_id: checkout.id, checkout_url: url });
      return { url, reused: false };
    } catch (error) {
      await store.updateCheckout(session.id, { status: "failed", error: String(error.message).slice(0, 500) });
      throw error.status ? error : httpError(502, "asaas_error", "Não foi possível iniciar o pagamento.");
    }
  }

  function verifyWebhookToken(received) {
    const expected = Buffer.from(config.asaas.webhookToken || "");
    const given = Buffer.from(String(received || ""));
    return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
  }

  // Recebe um webhook: valida o token, registra o evento uma única vez e o processa.
  async function receiveWebhook(token, payload) {
    if (!verifyWebhookToken(token)) throw httpError(401, "invalid_token", "Token do webhook inválido.");
    if (!payload?.id || !payload?.event) throw httpError(400, "invalid_event", "Evento sem identificador.");
    const { inserted, event } = await store.insertEvent({ id: String(payload.id), event: String(payload.event), payload, status: "received" });
    if (!inserted && event?.status === "processed") return { duplicate: true, status: "processed" };
    return { duplicate: !inserted, ...(await processEvent(event || { id: payload.id, event: payload.event, payload })) };
  }

  async function resolveUser(payload) {
    if (payload.checkout?.id) {
      const session = await store.findCheckoutByAsaasId(payload.checkout.id);
      if (session) return { userId: session.user_id, session };
    }
    const subscriptionId = payload.payment?.subscription || payload.subscription?.id;
    if (subscriptionId) {
      const subscription = await store.getSubscriptionByAsaasId(subscriptionId);
      if (subscription) return { userId: subscription.user_id, subscription };
    }
    const customer = payload.payment?.customer || payload.subscription?.customer || payload.checkout?.customer;
    if (customer) {
      const profile = await store.findProfileByCustomer(customer);
      if (profile) return { userId: profile.id };
    }
    return {};
  }

  async function processEvent(row) {
    const payload = row.payload;
    try {
      const { userId, session } = await resolveUser(payload);
      if (payload.event.startsWith("CHECKOUT_")) {
        if (!session) return finish(row, "unlinked", "Checkout desconhecido.");
        const statusByEvent = { CHECKOUT_PAID: "paid", CHECKOUT_CANCELED: "canceled", CHECKOUT_EXPIRED: "expired", CHECKOUT_CREATED: session.status };
        await store.updateCheckout(session.id, { status: statusByEvent[payload.event] || session.status });
        const customer = payload.checkout?.customer;
        if (payload.event === "CHECKOUT_PAID" && customer) {
          await store.setCustomerId(session.user_id, customer);
          await ensureSubscription(session.user_id, { planId: session.plan_id, customer });
          await retryUnlinked();
        }
        return finish(row, "processed");
      }
      if (!userId) return finish(row, "unlinked", "Cliente ainda não vinculado a uma conta.");
      const asaasSubscriptionId = payload.payment?.subscription || payload.subscription?.id || null;
      if (!asaasSubscriptionId) return finish(row, "processed", "Evento sem assinatura; apenas registrado.");
      const subscription = await ensureSubscription(userId, { asaasSubscriptionId, customer: payload.payment?.customer || payload.subscription?.customer });
      if (payload.payment) await store.upsertPayment(paymentRecord(payload.payment, userId, subscription.id));
      const { patch, effect } = applyAsaasEvent(subscription, payload);
      if (Object.keys(patch).length && !(await store.updateSubscription(subscription.id, patch, subscription.version))) {
        throw new Error("Assinatura alterada em paralelo; reprocessar.");
      }
      return finish(row, "processed", effect);
    } catch (error) {
      return finish(row, "failed", String(error.message).slice(0, 500));
    }
  }

  async function finish(row, status, note = null) {
    await store.updateEvent(row.id, { status, note, processed_at: status === "processed" ? now().toISOString() : null, attempts: (row.attempts || 0) + 1 });
    return { status, note };
  }

  // Garante uma linha de assinatura do usuário, vinculando o ID do Asaas quando ele chega.
  async function ensureSubscription(userId, { asaasSubscriptionId = null, planId = null, customer = null }) {
    let subscription = asaasSubscriptionId ? await store.getSubscriptionByAsaasId(asaasSubscriptionId) : null;
    if (!subscription) {
      const latest = await store.getSubscriptionByUser(userId);
      if (latest && (!latest.asaas_subscription_id || latest.asaas_subscription_id === asaasSubscriptionId) && !["expired", "suspended"].includes(effectiveStatus(latest, now()))) subscription = latest;
    }
    if (!subscription) {
      const plan = planId ? null : await store.getLatestCheckoutPlan(userId);
      subscription = await store.insertSubscription({ user_id: userId, plan_id: planId || plan, status: "pending", asaas_subscription_id: asaasSubscriptionId, asaas_customer_id: customer, cycle: "MONTHLY", version: 1 });
    } else if (asaasSubscriptionId && !subscription.asaas_subscription_id) {
      await store.updateSubscription(subscription.id, { asaas_subscription_id: asaasSubscriptionId }, subscription.version);
      subscription = await store.getSubscriptionByAsaasId(asaasSubscriptionId);
    }
    return subscription;
  }

  async function retryUnlinked() {
    for (const row of await store.listEvents({ status: "unlinked", limit: 50 })) await processEvent(row);
  }

  // Reconciliação: busca a verdade no Asaas e corrige o estado local.
  async function reconcileUser(userId, actorId = null) {
    const subscription = await store.getSubscriptionByUser(userId);
    if (!subscription?.asaas_subscription_id) {
      const profile = await store.getProfile(userId);
      if (!profile?.asaas_customer_id) return { changed: false, reason: "Sem assinatura no Asaas." };
      const remote = await asaas.listCustomerSubscriptions(profile.asaas_customer_id);
      const first = remote?.data?.[0];
      if (!first) return { changed: false, reason: "Nenhuma assinatura encontrada no Asaas." };
      await ensureSubscription(userId, { asaasSubscriptionId: first.id, customer: profile.asaas_customer_id });
      return reconcileUser(userId, actorId);
    }
    const [remote, payments] = await Promise.all([asaas.getSubscription(subscription.asaas_subscription_id), asaas.listSubscriptionPayments(subscription.asaas_subscription_id)]);
    for (const payment of payments?.data || []) await store.upsertPayment(paymentRecord(payment, userId, subscription.id));
    const next = reconcileState({ subscription: remote, payments: payments?.data || [], cycle: subscription.cycle, now: now() });
    const patch = { ...next, status_changed_at: next.status !== subscription.status ? now().toISOString() : subscription.status_changed_at, reconciled_at: now().toISOString() };
    await store.updateSubscription(subscription.id, patch, subscription.version);
    if (actorId) await store.insertAudit({ actor_id: actorId, action: "reconcile", target_user_id: userId, details: { from: subscription.status, to: next.status } });
    return { changed: next.status !== subscription.status, status: next.status };
  }

  async function cancel(user) {
    if (!config.cancelEnabled) throw httpError(403, "cancel_disabled", "O cancelamento pelo site está desativado.");
    const subscription = await store.getSubscriptionByUser(user.id);
    if (!subscription?.asaas_subscription_id) throw httpError(404, "no_subscription", "Nenhuma assinatura para cancelar.");
    await asaas.cancelSubscription(subscription.asaas_subscription_id);
    await store.updateSubscription(subscription.id, { status: "canceled", canceled_at: now().toISOString(), status_changed_at: now().toISOString() }, subscription.version);
    await store.insertAudit({ actor_id: user.id, action: "cancel_subscription", target_user_id: user.id, details: { asaas_subscription_id: subscription.asaas_subscription_id } });
    return accountState(user);
  }

  return { accountState, startCheckout, receiveWebhook, processEvent, reconcileUser, cancel, verifyWebhookToken };
}

export function publicPlan(plan) {
  return { code: plan.code, name: plan.name, description: plan.description, priceCents: plan.price_cents, currency: plan.currency || "BRL", cycle: plan.cycle, features: plan.features || [], rules: plan.rules || "" };
}

function paymentRecord(payment, userId, subscriptionId) {
  return {
    asaas_payment_id: payment.id, user_id: userId, subscription_id: subscriptionId, status: payment.status,
    value_cents: Math.round(Number(payment.value || 0) * 100), billing_type: payment.billingType || null,
    due_date: payment.dueDate || null, confirmed_at: payment.confirmedDate || payment.paymentDate || null,
    invoice_url: safeInvoiceUrl(payment.invoiceUrl),
  };
}

function safeInvoiceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")) ? url.toString() : null;
  } catch { return null; }
}
