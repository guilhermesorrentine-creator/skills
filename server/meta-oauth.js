import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const REQUIRED_SCOPES = ["ads_read", "instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement", "business_management"];
const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
const encode = (value) => Buffer.from(value).toString("base64url");
const decode = (value) => Buffer.from(value, "base64url").toString("utf8");
const keyFor = (secret) => createHash("sha256").update(secret).digest();

function signState(payload, secret) {
  const body = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readState(state, secret, userId, now) {
  const [body, signature, extra] = String(state || "").split(".");
  if (!body || !signature || extra) throw httpError(400, "invalid_meta_state", "A autorização da Meta é inválida. Tente conectar novamente.");
  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw httpError(400, "invalid_meta_state", "A autorização da Meta é inválida. Tente conectar novamente.");
  let payload;
  try { payload = JSON.parse(decode(body)); } catch { throw httpError(400, "invalid_meta_state", "A autorização da Meta é inválida. Tente conectar novamente."); }
  if (payload.user !== userId || !Number.isFinite(payload.expires)) throw httpError(400, "invalid_meta_state", "A autorização da Meta é inválida. Tente conectar novamente.");
  if (payload.expires < now().getTime()) throw httpError(400, "expired_meta_state", "A autorização da Meta expirou. Tente conectar novamente.");
  return payload;
}

export function encryptMetaToken(token, secret) {
  if (!token || !secret) throw new Error("Token e chave de criptografia são obrigatórios.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptMetaToken(envelope, secret) {
  const [version, iv, tag, encrypted, extra] = String(envelope || "").split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra || !secret) throw new Error("Token da Meta armazenado em formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

async function graph(fetchImpl, version, path, token, fields = "") {
  const params = new URLSearchParams();
  if (fields) params.set("fields", fields);
  const query = params.size ? `?${params}` : "";
  const response = await fetchImpl(`https://graph.facebook.com/${version}/${path}${query}`, { headers: { authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw httpError(502, "meta_oauth_failed", data.error?.message || `Meta respondeu ${response.status}.`);
  return data;
}

export function createMetaOAuth({ store, config, fetchImpl = fetch, now = () => new Date() }) {
  const redirectUri = `${config.appUrl}/admin/painel`;
  const ready = () => Boolean(config.oauthAppId && config.oauthAppSecret && config.oauthEncryptionKey && /^\d+$/.test(config.adsAccountId || ""));
  const requireConfig = () => { if (!ready()) throw httpError(503, "meta_oauth_not_configured", "Conexão oficial da Meta ainda não configurada no servidor."); };

  async function status() {
    const connection = await store.getDashboardConnection?.("meta");
    const expired = connection?.token_expires_at ? new Date(connection.token_expires_at) <= now() : false;
    return {
      configured: ready(), connected: Boolean(connection?.token_ciphertext) && !expired, expired,
      accountId: connection?.external_account_id || config.adsAccountId || null,
      accountName: connection?.display_name || null, connectedAt: connection?.connected_at || null,
      instagramUsername: connection?.instagram_username || null,
      expiresAt: connection?.token_expires_at || null, scopes: connection?.scopes || [],
    };
  }

  async function start(userId) {
    requireConfig();
    const state = signState({ user: userId, expires: now().getTime() + 10 * 60_000, nonce: randomBytes(16).toString("hex") }, config.oauthEncryptionKey);
    const params = new URLSearchParams({ client_id: config.oauthAppId, redirect_uri: redirectUri, response_type: "code", state,
      scope: REQUIRED_SCOPES.join(","), auth_type: "rerequest" });
    return { url: `https://www.facebook.com/${config.graphVersion}/dialog/oauth?${params}` };
  }

  async function finish(userId, code, state) {
    requireConfig();
    readState(state, config.oauthEncryptionKey, userId, now);
    if (!code || String(code).length > 2000) throw httpError(400, "invalid_meta_code", "A Meta não devolveu um código de autorização válido.");
    const shortParams = new URLSearchParams({ client_id: config.oauthAppId, client_secret: config.oauthAppSecret, redirect_uri: redirectUri, code: String(code) });
    const shortResponse = await fetchImpl(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`, { method: "POST", body: shortParams });
    const shortData = await shortResponse.json();
    if (!shortResponse.ok || !shortData.access_token) throw httpError(502, "meta_oauth_failed", shortData.error?.message || "A Meta recusou a autorização.");
    const longParams = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: config.oauthAppId, client_secret: config.oauthAppSecret, fb_exchange_token: shortData.access_token });
    const longResponse = await fetchImpl(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`, { method: "POST", body: longParams });
    const longData = await longResponse.json();
    if (!longResponse.ok || !longData.access_token) throw httpError(502, "meta_oauth_failed", longData.error?.message || "Não foi possível prolongar a autorização da Meta.");

    const permissions = await graph(fetchImpl, config.graphVersion, "me/permissions", longData.access_token);
    const granted = (permissions.data || []).filter((item) => item.status === "granted").map((item) => item.permission);
    const missing = REQUIRED_SCOPES.filter((scope) => !granted.includes(scope));
    if (missing.length) throw httpError(400, "meta_permissions_missing", `A Meta não autorizou: ${missing.join(", ")}.`);
    const account = await graph(fetchImpl, config.graphVersion, `act_${config.adsAccountId}`, longData.access_token, "id,name,account_status");
    if (Number(account.account_status) !== 1) throw httpError(400, "meta_account_inactive", "A conta de anúncios selecionada não está ativa.");
    const pages = await graph(fetchImpl, config.graphVersion, "me/accounts", longData.access_token, "id,name,instagram_business_account{id,username}");
    const instagramAccounts = (pages.data || []).map((page) => page.instagram_business_account).filter(Boolean);
    const instagram = instagramAccounts.find((item) => String(item.id) === String(config.instagramUserId || "")) || instagramAccounts[0];
    if (!instagram?.id) throw httpError(400, "meta_instagram_not_found", "Nenhuma conta profissional do Instagram vinculada foi encontrada.");
    const connectedAt = now().toISOString();
    const expiresAt = Number(longData.expires_in) > 0 ? new Date(now().getTime() + Number(longData.expires_in) * 1000).toISOString() : null;
    await store.saveDashboardConnection({ provider: "meta", token_ciphertext: encryptMetaToken(longData.access_token, config.oauthEncryptionKey),
      external_account_id: config.adsAccountId, display_name: account.name || "Meta Ads", scopes: granted, token_expires_at: expiresAt,
      instagram_user_id: String(instagram.id), instagram_username: instagram.username || null,
      connected_by: userId, connected_at: connectedAt });
    return { connected: true, accountId: config.adsAccountId, accountName: account.name || "Meta Ads", instagramUsername: instagram.username || null, connectedAt, expiresAt, scopes: granted };
  }

  async function adsConfig() {
    const connection = await store.getDashboardConnection?.("meta");
    const usable = connection?.token_ciphertext && (!connection.token_expires_at || new Date(connection.token_expires_at) > now());
    if (!usable) return config;
    try { return { ...config, adsToken: decryptMetaToken(connection.token_ciphertext, config.oauthEncryptionKey), instagramToken: decryptMetaToken(connection.token_ciphertext, config.oauthEncryptionKey), instagramUserId: connection.instagram_user_id || config.instagramUserId }; }
    catch { return config; }
  }

  return { status, start, finish, adsConfig };
}

export { REQUIRED_SCOPES };
