// Armazenamento no Postgres do Supabase com a chave de serviço (somente no servidor).
// Esquema e RLS: `supabase/migrations/`.
import { createClient } from "@supabase/supabase-js";

// Link de criar/redefinir senha: nossa página com o token "hasheado". A verificação só acontece quando a
// pessoa envia a senha, então prévias do WhatsApp e robôs de e-mail abrem o link sem gastar o uso único
// (o link padrão do Supabase é consumido no primeiro acesso, e a pessoa via "link expirado").
const passwordLink = (page, tokenHash, type) => `${page}?${new URLSearchParams({ token_hash: tokenHash, type })}`;

export function createSupabaseStore({ url, serviceKey }) {
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const must = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message), { status: 500, code: "db_error" }); return data; };
  const one = async (query) => must(await query.maybeSingle());
  const many = async (query) => must(await query) || [];
  const run = async (query) => { must(await query); };
  const now = () => new Date().toISOString();
  const insertOrNull = async (table, row) => {
    const { data, error } = await db.from(table).insert(row).select().single();
    if (error?.code === "23505") return null;
    return must({ data, error });
  };

  return {
    getProfile: (id) => one(db.from("profiles").select("*").eq("id", id)),
    findProfileByEmail: (email) => one(db.from("profiles").select("*").eq("email", email.toLowerCase())),
    // Cria a conta pelo Auth sem enviar o e-mail padrão do Supabase; devolve o link de criar senha.
    createInvitedUser: async (email, redirectTo) => {
      const { data, error } = await db.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
      if (error) throw Object.assign(new Error(error.message), { status: 400, code: "invite_failed" });
      return { userId: data.user.id, actionUrl: passwordLink(redirectTo, data.properties.hashed_token, "invite") };
    },
    // Conta criada mas nunca usada: novo link de uso único para criar a senha (convite reenviado).
    createPasswordLink: async (email, redirectTo) => {
      const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
      if (error) throw Object.assign(new Error(error.message), { status: 400, code: "invite_failed" });
      return passwordLink(redirectTo, data.properties.hashed_token, "recovery");
    },
    // Versão do link de conexão MCP (nos metadados do usuário): trocar o link invalida o anterior.
    getMcpVersion: async (userId) => {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) return 0;
      return Number(data?.user?.app_metadata?.mcp_v) || 1;
    },
    setMcpVersion: async (userId, version) => {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) throw error;
      const { error: updateError } = await db.auth.admin.updateUserById(userId, { app_metadata: { ...(data.user.app_metadata || {}), mcp_v: version } });
      if (updateError) throw updateError;
    },
    hasSignedIn: async (userId) => {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) throw error;
      return Boolean(data?.user?.last_sign_in_at);
    },
    findProfileByCustomer: (customer) => one(db.from("profiles").select("*").eq("asaas_customer_id", customer)),
    setCustomerId: (id, customer) => run(db.from("profiles").update({ asaas_customer_id: customer }).eq("id", id)),
    listProfiles: () => many(db.from("profiles").select("id,email,is_admin,asaas_customer_id,created_at").order("created_at", { ascending: false }).limit(1000)),

    listEditions: ({ onSaleOnly = true } = {}) => { let query = db.from("commercial_editions").select("*").order("rank"); if (onSaleOnly) query = query.eq("on_sale", true); return many(query); },
    getEditionByCode: (code) => one(db.from("commercial_editions").select("*").eq("code", code)),
    upsertEdition: async (edition) => must(await db.from("commercial_editions").upsert({ ...edition, updated_at: now() }, { onConflict: "code" }).select().single()),

    getPlanByCode: (code) => one(db.from("plans").select("*").eq("code", code)),
    insertCheckoutSession: (row) => insertOrNull("checkout_sessions", row),
    updateCheckoutSession: (id, patch) => run(db.from("checkout_sessions").update({ ...patch, updated_at: now() }).eq("id", id)),
    getCheckoutSession: (id) => (/^[0-9a-f-]{36}$/i.test(id) ? one(db.from("checkout_sessions").select("*").eq("id", id)) : null),
    findCheckoutSessionByAsaas: (id) => one(db.from("checkout_sessions").select("*").eq("asaas_checkout_id", id)),
    findCheckoutSessionByCustomer: (id) => one(db.from("checkout_sessions").select("*").eq("asaas_customer_id", id).eq("status", "paid").order("created_at", { ascending: false }).limit(1)),
    getOpenCheckoutSession: (userId, at) => one(db.from("checkout_sessions").select("*").eq("user_id", userId).in("status", ["creating", "created"]).gt("expires_at", new Date(at).toISOString()).order("created_at", { ascending: false }).limit(1)),
    listCheckoutSessions: (userId) => many(db.from("checkout_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)),
    insertSubscription: (row) => insertOrNull("subscriptions", row),
    updateSubscription: (id, patch) => run(db.from("subscriptions").update({ ...patch, updated_at: now() }).eq("id", id)),
    findSubscriptionByAsaas: (id) => one(db.from("subscriptions").select("*").eq("asaas_subscription_id", id)),
    listSubscriptions: (userId) => { let query = db.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(userId ? 20 : 1000); if (userId) query = query.eq("user_id", userId); return many(query); },
    getSubscription: (id) => (/^[0-9a-f-]{36}$/i.test(id) ? one(db.from("subscriptions").select("*").eq("id", id)) : null),
    upsertSubscriptionPayment: async (row) => {
      const { data, error } = await db.from("payment_records").insert(row).select().single();
      if (!error) return data;
      if (error.code !== "23505") return must({ data, error });
      let query = db.from("payment_records").update(row).eq("asaas_payment_id", row.asaas_payment_id);
      if (row.status !== "REFUNDED") query = row.status === "CONFIRMED" || row.status === "RECEIVED"
        ? query.neq("status", "REFUNDED") : query.not("status", "in", "(CONFIRMED,RECEIVED,REFUNDED)");
      must(await query);
      return one(db.from("payment_records").select("*").eq("asaas_payment_id", row.asaas_payment_id));
    },
    getSubscriptionPayment: (id) => one(db.from("payment_records").select("*").eq("asaas_payment_id", id)),
    listSubscriptionPayments: (subscriptionId) => { let query = db.from("payment_records").select("*").order("confirmed_at").limit(subscriptionId ? 100 : 1000); if (subscriptionId) query = query.eq("subscription_id", subscriptionId); return many(query); },

    getOpenOrder: (userId, at) => one(db.from("orders").select("*").eq("user_id", userId).in("status", ["creating", "pending"]).or(`expires_at.is.null,expires_at.gt.${new Date(at).toISOString()}`).order("created_at", { ascending: false }).limit(1)),
    insertOrder: (row) => insertOrNull("orders", row),
    updateOrder: (id, patch) => run(db.from("orders").update({ ...patch, updated_at: now() }).eq("id", id)),
    getOrder: (id) => (/^[0-9a-f-]{36}$/i.test(id) ? one(db.from("orders").select("*").eq("id", id)) : null),
    findOrderByCheckout: (checkoutId) => one(db.from("orders").select("*").eq("asaas_checkout_id", checkoutId)),
    listOrders: (userId) => { let query = db.from("orders").select("*").order("created_at", { ascending: false }).limit(1000); if (userId) query = query.eq("user_id", userId); return many(query); },

    getPayment: (id) => one(db.from("payments").select("*").eq("asaas_payment_id", id)),
    findPaymentByOrder: (orderId) => one(db.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1)),
    upsertPayment: async (row) => {
      const existing = await one(db.from("payments").select("order_id,refunded_cents").eq("asaas_payment_id", row.asaas_payment_id));
      await run(db.from("payments").upsert({ ...row, refunded_cents: row.refunded_cents ?? existing?.refunded_cents ?? 0, order_id: row.order_id || existing?.order_id || null, updated_at: now() }, { onConflict: "asaas_payment_id" }));
    },
    listPayments: () => many(db.from("payments").select("*").order("created_at", { ascending: false }).limit(1000)),

    getLicense: (userId) => one(db.from("lifetime_licenses").select("*").eq("user_id", userId)),
    insertLicense: async (row) => must(await db.from("lifetime_licenses").insert(row).select().single()),
    // Concorrência otimista: só grava se a versão lida ainda for a atual.
    updateLicense: async (id, patch, version) => {
      let query = db.from("lifetime_licenses").update({ ...patch, version: (version ?? 0) + 1, updated_at: now() }).eq("id", id);
      if (version !== undefined) query = query.eq("version", version);
      return (must(await query.select("id")) || []).length > 0;
    },
    listLicenses: () => many(db.from("lifetime_licenses").select("*").order("activated_at", { ascending: false }).limit(1000)),
    insertLicenseEvent: (row) => run(db.from("license_events").insert(row)),
    listLicenseEvents: (userId) => { let query = db.from("license_events").select("*").order("created_at", { ascending: false }).limit(500); if (userId) query = query.eq("user_id", userId); return many(query); },

    insertEvent: async (row) => {
      const { data, error } = await db.from("asaas_webhook_events").insert(row).select().single();
      if (error?.code === "23505") return { inserted: false, event: await one(db.from("asaas_webhook_events").select("*").eq("id", row.id)) };
      return { inserted: true, event: must({ data, error }) };
    },
    updateEvent: (id, patch) => run(db.from("asaas_webhook_events").update(patch).eq("id", id)),
    getEvent: (id) => one(db.from("asaas_webhook_events").select("*").eq("id", id)),
    listEvents: ({ status, limit = 100 } = {}) => { let query = db.from("asaas_webhook_events").select("*").order("received_at", { ascending: false }).limit(limit); if (status) query = query.eq("status", status); return many(query); },

    listGrants: (userId) => { let query = db.from("access_grants").select("*").order("created_at", { ascending: false }); if (userId) query = query.eq("user_id", userId); return many(query); },
    insertGrant: async (row) => must(await db.from("access_grants").insert(row).select().single()),
    revokeGrant: async (id, revokedAt) => one(db.from("access_grants").update({ revoked_at: revokedAt }).eq("id", id).select()),
    insertAudit: (row) => run(db.from("audit_logs").insert(row)),
    insertFunnelEvent: (row) => run(db.from("funnel_events").insert(row)),
    listFunnelEvents: (since) => many(db.from("funnel_events").select("*").gte("at", since).order("at", { ascending: false }).limit(20000)),
    listAudit: ({ limit = 100 } = {}) => many(db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit)),
    listDashboardExpenses: () => many(db.from("dashboard_expenses").select("*").order("starts_on", { ascending: false })),
    saveDashboardExpense: async (row) => {
      if (row.id) return must(await db.from("dashboard_expenses").update({ ...row, updated_at: now() }).eq("id", row.id).select().single());
      return must(await db.from("dashboard_expenses").insert(row).select().single());
    },
    deleteDashboardExpense: (id) => one(db.from("dashboard_expenses").delete().eq("id", id).select()),
    getDashboardSettings: () => one(db.from("dashboard_settings").select("*").eq("id", true)),
    saveDashboardSettings: async (row) => must(await db.from("dashboard_settings").upsert({ id: true, ...row, updated_at: now() }).select().single()),
    listDashboardNotes: () => many(db.from("dashboard_notes").select("*").order("path")),
    saveDashboardNote: async (row) => must(await db.from("dashboard_notes").upsert({ ...row, imported_at: now() }, { onConflict: "path" }).select().single()),
    listDashboardAdLinks: () => many(db.from("dashboard_ad_links").select("*")),
    saveDashboardAdLink: async (row) => must(await db.from("dashboard_ad_links").upsert({ ...row, updated_at: now() }, { onConflict: "entity_kind,entity_id" }).select().single()),
    getDashboardCache: (key) => one(db.from("dashboard_cache").select("*").eq("key", key)),
    saveDashboardCache: (key, payload) => run(db.from("dashboard_cache").upsert({ key, payload, checked_at: now() }, { onConflict: "key" })),

    listResources: ({ status } = {}) => { let query = db.from("resources").select("*").order("title"); if (status) query = query.eq("status", status); return many(query); },
    getResource: (id) => one(db.from("resources").select("*").eq("id", id)),
    upsertResource: async (row) => must(await db.from("resources").upsert({ ...row, updated_at: now() }, { onConflict: "id" }).select().single()),
    listRelations: () => many(db.from("resource_relations").select("*")),
    setRelations: async (fromId, rows) => {
      await run(db.from("resource_relations").delete().eq("from_id", fromId));
      if (rows.length) await run(db.from("resource_relations").insert(rows));
    },
    listGoalPaths: ({ status } = {}) => { let query = db.from("goal_paths").select("*").order("goal"); if (status) query = query.eq("status", status); return many(query); },
    upsertGoalPath: async (row) => {
      if (row.id) {
        const current = await one(db.from("goal_paths").select("version").eq("id", row.id));
        return must(await db.from("goal_paths").update({ ...row, version: (current?.version || 0) + 1, updated_at: now() }).eq("id", row.id).select().single());
      }
      return must(await db.from("goal_paths").insert(row).select().single());
    },

    listCollections: (userId) => many(db.from("collections").select("*").eq("user_id", userId).order("updated_at", { ascending: false })),
    getCollection: (id) => (/^[0-9a-f-]{36}$/i.test(id) ? one(db.from("collections").select("*").eq("id", id)) : null),
    getCollectionByShareToken: (token) => one(db.from("collections").select("*").eq("share_token", token)),
    insertCollection: async (row) => must(await db.from("collections").insert(row).select().single()),
    updateCollection: (id, patch) => run(db.from("collections").update(patch).eq("id", id)),
    deleteCollection: (id) => run(db.from("collections").delete().eq("id", id)),
    listCollectionItems: (id) => many(db.from("collection_items").select("*").eq("collection_id", id)),
    insertCollectionItem: (row) => run(db.from("collection_items").upsert(row, { onConflict: "collection_id,resource_id" })),
    deleteCollectionItem: (id, resourceId) => run(db.from("collection_items").delete().eq("collection_id", id).eq("resource_id", resourceId)),
    setCollectionOrder: async (id, order) => {
      for (const [position, resourceId] of order.entries()) await run(db.from("collection_items").update({ position }).eq("collection_id", id).eq("resource_id", resourceId));
    },

    listFavorites: (userId) => many(db.from("favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false })),
    addFavorite: (userId, resourceId) => run(db.from("favorites").upsert({ user_id: userId, resource_id: resourceId }, { onConflict: "user_id,resource_id", ignoreDuplicates: true })),
    removeFavorite: (userId, resourceId) => run(db.from("favorites").delete().eq("user_id", userId).eq("resource_id", resourceId)),
    listRecent: (userId) => many(db.from("recent_items").select("*").eq("user_id", userId).order("visited_at", { ascending: false }).limit(30)),
    upsertRecent: async (userId, resourceId, visitedAt, max) => {
      await run(db.from("recent_items").upsert({ user_id: userId, resource_id: resourceId, visited_at: visitedAt }, { onConflict: "user_id,resource_id" }));
      const rows = await many(db.from("recent_items").select("resource_id").eq("user_id", userId).order("visited_at", { ascending: false }).range(max, max + 200));
      if (rows.length) await run(db.from("recent_items").delete().eq("user_id", userId).in("resource_id", rows.map((row) => row.resource_id)));
    },
    clearRecent: (userId) => run(db.from("recent_items").delete().eq("user_id", userId)),

    // Valida o JWT do Supabase Auth enviado pelo navegador.
    verifyToken: async (token) => {
      const { data, error } = await db.auth.getUser(token);
      return error || !data?.user ? null : { id: data.user.id, email: data.user.email };
    },
  };
}
