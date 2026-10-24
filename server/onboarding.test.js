import test from "node:test";
import assert from "node:assert/strict";
import { createOnboarding } from "./onboarding.js";
import { welcomeEmail } from "./email.js";
import { createApi } from "./routes.js";
import { createMemoryStore } from "./store-memory.js";

const config = { appUrl: "https://arsenal.example" };
const fakeMailer = () => { const sent = []; return { sent, send: async (message) => { sent.push(message); } }; };
const seed = () => createMemoryStore({ profiles: [{ id: "adm", email: "adm@x.com", is_admin: true, last_sign_in_at: "2026-10-01" }, { id: "u1", email: "ja@x.com", last_sign_in_at: "2026-10-01" }] });

test("convite cria a conta, libera todas as edições, audita e envia o link de criar senha", async () => {
  const store = seed();
  const mailer = fakeMailer();
  const result = await createOnboarding({ store, mailer, config }).inviteUser({ email: " Novo@X.com ", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  assert.equal(result.created, true);
  assert.equal(result.sent, true);
  assert.equal(result.link, null, "o link não volta para o admin quando o e-mail saiu");
  const profile = await store.findProfileByEmail("novo@x.com");
  assert.ok(profile);
  const [grant] = await store.listGrants(profile.id);
  assert.equal(grant.edition_id, null);
  assert.equal(grant.ends_at, null);
  assert.equal(mailer.sent.length, 1);
  assert.equal(mailer.sent[0].to, "novo@x.com");
  assert.match(mailer.sent[0].html, /Criar minha senha e entrar/);
  assert.match(mailer.sent[0].html, /https:\/\/arsenal\.example\/criar-senha\?token_hash=local-/);
  assert.match(mailer.sent[0].html, /type=invite/, "convite verificado só quando a pessoa envia a senha");
  assert.match(mailer.sent[0].html, /personagens\.png/);
  assert.ok(!/senha:\s*\S/i.test(mailer.sent[0].text), "nenhuma senha vai no e-mail");
  const actions = (await store.listAudit()).map((row) => row.action);
  assert.ok(actions.includes("invite_user") && actions.includes("welcome_email"));
});

test("sem envio configurado, o admin recebe o link para enviar por outro canal", async () => {
  const store = seed();
  const result = await createOnboarding({ store, mailer: null, config }).inviteUser({ email: "sem@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  assert.equal(result.sent, false);
  assert.match(result.link, /criar-senha/);
});

test("conta existente com acesso ativo não ganha concessão duplicada", async () => {
  const store = seed();
  const onboarding = createOnboarding({ store, mailer: fakeMailer(), config });
  await onboarding.inviteUser({ email: "ja@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  const again = await onboarding.inviteUser({ email: "ja@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  assert.equal(again.created, false);
  assert.equal(again.alreadyHadAccess, true);
  assert.equal((await store.listGrants("u1")).length, 1);
});

test("convite valida e-mail e justificativa", async () => {
  const onboarding = createOnboarding({ store: seed(), mailer: null, config });
  await assert.rejects(onboarding.inviteUser({ email: "invalido", reason: "Cortesia autorizada", actorId: "adm" }), /e-mail válido/);
  await assert.rejects(onboarding.inviteUser({ email: "a@b.com", reason: "curta", actorId: "adm" }), /justificativa/);
});

test("boas-vindas da compra saem uma única vez por pessoa", async () => {
  const store = seed();
  const mailer = fakeMailer();
  const onboarding = createOnboarding({ store, mailer, config });
  await onboarding.welcomeBuyer("u1", { name: "Voxelia — Edição 1" });
  await onboarding.welcomeBuyer("u1", { name: "Voxelia — Edição 1" });
  assert.equal(mailer.sent.length, 1);
  assert.match(mailer.sent[0].html, /Entrar na Voxelia/);
});

test("o e-mail escapa dados da pessoa", () => {
  const { html } = welcomeEmail({ kind: "grant", email: "<script>@x.com", appUrl: "https://arsenal.example" });
  assert.ok(!html.includes("<script>@"));
  assert.ok(html.includes("&lt;script&gt;@x.com"));
});

test("rota de convite exige administrador", async () => {
  const store = seed();
  const users = { adm: { id: "adm", email: "adm@x.com" }, u1: { id: "u1", email: "ja@x.com" } };
  const api = createApi({ store, commerce: {}, onboarding: createOnboarding({ store, mailer: null, config }), library: {}, me: {}, verifyToken: async (token) => users[token] || null });
  const call = (token) => api(new Request("https://arsenal.example/api/admin/invite", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ email: "c@x.com", reason: "Cortesia autorizada pelo dono" }) }));
  assert.equal((await call("u1")).status, 403);
  const ok = await call("adm");
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).created, true);
});

test("reconvidar quem nunca entrou manda um link novo de criar senha", async () => {
  const store = seed();
  const mailer = fakeMailer();
  const onboarding = createOnboarding({ store, mailer, config });
  await onboarding.inviteUser({ email: "novo@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  const again = await onboarding.inviteUser({ email: "novo@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  assert.equal(again.created, false);
  assert.match(mailer.sent[1].html, /Criar minha senha e entrar/);
  assert.match(mailer.sent[1].html, /criar-senha\?token_hash=local-[^"]*type=recovery/);
});

test("quem já usa a conta recebe só o botão de entrar", async () => {
  const store = seed();
  const mailer = fakeMailer();
  await createOnboarding({ store, mailer, config }).inviteUser({ email: "ja@x.com", reason: "Cortesia autorizada pelo dono", actorId: "adm" });
  assert.match(mailer.sent[0].html, /Entrar na Voxelia/);
  assert.ok(!/criar-senha/.test(mailer.sent[0].html));
});
