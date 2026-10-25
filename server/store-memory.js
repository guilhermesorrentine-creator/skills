// Armazenamento em memória com o mesmo contrato de `store-supabase.js`. Usado nos testes e no
// modo de desenvolvimento local sem banco.
import { randomUUID } from "node:crypto";

export function createMemoryStore(seed = {}) {
  const db = {
    profiles: [...(seed.profiles || [])], editions: [...(seed.editions || [])], plans: [...(seed.plans || [{ id: "plan-monthly", code: "voxelia-mensal", name: "Voxelia mensal", price_cents: 4990, cycle: "MONTHLY", active: true }])], checkoutSessions: [], subscriptions: [], subscriptionPayments: [], orders: [], payments: [], licenses: [], licenseEvents: [],
    events: [], grants: [], audit: [], funnel: [], resources: [...(seed.resources || [])], relations: [...(seed.relations || [])], paths: [...(seed.paths || [])],
    collections: [], items: [], favorites: [], recent: [], dashboardExpenses: [], dashboardNotes: [], dashboardAdLinks: [], dashboardCache: [],
    dashboardSettings: { goal_cents: 1500000, goal_starts_on: "2026-10-22", goal_ends_on: "2026-12-05" },
  };
  const clone = (value) => (value === undefined || value === null ? null : structuredClone(value));
  const stamp = () => new Date().toISOString();
  const newest = (key) => (a, b) => new Date(b[key]) - new Date(a[key]);
  const isOpen = (order, now) => ["creating", "pending"].includes(order.status) && (!order.expires_at || new Date(order.expires_at) > new Date(now));

  return {
    db,
    getProfile: async (id) => clone(db.profiles.find((item) => item.id === id)),
    findProfileByEmail: async (email) => clone(db.profiles.find((item) => item.email?.toLowerCase() === email.toLowerCase())),
    createInvitedUser: async (email, redirectTo) => {
      const id = randomUUID();
      db.profiles.push({ id, email, is_admin: false, created_at: stamp() });
      return { userId: id, actionUrl: `${redirectTo}?token_hash=local-${id}&type=invite` };
    },
    createPasswordLink: async (email, redirectTo) => `${redirectTo}?token_hash=local-${encodeURIComponent(email)}&type=recovery`,
    getMcpVersion: async (userId) => { const profile = db.profiles.find((item) => item.id === userId); return profile ? profile.mcp_v || 1 : 0; },
    setMcpVersion: async (userId, version) => { const profile = db.profiles.find((item) => item.id === userId); if (profile) profile.mcp_v = version; },
    hasSignedIn: async (userId) => Boolean(db.profiles.find((item) => item.id === userId)?.last_sign_in_at),
    findProfileByCustomer: async (customer) => clone(db.profiles.find((item) => item.asaas_customer_id === customer)),
    setCustomerId: async (id, customer) => { const profile = db.profiles.find((item) => item.id === id); if (profile) profile.asaas_customer_id = customer; },
    listProfiles: async () => clone(db.profiles),

    listEditions: async ({ onSaleOnly = true } = {}) => clone(db.editions.filter((item) => !onSaleOnly || item.on_sale).sort((a, b) => a.rank - b.rank)),
    getEditionByCode: async (code) => clone(db.editions.find((item) => item.code === code)),
    upsertEdition: async (edition) => {
      const existing = db.editions.find((item) => item.code === edition.code);
      if (existing) Object.assign(existing, edition); else db.editions.push({ id: randomUUID(), ...edition });
      return clone(db.editions.find((item) => item.code === edition.code));
    },

    getPlanByCode: async (code) => clone(db.plans.find((item) => item.code === code)),
    insertCheckoutSession: async (row) => {
      if (db.checkoutSessions.some((item) => item.user_id === row.user_id && ["creating", "created"].includes(item.status))) return null;
      const record = { id: randomUUID(), created_at: stamp(), ...row }; db.checkoutSessions.push(record); return clone(record);
    },
    updateCheckoutSession: async (id, patch) => { Object.assign(db.checkoutSessions.find((item) => item.id === id) || {}, patch); },
    getCheckoutSession: async (id) => clone(db.checkoutSessions.find((item) => item.id === id)),
    findCheckoutSessionByAsaas: async (id) => clone(db.checkoutSessions.find((item) => item.asaas_checkout_id === id)),
    findCheckoutSessionByCustomer: async (id) => clone(db.checkoutSessions.find((item) => item.asaas_customer_id === id && item.status === "paid")),
    getOpenCheckoutSession: async (userId, at) => clone(db.checkoutSessions.find((item) => item.user_id === userId && ["creating", "created"].includes(item.status) && new Date(item.expires_at) > new Date(at))),
    listCheckoutSessions: async (userId) => clone(db.checkoutSessions.filter((item) => item.user_id === userId)),
    insertSubscription: async (row) => {
      if (db.subscriptions.some((item) => item.asaas_subscription_id === row.asaas_subscription_id)) return null;
      const record = { id: randomUUID(), created_at: stamp(), ...row }; db.subscriptions.push(record); return clone(record);
    },
    updateSubscription: async (id, patch) => { Object.assign(db.subscriptions.find((item) => item.id === id) || {}, patch); },
    findSubscriptionByAsaas: async (id) => clone(db.subscriptions.find((item) => item.asaas_subscription_id === id)),
    listSubscriptions: async (userId) => clone(db.subscriptions.filter((item) => !userId || item.user_id === userId)),
    getSubscription: async (id) => clone(db.subscriptions.find((item) => item.id === id)),
    upsertSubscriptionPayment: async (row) => {
      const found = db.subscriptionPayments.find((item) => item.asaas_payment_id === row.asaas_payment_id);
      if (found) {
        if (row.status === "REFUNDED" || (row.status === "CONFIRMED" || row.status === "RECEIVED") && found.status !== "REFUNDED"
          || !["CONFIRMED", "RECEIVED", "REFUNDED"].includes(found.status)) Object.assign(found, row);
      } else db.subscriptionPayments.push({ id: randomUUID(), created_at: stamp(), ...row });
      return clone(found || db.subscriptionPayments.at(-1));
    },
    getSubscriptionPayment: async (id) => clone(db.subscriptionPayments.find((item) => item.asaas_payment_id === id)),
    listSubscriptionPayments: async (subscriptionId) => clone(db.subscriptionPayments.filter((item) => !subscriptionId || item.subscription_id === subscriptionId)),
    claimSubscriptionPurchase: async (id, attemptedAt, staleBefore) => {
      const item = db.subscriptionPayments.find((entry) => entry.asaas_payment_id === id);
      if (!item || item.meta_purchase_sent_at || item.meta_purchase_attempted_at && item.meta_purchase_attempted_at >= staleBefore) return null;
      item.meta_purchase_attempted_at = attemptedAt; item.meta_purchase_error = null;
      return clone(item);
    },
    finishSubscriptionPurchase: async (id, patch) => { Object.assign(db.subscriptionPayments.find((item) => item.asaas_payment_id === id) || {}, patch); },

    getOpenOrder: async (userId, now) => clone(db.orders.filter((item) => item.user_id === userId && isOpen(item, now)).sort(newest("created_at"))[0]),
    insertOrder: async (row) => {
      if (["creating", "pending"].includes(row.status) && db.orders.some((item) => item.user_id === row.user_id && ["creating", "pending"].includes(item.status))) return null;
      const record = { id: randomUUID(), created_at: stamp(), ...row };
      db.orders.push(record);
      return clone(record);
    },
    updateOrder: async (id, patch) => { Object.assign(db.orders.find((item) => item.id === id) || {}, patch); },
    getOrder: async (id) => clone(db.orders.find((item) => item.id === id)),
    findOrderByCheckout: async (checkoutId) => clone(db.orders.find((item) => item.asaas_checkout_id === checkoutId)),
    listOrders: async (userId) => clone(db.orders.filter((item) => !userId || item.user_id === userId).sort(newest("created_at"))),

    getPayment: async (id) => clone(db.payments.find((item) => item.asaas_payment_id === id)),
    findPaymentByOrder: async (orderId) => clone(db.payments.find((item) => item.order_id === orderId)),
    upsertPayment: async (row) => {
      const existing = db.payments.find((item) => item.asaas_payment_id === row.asaas_payment_id);
      if (existing) Object.assign(existing, row, { order_id: row.order_id || existing.order_id }); else db.payments.push({ id: randomUUID(), created_at: stamp(), ...row });
    },
    listPayments: async () => clone(db.payments),

    getLicense: async (userId) => clone(db.licenses.find((item) => item.user_id === userId)),
    insertLicense: async (row) => { const record = { id: randomUUID(), version: 1, ...row }; db.licenses.push(record); return clone(record); },
    updateLicense: async (id, patch, version) => {
      const record = db.licenses.find((item) => item.id === id);
      if (!record || (version !== undefined && record.version !== version)) return false;
      Object.assign(record, patch, { version: record.version + 1 });
      return true;
    },
    listLicenses: async () => clone(db.licenses),
    insertLicenseEvent: async (row) => { db.licenseEvents.push({ id: randomUUID(), created_at: stamp(), ...row }); },
    listLicenseEvents: async (userId) => clone(db.licenseEvents.filter((item) => !userId || item.user_id === userId)),

    insertEvent: async (row) => {
      const existing = db.events.find((item) => item.id === row.id);
      if (existing) return { inserted: false, event: clone(existing) };
      const record = { received_at: stamp(), attempts: 0, ...row };
      db.events.push(record);
      return { inserted: true, event: clone(record) };
    },
    updateEvent: async (id, patch) => { Object.assign(db.events.find((item) => item.id === id) || {}, patch); },
    getEvent: async (id) => clone(db.events.find((item) => item.id === id)),
    listEvents: async ({ status, limit = 100 } = {}) => clone(db.events.filter((item) => !status || item.status === status).slice(-limit).reverse()),

    listGrants: async (userId) => clone(db.grants.filter((item) => !userId || item.user_id === userId)),
    insertGrant: async (row) => { const record = { id: randomUUID(), created_at: stamp(), ...row }; db.grants.push(record); return clone(record); },
    revokeGrant: async (id, revokedAt) => { const record = db.grants.find((item) => item.id === id); if (record) record.revoked_at = revokedAt; return clone(record); },
    insertAudit: async (row) => { db.audit.push({ id: randomUUID(), created_at: stamp(), ...row }); },
    insertFunnelEvent: async (row) => { db.funnel.push({ id: db.funnel.length + 1, at: stamp(), ...row }); },
    listFunnelEvents: async (since) => clone(db.funnel.filter((item) => item.at >= since)),
    listAudit: async ({ limit = 100 } = {}) => clone(db.audit.slice(-limit).reverse()),
    listDashboardExpenses: async () => clone(db.dashboardExpenses),
    saveDashboardExpense: async (row) => {
      const item = row.id && db.dashboardExpenses.find((entry) => entry.id === row.id);
      if (item) Object.assign(item, row); else db.dashboardExpenses.push({ id: randomUUID(), ...row });
      return clone(item || db.dashboardExpenses.at(-1));
    },
    deleteDashboardExpense: async (id) => { const item = db.dashboardExpenses.find((entry) => entry.id === id); db.dashboardExpenses = db.dashboardExpenses.filter((entry) => entry.id !== id); return clone(item); },
    getDashboardSettings: async () => clone(db.dashboardSettings),
    saveDashboardSettings: async (row) => clone(Object.assign(db.dashboardSettings, row)),
    listDashboardNotes: async () => clone(db.dashboardNotes),
    saveDashboardNote: async (row) => { const item = db.dashboardNotes.find((entry) => entry.path === row.path); if (item) Object.assign(item, row, { imported_at: stamp() }); else db.dashboardNotes.push({ ...row, imported_at: stamp() }); return clone(item || db.dashboardNotes.at(-1)); },
    listDashboardAdLinks: async () => clone(db.dashboardAdLinks),
    saveDashboardAdLink: async (row) => { const item = db.dashboardAdLinks.find((entry) => entry.entity_kind === row.entity_kind && entry.entity_id === row.entity_id); if (item) Object.assign(item, row); else db.dashboardAdLinks.push(row); return clone(item || row); },
    getDashboardCache: async (key) => clone(db.dashboardCache.find((entry) => entry.key === key)),
    saveDashboardCache: async (key, payload) => { const item = db.dashboardCache.find((entry) => entry.key === key); if (item) Object.assign(item, { payload, checked_at: stamp() }); else db.dashboardCache.push({ key, payload, checked_at: stamp() }); },

    listResources: async ({ status } = {}) => clone(db.resources.filter((item) => !status || item.status === status)),
    getResource: async (id) => clone(db.resources.find((item) => item.id === id)),
    upsertResource: async (row) => {
      const existing = db.resources.find((item) => item.id === row.id);
      if (existing) Object.assign(existing, row, { updated_at: stamp() }); else db.resources.push({ created_at: stamp(), updated_at: stamp(), ...row });
      return clone(db.resources.find((item) => item.id === row.id));
    },
    listRelations: async () => clone(db.relations),
    setRelations: async (fromId, rows) => { db.relations = db.relations.filter((rel) => rel.from_id !== fromId).concat(rows); },
    listGoalPaths: async ({ status } = {}) => clone(db.paths.filter((item) => !status || item.status === status)),
    upsertGoalPath: async (row) => {
      const existing = row.id && db.paths.find((item) => item.id === row.id);
      if (existing) Object.assign(existing, row, { version: existing.version + 1 }); else db.paths.push({ id: randomUUID(), version: 1, ...row });
      return clone(existing || db.paths.at(-1));
    },

    listCollections: async (userId) => clone(db.collections.filter((item) => item.user_id === userId)),
    getCollection: async (id) => clone(db.collections.find((item) => item.id === id)),
    getCollectionByShareToken: async (token) => clone(db.collections.find((item) => item.share_token && item.share_token === token)),
    insertCollection: async (row) => { const record = { id: randomUUID(), share_token: null, created_at: stamp(), updated_at: stamp(), ...row }; db.collections.push(record); return clone(record); },
    updateCollection: async (id, patch) => { Object.assign(db.collections.find((item) => item.id === id) || {}, patch); },
    deleteCollection: async (id) => { db.collections = db.collections.filter((item) => item.id !== id); db.items = db.items.filter((item) => item.collection_id !== id); },
    listCollectionItems: async (id) => clone(db.items.filter((item) => item.collection_id === id)),
    insertCollectionItem: async (row) => { db.items.push({ added_at: stamp(), ...row }); },
    deleteCollectionItem: async (id, resourceId) => { db.items = db.items.filter((item) => !(item.collection_id === id && item.resource_id === resourceId)); },
    setCollectionOrder: async (id, order) => { order.forEach((rid, position) => { const row = db.items.find((item) => item.collection_id === id && item.resource_id === rid); if (row) row.position = position; }); },

    listFavorites: async (userId) => clone(db.favorites.filter((item) => item.user_id === userId).sort(newest("created_at"))),
    addFavorite: async (userId, resourceId) => { if (!db.favorites.some((item) => item.user_id === userId && item.resource_id === resourceId)) db.favorites.push({ user_id: userId, resource_id: resourceId, created_at: stamp() }); },
    removeFavorite: async (userId, resourceId) => { db.favorites = db.favorites.filter((item) => !(item.user_id === userId && item.resource_id === resourceId)); },
    listRecent: async (userId) => clone(db.recent.filter((item) => item.user_id === userId).sort(newest("visited_at"))),
    upsertRecent: async (userId, resourceId, visitedAt, max) => {
      db.recent = db.recent.filter((item) => !(item.user_id === userId && item.resource_id === resourceId));
      db.recent.push({ user_id: userId, resource_id: resourceId, visited_at: visitedAt });
      const mine = db.recent.filter((item) => item.user_id === userId).sort(newest("visited_at"));
      const drop = new Set(mine.slice(max).map((item) => item.resource_id));
      db.recent = db.recent.filter((item) => item.user_id !== userId || !drop.has(item.resource_id));
    },
    clearRecent: async (userId) => { db.recent = db.recent.filter((item) => item.user_id !== userId); },
  };
}
