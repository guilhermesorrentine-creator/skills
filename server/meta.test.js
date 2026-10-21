import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCommerce } from "./commerce.js";
import { createConversions, readTracking } from "./meta.js";
import { createApi } from "./routes.js";
import { createMemoryStore } from "./store-memory.js";
import { readConfig } from "./config.js";

const TOKEN = "whk_test_token_123";
const config = readConfig({ ASAAS_WEBHOOK_TOKEN: TOKEN, ASAAS_API_KEY: "x", APP_URL: "https://bt.example" });
const E1 = { id: "e1", code: "edicao-1", name: "Edição 1", rank: 1, price_cents: 9790, on_sale: true, features: [] };
const sha = (v) => createHash("sha256").update(v).digest("hex");

function setup() {
  const store = createMemoryStore({ profiles: [{ id: "u1", email: "A@X.com" }], editions: [E1] });
  const sent = [];
  const conversions = createConversions({ pixelId: "123", token: "tok" }, async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true }; });
  const asaas = { createCheckout: async () => ({ id: `chk_${store.db.orders.length}`, link: "https://sandbox.asaas.com/c/x" }), listCustomerPayments: async () => ({ data: [] }) };
  const api = createApi({ store, commerce: createCommerce({ store, asaas, config, conversions }), library: null, me: null, verifyToken: async (t) => (t === "tok-u1" ? { id: "u1", email: "a@x.com" } : null) });
  const call = (path, body, headers = {}) => api(new Request(`https://bt.example${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));
  const buy = async (tracking) => {
    await call("/api/checkout", { editionCode: "edicao-1", tracking }, { authorization: "Bearer tok-u1", "user-agent": "Teste/1.0", "x-forwarded-for": "203.0.113.9, 10.0.0.1" });
    const order = store.db.orders.at(-1);
    const paid = { id: `evt_${order.id}`, event: "CHECKOUT_PAID", checkout: { id: order.asaas_checkout_id, customer: "cus_1", items: [{ value: 97.9, quantity: 1 }] } };
    await call("/api/webhooks/asaas", paid, { "asaas-access-token": TOKEN });
    await call("/api/webhooks/asaas", { ...paid, id: `${paid.id}_dup` }, { "asaas-access-token": TOKEN });
  };
  return { store, sent, buy };
}

test("Purchase vai para o Meta uma vez, com dados protegidos, só com consentimento", async () => {
  const { sent, buy, store } = setup();
  await buy({ consent: true, fbp: "fb.1.1729500000000.123456789", fbc: "<script>", pageUrl: "https://bt.example/" });
  assert.equal(sent.length, 1, "um envio mesmo com webhook repetido");
  const [event] = sent[0].body.data;
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, `purchase-${store.db.orders.at(-1).id}`);
  assert.deepEqual(event.custom_data, { currency: "BRL", value: 97.9, content_ids: ["edicao-1"], content_type: "product" });
  assert.deepEqual(event.user_data.em, [sha("a@x.com")], "e-mail normalizado e em hash");
  assert.equal(event.user_data.fbp, "fb.1.1729500000000.123456789");
  assert.equal(event.user_data.fbc, undefined, "cookie inválido descartado");
  assert.equal(event.user_data.client_ip_address, "203.0.113.9");
  assert.ok(!JSON.stringify(sent[0].body).includes("A@X.com"));
});

test("sem consentimento nada é guardado nem enviado", async () => {
  const { sent, buy, store } = setup();
  await buy({ consent: false, fbp: "fb.1.1729500000000.1" });
  assert.equal(sent.length, 0);
  assert.equal(store.db.orders.at(-1).ad_tracking, undefined);
  assert.equal(readTracking(undefined, new Request("https://x")), null);
});

test("sem configuração do Meta, a API de Conversões fica desligada", () => {
  assert.equal(createConversions({ pixelId: "", token: "" }), null);
});
