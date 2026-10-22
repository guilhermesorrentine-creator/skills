import test from "node:test";
import assert from "node:assert/strict";
import { eligibleCredit, entitlement, quote, canAccessResource } from "./licensing.js";
import { createCommerce } from "./commerce.js";
import { createLibrary, validateResource } from "./library.js";
import { createMe } from "./me.js";
import { createApi } from "./routes.js";
import { createMemoryStore } from "./store-memory.js";
import { readConfig } from "./config.js";

const TOKEN = "whk_test_token_123";
const config = readConfig({ ASAAS_WEBHOOK_TOKEN: TOKEN, ASAAS_API_KEY: "x", APP_URL: "https://bt.example" });
const E1 = { id: "e1", code: "edicao-1", name: "Edição 1", rank: 1, price_cents: 9790, on_sale: true, features: [] };
const E2 = { id: "e2", code: "edicao-2", name: "Edição 2", rank: 2, price_cents: 14790, on_sale: false, features: [] };
const E3 = { id: "e3", code: "edicao-3", name: "Edição 3", rank: 3, price_cents: 19790, on_sale: false, features: [] };
const catalog = [{ name: "repo-a", category: "software", summary: "Ferramentas", url: "https://github.com/acme/repo-a", skills: [
  { name: "landing-page", description: "Cria landing pages", path: "skills/landing/SKILL.md" },
  { name: "security-audit", description: "Auditoria", path: "skills/security/SKILL.md" },
] }];
const guide = { id: "guia-subagente", type: "guide", category: "software", title: "Criar um subagente", summary: "Passo a passo", body_md: "## Passo 1\nTexto", instructions: "", tags: [], visibility: "edition", min_edition_rank: 2, status: "published" };
const tool = { id: "21st-dev", type: "reference", category: "software", title: "21st.dev", summary: "Componentes React", body_md: "", instructions: "", tags: ["react"], source_url: "https://21st.dev", visibility: "demo", min_edition_rank: 1, status: "published" };
const draft = { ...tool, id: "rascunho", status: "draft" };

function setup() {
  const store = createMemoryStore({
    profiles: [{ id: "u1", email: "a@x.com" }, { id: "u2", email: "b@x.com" }, { id: "adm", email: "adm@x.com", is_admin: true }],
    editions: [E1, E2, E3], resources: [guide, tool, draft],
  });
  const calls = [];
  const asaas = {
    createCheckout: async (body) => { calls.push(body); return { id: `chk_${calls.length}`, link: "https://evil.example/x" }; },
    listCustomerPayments: async () => ({ data: [] }),
  };
  const commerce = createCommerce({ store, asaas, config });
  const library = createLibrary({ store, loadCatalog: async () => catalog });
  const me = createMe({ store, library });
  const users = { "tok-u1": { id: "u1", email: "a@x.com" }, "tok-u2": { id: "u2", email: "b@x.com" }, "tok-adm": { id: "adm", email: "adm@x.com" } };
  const api = createApi({ store, commerce, library, me, verifyToken: async (token) => users[token] || null });
  const call = async (method, path, { token, body, headers = {} } = {}) => {
    const response = await api(new Request(`https://bt.example${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined }));
    return { status: response.status, data: await response.json() };
  };
  const hook = (payload, token = TOKEN) => call("POST", "/api/webhooks/asaas", { body: payload, headers: { "asaas-access-token": token } });
  const pay = async (user = "tok-u1", n = 1, amount) => {
    await call("POST", "/api/checkout", { token: user, body: { editionCode: "edicao-1" } });
    const order = store.db.orders.at(-1);
    return hook({ id: `evt_paid_${n}`, event: "CHECKOUT_PAID", checkout: { id: order.asaas_checkout_id, customer: `cus_${user}`, items: [{ value: (amount ?? order.amount_cents) / 100, quantity: 1 }] } });
  };
  return { store, asaas, calls, call, hook, pay };
}

test("cálculo de upgrade em centavos com crédito elegível", () => {
  const license = { status: "active", edition_id: "e1" };
  const paid = [{ status: "paid", amount_cents: 9790 }, { status: "pending", amount_cents: 5000 }, { status: "paid", amount_cents: 1000, refunded_at: "x" }];
  assert.equal(eligibleCredit(paid), 9790);
  assert.deepEqual(quote({ target: E2, license, editions: [E1, E2, E3], orders: paid }), { kind: "upgrade", listPrice: 14790, credit: 9790, amount: 5000 });
  assert.equal(quote({ target: E3, license, editions: [E1, E2, E3], orders: paid }).amount, 10000, "1 → 3 direto: R$ 100,00");
  assert.equal(quote({ target: E3, license: { status: "active", edition_id: "e2" }, editions: [E1, E2, E3], orders: [{ status: "paid", amount_cents: 9790 }, { status: "paid", amount_cents: 5000 }] }).amount, 5000);
  assert.equal(quote({ target: E1, license, editions: [E1], orders: paid }).error, "already_owned");
  assert.deepEqual(quote({ target: E1, license: null, editions: [E1], orders: [] }), { kind: "purchase", listPrice: 9790, credit: 0, amount: 9790 });
  assert.equal(quote({ target: { ...E2, price_cents: 9000 }, license, editions: [E1, E2], orders: paid }).amount, 0, "nunca negativo");
});

test("licença vitalícia não expira; disputa mantém acesso; estorno remove", () => {
  const editions = [E1, E2];
  const far = new Date("2090-01-01");
  assert.equal(entitlement({ license: { status: "active", edition_id: "e1" }, editions, now: far }).rank, 1);
  assert.equal(entitlement({ license: { status: "disputed", edition_id: "e2" }, editions }).rank, 2);
  assert.equal(entitlement({ license: { status: "refunded", edition_id: "e2" }, editions }).access, false);
  assert.equal(entitlement({ license: null, grants: [{ starts_at: "2020-01-01", edition_id: "e1" }], editions }).reason, "grant");
  assert.equal(canAccessResource(guide, 1), false);
  assert.equal(canAccessResource(tool, 0), true);
});

test("compra avulsa: Pix e cartão, DETACHED, preço do servidor, sem duplicar checkout", async () => {
  const ctx = setup();
  assert.equal((await ctx.call("POST", "/api/checkout", { body: { editionCode: "edicao-1" } })).status, 401);
  assert.equal((await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-2" } })).status, 404, "edição fora de venda");
  const first = await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-1", priceCents: 1 } });
  const second = await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-1" } });
  assert.equal(ctx.calls.length, 1);
  assert.equal(second.data.reused, true);
  assert.match(first.data.url, /^https:\/\/sandbox\.asaas\.com\/checkoutSession\/show\?id=chk_1$/);
  const body = ctx.calls[0];
  assert.deepEqual(body.chargeTypes, ["DETACHED"]);
  assert.deepEqual(body.billingTypes, ["PIX", "CREDIT_CARD"]);
  assert.equal(body.items[0].value, 97.9);
  assert.equal(body.externalReference, ctx.store.db.orders[0].id);
  assert.equal("subscription" in body, false);
});

test("retorno do navegador não libera; webhook inválido é rejeitado; CHECKOUT_PAID ativa uma vez", async () => {
  const ctx = setup();
  await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-1" } });
  assert.equal((await ctx.call("GET", "/api/account", { token: "tok-u1" })).data.access, false);
  assert.equal((await ctx.call("GET", "/api/library", { token: "tok-u1" })).status, 402);
  assert.equal((await ctx.hook({ id: "x", event: "CHECKOUT_PAID" }, "errado")).status, 401);
  const order = ctx.store.db.orders[0];
  const paid = { id: "evt_1", event: "CHECKOUT_PAID", checkout: { id: order.asaas_checkout_id, customer: "cus_1", items: [{ value: 97.9, quantity: 1 }] } };
  assert.equal((await ctx.hook(paid)).data.status, "processed");
  const replay = await ctx.hook(paid);
  assert.equal(replay.data.duplicate, true);
  assert.equal(ctx.store.db.licenses.length, 1);
  assert.equal(ctx.store.db.licenseEvents.length, 1);
  const account = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(account.access, true);
  assert.equal(account.edition.code, "edicao-1");
  assert.equal(account.license.status, "active");
  assert.equal((await ctx.call("GET", "/api/library", { token: "tok-u1" })).status, 200);
  assert.equal((await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-1" } })).status, 409, "não cobra de novo");
});

test("valor divergente não concede licença", async () => {
  const ctx = setup();
  const result = await ctx.pay("tok-u1", 1, 100);
  assert.equal(result.data.status, "failed");
  assert.equal(ctx.store.db.licenses.length, 0);
});

test("estorno recalcula; contestação mantém acesso até decisão auditada", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  await ctx.hook({ id: "cb", event: "PAYMENT_CHARGEBACK_REQUESTED", payment: { id: "pay_1", customer: "cus_tok-u1", value: 97.9, status: "CHARGEBACK_REQUESTED" } });
  let account = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(account.license.status, "disputed");
  assert.equal(account.access, true);
  assert.equal((await ctx.call("POST", "/api/admin/licenses/status", { token: "tok-adm", body: { userId: "u1", status: "revoked", reason: "curto" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/licenses/status", { token: "tok-adm", body: { userId: "u1", status: "active", reason: "Contestação encerrada a favor do vendedor" } })).status, 200);
  await ctx.hook({ id: "rf", event: "PAYMENT_REFUNDED", payment: { id: "pay_1", customer: "cus_tok-u1", value: 97.9, status: "REFUNDED" } });
  account = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(account.license.status, "refunded");
  assert.equal(account.access, false);
});

test("upgrade cobra a diferença e amplia direitos sem apagar os anteriores", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  ctx.store.db.editions.find((e) => e.code === "edicao-2").on_sale = true;
  const before = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(before.upgrade.amount, 5000);
  await ctx.call("POST", "/api/checkout", { token: "tok-u1", body: { editionCode: "edicao-2" } });
  const order = ctx.store.db.orders.at(-1);
  assert.equal(order.kind, "upgrade");
  assert.equal(order.amount_cents, 5000);
  assert.equal(order.credit_cents, 9790);
  await ctx.hook({ id: "evt_up", event: "CHECKOUT_PAID", checkout: { id: order.asaas_checkout_id, customer: "cus_tok-u1", items: [{ value: 50, quantity: 1 }] } });
  const after = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(after.edition.code, "edicao-2");
  assert.equal(after.orders.filter((o) => o.status === "paid").length, 2);
  const lib = (await ctx.call("GET", "/api/library", { token: "tok-u1" })).data;
  assert.ok(lib.resources.some((r) => r.id === "guia-subagente"), "Edição 2 libera o guia");
});

test("mudança de preço não altera pedidos e direitos já adquiridos", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  ctx.store.db.editions.find((e) => e.code === "edicao-1").price_cents = 12990;
  const account = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(account.orders[0].amountCents, 9790);
  assert.equal(account.access, true);
});

test("catálogo autorizado por edição: rascunho oculto, guia bloqueado na Edição 1, sem corpo no índice", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  const lib = (await ctx.call("GET", "/api/library", { token: "tok-u1" })).data;
  const ids = lib.resources.map((r) => r.id);
  assert.ok(ids.includes("repo-a::skills/landing/SKILL.md"));
  assert.ok(ids.includes("21st-dev"));
  assert.ok(!ids.includes("rascunho"));
  assert.ok(!ids.includes("guia-subagente"));
  assert.ok(lib.resources.every((r) => !("body_md" in r)));
  const locked = (await ctx.call("GET", "/api/resource?id=guia-subagente", { token: "tok-u1" })).data;
  assert.equal(locked.locked, true);
  assert.equal(locked.resource.body_md, undefined, "conteúdo protegido não vaza por URL direta");
  assert.equal((await ctx.call("GET", "/api/resource?id=rascunho", { token: "tok-u1" })).status, 404);
});

test("coleções: privadas, sem IDOR, link de visualização revogável que não libera conteúdo", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  await ctx.pay("tok-u2", 2);
  const { collection } = (await ctx.call("POST", "/api/collections", { token: "tok-u1", body: { name: "Sites" } })).data;
  await ctx.call("POST", "/api/collections/item", { token: "tok-u1", body: { id: collection.id, resourceId: "21st-dev" } });
  await ctx.call("POST", "/api/collections/item", { token: "tok-u1", body: { id: collection.id, resourceId: "repo-a::skills/landing/SKILL.md" } });
  assert.equal((await ctx.call("POST", "/api/collections/item", { token: "tok-u1", body: { id: collection.id, resourceId: "inexistente" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/collections/item", { token: "tok-u2", body: { id: collection.id, resourceId: "21st-dev" } })).status, 404, "outro usuário não altera");
  assert.equal((await ctx.call("POST", "/api/collections/delete", { token: "tok-u2", body: { id: collection.id } })).status, 404);
  await ctx.call("POST", "/api/collections/reorder", { token: "tok-u1", body: { id: collection.id, order: ["repo-a::skills/landing/SKILL.md", "21st-dev"] } });
  const mine = (await ctx.call("GET", "/api/me", { token: "tok-u1" })).data.collections[0];
  assert.deepEqual(mine.items, ["repo-a::skills/landing/SKILL.md", "21st-dev"]);
  assert.equal((await ctx.call("GET", "/api/me", { token: "tok-u2" })).data.collections.length, 0);
  const { shareToken } = (await ctx.call("POST", "/api/collections/share", { token: "tok-u1", body: { id: collection.id, enabled: true } })).data;
  assert.ok(shareToken.length >= 20);
  const shared = await ctx.call("GET", `/api/shared?token=${shareToken}`);
  assert.equal(shared.data.name, "Sites");
  assert.deepEqual(Object.keys(shared.data.items[0]).sort(), ["category", "id", "title", "type"]);
  assert.equal(JSON.stringify(shared.data).includes("a@x.com"), false);
  await ctx.call("POST", "/api/collections/share", { token: "tok-u1", body: { id: collection.id, enabled: false } });
  assert.equal((await ctx.call("GET", `/api/shared?token=${shareToken}`)).status, 404, "revogado");
});

test("favoritos e histórico sincronizam do navegador sem duplicar e ignoram IDs inválidos", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1", 1);
  const local = { favorites: ["21st-dev", "21st-dev", "nao-existe"], recent: [{ id: "repo-a::skills/landing/SKILL.md", visitedAt: "2026-10-01T00:00:00Z" }] };
  await ctx.call("POST", "/api/me/import", { token: "tok-u1", body: local });
  await ctx.call("POST", "/api/me/import", { token: "tok-u1", body: local });
  const state = (await ctx.call("GET", "/api/me", { token: "tok-u1" })).data;
  assert.deepEqual(state.favorites, ["21st-dev"]);
  assert.equal(state.recent.length, 1);
});

test("administração restrita e validada; caminhos exigem recursos reais e justificativa", async () => {
  const ctx = setup();
  assert.equal((await ctx.call("GET", "/api/admin/overview", { token: "tok-u1" })).status, 403);
  assert.equal((await ctx.call("POST", "/api/admin/resources", { token: "tok-adm", body: { id: "X Y", type: "tool", category: "software", title: "a" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/resources", { token: "tok-adm", body: { id: "ok-tool", type: "tool", category: "software", title: "Ferramenta", source_url: "javascript:alert(1)" } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/paths", { token: "tok-adm", body: { goal: "Criar site", steps: [{ resource_id: "nao-existe", reason: "x" }] } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/paths", { token: "tok-adm", body: { goal: "Criar site", steps: [{ resource_id: "21st-dev" }] } })).status, 400);
  assert.equal((await ctx.call("POST", "/api/admin/paths", { token: "tok-adm", body: { goal: "Criar site", keywords: "site", status: "published", steps: [{ resource_id: "21st-dev", reason: "Componentes prontos" }] } })).status, 200);
  assert.equal((await ctx.call("POST", "/api/admin/editions", { token: "tok-adm", body: { code: "edicao-1", priceCents: 9790, rank: 1, onSale: true } })).status, 200);
  assert.equal(ctx.store.db.audit.length, 2);
  assert.throws(() => validateResource({ id: "a1", type: "skill", category: "software", title: "x" }));
});

test("produção do Asaas exige duas chaves explícitas", () => {
  assert.equal(readConfig({ ASAAS_ENV: "production" }).asaas.env, "sandbox");
  assert.equal(readConfig({ ASAAS_ENV: "production", ASAAS_ALLOW_PRODUCTION: "true" }).asaas.baseUrl, "https://api.asaas.com/v3");
  assert.equal(readConfig({ BT_DEV_BYPASS: "1", VERCEL: "1" }).devBypass, false);
  // Retorno do checkout: o preview volta para si mesmo; produção usa APP_URL.
  assert.equal(readConfig({ APP_URL: "https://prod.example", VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "app-git-x.vercel.app" }).appUrl, "https://app-git-x.vercel.app");
  assert.equal(readConfig({ APP_URL: "https://prod.example/", VERCEL_ENV: "production", VERCEL_BRANCH_URL: "app-git-main.vercel.app" }).appUrl, "https://prod.example");
});

test("compra sem cadastro: só e-mail, retorno com chave e link de senha após o webhook", async () => {
  const ctx = setup();
  const bad = await ctx.call("POST", "/api/checkout/guest", { body: { email: "x", editionCode: "edicao-1" } });
  assert.equal(bad.status, 400);
  const started = await ctx.call("POST", "/api/checkout/guest", { body: { email: " Nova@Exemplo.com ", editionCode: "edicao-1" } });
  assert.equal(started.status, 200);
  const { order, key } = started.data;
  assert.ok(order && key);
  assert.ok(ctx.calls.at(-1).callback.successUrl.includes(`pedido=${order}&chave=${key}`));
  assert.equal(ctx.store.db.profiles.at(-1).email, "nova@exemplo.com");
  const again = await ctx.call("POST", "/api/checkout/guest", { body: { email: "nova@exemplo.com", editionCode: "edicao-1" } });
  assert.equal(again.data.order, order, "mesmo pedido em aberto é reaproveitado");

  assert.equal((await ctx.call("POST", "/api/checkout/claim", { body: { order, key: "x".repeat(32) } })).status, 403);
  assert.deepEqual((await ctx.call("POST", "/api/checkout/claim", { body: { order, key } })).data, { status: "pending" });

  const row = ctx.store.db.orders.find((item) => item.id === order);
  await ctx.hook({ id: "evt_guest", event: "CHECKOUT_PAID", checkout: { id: row.asaas_checkout_id, customer: "cus_guest", items: [{ value: 97.9, quantity: 1 }] } });
  const claimed = await ctx.call("POST", "/api/checkout/claim", { body: { order, key } });
  assert.equal(claimed.data.status, "paid");
  assert.ok(claimed.data.url.includes("/criar-senha"));

  ctx.store.db.profiles.find((item) => item.email === "nova@exemplo.com").last_sign_in_at = "2026-10-22T00:00:00Z";
  assert.deepEqual((await ctx.call("POST", "/api/checkout/claim", { body: { order, key } })).data, { status: "paid", login: true });
});

test("compra direta: nome e CPF geram o QR do Pix na página e o retorno confirma no Asaas", async () => {
  const ctx = setup();
  const remote = [];
  Object.assign(ctx.asaas, {
    createCustomer: async (body) => { ctx.calls.push(body); return { id: "cus_pix" }; },
    createPayment: async (body) => { ctx.calls.push(body); return { id: "pay_1", status: "PENDING", billingType: "UNDEFINED", invoiceUrl: "https://www.asaas.com/i/abc" }; },
    pixQrCode: async () => ({ encodedImage: "iVBOR", payload: "000201pix" }),
    listCustomerPayments: async () => ({ data: remote }),
  });
  const input = { email: "pix@exemplo.com", editionCode: "edicao-1", name: "Ana Souza", document: "529.982.247-25" };
  assert.equal((await ctx.call("POST", "/api/checkout/guest", { body: { ...input, document: "111.111.111-11" } })).data.error, "invalid_document");
  const started = await ctx.call("POST", "/api/checkout/guest", { body: input });
  assert.equal(started.status, 200);
  assert.deepEqual(started.data.pix, { image: "iVBOR", payload: "000201pix" });
  assert.equal(started.data.url, "https://www.asaas.com/i/abc");
  assert.equal(ctx.calls.find((c) => c.cpfCnpj).cpfCnpj, "52998224725");
  assert.equal(ctx.calls.at(-1).externalReference, started.data.order);
  const again = await ctx.call("POST", "/api/checkout/guest", { body: input });
  assert.equal(again.data.order, started.data.order, "reabrir a página mostra o mesmo QR");
  assert.equal(again.data.pix.payload, "000201pix");

  const claim = { order: started.data.order, key: started.data.key };
  assert.equal((await ctx.call("POST", "/api/checkout/claim", { body: claim })).data.status, "pending");
  remote.push({ id: "pay_1", status: "RECEIVED", value: 97.9, externalReference: started.data.order });
  const paid = await ctx.call("POST", "/api/checkout/claim", { body: claim });
  assert.equal(paid.data.status, "paid");
  assert.ok(ctx.store.db.licenses.some((l) => l.status === "active"));
});

test("garantia: reembolso automático encerra o acesso; recusa do Asaas vira pedido para o admin", async () => {
  const ctx = setup();
  await ctx.pay("tok-u1");
  const order = ctx.store.db.orders.at(-1);
  const refunds = [];
  Object.assign(ctx.asaas, {
    listCustomerPayments: async () => ({ data: [{ id: "pay_c", status: "RECEIVED", value: 97.9 }] }),
    refundPayment: async (id, body) => { if (refunds.fail) throw Object.assign(new Error("Saldo insuficiente"), { status: 502 }); refunds.push(id); return {}; },
  });
  assert.equal((await ctx.call("GET", "/api/account", { token: "tok-u1" })).data.refund.orderId, order.id);

  refunds.fail = true;
  const pending = await ctx.call("POST", "/api/account/refund", { token: "tok-u1", body: { reason: "não usei" } });
  assert.deepEqual(pending.data, { refunded: false, requested: true });
  assert.equal((await ctx.call("GET", "/api/account", { token: "tok-u1" })).data.refund.requested, true);
  assert.equal((await ctx.call("GET", "/api/account", { token: "tok-u1" })).data.access, true, "acesso segue até o estorno sair");

  refunds.fail = false;
  assert.equal((await ctx.call("POST", "/api/admin/orders/refund", { token: "tok-adm", body: { orderId: order.id } })).data.refunded, true);
  assert.deepEqual([...refunds], ["pay_c"]);
  const after = (await ctx.call("GET", "/api/account", { token: "tok-u1" })).data;
  assert.equal(after.access, false);
  assert.equal(after.refund, null);
  assert.equal((await ctx.call("POST", "/api/account/refund", { token: "tok-u1", body: {} })).status, 422);
});

test("compra sem cadastro recusa e-mail de conta já usada", async () => {
  const ctx = setup();
  ctx.store.db.profiles.find((item) => item.id === "u1").last_sign_in_at = "2026-10-01T00:00:00Z";
  const response = await ctx.call("POST", "/api/checkout/guest", { body: { email: "a@x.com", editionCode: "edicao-1" } });
  assert.equal(response.status, 409);
  assert.equal(response.data.error, "account_exists");
});
