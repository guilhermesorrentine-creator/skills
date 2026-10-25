import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./store-memory.js";
import { createCommerce } from "./commerce.js";
import { createApi } from "./routes.js";
import { readConfig } from "./config.js";

const config = readConfig({ ASAAS_WEBHOOK_TOKEN: "webhook-secret", ASAAS_API_KEY: "x", APP_URL: "https://voxelia.example", CHECKOUT_CLAIM_SECRET: "claim-secret" });
function fixture() {
  let clock = new Date("2026-10-25T12:00:00Z");
  const store = createMemoryStore({ profiles: [{ id: "u1", email: "cliente@example.com", last_sign_in_at: "2026-10-01" }],
    editions: [{ id: "e1", code: "edicao-1", rank: 1, price_cents: 9790, on_sale: true }, { id: "e2", code: "pro-anual", rank: 2, price_cents: 59880, on_sale: false }] });
  const checkouts = [], canceled = [], refunded = [];
  const asaas = { createCheckout: async (body) => { checkouts.push(body); return { id: `chk_${checkouts.length}` }; },
    deleteSubscription: async (id) => { canceled.push(id); }, refundPayment: async (id) => { refunded.push(id); } };
  const commerce = createCommerce({ store, asaas, config, now: () => clock });
  const api = createApi({ store, commerce, library: {}, me: {}, verifyToken: async (token) => token === "user" ? { id: "u1", email: "cliente@example.com" } : null });
  const call = async (path, body, token) => { const response = await api(new Request(`https://voxelia.example${path}`, { method: "POST", headers: {
    "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }), ...(path === "/api/webhooks/asaas" && { "asaas-access-token": "webhook-secret" }),
  }, body: JSON.stringify(body) })); return { status: response.status, data: await response.json() }; };
  const hook = (id, event, data) => call("/api/webhooks/asaas", { id, event, ...data });
  return { store, commerce, checkouts, canceled, refunded, call, hook, advance: (date) => { clock = new Date(date); } };
}

test("assinatura cobra R$ 49,90 mensal no cartão e só libera após cobrança confirmada", async () => {
  const f = fixture();
  assert.equal((await f.call("/api/subscription/checkout", {}, null)).status, 401);
  const started = await f.call("/api/subscription/checkout", {}, "user");
  assert.equal(started.status, 200);
  assert.deepEqual(f.checkouts[0].chargeTypes, ["RECURRENT"]);
  assert.deepEqual(f.checkouts[0].billingTypes, ["CREDIT_CARD"]);
  assert.equal(f.checkouts[0].items[0].value, 49.9);
  assert.equal((await f.call("/api/subscription/checkout", {}, "user")).data.reused, true);
  assert.equal((await f.commerce.userEntitlement("u1")).access, false);
  await f.hook("checkout", "CHECKOUT_PAID", { checkout: { id: "chk_1", customer: "cus_1", items: [{ value: 49.9, quantity: 1 }] } });
  assert.equal((await f.commerce.userEntitlement("u1")).access, false);
  // A cobrança pode chegar antes do evento de criação da assinatura.
  const payment = { id: "pay_1", subscription: "sub_1", customer: "cus_1", value: 49.9, billingType: "CREDIT_CARD", dueDate: "2026-10-25", status: "CONFIRMED" };
  assert.equal((await f.hook("payment", "PAYMENT_CONFIRMED", { payment })).data.status, "processed");
  assert.equal((await f.commerce.userEntitlement("u1")).rank, 2, "a cobrança vincula a assinatura mesmo sem SUBSCRIPTION_CREATED");
  const session = f.store.db.checkoutSessions[0];
  await f.hook("subscription", "SUBSCRIPTION_CREATED", { subscription: { id: "sub_1", customer: "cus_1", externalReference: session.id, value: 49.9 } });
  assert.equal((await f.commerce.userEntitlement("u1")).rank, 2);
  assert.equal((await f.commerce.mcpStatus("u1")).active, true);
  assert.equal(f.store.db.subscriptionPayments.length, 1);
  await f.hook("payment", "PAYMENT_CONFIRMED", { payment });
  assert.equal(f.store.db.subscriptionPayments.length, 1);
  f.advance("2026-11-25T13:00:00Z");
  assert.equal((await f.commerce.userEntitlement("u1")).access, false);
  await f.hook("renewal", "PAYMENT_RECEIVED", { payment: { ...payment, id: "pay_2", dueDate: "2026-11-25", status: "RECEIVED" } });
  assert.equal((await f.commerce.userEntitlement("u1")).access, true);
  await f.call("/api/subscription/cancel", {}, "user");
  assert.deepEqual(f.canceled, ["sub_1"]);
  assert.equal((await f.commerce.userEntitlement("u1")).access, true);
  f.advance("2026-12-26T12:00:00Z");
  assert.equal((await f.commerce.userEntitlement("u1")).access, false);
});

test("retorno sem cadastro exige chave e pagamento; estorno encerra período", async () => {
  const f = fixture();
  const start = await f.call("/api/subscription/guest", { email: "novo@example.com" });
  assert.equal(start.status, 200);
  assert.equal((await f.call("/api/subscription/claim", { session: start.data.session, key: "errada" })).status, 403);
  assert.equal((await f.call("/api/subscription/claim", { session: start.data.session, key: start.data.key })).data.status, "pending");
  await f.hook("checkout", "CHECKOUT_PAID", { checkout: { id: "chk_1", customer: "cus_new" } });
  const session = f.store.db.checkoutSessions[0];
  await f.hook("sub", "SUBSCRIPTION_CREATED", { subscription: { id: "sub_new", customer: "cus_new", externalReference: session.id } });
  const payment = { id: "pay_new", subscription: "sub_new", customer: "cus_new", value: 49.9, billingType: "CREDIT_CARD", dueDate: "2026-10-25", status: "CONFIRMED" };
  await f.hook("paid", "PAYMENT_CONFIRMED", { payment });
  const claim = await f.call("/api/subscription/claim", { session: start.data.session, key: start.data.key });
  assert.equal(claim.data.status, "paid");
  assert.match(claim.data.url, /criar-senha/);
  await f.hook("refund", "PAYMENT_REFUNDED", { payment: { ...payment, status: "REFUNDED" } });
  assert.equal((await f.commerce.userEntitlement(session.user_id)).access, false);
  await f.hook("late-confirmation", "PAYMENT_CONFIRMED", { payment });
  assert.equal((await f.commerce.userEntitlement(session.user_id)).access, false, "confirmação atrasada não reativa período estornado");
});
