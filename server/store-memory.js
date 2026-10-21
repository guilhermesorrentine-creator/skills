// Armazenamento em memória com o mesmo contrato de `store-supabase.js`. Usado nos testes e no
// modo de desenvolvimento local sem banco.
import { randomUUID } from "node:crypto";

export function createMemoryStore(seed = {}) {
  const db = {
    profiles: [...(seed.profiles || [])], editions: [...(seed.editions || [])], orders: [], payments: [], licenses: [], licenseEvents: [],
    events: [], grants: [], audit: [], resources: [...(seed.resources || [])], relations: [...(seed.relations || [])], paths: [...(seed.paths || [])],
    collections: [], items: [], favorites: [], recent: [],
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
      return { userId: id, actionUrl: `${redirectTo}#convite-local-${id}` };
    },
    createPasswordLink: async (email, redirectTo) => `${redirectTo}#novo-link-local-${encodeURIComponent(email)}`,
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
    listAudit: async ({ limit = 100 } = {}) => clone(db.audit.slice(-limit).reverse()),

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
