// Rotas HTTP (assinatura Web: Request → Response), compartilhadas pelas Vercel Functions,
// pelo servidor de desenvolvimento e pelos testes.
import { publicPlan } from "./billing.js";
import { hasAccess } from "./access.js";

const noStore = { "Cache-Control": "private, no-store", "Content-Type": "application/json; charset=utf-8" };
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...noStore, ...headers } });
const fail = (error) => {
  const status = error.status || 500;
  if (status >= 500 && error.code !== "not_configured") console.error("[api]", error);
  return json(status, { error: error.code || "internal_error", message: status >= 500 && !error.code ? "Erro interno." : error.message });
};

export function createApi({ store, billing, verifyToken, loadCatalog, devUser = null }) {
  async function requireUser(request) {
    if (devUser) return devUser;
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = token ? await verifyToken(token) : null;
    if (!user) throw Object.assign(new Error("Faça login para continuar."), { status: 401, code: "unauthenticated" });
    return user;
  }
  async function requireAccess(request) {
    const user = await requireUser(request);
    if (devUser) return user;
    const [subscription, grants] = await Promise.all([store.getSubscriptionByUser(user.id), store.listGrants(user.id)]);
    if (!hasAccess({ subscription, grants, now: new Date() }).access) throw Object.assign(new Error("Assinatura sem acesso ativo."), { status: 402, code: "no_access" });
    return user;
  }
  async function requireAdmin(request) {
    const user = await requireUser(request);
    const profile = await store.getProfile(user.id);
    if (!profile?.is_admin) throw Object.assign(new Error("Acesso restrito à administração."), { status: 403, code: "forbidden" });
    return user;
  }
  const body = async (request) => { try { return await request.json(); } catch { return {}; } };

  const routes = {
    "GET /api/billing/plans": async () => json(200, { plans: (await store.listPlans({ activeOnly: true })).map(publicPlan) }, { "Cache-Control": "public, max-age=60" }),
    "GET /api/billing/subscription": async (request) => {
      const user = await requireUser(request);
      if (new URL(request.url).searchParams.get("refresh") === "1") await billing.reconcileUser(user.id).catch(() => null);
      return json(200, devUser ? { email: user.email, access: true, accessReason: "dev", isAdmin: false, subscription: null, plan: null } : await billing.accountState(user));
    },
    "POST /api/billing/checkout": async (request) => json(200, await billing.startCheckout(await requireUser(request), (await body(request)).planCode)),
    "POST /api/billing/cancel": async (request) => json(200, await billing.cancel(await requireUser(request))),
    "POST /api/webhooks/asaas": async (request) => {
      const payload = await body(request);
      const result = await billing.receiveWebhook(request.headers.get("asaas-access-token"), payload);
      return json(200, { received: true, ...result });
    },
    // Catálogo completo: somente para quem tem acesso válido, sem cache público.
    "GET /api/catalog": async (request) => { await requireAccess(request); return json(200, await loadCatalog()); },

    "GET /api/admin/overview": async (request) => {
      await requireAdmin(request);
      const [profiles, subscriptions, events, payments, grants, plans, audit] = await Promise.all([
        store.listProfiles(), store.listSubscriptions(), store.listEvents({ limit: 100 }), store.listPayments(), store.listGrants(), store.listPlans({ activeOnly: false }), store.listAudit({ limit: 50 }),
      ]);
      return json(200, { profiles, subscriptions, events: events.map(({ payload, ...event }) => ({ ...event, summary: summarize(payload) })), payments, grants, plans, audit });
    },
    "POST /api/admin/plans": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const plan = validatePlan(input);
      const saved = await store.upsertPlan(plan);
      await store.insertAudit({ actor_id: admin.id, action: "upsert_plan", details: { code: plan.code, price_cents: plan.price_cents, active: plan.active } });
      return json(200, { plan: saved });
    },
    "POST /api/admin/events/reprocess": async (request) => {
      const admin = await requireAdmin(request);
      const event = await store.getEvent(String((await body(request)).id || ""));
      if (!event) return json(404, { error: "not_found", message: "Evento não encontrado." });
      if (event.status === "processed") return json(409, { error: "already_processed", message: "Evento já processado; não será aplicado de novo." });
      const result = await billing.processEvent(event);
      await store.insertAudit({ actor_id: admin.id, action: "reprocess_event", details: { event_id: event.id, result: result.status } });
      return json(200, result);
    },
    "POST /api/admin/reconcile": async (request) => {
      const admin = await requireAdmin(request);
      return json(200, await billing.reconcileUser(String((await body(request)).userId || ""), admin.id));
    },
    "POST /api/admin/grants": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const reason = String(input.reason || "").trim();
      if (!input.userId || reason.length < 10) return json(400, { error: "invalid_grant", message: "Informe o usuário e uma justificativa com pelo menos 10 caracteres." });
      const endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && Number.isNaN(endsAt.getTime())) return json(400, { error: "invalid_date", message: "Data final inválida." });
      const grant = await store.insertGrant({ user_id: input.userId, reason, granted_by: admin.id, starts_at: new Date().toISOString(), ends_at: endsAt?.toISOString() || null });
      await store.insertAudit({ actor_id: admin.id, action: "grant_access", target_user_id: input.userId, details: { grant_id: grant.id, reason, ends_at: grant.ends_at } });
      return json(200, { grant });
    },
    "POST /api/admin/grants/revoke": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const grant = await store.revokeGrant(String(input.id || ""), new Date().toISOString());
      if (!grant) return json(404, { error: "not_found", message: "Concessão não encontrada." });
      await store.insertAudit({ actor_id: admin.id, action: "revoke_grant", target_user_id: grant.user_id, details: { grant_id: grant.id } });
      return json(200, { grant });
    },
  };

  return async function handle(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    const route = routes[`${request.method} ${path}`];
    if (!route) return json(404, { error: "not_found", message: "Rota inexistente." });
    try { return await route(request); } catch (error) { return fail(error); }
  };
}

function validatePlan(input) {
  const code = String(input.code || "").trim().toLowerCase();
  const price = Number(input.priceCents);
  if (!/^[a-z0-9-]{2,40}$/.test(code)) throw Object.assign(new Error("Código do plano inválido (use letras minúsculas, números e hífen)."), { status: 400, code: "invalid_plan" });
  if (!Number.isInteger(price) || price < 500) throw Object.assign(new Error("Preço em centavos inválido (mínimo R$ 5,00)."), { status: 400, code: "invalid_plan" });
  if (!["MONTHLY", "YEARLY"].includes(input.cycle)) throw Object.assign(new Error("Periodicidade inválida."), { status: 400, code: "invalid_plan" });
  return {
    code, name: String(input.name || "").trim().slice(0, 80) || code, description: String(input.description || "").trim().slice(0, 400),
    price_cents: price, currency: "BRL", cycle: input.cycle,
    features: (Array.isArray(input.features) ? input.features : String(input.features || "").split("\n")).map((item) => String(item).trim()).filter(Boolean).slice(0, 12),
    rules: String(input.rules || "").trim().slice(0, 800), active: Boolean(input.active), sort: Number.isInteger(input.sort) ? input.sort : 0,
  };
}

function summarize(payload = {}) {
  return {
    payment: payload.payment ? { id: payload.payment.id, status: payload.payment.status, value: payload.payment.value, subscription: payload.payment.subscription } : null,
    subscription: payload.subscription ? { id: payload.subscription.id, status: payload.subscription.status } : null,
    checkout: payload.checkout ? { id: payload.checkout.id, status: payload.checkout.status } : null,
  };
}
