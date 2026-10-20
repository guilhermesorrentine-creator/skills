// Armazenamento em memória com o mesmo contrato do Supabase (`store-supabase.js`). Usado nos testes
// e no modo de desenvolvimento local sem banco.
import { randomUUID } from "node:crypto";

export function createMemoryStore(seed = {}) {
  const db = {
    profiles: [...(seed.profiles || [])], plans: [...(seed.plans || [])], subscriptions: [], checkouts: [],
    events: [], payments: [], grants: [], audit: [],
  };
  const clone = (value) => (value ? structuredClone(value) : null);
  const byDate = (key) => (a, b) => new Date(b[key]) - new Date(a[key]);
  const stamp = () => new Date().toISOString();

  return {
    db,
    getProfile: async (id) => clone(db.profiles.find((item) => item.id === id)),
    findProfileByCustomer: async (customer) => clone(db.profiles.find((item) => item.asaas_customer_id === customer)),
    setCustomerId: async (id, customer) => { const profile = db.profiles.find((item) => item.id === id); if (profile) profile.asaas_customer_id = customer; },
    listProfiles: async () => clone(db.profiles),

    listPlans: async ({ activeOnly = true } = {}) => clone(db.plans.filter((plan) => !activeOnly || plan.active).sort((a, b) => (a.sort || 0) - (b.sort || 0))),
    getPlanByCode: async (code) => clone(db.plans.find((plan) => plan.code === code)),
    getPlanById: async (id) => clone(db.plans.find((plan) => plan.id === id)),
    upsertPlan: async (plan) => {
      const existing = db.plans.find((item) => item.code === plan.code);
      if (existing) Object.assign(existing, plan); else db.plans.push({ id: randomUUID(), ...plan });
      return clone(db.plans.find((item) => item.code === plan.code));
    },

    findOpenCheckout: async (userId, now) => clone(db.checkouts.filter((item) => item.user_id === userId && ["creating", "created"].includes(item.status) && new Date(item.expires_at) > new Date(now)).sort(byDate("created_at"))[0]),
    insertCheckout: async (row) => {
      if (db.checkouts.some((item) => item.user_id === row.user_id && ["creating", "created"].includes(item.status) && new Date(item.expires_at) > new Date())) return null;
      const record = { id: randomUUID(), created_at: stamp(), ...row };
      db.checkouts.push(record);
      return clone(record);
    },
    updateCheckout: async (id, patch) => { Object.assign(db.checkouts.find((item) => item.id === id) || {}, patch); },
    findCheckoutByAsaasId: async (asaasId) => clone(db.checkouts.find((item) => item.asaas_checkout_id === asaasId)),
    getLatestCheckoutPlan: async (userId) => db.checkouts.filter((item) => item.user_id === userId).sort(byDate("created_at"))[0]?.plan_id || null,

    getSubscriptionByUser: async (userId) => clone(db.subscriptions.filter((item) => item.user_id === userId).sort(byDate("created_at"))[0]),
    getSubscriptionByAsaasId: async (asaasId) => clone(db.subscriptions.find((item) => item.asaas_subscription_id === asaasId)),
    insertSubscription: async (row) => { const record = { id: randomUUID(), created_at: stamp(), version: 1, ...row }; db.subscriptions.push(record); return clone(record); },
    updateSubscription: async (id, patch, version) => {
      const record = db.subscriptions.find((item) => item.id === id);
      if (!record || (version !== undefined && record.version !== version)) return false;
      Object.assign(record, patch, { version: record.version + 1 });
      return true;
    },
    listSubscriptions: async () => clone(db.subscriptions.sort(byDate("created_at"))),

    insertEvent: async (row) => {
      const existing = db.events.find((item) => item.id === row.id);
      if (existing) return { inserted: false, event: clone(existing) };
      const record = { received_at: stamp(), attempts: 0, ...row };
      db.events.push(record);
      return { inserted: true, event: clone(record) };
    },
    updateEvent: async (id, patch) => { Object.assign(db.events.find((item) => item.id === id) || {}, patch); },
    getEvent: async (id) => clone(db.events.find((item) => item.id === id)),
    listEvents: async ({ status, limit = 100 } = {}) => clone(db.events.filter((item) => !status || item.status === status).sort(byDate("received_at")).slice(0, limit)),

    upsertPayment: async (row) => {
      const existing = db.payments.find((item) => item.asaas_payment_id === row.asaas_payment_id);
      if (existing) Object.assign(existing, row); else db.payments.push({ id: randomUUID(), created_at: stamp(), ...row });
    },
    getLatestPayment: async (userId) => clone(db.payments.filter((item) => item.user_id === userId).sort(byDate("created_at"))[0]),
    listPayments: async () => clone(db.payments),

    listGrants: async (userId) => clone(db.grants.filter((item) => !userId || item.user_id === userId)),
    insertGrant: async (row) => { const record = { id: randomUUID(), created_at: stamp(), ...row }; db.grants.push(record); return clone(record); },
    revokeGrant: async (id, revokedAt) => { const record = db.grants.find((item) => item.id === id); if (record) record.revoked_at = revokedAt; return clone(record); },

    insertAudit: async (row) => { db.audit.push({ id: randomUUID(), created_at: stamp(), ...row }); },
    listAudit: async ({ limit = 100 } = {}) => clone(db.audit.sort(byDate("created_at")).slice(0, limit)),
  };
}
