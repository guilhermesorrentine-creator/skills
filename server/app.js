// Monta a API com as dependências reais a partir das variáveis de ambiente do servidor.
import { readFile } from "node:fs/promises";
import { readConfig, assertConfigured } from "./config.js";
import { createAsaasClient } from "./asaas.js";
import { createBilling } from "./billing.js";
import { createApi, json } from "./routes.js";
import { createSupabaseStore } from "./store-supabase.js";
import { createMemoryStore } from "./store-memory.js";

let handler;
let catalogCache;
// Fora de `public/`: o catálogo completo só sai por `/api/catalog`, com autorização.
const loadCatalog = async () => (catalogCache ||= JSON.parse(await readFile(new URL("../src/data/catalog.json", import.meta.url), "utf8")));

function build() {
  const config = readConfig();
  if (config.devBypass) {
    console.warn("[api] BT_DEV_BYPASS ativo: acesso local sem login (somente desenvolvimento).");
    const store = createMemoryStore();
    return createApi({ store, billing: createBilling({ store, asaas: null, config }), verifyToken: async () => null, loadCatalog, devUser: { id: "dev", email: "dev@localhost" } });
  }
  try { assertConfigured(config, ["supabase"]); } catch (error) { return async () => json(503, { error: error.code, message: error.message }); }
  const store = createSupabaseStore({ url: config.supabaseUrl, serviceKey: config.supabaseServiceKey });
  const asaas = config.asaas.apiKey ? createAsaasClient(config.asaas) : missingAsaas();
  return createApi({ store, billing: createBilling({ store, asaas, config }), verifyToken: store.verifyToken, loadCatalog });
}

function missingAsaas() {
  const fail = async () => { const config = readConfig(); assertConfigured(config, ["asaas"]); };
  return { createCheckout: fail, getSubscription: fail, listSubscriptionPayments: fail, listCustomerSubscriptions: fail, cancelSubscription: fail };
}

export default function handle(request) {
  handler ||= build();
  return handler(request);
}
