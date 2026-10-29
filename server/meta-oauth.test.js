import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./store-memory.js";
import { createMetaOAuth, decryptMetaToken, encryptMetaToken, REQUIRED_SCOPES } from "./meta-oauth.js";

const fixedNow = new Date("2026-10-26T15:00:00.000Z");
const config = {
  appUrl: "https://skills.example", graphVersion: "v24.0", adsAccountId: "3796660790508267",
  adsToken: "legacy-token", oauthAppId: "123456", oauthAppSecret: "app-secret",
  oauthEncryptionKey: "uma-chave-local-de-teste-com-mais-de-32-caracteres",
};

test("cifra o token da Meta com autenticidade e não preserva o texto original", () => {
  const encrypted = encryptMetaToken("token-muito-secreto", config.oauthEncryptionKey);
  assert.match(encrypted, /^v1\./);
  assert.doesNotMatch(encrypted, /token-muito-secreto/);
  assert.equal(decryptMetaToken(encrypted, config.oauthEncryptionKey), "token-muito-secreto");
  assert.throws(() => decryptMetaToken(`${encrypted}x`, config.oauthEncryptionKey));
});

test("conecta a Meta, exige todas as permissões e usa o token cifrado", async () => {
  const store = createMemoryStore();
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url); calls.push(parsed);
    const body = new URLSearchParams(options.body || "");
    if (parsed.pathname.endsWith("/oauth/access_token") && body.get("code")) return Response.json({ access_token: "short-token" });
    if (parsed.pathname.endsWith("/oauth/access_token") && body.get("grant_type")) return Response.json({ access_token: "long-token", expires_in: 5_184_000 });
    if (parsed.pathname.endsWith("/me/permissions")) return Response.json({ data: REQUIRED_SCOPES.map((permission) => ({ permission, status: "granted" })) });
    if (parsed.pathname.endsWith(`/act_${config.adsAccountId}`)) return Response.json({ id: `act_${config.adsAccountId}`, name: "Voxelia", account_status: 1 });
    if (parsed.pathname.endsWith("/me/accounts")) return Response.json({ data: [{ id: "page-1", instagram_business_account: { id: "ig-1", username: "voxelia.ia" } }] });
    return Response.json({ error: { message: "rota inesperada" } }, { status: 404 });
  };
  const oauth = createMetaOAuth({ store, config, fetchImpl, now: () => fixedNow });
  const start = await oauth.start("admin-1");
  const authUrl = new URL(start.url);
  assert.equal(authUrl.searchParams.get("client_id"), config.oauthAppId);
  assert.deepEqual(authUrl.searchParams.get("scope").split(",").sort(), [...REQUIRED_SCOPES].sort());
  const result = await oauth.finish("admin-1", "authorization-code", authUrl.searchParams.get("state"));
  assert.equal(result.connected, true);
  assert.equal(result.accountName, "Voxelia");
  const saved = store.db.dashboardConnections[0];
  assert.doesNotMatch(saved.token_ciphertext, /long-token/);
  assert.equal(saved.instagram_user_id, "ig-1");
  assert.equal((await oauth.adsConfig()).instagramUserId, "ig-1");
  assert.equal((await oauth.adsConfig()).adsToken, "long-token");
  assert.equal((await oauth.status()).connected, true);
  assert.equal(JSON.stringify(await oauth.status()).includes("long-token"), false);
  assert.equal(calls.some((url) => url.searchParams.has("client_secret")), false);
});

test("rejeita retorno adulterado ou sem permissões antes de salvar", async () => {
  const store = createMemoryStore();
  const missingPermissionFetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const body = new URLSearchParams(options.body || "");
    if (parsed.pathname.endsWith("/oauth/access_token") && body.get("code")) return Response.json({ access_token: "short" });
    if (parsed.pathname.endsWith("/oauth/access_token")) return Response.json({ access_token: "long", expires_in: 1000 });
    if (parsed.pathname.endsWith("/me/permissions")) return Response.json({ data: [{ permission: "ads_read", status: "granted" }] });
    return Response.json({ id: "act_1", account_status: 1 });
  };
  const oauth = createMetaOAuth({ store, config, fetchImpl: missingPermissionFetch, now: () => fixedNow });
  const start = await oauth.start("admin-1"); const state = new URL(start.url).searchParams.get("state");
  await assert.rejects(() => oauth.finish("admin-2", "code", state), { code: "invalid_meta_state" });
  await assert.rejects(() => oauth.finish("admin-1", "code", state), { code: "meta_permissions_missing" });
  assert.equal(store.db.dashboardConnections.length, 0);
});

test("sem credenciais mantém o token manual como fallback e informa configuração pendente", async () => {
  const store = createMemoryStore();
  const oauth = createMetaOAuth({ store, config: { ...config, oauthAppSecret: "" }, now: () => fixedNow });
  assert.equal((await oauth.status()).configured, false);
  assert.equal((await oauth.adsConfig()).adsToken, "legacy-token");
  await assert.rejects(() => oauth.start("admin-1"), { code: "meta_oauth_not_configured" });
});
