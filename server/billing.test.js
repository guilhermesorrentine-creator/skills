import test from "node:test";
import assert from "node:assert/strict";
import { applyAsaasEvent, hasAccess, reconcileState, parseAsaasDate } from "./access.js";
import { createBilling } from "./billing.js";
import { createApi } from "./routes.js";
import { createMemoryStore } from "./store-memory.js";
import { readConfig } from "./config.js";

const TOKEN = "whk_test_token_123";
const config = { ...readConfig({ ASAAS_WEBHOOK_TOKEN: TOKEN, ASAAS_API_KEY: "x", APP_URL: "https://bt.example" }) };

function setup({ clock = new Date("2026-11-01T12:00:00Z") } = {}) {
  const store = createMemoryStore({
    profiles: [{ id: "u1", email: "a@x.com", is_admin: false }, { id: "u2", email: "b@x.com", is_admin: false }, { id: "adm", email: "adm@x.com", is_admin: true }],
    plans: [{ id: "p1", code: "mensal", name: "Mensal", description: "", price_cents: 2990, cycle: "MONTHLY", features: ["Busca"], rules: "", active: true }],
  });
  const calls = [];
  const asaas = {
    createCheckout: async (body) => { calls.push(body); return { id: `chk_${calls.length}`, link: "https://evil.example/x" }; },
    getSubscription: async (id) => ({ id, status: "ACTIVE", nextDueDate: "2026-12-01" }),
    listSubscriptionPayments: async () => ({ data: [{ id: "pay_r", status: "RECEIVED", dueDate: "2026-11-01", value: 29.9 }] }),
    listCustomerSubscriptions: async () => ({ data: [] }),
    cancelSubscription: async () => ({ deleted: true }),
  };
  const now = () => clock;
  const billing = createBilling({ store, asaas, config, now });
  const users = { "tok-u1": { id: "u1", email: "a@x.com" }, "tok-u2": { id: "u2", email: "b@x.com" }, "tok-adm": { id: "adm", email: "adm@x.com" } };
  const api = createApi({ store, billing, verifyToken: async (token) => users[token] || null, loadCatalog: async () => [{ name: "repo" }] });
  const call = (method, path, { token, body, headers = {} } = {}) => api(new Request(`https://bt.example${path}`, {
    method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined,
  }));
  const hook = (payload, token = TOKEN) => call("POST", "/api/webhooks/asaas", { body: payload, headers: { "asaas-access-token": token } });
  return { store, calls, billing, call, hook };
}

const paidFlow = async (ctx, { user = "tok-u1", checkoutId = "chk_1" } = {}) => {
  await ctx.call("POST", "/api/billing/checkout", { token: user, body: { planCode: "mensal" } });
  await ctx.hook({ id: `evt_paid_${checkoutId}`, event: "CHECKOUT_PAID", dateCreated: "2026-11-01 09:00:00", checkout: { id: checkoutId, customer: `cus_${checkoutId}` } });
  await ctx.hook({ id: `evt_sub_${checkoutId}`, event: "SUBSCRIPTION_CREATED", dateCreated: "2026-11-01 09:00:01", subscription: { id: `sub_${checkoutId}`, customer: `cus_${checkoutId}`, status: "ACTIVE", cycle: "MONTHLY", nextDueDate: "2026-12-01" } });
  return ctx.hook({ id: `evt_pay_${checkoutId}`, event: "PAYMENT_CONFIRMED", dateCreated: "2026-11-01 09:00:05", payment: { id: `pay_${checkoutId}`, customer: `cus_${checkoutId}`, subscription: `sub_${checkoutId}`, status: "CONFIRMED", dueDate: "2026-11-01", value: 29.9, invoiceUrl: "https://sandbox.asaas.com/i/abc" } });
};

test("datas do Asaas e regras de acesso", () => {
  assert.equal(parseAsaasDate("2026-11-01"), "2026-11-02T02:59:59.000Z");
  assert.equal(hasAccess({ subscription: null }).access, false);
  assert.equal(hasAccess({ subscription: { status: "active", current_period_end: "2026-12-01" }, now: new Date("2026-11-15") }).access, true);
  assert.equal(hasAccess({ subscription: { status: "active", current_period_end: "2026-12-01" }, now: new Date("2026-12-02") }).access, false);
  assert.equal(hasAccess({ subscription: { status: "pending", current_period_end: "2027-01-01" }, now: new Date("2026-11-15") }).access, false);
  assert.equal(hasAccess({ subscription: { status: "suspended", current_period_end: "2027-01-01" }, now: new Date("2026-11-15") }).access, false);
  assert.equal(hasAccess({ subscription: null, grants: [{ starts_at: "2026-01-01", ends_at: null }], now: new Date("2026-11-15") }).reason, "grant");
  assert.equal(hasAccess({ subscription: null, grants: [{ starts_at: "2026-01-01", ends_at: null, revoked_at: "2026-02-01" }], now: new Date("2026-11-15") }).access, false);
});

test("evento antigo não rebaixa status e reconciliação recalcula a partir do Asaas", () => {
  const current = { status: "active", cycle: "MONTHLY", current_period_end: "2026-12-01T00:00:00Z", status_changed_at: "2026-11-10T00:00:00Z" };
  assert.deepEqual(applyAsaasEvent(current, { event: "PAYMENT_OVERDUE", dateCreated: "2026-11-05 10:00:00", payment: { subscription: "s" } }).patch, {});
  assert.equal(applyAsaasEvent(current, { event: "PAYMENT_REFUNDED", dateCreated: "2026-11-12 10:00:00", payment: { subscription: "s" } }).patch.status, "suspended");
  assert.equal(reconcileState({ subscription: { status: "ACTIVE" }, payments: [{ status: "RECEIVED", dueDate: "2026-11-01" }] }).status, "active");
  assert.equal(reconcileState({ subscription: { status: "INACTIVE" }, payments: [] }).status, "canceled");
  assert.equal(reconcileState({ subscription: { status: "ACTIVE" }, payments: [{ status: "CHARGEBACK_REQUESTED", dueDate: "2026-11-01" }] }).status, "suspended");
});

test("planos públicos vêm do servidor e checkout exige login, plano válido e não duplica", async () => {
  const ctx = setup();
  const plans = await (await ctx.call("GET", "/api/billing/plans")).json();
  assert.deepEqual(plans.plans.map((plan) => [plan.code, plan.priceCents]), [["mensal", 2990]]);
  assert.equal((await ctx.call("POST", "/api/billing/checkout", { body: { planCode: "mensal" } })).status, 401);
  assert.equal((await ctx.call("POST", "/api/billing/checkout", { token: "tok-u1", body: { planCode: "inexistente" } })).status, 404);
  const first = await (await ctx.call("POST", "/api/billing/checkout", { token: "tok-u1", body: { planCode: "mensal" } })).json();
  const second = await (await ctx.call("POST", "/api/billing/checkout", { token: "tok-u1", body: { planCode: "mensal" } })).json();
  assert.equal(ctx.calls.length, 1);
  assert.equal(second.reused, true);
  assert.equal(first.url, second.url);
  assert.match(first.url, /^https:\/\/sandbox\.asaas\.com\/checkoutSession\/show\?id=chk_1$/, "link fora do domínio do Asaas é ignorado");
  assert.deepEqual(ctx.calls[0].billingTypes, ["CREDIT_CARD"]);
  assert.deepEqual(ctx.calls[0].chargeTypes, ["RECURRENT"]);
  assert.equal(ctx.calls[0].items[0].value, 29.9);
  assert.equal(ctx.calls[0].callback.successUrl, "https://bt.example/checkout/retorno?resultado=sucesso");
});

test("webhook rejeita token inválido e retorno do navegador não libera acesso", async () => {
  const ctx = setup();
  assert.equal((await ctx.hook({ id: "e1", event: "PAYMENT_CONFIRMED" }, "errado")).status, 401);
  assert.equal((await ctx.hook({ id: "e1", event: "PAYMENT_CONFIRMED" }, "")).status, 401);
  await ctx.call("POST", "/api/billing/checkout", { token: "tok-u1", body: { planCode: "mensal" } });
  const state = await (await ctx.call("GET", "/api/billing/subscription", { token: "tok-u1" })).json();
  assert.equal(state.access, false);
  assert.ok(state.pendingCheckout);
  assert.equal((await ctx.call("GET", "/api/catalog", { token: "tok-u1" })).status, 402);
});

test("pagamento confirmado libera acesso; reenvio do mesmo evento não duplica efeitos", async () => {
  const ctx = setup();
  await paidFlow(ctx);
  const state = await (await ctx.call("GET", "/api/billing/subscription", { token: "tok-u1" })).json();
  assert.equal(state.access, true);
  assert.equal(state.subscription.status, "active");
  assert.equal(state.latestInvoiceUrl, "https://sandbox.asaas.com/i/abc");
  assert.equal((await ctx.call("GET", "/api/catalog", { token: "tok-u1" })).status, 200);
  const versionBefore = ctx.store.db.subscriptions[0].version;
  const replay = await (await ctx.hook({ id: "evt_pay_chk_1", event: "PAYMENT_CONFIRMED", dateCreated: "2026-11-01 09:00:05", payment: { id: "pay_chk_1", subscription: "sub_chk_1", customer: "cus_chk_1", status: "CONFIRMED", dueDate: "2026-11-01" } })).json();
  assert.equal(replay.duplicate, true);
  assert.equal(ctx.store.db.subscriptions[0].version, versionBefore);
  assert.equal(ctx.store.db.events.filter((event) => event.id === "evt_pay_chk_1").length, 1);
  assert.equal((await ctx.call("GET", "/api/catalog", { token: "tok-u2" })).status, 402, "outro usuário continua sem acesso");
  assert.equal((await ctx.call("GET", "/api/catalog")).status, 401);
});

test("pagamento que chega antes do vínculo fica pendente e é aplicado depois", async () => {
  const ctx = setup();
  await ctx.call("POST", "/api/billing/checkout", { token: "tok-u1", body: { planCode: "mensal" } });
  const early = await (await ctx.hook({ id: "early", event: "PAYMENT_RECEIVED", dateCreated: "2026-11-01 09:00:00", payment: { id: "pay_e", customer: "cus_e", subscription: "sub_e", status: "RECEIVED", dueDate: "2026-11-01" } })).json();
  assert.equal(early.status, "unlinked");
  await ctx.hook({ id: "link", event: "CHECKOUT_PAID", dateCreated: "2026-11-01 09:00:02", checkout: { id: "chk_1", customer: "cus_e" } });
  assert.equal(ctx.store.db.events.find((event) => event.id === "early").status, "processed");
  assert.equal((await (await ctx.call("GET", "/api/billing/subscription", { token: "tok-u1" })).json()).access, true);
});

test("atraso, estorno e cancelamento mudam o acesso conforme a regra", async () => {
  const ctx = setup();
  await paidFlow(ctx);
  await ctx.hook({ id: "chb", event: "PAYMENT_CHARGEBACK_REQUESTED", dateCreated: "2026-11-02 10:00:00", payment: { id: "pay_chk_1", subscription: "sub_chk_1", customer: "cus_chk_1", status: "CHARGEBACK_REQUESTED", dueDate: "2026-11-01" } });
  let state = await (await ctx.call("GET", "/api/billing/subscription", { token: "tok-u1" })).json();
  assert.equal(state.access, false);
  assert.equal(state.subscription.status, "suspended");

  const ctx2 = setup();
  await paidFlow(ctx2);
  const canceled = await (await ctx2.call("POST", "/api/billing/cancel", { token: "tok-u1" })).json();
  assert.equal(canceled.subscription.status, "canceled");
  assert.equal(canceled.access, true, "mantém acesso até o fim do período já pago");
  assert.equal(ctx2.store.db.audit.at(-1).action, "cancel_subscription");
});

test("administração é restrita, exige justificativa e registra auditoria", async () => {
  const ctx = setup();
  assert.equal((await ctx.call("GET", "/api/admin/overview", { token: "tok-u1" })).status, 403);
  assert.equal((await ctx.call("POST", "/api/admin/grants", { token: "tok-adm", body: { userId: "u2", reason: "curto" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/grants", { token: "tok-adm", body: { userId: "u2", reason: "Acesso de cortesia para revisão do conteúdo" } })).status, 200);
  assert.equal((await ctx.call("GET", "/api/catalog", { token: "tok-u2" })).status, 200);
  assert.equal(ctx.store.db.audit.at(-1).actor_id, "adm");
  assert.equal((await ctx.call("POST", "/api/admin/plans", { token: "tok-adm", body: { code: "anual", priceCents: 10, cycle: "YEARLY" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/plans", { token: "tok-u1", body: { code: "anual", priceCents: 29900, cycle: "YEARLY" } })).status, 403);
  const overview = await (await ctx.call("GET", "/api/admin/overview", { token: "tok-adm" })).json();
  assert.equal(overview.profiles.length, 3);
});

test("produção do Asaas exige duas chaves explícitas", () => {
  assert.equal(readConfig({ ASAAS_ENV: "production" }).asaas.env, "sandbox");
  assert.equal(readConfig({ ASAAS_ENV: "production", ASAAS_ALLOW_PRODUCTION: "true" }).asaas.baseUrl, "https://api.asaas.com/v3");
  assert.equal(readConfig({ BT_DEV_BYPASS: "1", VERCEL: "1" }).devBypass, false);
  assert.equal(readConfig({ BT_DEV_BYPASS: "1", NODE_ENV: "production" }).devBypass, false);
});
