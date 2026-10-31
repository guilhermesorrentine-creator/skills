// Rotas HTTP (assinatura Web: Request → Response), compartilhadas pela Vercel Function, pelo
// servidor de desenvolvimento e pelos testes. Autorização sempre decidida aqui, no servidor.
import { publicEdition } from "./commerce.js";
import { validateResource } from "./library.js";
import { readTracking } from "./meta.js";
import { verifyCaktoWebhook } from "./cakto.js";
import { estimateMetaBalance, expenseOccurrences, loadAsaasPayments, loadMetaAds, summarizeStages } from "./dashboard.js";
import { buildLedger, businessDay, summarizeLedger } from "./dashboard-ledger.js";
import { loadInstagramReels } from "./instagram.js";

const noStore = { "Cache-Control": "private, no-store", "Content-Type": "application/json; charset=utf-8" };
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...noStore, ...headers } });
const fail = (error) => {
  const status = error.status || 500;
  if (status >= 500 && error.code !== "not_configured") console.error("[api]", error);
  return json(status, { error: error.code || "internal_error", message: status >= 500 && !error.code ? "Erro interno." : error.message });
};
const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });

export function createApi({ store, commerce, onboarding = null, library, me, mcp = null, asaas = null, caktoConfig = {}, dashboardConfig = {}, metaOAuth = null, verifyToken, devUser = null }) {
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
  // Conexão com IAs (MCP): parte do Voxelia Pro, válida por 12 meses.
  async function requireMcp(request) {
    const user = await requireUser(request);
    if (!devUser && !(await commerce.mcpStatus(user.id)).active) throw httpError(402, "no_mcp", "A conexão com IAs faz parte do Voxelia Pro.");
    return user;
  }
  async function requireAdmin(request) {
    const user = await requireUser(request);
    const profile = await store.getProfile(user.id);
    if (!profile?.is_admin) throw httpError(403, "forbidden", "Acesso restrito à administração.");
    return user;
  }
  const body = async (request) => { try { return await request.json(); } catch { return {}; } };
  const attribution = (input) => {
    const clean = (value) => String(value || "").replace(/[^\p{L}\p{N}_\-./ ]/gu, "").slice(0, 120);
    return { source: clean(input?.source), campaign: clean(input?.campaign), content: clean(input?.content) };
  };
  const param = (request, name) => new URL(request.url).searchParams.get(name);
  const ok = (data = { ok: true }) => json(200, data);
  async function cached(key, fetchFresh, force) {
    const previous = await store.getDashboardCache(key);
    const age = previous ? Date.now() - new Date(previous.checked_at).getTime() : Infinity;
    if (!force && age < 600000) return { ...previous.payload, checkedAt: previous.checked_at, ageSeconds: Math.floor(age / 1000), cached: true };
    const result = await fetchFresh();
    if (!result.error) {
      await store.saveDashboardCache(key, result);
      return { ...result, ageSeconds: 0, cached: false };
    }
    return previous ? { ...previous.payload, error: result.error, checkedAt: previous.checked_at, ageSeconds: Math.floor(age / 1000), cached: true, stale: true } : result;
  }
  function dashboardPeriod(request) {
    const date = (value, fallback) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value)) ? value : fallback;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const fromDefault = new Date(`${today}T12:00:00Z`); fromDefault.setUTCDate(fromDefault.getUTCDate() - 6);
    const from = date(param(request, "from"), fromDefault.toISOString().slice(0, 10));
    const to = date(param(request, "to"), today);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw httpError(400, "invalid_range", "Escolha até 366 dias em ordem cronológica.");
    return { from, to, today };
  }

  const routes = {
    // Público
    "GET /api/editions": async () => json(200, { editions: (await store.listEditions({ onSaleOnly: true })).map(publicEdition) }, { "Cache-Control": "public, max-age=60" }),
    "GET /api/stats": async () => json(200, await library.stats(), { "Cache-Control": "public, max-age=300" }),
    "GET /api/shared": async (request) => json(200, await me.shared(param(request, "token")), { "X-Robots-Tag": "noindex, nofollow" }),
    // Funil próprio: aceita só eventos conhecidos, sem dados pessoais.
    "POST /api/funnel": async (request) => {
      const input = await body(request);
      const text = (value, max = 120) => String(value || "").replace(/[^\p{L}\p{N}_\-./ ]/gu, "").slice(0, max);
      if (!FUNNEL_EVENTS.has(input.name) || !/^[a-z0-9]{8,40}$/.test(String(input.sid || ""))) return json(400, { error: "invalid_event" });
      await store.insertFunnelEvent({ sid: input.sid, name: input.name, path: text(input.path, 200), source: text(input.source), campaign: text(input.campaign), content: text(input.content),
        order_id: /^[0-9a-f-]{36}$/i.test(String(input.order || "")) ? input.order : null });
      return ok();
    },
    "POST /api/webhooks/asaas": async (request) => ok({ received: true, ...(await commerce.receiveWebhook(request.headers.get("asaas-access-token"), await body(request))) }),
    "POST /api/webhooks/cakto": async (request) => {
      const raw = Buffer.from(await request.arrayBuffer());
      if (!verifyCaktoWebhook(raw, request.headers.get("x-cakto-timestamp"), request.headers.get("x-cakto-signature"), caktoConfig.webhookSecret))
        throw httpError(401, "invalid_signature", "Assinatura Cakto inválida.");
      let payload;
      try { payload = JSON.parse(raw.toString("utf8")); } catch { throw httpError(400, "invalid_json", "Evento Cakto inválido."); }
      return ok({ received: true, ...(await commerce.receiveCaktoWebhook(payload)) });
    },

    // Conta e compra
    "GET /api/account": async (request) => {
      const user = await requireUser(request);
      if (devUser) return ok({ email: user.email, access: true, accessReason: "dev", rank: 99, isAdmin: false, edition: null, license: null, orders: [], history: [] });
      return ok(await commerce.accountState(user));
    },
    "POST /api/checkout": async (request) => { const input = await body(request); return ok(await commerce.accountCheckout(await requireUser(request), input.editionCode, readTracking(input.tracking, request), input.name || input.document ? { name: input.name, document: input.document } : null, input.method === "card" ? "card" : "pix")); },
    // Compra sem cadastro (só e-mail) e retorno com link para criar a senha.
    "POST /api/checkout/guest": async (request) => { const input = await body(request); return ok(await commerce.guestCheckout(input.email, input.editionCode, readTracking(input.tracking, request), input.name || input.document ? { name: input.name, document: input.document } : null, input.method === "card" ? "card" : "pix")); },
    "POST /api/subscription/checkout": async (request) => { const user = await requireUser(request); const input = await body(request); return ok(await commerce.subscriptions.start(user, readTracking(input.tracking, request), false, attribution(input.attribution))); },
    "POST /api/subscription/guest": async (request) => { const input = await body(request); return ok(await commerce.subscriptions.startGuest(input.email, readTracking(input.tracking, request), attribution(input.attribution))); },
    "POST /api/subscription/claim": async (request) => { const input = await body(request); return ok(await commerce.subscriptions.claim(input.session, input.key)); },
    "POST /api/subscription/cancel": async (request) => ok(await commerce.subscriptions.cancel((await requireUser(request)).id)),
    "POST /api/subscription/refund": async (request) => ok(await commerce.subscriptions.refund((await requireUser(request)).id)),
    // Conexão com IAs (MCP): só para quem tem licença ativa.
    "GET /api/account/mcp": async (request) => { const user = await requireMcp(request); return ok({ url: await mcp.connectionUrl(user.id) }); },
    "POST /api/account/mcp/rotate": async (request) => { const user = await requireMcp(request); return ok({ url: await mcp.rotate(user.id) }); },
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
    "GET /api/admin/dashboard": async (request) => {
      await requireAdmin(request);
      const { from, to, today } = dashboardPeriod(request);
      const goal = await store.getDashboardSettings();
      const force = param(request, "refresh") === "1";
      const [orders, payments, profiles, editions, subscriptions, subscriptionPayments, expenses, links, funnel, asaasData] = await Promise.all([
        store.listOrders(), store.listPayments(), store.listProfiles(), store.listEditions({ onSaleOnly: false }), store.listSubscriptions(), store.listSubscriptionPayments(),
        store.listDashboardExpenses(), store.listDashboardAdLinks(),
        store.listFunnelEvents(`${[from, goal.goal_starts_on].sort()[0]}T00:00:00-03:00`), cached("asaas-payments", () => loadAsaasPayments(asaas), force),
      ]);
      const firstDeposit = estimateMetaBalance(expenses, [], today).since;
      const metaFrom = [from, goal.goal_starts_on, firstDeposit].filter(Boolean).sort()[0];
      const metaTo = [to, goal.goal_ends_on].sort().at(-1) > today ? today : [to, goal.goal_ends_on].sort().at(-1);
      const activeMetaConfig = metaOAuth ? await metaOAuth.adsConfig() : dashboardConfig;
      const metaData = await cached(`meta-${activeMetaConfig.adsAccountId}-${metaFrom}-${metaTo}`, () => loadMetaAds(activeMetaConfig, metaFrom, metaTo), force);
      const metaAuth = metaOAuth ? await metaOAuth.status() : { configured: false, connected: false, expired: false };
      const ledger = buildLedger({ orders, remotePayments: asaasData.rows, localPayments: payments, profiles, editions, funnel, subscriptions, subscriptionPayments });
      const occurrences = expenseOccurrences(expenses, [from, goal.goal_starts_on].sort()[0], [to, goal.goal_ends_on].sort().at(-1));
      const metrics = summarizeLedger({ ledger, expenses: occurrences, ads: metaData.rows || [], funnel, from, to, goal });
      if (asaasData.error || ledger.incomplete || orders.length >= 1000 || payments.length >= 1000) {
        for (const key of ["salesCents", "cashCents", "receivableCents", "refundsCents", "feesCents", "profitCents", "roas", "costPerSaleCents", "metaSalesCents"]) metrics[key] = null;
        metrics.goal = { ...metrics.goal, profitCents: null, consolidatedCents: null, guaranteeCents: null, remainingCents: null, projectedCents: null, projectedDate: null };
      } else if (metaData.error) {
        for (const key of ["adCents", "profitCents", "roas", "costPerSaleCents", "metaProfitCents"]) metrics[key] = null;
        metrics.goal = { ...metrics.goal, profitCents: null, consolidatedCents: null, guaranteeCents: null, remainingCents: null, projectedCents: null, projectedDate: null };
      }
      const stageData = summarizeStages(funnel, orders, from, to);
      const metaBalance = estimateMetaBalance(expenses, metaData.rows || [], today, metaData.error);
      return ok({ from, to, updatedAt: new Date().toISOString(), metrics, metaBalance, stages: stageData, payments: ledger.paymentRows, receivable: ledger.receivable, refunds: ledger.refunds, salesLedger: ledger.sales, orders: ledger.orderRows, expenses, goal, links, ads: metaData.rows || [], funnel: funnel.map((event) => ({ at: event.at, on: businessDay(event.at), name: event.name, path: event.path, source: event.source, campaign: event.campaign, content: event.content, orderId: event.order_id, sid: event.sid })),
        connections: { asaas: { checkedAt: asaasData.checkedAt, error: asaasData.error || (ledger.incomplete || orders.length >= 1000 || payments.length >= 1000 ? "Dados de cobranças parciais; confira o Asaas." : null), ageSeconds: asaasData.ageSeconds, cached: asaasData.cached }, meta: { checkedAt: metaData.checkedAt, error: metaData.error, ageSeconds: metaData.ageSeconds, cached: metaData.cached, auth: metaAuth }, funnel: { checkedAt: new Date().toISOString(), error: funnel.length === 20000 ? "Limite de eventos atingido; período parcial." : null } } });
    },
    "POST /api/admin/dashboard/meta/connect/start": async (request) => {
      const admin = await requireAdmin(request);
      if (!metaOAuth) throw httpError(503, "meta_oauth_not_configured", "Conexão oficial da Meta indisponível.");
      return ok(await metaOAuth.start(admin.id));
    },
    "POST /api/admin/dashboard/meta/connect/finish": async (request) => {
      const admin = await requireAdmin(request); const input = await body(request);
      if (!metaOAuth) throw httpError(503, "meta_oauth_not_configured", "Conexão oficial da Meta indisponível.");
      const result = await metaOAuth.finish(admin.id, input.code, input.state);
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_meta_connect", details: { account_id: result.accountId } });
      return ok(result);
    },
    "GET /api/admin/dashboard/organic": async (request) => {
      await requireAdmin(request);
      const { from, to } = dashboardPeriod(request);
      const activeMetaConfig = metaOAuth ? await metaOAuth.adsConfig() : dashboardConfig;
      const result = await cached(`instagram-reels-${activeMetaConfig.instagramUserId}-${from}-${to}`,
        () => loadInstagramReels(activeMetaConfig, from, to), param(request, "refresh") === "1");
      return ok({ from, to, rows: result.rows || [], profile: result.profile || null, warning: result.warning || null,
        connection: { checkedAt: result.checkedAt || null, error: result.error || null, ageSeconds: result.ageSeconds ?? null, cached: Boolean(result.cached) } });
    },
    "POST /api/admin/dashboard/expenses": async (request) => {
      const admin = await requireAdmin(request);
      const input = await body(request);
      const title = String(input.title || "").trim().slice(0, 120);
      const amount = Number(input.amountCents);
      if (!title || !Number.isInteger(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn || "") || (input.endsOn && input.endsOn < input.startsOn)) throw httpError(400, "invalid_expense", "Confira nome, valor e datas da despesa.");
      const id = input.id ? String(input.id) : undefined;
      if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw httpError(400, "invalid_expense", "Identificador inválido.");
      const kind = input.kind || "expense";
      if (!["expense", "meta_deposit"].includes(kind) || (kind === "meta_deposit" && input.recurring)) throw httpError(400, "invalid_expense", "Recarga Meta deve ser avulsa.");
      const expense = await store.saveDashboardExpense({ ...(id ? { id } : {}), title, category: String(input.category || "Sistema").trim().slice(0, 60), amount_cents: amount,
        starts_on: input.startsOn, recurring: Boolean(input.recurring), ends_on: input.endsOn || null, kind });
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_expense_save", details: { expense_id: expense.id } });
      return ok({ expense });
    },
    "POST /api/admin/dashboard/expenses/delete": async (request) => {
      const admin = await requireAdmin(request); const id = String((await body(request)).id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id) || !(await store.deleteDashboardExpense(id))) throw httpError(404, "not_found", "Despesa não encontrada.");
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_expense_delete", details: { expense_id: id } }); return ok();
    },
    "POST /api/admin/dashboard/goal": async (request) => {
      const admin = await requireAdmin(request); const input = await body(request); const amount = Number(input.goalCents);
      if (!Number.isInteger(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn || "") || !/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn || "") || input.endsOn < input.startsOn) throw httpError(400, "invalid_goal", "Confira valor e prazo da meta.");
      const goal = await store.saveDashboardSettings({ goal_cents: amount, goal_starts_on: input.startsOn, goal_ends_on: input.endsOn });
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_goal_save", details: { goal_cents: amount, goal_ends_on: input.endsOn } }); return ok({ goal });
    },
    "POST /api/admin/dashboard/notes": async (request) => {
      const admin = await requireAdmin(request); const input = await body(request);
      const path = String(input.path || "").replaceAll("\\", "/").trim();
      const content = String(input.content || "");
      if (!path.startsWith("Marketing/") || path.includes("..") || !/\.md$/i.test(path) || path.length > 300 || !content.trim() || content.length > 200000)
        throw httpError(400, "invalid_note", "Escolha uma nota Markdown de Marketing com até 200 KB.");
      const sourceDate = content.match(/^atualizado_em:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1] || null;
      const note = await store.saveDashboardNote({ path, title: path.split("/").at(-1).replace(/\.md$/i, ""), content, source_updated_on: sourceDate });
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_note_import", details: { path } }); return ok({ note });
    },
    "POST /api/admin/dashboard/links": async (request) => {
      const admin = await requireAdmin(request); const input = await body(request);
      const kind = input.entityKind, id = String(input.entityId || "").trim();
      const campaign = String(input.utmCampaign || "").trim(), content = String(input.utmContent || "").trim();
      const paths = Array.isArray(input.notePaths) ? [...new Set(input.notePaths)] : [];
      if (!["campaign", "ad"].includes(kind) || !/^\d{1,40}$/.test(id) || campaign.length > 120 || content.length > 120 || paths.length > 10 || paths.some((path) => typeof path !== "string" || path.length > 300))
        throw httpError(400, "invalid_link", "Confira o item, a UTM e as notas.");
      const available = new Set((await store.listDashboardNotes()).map((note) => note.path));
      if (paths.some((path) => !available.has(path))) throw httpError(400, "invalid_link", "Importe as notas antes de vinculá-las.");
      const link = await store.saveDashboardAdLink({ entity_kind: kind, entity_id: id, utm_campaign: campaign, utm_content: content, note_paths: paths });
      await store.insertAudit({ actor_id: admin.id, action: "dashboard_ad_link_save", details: { kind, id } }); return ok({ link });
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
    "GET /api/admin/cakto/events": async (request) => {
      await requireAdmin(request);
      const events = await store.listCaktoEvents({ limit: 100 });
      return ok({ events: events.map(({ id, event, status, note, attempts, received_at, processed_at }) =>
        ({ id, event, status, note, attempts, received_at, processed_at })) });
    },
    "POST /api/admin/cakto/reprocess": async (request) => {
      const admin = await requireAdmin(request);
      const id = String((await body(request)).id || "");
      const event = await store.getCaktoEvent(id);
      if (!event) throw httpError(404, "not_found", "Evento Cakto não encontrado.");
      if (event.status === "processed") throw httpError(409, "already_processed", "Evento já processado.");
      const result = await commerce.processCaktoEvent(id);
      await store.insertAudit({ actor_id: admin.id, action: "reprocess_cakto_event", details: { event_id: id, status: result.status } });
      return ok(result);
    },
    // Painel do funil: por campanha e criativo, sessões em cada etapa, pedidos pagos e receita.
    "GET /api/admin/funnel": async (request) => {
      await requireAdmin(request);
      const days = Math.min(90, Math.max(1, Number(param(request, "days")) || 7));
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [events, orders] = await Promise.all([store.listFunnelEvents(since), store.listOrders()]);
      return ok({ days, ...summarizeFunnel(events, orders) });
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
    if (mcp && path.startsWith("/api/mcp/")) {
      try { return await mcp.handle(request, decodeURIComponent(path.slice("/api/mcp/".length))); } catch (error) { return fail(error); }
    }
    const route = routes[`${request.method} ${path}`];
    if (!route) return json(404, { error: "not_found", message: "Rota inexistente." });
    try { return await route(request); } catch (error) { return fail(error); }
  };
}

const FUNNEL_EVENTS = new Set(["view", "buy_click", "buy_page", "checkout"]);

// Agrega o funil por origem (campanha · criativo): cada etapa conta sessões distintas; venda = pedido pago
// gerado a partir de um evento "checkout" daquela origem.
export function summarizeFunnel(events, orders) {
  const paid = new Map(orders.filter((order) => order.status === "paid").map((order) => [order.id, order]));
  const rows = new Map();
  const origin = (e) => [e.source || "direto", e.campaign || "-", e.content || "-"].join(" · ");
  for (const e of events) {
    const key = origin(e);
    const row = rows.get(key) || { origin: key, view: new Set(), buy_click: new Set(), buy_page: new Set(), checkout: new Set(), orders: new Set() };
    row[e.name]?.add(e.sid);
    if (e.name === "checkout" && e.order_id) row.orders.add(e.order_id);
    rows.set(key, row);
  }
  const out = [...rows.values()].map((row) => {
    const sold = [...row.orders].map((id) => paid.get(id)).filter(Boolean);
    return { origin: row.origin, views: row.view.size, buyClicks: row.buy_click.size, buyPage: row.buy_page.size, checkouts: row.checkout.size, sales: sold.length, revenueCents: sold.reduce((sum, order) => sum + order.amount_cents, 0) };
  }).sort((a, b) => b.views - a.views);
  const pages = {};
  for (const e of events) if (e.name === "view") pages[e.path] = (pages[e.path] || 0) + 1;
  return { rows: out, pages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([path, views]) => ({ path, views })) };
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
