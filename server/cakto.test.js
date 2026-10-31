import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { CAKTO_PRICE_CENTS, caktoCheckoutUrl, verifyCaktoWebhook } from "./cakto.js";

const PRICE = CAKTO_PRICE_CENTS / 100;
import { createCommerce } from "./commerce.js";
import { createConversions } from "./meta.js";
import { createOnboarding } from "./onboarding.js";
import { createMemoryStore } from "./store-memory.js";
import { readConfig } from "./config.js";

const productId = "eab775e9-b5c9-4f22-8bcb-490e8338b66e";
const offerId = "xjg2gb9";
const user = { id: "buyer", email: "buyer@example.com", last_sign_in_at: "2026-10-01T00:00:00Z" };

function setup(purchase = async () => true) {
  const config = readConfig({ CLAIM_SECRET: "claim-test", CAKTO_PRODUCT_ID: productId, CAKTO_OFFER_ID: offerId,
    CAKTO_CHECKOUT_SLUG: "xjg2gb9_1253369", CAKTO_WEBHOOK_SECRET: "webhook-test" });
  const store = createMemoryStore({ profiles: [user], editions: [{ id: "edition", code: "edicao-1", name: "Voxelia vitalício",
    rank: 1, price_cents: CAKTO_PRICE_CENTS, on_sale: true, features: [] }] });
  const commerce = createCommerce({ store, asaas: {}, config, conversions: { purchase } });
  const data = (order, changes = {}) => ({ id: randomUUID(), callback: order.id, offer_type: "main", subscription: null,
    product: { id: productId, type: "unique" }, offer: { id: offerId, price: PRICE, currency: "BRL" }, amount: PRICE,
    currency: "BRL", installments: 1, customer: { email: user.email }, status: "paid", paidAt: new Date().toISOString(),
    fees: 2.5, paymentMethod: "PIX", ...changes });
  return { store, commerce, data };
}

test("Cakto: assinatura HMAC exige corpo intacto e timestamp recente", () => {
  const raw = Buffer.from('{"event":"purchase_approved"}');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1=${createHmac("sha256", "segredo").update(`${timestamp}.`).update(raw).digest("hex")}`;
  assert.equal(verifyCaktoWebhook(raw, timestamp, signature, "segredo"), true);
  assert.equal(verifyCaktoWebhook(Buffer.from('{"event":"refund"}'), timestamp, signature, "segredo"), false);
  assert.equal(verifyCaktoWebhook(raw, timestamp, signature, "outro"), false);
  assert.equal(verifyCaktoWebhook(raw, String(Number(timestamp) - 600), signature, "segredo"), false);
});

test("Cakto: compra sem conta abre o checkout e libera mesmo com outro e-mail na Cakto", async () => {
  const { store, commerce, data } = setup();
  const checkout = await commerce.guestCheckout("new@example.com", "edicao-1");
  const order = store.db.orders[0];
  assert.ok(checkout.url.includes(`callback=${order.id}`));
  assert.ok(checkout.key);
  const paid = data(order, { customer: { email: "outro-no-checkout@example.com" } });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid })).results[0].status, "processed");
  assert.equal(store.db.licenses.length, 1);
  assert.equal((await commerce.claimAccess(order.id, checkout.key)).status, "paid");
});

test("Cakto: e-mail de conta já usada exige login antes da compra", async () => {
  const { commerce } = setup();
  await assert.rejects(commerce.guestCheckout(user.email, "edicao-1"), (error) => error.code === "account_exists");
});

test("Cakto: pedido Asaas antigo não é reutilizado para a nova oferta", async () => {
  const { store, commerce } = setup();
  store.db.orders.push({ id: randomUUID(), user_id: user.id, edition_id: "edition", status: "pending",
    amount_cents: 9790, payment_provider: "asaas", checkout_url: "https://asaas.com/old",
    expires_at: new Date(Date.now() + 3600000).toISOString() });
  await assert.rejects(commerce.accountCheckout(user, "edicao-1"),
    (error) => error.code === "order_in_progress" && error.status === 409);
  assert.equal(store.db.orders.length, 1);
});

test("Cakto: compra sem cadastro entrega o link uma vez após pagamento aprovado", async () => {
  const config = readConfig({ CLAIM_SECRET: "claim-test", CAKTO_PRODUCT_ID: productId, CAKTO_OFFER_ID: offerId,
    CAKTO_CHECKOUT_SLUG: "xjg2gb9_1253369", CAKTO_WEBHOOK_SECRET: "webhook-test",
    GMAIL_SMTP_USER: "sender@example.com", GMAIL_SMTP_APP_PASSWORD: "app-password-test",
    APP_URL: "https://voxelia.example" });
  const store = createMemoryStore({ editions: [{ id: "edition", code: "edicao-1", name: "Voxelia vitalício",
    rank: 1, price_cents: CAKTO_PRICE_CENTS, on_sale: true, features: [] }] });
  const emails = [];
  const onboarding = createOnboarding({ store, config, mailer: { send: async (message) => emails.push(message) } });
  const commerce = createCommerce({ store, asaas: {}, config, onboarding });
  const checkout = await commerce.guestCheckout("buyer@example.com", "edicao-1");
  const order = store.db.orders[0];
  assert.ok(checkout.url.includes(`callback=${order.id}`));
  assert.equal(emails.length, 0);
  const paid = { id: randomUUID(), callback: order.id, offer_type: "main", subscription: null,
    product: { id: productId, type: "unique" }, offer: { id: offerId, price: PRICE, currency: "BRL" },
    amount: PRICE, currency: "BRL", installments: 1, customer: { email: "buyer@example.com" },
    status: "paid", paidAt: new Date().toISOString() };
  await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid });
  await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid });
  assert.equal(store.db.licenses.length, 1);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "buyer@example.com");
  assert.match(emails[0].html, /Criar minha senha e entrar/);
});

test("Cakto: pagamento aprovado libera uma vez; divergências e pendências não liberam", async () => {
  const sent = [];
  const { store, commerce, data } = setup(async (event) => { sent.push(event); return true; });
  const checkout = await commerce.accountCheckout(user, "edicao-1", { consent: true });
  const order = store.db.orders[0];
  assert.equal(checkout.url, caktoCheckoutUrl("xjg2gb9_1253369", order.id));
  assert.equal(order.payment_provider, "cakto");
  assert.equal(store.db.licenses.length, 0);
  const bad = data(order, { amount: 1 });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: bad })).results[0].status, "failed");
  assert.equal(store.db.licenses.length, 0);
  const wrongBuyer = data(order, { customer: { email: "other@example.com" } });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: wrongBuyer })).results[0].status, "failed");
  const wrongOffer = data(order, { offer: { id: "other", price: PRICE, currency: "BRL" } });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: wrongOffer })).results[0].status, "failed");
  const unexplainedExtra = data(order, { amount: PRICE + 0.99 });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: unexplainedExtra })).results[0].status, "failed");
  const pending = data(order, { status: "pending" });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: pending })).results[0].status, "failed");
  assert.equal(store.db.licenses.length, 0);
  const paid = data(order);
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid })).results[0].status, "processed");
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid })).results[0].duplicate, true);
  assert.equal(store.db.licenses.length, 1);
  assert.equal(store.db.licenseEvents.length, 1);
  assert.equal(store.db.orders[0].access_granted_at != null, true);
  assert.equal(store.db.orders[0].cakto_order_id, paid.id);
  assert.equal(store.db.orders[0].cakto_fee_cents, 250);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].order.cakto_order_id, paid.id);
  assert.equal(sent[0].editionCode, "voxelia-vitalicio");
});

test("Cakto: falha temporária da Meta pode ser repetida; estorno encerra o acesso", async () => {
  let attempts = 0;
  const { store, commerce, data } = setup(async () => { attempts += 1; if (attempts === 1) throw new Error("Meta indisponível"); return true; });
  await commerce.accountCheckout(user, "edicao-1", { consent: true });
  const paid = data(store.db.orders[0]);
  await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid });
  assert.equal(store.db.orders[0].meta_purchase_sent_at, undefined);
  // O prazo da tentativa impede que duas entregas simultâneas contem duas compras.
  store.db.orders[0].meta_purchase_attempted_at = new Date(Date.now() - 360000).toISOString();
  await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid });
  assert.equal(attempts, 2);
  assert.ok(store.db.orders[0].meta_purchase_sent_at);
  await commerce.receiveCaktoWebhook({ event: "refund", data: paid });
  assert.equal(store.db.orders[0].status, "refunded");
  assert.equal(store.db.licenses[0].status, "refunded");
  assert.equal(store.db.licenseEvents.length, 2);
});

test("Cakto: Purchase enviado ao Pixel certo com valor, moeda e ID da transação", async () => {
  const sent = [];
  const conversions = createConversions({ pixelId: "1134502832307010", token: "test-token", testEventCode: "TEST123" },
    async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true }; });
  const { store, commerce, data } = setup(conversions.purchase);
  await commerce.accountCheckout(user, "edicao-1", { consent: true });
  const paid = data(store.db.orders[0]);
  await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: paid });
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /1134502832307010\/events$/);
  assert.equal(sent[0].body.test_event_code, "TEST123");
  assert.equal(sent[0].body.data[0].event_name, "Purchase");
  assert.equal(sent[0].body.data[0].event_id, `purchase-cakto-${paid.id}`);
  assert.deepEqual(sent[0].body.data[0].custom_data, { currency: "BRL", value: PRICE,
    content_ids: ["voxelia-vitalicio"], content_type: "product" });
});

test("Cakto: taxa repassada ao comprador (preço + charged_fees) libera o acesso", async () => {
  const { store, commerce, data } = setup(async () => true);
  await commerce.accountCheckout(user, "edicao-1", { consent: true });
  const order = store.db.orders[0];
  const withFee = data(order, { amount: 40.89, baseAmount: PRICE, charged_fees: "0.99", discount: "0.00", fees: 2.49 });
  assert.equal((await commerce.receiveCaktoWebhook({ event: "purchase_approved", data: withFee })).results[0].status, "processed");
  assert.equal(store.db.licenses.length, 1);
  assert.equal(store.db.orders[0].amount_cents, CAKTO_PRICE_CENTS);
});
