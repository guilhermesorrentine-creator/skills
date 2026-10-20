// Armazenamento no Postgres do Supabase com a chave de serviço (somente no servidor).
// Esquema e RLS: `supabase/migrations/`.
import { createClient } from "@supabase/supabase-js";

export function createSupabaseStore({ url, serviceKey }) {
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const must = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message), { status: 500, code: "db_error" }); return data; };
  const one = async (query) => must(await query.maybeSingle());
  const many = async (query) => must(await query) || [];

  return {
    client: db,
    getProfile: (id) => one(db.from("profiles").select("*").eq("id", id)),
    findProfileByCustomer: (customer) => one(db.from("profiles").select("*").eq("asaas_customer_id", customer)),
    setCustomerId: async (id, customer) => { must(await db.from("profiles").update({ asaas_customer_id: customer }).eq("id", id)); },
    listProfiles: () => many(db.from("profiles").select("id,email,is_admin,asaas_customer_id,created_at").order("created_at", { ascending: false }).limit(500)),

    listPlans: ({ activeOnly = true } = {}) => { let query = db.from("plans").select("*").order("sort"); if (activeOnly) query = query.eq("active", true); return many(query); },
    getPlanByCode: (code) => one(db.from("plans").select("*").eq("code", code)),
    getPlanById: (id) => one(db.from("plans").select("*").eq("id", id)),
    upsertPlan: async (plan) => must(await db.from("plans").upsert(plan, { onConflict: "code" }).select().single()),

    findOpenCheckout: (userId, now) => one(db.from("checkout_sessions").select("*").eq("user_id", userId).in("status", ["creating", "created"]).gt("expires_at", new Date(now).toISOString()).order("created_at", { ascending: false }).limit(1)),
    insertCheckout: async (row) => {
      const { data, error } = await db.from("checkout_sessions").insert(row).select().single();
      if (error?.code === "23505") return null; // já existe intenção aberta para o usuário
      return must({ data, error });
    },
    updateCheckout: async (id, patch) => { must(await db.from("checkout_sessions").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id)); },
    findCheckoutByAsaasId: (asaasId) => one(db.from("checkout_sessions").select("*").eq("asaas_checkout_id", asaasId)),
    getLatestCheckoutPlan: async (userId) => (await one(db.from("checkout_sessions").select("plan_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)))?.plan_id || null,

    getSubscriptionByUser: (userId) => one(db.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)),
    getSubscriptionByAsaasId: (asaasId) => one(db.from("subscriptions").select("*").eq("asaas_subscription_id", asaasId)),
    insertSubscription: async (row) => must(await db.from("subscriptions").insert(row).select().single()),
    // Concorrência otimista: só grava se a versão lida ainda for a atual.
    updateSubscription: async (id, patch, version) => {
      let query = db.from("subscriptions").update({ ...patch, version: (version ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", id);
      if (version !== undefined) query = query.eq("version", version);
      return (must(await query.select("id")) || []).length > 0;
    },
    listSubscriptions: () => many(db.from("subscriptions").select("*, profiles(email), plans(name, code)").order("created_at", { ascending: false }).limit(500)),

    insertEvent: async (row) => {
      const { data, error } = await db.from("asaas_webhook_events").insert(row).select().single();
      if (error?.code === "23505") return { inserted: false, event: await one(db.from("asaas_webhook_events").select("*").eq("id", row.id)) };
      return { inserted: true, event: must({ data, error }) };
    },
    updateEvent: async (id, patch) => { must(await db.from("asaas_webhook_events").update(patch).eq("id", id)); },
    getEvent: (id) => one(db.from("asaas_webhook_events").select("*").eq("id", id)),
    listEvents: ({ status, limit = 100 } = {}) => { let query = db.from("asaas_webhook_events").select("*").order("received_at", { ascending: false }).limit(limit); if (status) query = query.eq("status", status); return many(query); },

    upsertPayment: async (row) => { must(await db.from("payment_records").upsert(row, { onConflict: "asaas_payment_id" })); },
    getLatestPayment: (userId) => one(db.from("payment_records").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1)),
    listPayments: () => many(db.from("payment_records").select("*").order("created_at", { ascending: false }).limit(500)),

    listGrants: (userId) => { let query = db.from("access_grants").select("*").order("created_at", { ascending: false }); if (userId) query = query.eq("user_id", userId); return many(query); },
    insertGrant: async (row) => must(await db.from("access_grants").insert(row).select().single()),
    revokeGrant: async (id, revokedAt) => must(await db.from("access_grants").update({ revoked_at: revokedAt }).eq("id", id).select().single()),

    insertAudit: async (row) => { must(await db.from("audit_logs").insert(row)); },
    listAudit: ({ limit = 100 } = {}) => many(db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit)),

    // Valida o JWT do Supabase Auth enviado pelo navegador.
    verifyToken: async (token) => {
      const { data, error } = await db.auth.getUser(token);
      return error || !data?.user ? null : { id: data.user.id, email: data.user.email };
    },
  };
}
