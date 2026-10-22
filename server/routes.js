// Rotas HTTP (assinatura Web: Request → Response), compartilhadas pela Vercel Function, pelo
// servidor de desenvolvimento e pelos testes. Autorização sempre decidida aqui, no servidor.
import { publicEdition } from "./commerce.js";
import { validateResource } from "./library.js";
import { readTracking } from "./meta.js";

const noStore = { "Cache-Control": "private, no-store", "Content-Type": "application/json; charset=utf-8" };
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...noStore, ...headers } });
const fail = (error) => {
  const status = error.status || 500;
  if (status >= 500 && error.code !== "not_configured") console.error("[api]", error);
  return json(status, { error: error.code || "internal_error", message: status >= 500 && !error.code ? "Erro interno." : error.message });
};
const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });

export function createApi({ store, commerce, onboarding = null, library, me, verifyToken, devUser = null }) {
  async function requireUser(request) {
    if (devUser) return devUser;
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const user = token ? await verifyToken(token) : null;
    if (!user) throw httpError(401, "unauthenticated", "Faça login para continuar.");
    return user;
  }
  const rankOf = async (user) => (devUser ? 99 : (await commerce.userEntitlement(user.id)).rank);
  async function requireAccess(request) {
    const user = await requireUser(request);
    const rank = await rankOf(user);
    if (rank < 1) throw httpError(402, "no_license", "Sua conta ainda não tem uma licença ativa.");
    return { user, rank };
  }
  async function requireAdmin(request) {
    const user = await requireUser(request);
    const profile = await store.getProfile(user.id);
    if (!profile?.is_admin) throw httpError(403, "forbidden", "Acesso restrito à administração.");
    return user;
  }
  const body = async (request) => { try { return await request.json(); } catch { return {}; } };
  const param = (request, name) => new URL(request.url).searchParams.get(name);
  const ok = (data = { ok: true }) => json(200, data);

  const routes = {
    // Público
    "GET /api/editions": async () => json(200, { editions: (await store.listEditions({ onSaleOnly: true })).map(publicEdition) }, { "Cache-Control": "public, max-age=60" }),
    "GET /api/stats": async () => json(200, await library.stats(), { "Cache-Control": "public, max-age=300" }),
    "GET /api/shared": async (request) => json(200, await me.shared(param(request, "token")), { "X-Robots-Tag": "noindex, nofollow" }),
    "POST /api/webhooks/asaas": async (request) => ok({ received: true, ...(await commerce.receiveWebhook(request.headers.get("asaas-access-token"), await body(request))) }),

    // Conta e compra
    "GET /api/account": async (request) => {
      const user = await requireUser(request);
      if (devUser) return ok({ email: user.email, access: true, accessReason: "dev", rank: 99, isAdmin: false, edition: null, license: null, orders: [], history: [] });
      return ok(await commerce.accountState(user));
    },
    "POST /api/checkout": async (request) => { const input = await body(request); return ok(await commerce.startCheckout(await requireUser(request), input.editionCode, readTracking(input.tracking, request))); },
    // Compra sem cadastro (só e-mail) e retorno com link para criar a senha.
    "POST /api/checkout/guest": async (request) => { const input = await body(request); return ok(await commerce.guestCheckout(input.email, input.editionCode, readTracking(input.tracking, request), input.name || input.document ? { name: input.name, document: input.document } : null)); },
    "POST /api/account/refund": async (request) => ok(await commerce.requestRefund(await requireUser(request), (await body(request)).reason)),
    "POST /api/checkout/claim": async (request) => { const input = await body(request); return ok(await commerce.claimAccess(input.order, input.key)); },

    // Catálogo autorizado: índice para a busca local e detalhe de um recurso
    "GET /api/library": async (request) => { const { rank } = await requireAccess(request); return ok(await library.libraryFor(rank)); },
    "GET /api/resource": async (request) => {
      const user = await requireUser(request);
      const found = await library.resourceFor(String(param(request, "id") || ""), await rankOf(user));
      if (!found) throw httpError(404, "not_found", "Recurso não encontrado.");
      return ok(found);
    },

    // Dados pessoais
    "GET /api/me": async (request) => ok(await me.state((await requireAccess(request)).user.id)),
    "POST /api/me/favorite": async (request) => { const { user } = await requireAccess(request); const input = await body(request); await me.toggleFavorite(user.id, input.id, Boolean(input.on)); return ok(); },
    "POST /api/me/visit": async (request) => { const { user } = await requireAccess(request); await me.visit(user.id, (await body(request)).id); return ok(); },
    "POST /api/me/recent/clear": async (request) => { await me.clearRecent((await requireAccess(request)).user.id); return ok(); },
    "POST /api/me/import": async (request) => { const { user } = await requireAccess(request); return ok(await me.importLocal(user.id, await body(request))); },
    "POST /api/collections": async (request) => { const { user } = await requireAccess(request); return ok({ collection: await me.createCollection(user.id, await body(request)) }); },
    "POST /api/collections/update": async (request) => { const { user } = await requireAccess(request); const input = await body(request); await me.updateCollection(user.id, input.id, input); return ok(); },
    "POST /api/collections/delete": async (request) => { const { user } = await requireAccess(request); await me.deleteCollection(user.id, (await body(request)).id); return ok(); },
    "POST /api/collections/item": async (request) => {
      const { user } = await requireAccess(request); const input = await body(request);
      if (input.action === "remove") await me.removeItem(user.id, input.id, input.resourceId); else await me.addItem(user.id, input.id, input.resourceId);
      return ok();
    },
    "POST /api/collections/reorder": async (request) => { const { user } = await requireAccess(request); const input = await body(request); await me.reorder(user.id, input.id, input.order); return ok(); },
    "POST /api/collections/share": async (request) => { const { user } = await requireAccess(request); const input = await body(request); return ok(await me.share(user.id, input.id, Boolean(input.enabled))); },

    // Administração
    "GET /api/admin/overview": async (request) => {
      await requireAdmin(request);
      const [profiles, editions, orders, payments, licenses, licenseEvents, events, grants, audit, resources, relations, paths] = await Promise.all([
        store.listProfiles(), store.listEditions({ onSaleOnly: false }), store.listOrders(), store.listPayments(), store.listLicenses(), store.listLicenseEvents(),
        store.listEvents({ limit: 100 }), store.listGrants(), store.listAudit({ limit: 50 }), store.listResources(), store.listRelations(), store.listGoalPaths(),
      ]);
      return ok({ profiles, editions, orders, payments, licenses, licenseEvents, events: events.map(({ payload, ...event }) => ({ ...event, summary: summarize(payload) })), grants, audit, resources, relations, paths });
    },
    "POST /api/admin/editions": async (request) => {
      const admin = await requireAdmin(request);
      const edition = validateEdition(await body(request));
      const saved = await store.upsertEdition(edition);
      await store.insertAudit({ actor_id: admin.id, action: "upsert_edition", details: { code: edition.code, price_cents: edition.price_cents, on_sale: edition.on_sale } });
      return ok({ edition: saved });
    },
    "POST /api/admin/resources": async (request) => {
      const admin = await requireAdmin(request);
      const resource = validateResource(await body(request));
      const saved = await store.upsertResource({ ...resource, updated_by: admin.id });
      await store.insertAudit({ actor_id: admin.id, action: "upsert_resource", details: { id: resource.id, status: resource.status } });
      return ok({ resource: saved });
    },
    "POST /api/admin/relations": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const fromId = String(input.fromId || "");
      const rows = (Array.isArray(input.items) ? input.items : []).slice(0, 50).map((item) => ({ from_id: fromId, to_id: String(item.toId || ""), kind: ["related", "requires", "next"].includes(item.kind) ? item.kind : "related" }));
      for (const id of [fromId, ...rows.map((row) => row.to_id)]) if (!(await library.exists(id))) throw httpError(400, "invalid_resource", `Recurso inexistente: ${id}`);
      await store.setRelations(fromId, rows);
      await store.insertAudit({ actor_id: admin.id, action: "set_relations", details: { from: fromId, count: rows.length } });
      return ok();
    },
    "POST /api/admin/paths": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const goal = String(input.goal || "").trim();
      if (!goal) throw httpError(400, "invalid_path", "Informe o objetivo.");
      const steps = (Array.isArray(input.steps) ? input.steps : []).slice(0, 12).map((step) => ({ resource_id: String(step.resource_id || ""), reason: String(step.reason || "").trim().slice(0, 300) }));
      for (const step of steps) {
        if (!(await library.exists(step.resource_id))) throw httpError(400, "invalid_resource", `Recurso inexistente: ${step.resource_id}`);
        if (!step.reason) throw httpError(400, "invalid_path", "Cada passo precisa de uma justificativa.");
      }
      const saved = await store.upsertGoalPath({ id: input.id || undefined, goal: goal.slice(0, 140), description: String(input.description || "").trim().slice(0, 400), keywords: String(input.keywords || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 20), steps, status: input.status === "published" ? "published" : "draft" });
      await store.insertAudit({ actor_id: admin.id, action: "upsert_goal_path", details: { goal, steps: steps.length, status: saved.status } });
      return ok({ path: saved });
    },
    "POST /api/admin/events/reprocess": async (request) => {
      const admin = await requireAdmin(request);
      const event = await store.getEvent(String((await body(request)).id || ""));
      if (!event) throw httpError(404, "not_found", "Evento não encontrado.");
      if (event.status === "processed") throw httpError(409, "already_processed", "Evento já processado; não será aplicado de novo.");
      const result = await commerce.processEvent(event);
      await store.insertAudit({ actor_id: admin.id, action: "reprocess_event", details: { event_id: event.id, result: result.status } });
      return ok(result);
    },
    "POST /api/admin/orders/refund": async (request) => { const admin = await requireAdmin(request); return ok(await commerce.adminRefund((await body(request)).orderId, admin.id)); },
    "POST /api/admin/orders/reconcile": async (request) => { const admin = await requireAdmin(request); return ok(await commerce.reconcileOrder(String((await body(request)).orderId || ""), admin.id)); },
    "POST /api/admin/licenses/status": async (request) => { const admin = await requireAdmin(request); const input = await body(request); return ok(await commerce.setLicenseStatus(input.userId, input.status, input.reason, admin.id)); },
    // Convite: cria a conta (se preciso), libera o acesso e envia as boas-vindas com o link para criar a senha.
    "POST /api/admin/invite": async (request) => {
      const admin = await requireAdmin(request);
      if (!onboarding) throw httpError(503, "not_configured", "Convites indisponíveis neste ambiente.");
      const input = await body(request);
      return ok(await onboarding.inviteUser({ email: input.email, reason: input.reason, editionId: input.editionId || null, actorId: admin.id }));
    },
    "POST /api/admin/grants": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const reason = String(input.reason || "").trim();
      if (!input.userId || reason.length < 10) throw httpError(400, "invalid_grant", "Informe o usuário e uma justificativa com pelo menos 10 caracteres.");
      const endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && Number.isNaN(endsAt.getTime())) throw httpError(400, "invalid_date", "Data final inválida.");
      const grant = await store.insertGrant({ user_id: input.userId, reason, granted_by: admin.id, starts_at: new Date().toISOString(), ends_at: endsAt?.toISOString() || null, edition_id: input.editionId || null });
      await store.insertAudit({ actor_id: admin.id, action: "grant_access", target_user_id: input.userId, details: { grant_id: grant.id, reason, ends_at: grant.ends_at } });
      return ok({ grant });
    },
    "POST /api/admin/grants/revoke": async (request) => {
      const admin = await requireAdmin(request);
      const grant = await store.revokeGrant(String((await body(request)).id || ""), new Date().toISOString());
      if (!grant) throw httpError(404, "not_found", "Concessão não encontrada.");
      await store.insertAudit({ actor_id: admin.id, action: "revoke_grant", target_user_id: grant.user_id, details: { grant_id: grant.id } });
      return ok({ grant });
    },
  };

  return async function handle(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    const route = routes[`${request.method} ${path}`];
    if (!route) return json(404, { error: "not_found", message: "Rota inexistente." });
    try { return await route(request); } catch (error) { return fail(error); }
  };
}

function validateEdition(input) {
  const code = String(input.code || "").trim().toLowerCase();
  const price = Number(input.priceCents);
  const rank = Number(input.rank);
  const bad = (message) => { throw httpError(400, "invalid_edition", message); };
  if (!/^[a-z0-9-]{2,40}$/.test(code)) bad("Código inválido (letras minúsculas, números e hífen).");
  if (!Number.isInteger(price) || price < 500) bad("Preço em centavos inválido (mínimo R$ 5,00).");
  if (!Number.isInteger(rank) || rank < 1) bad("Ordem da edição inválida (1, 2, 3…).");
  return {
    code, name: String(input.name || "").trim().slice(0, 100) || code, rank, price_cents: price,
    description: String(input.description || "").trim().slice(0, 600),
    features: (Array.isArray(input.features) ? input.features : String(input.features || "").split("\n")).map((item) => String(item).trim()).filter(Boolean).slice(0, 20),
    on_sale: Boolean(input.onSale),
  };
}

function summarize(payload = {}) {
  return {
    payment: payload.payment ? { id: payload.payment.id, status: payload.payment.status, value: payload.payment.value } : null,
    checkout: payload.checkout ? { id: payload.checkout.id, status: payload.checkout.status } : null,
  };
}
