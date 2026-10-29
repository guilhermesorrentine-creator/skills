// Monta a API com as dependências reais a partir das variáveis de ambiente do servidor.
import { readFile } from "node:fs/promises";
import { readConfig, assertConfigured } from "./config.js";
import { createAsaasClient } from "./asaas.js";
import { createCommerce } from "./commerce.js";
import { createLibrary } from "./library.js";
import { createMe } from "./me.js";
import { createMcp } from "./mcp.js";
import { createMailer } from "./email.js";
import { createOnboarding } from "./onboarding.js";
import { createConversions } from "./meta.js";
import { createMetaOAuth } from "./meta-oauth.js";
import { createApi, json } from "./routes.js";
import { createSupabaseStore } from "./store-supabase.js";
import { createMemoryStore } from "./store-memory.js";

let handler;
let catalogCache;
// Fora de `public/`: o catálogo só sai pela API, depois da autorização.
const loadCatalog = async () => (catalogCache ||= JSON.parse(await readFile(new URL("../src/data/catalog.json", import.meta.url), "utf8")));

function assemble(store, asaas, config, extra = {}) {
  const library = createLibrary({ store, loadCatalog });
  const onboarding = createOnboarding({ store, mailer: createMailer(config.email), config });
  const commerce = createCommerce({ store, asaas, config, onboarding, conversions: createConversions(config.meta) });
  const mcp = createMcp({ store, commerce, library, loadCatalog, config });
  const metaOAuth = createMetaOAuth({ store, config: config.meta });
  return createApi({ store, commerce, onboarding, library, me: createMe({ store, library }), mcp, asaas, caktoConfig: config.cakto, dashboardConfig: config.meta, metaOAuth, ...extra });
}

function build() {
  const config = readConfig();
  if (config.devBypass) {
    console.warn("[api] BT_DEV_BYPASS ativo: acesso local sem login (somente desenvolvimento).");
    return assemble(createMemoryStore(), null, config, { verifyToken: async () => null, devUser: { id: "00000000-0000-0000-0000-000000000000", email: "dev@localhost" } });
  }
  try { assertConfigured(config, ["supabase"]); } catch (error) { return async () => json(503, { error: error.code, message: error.message }); }
  const store = createSupabaseStore({ url: config.supabaseUrl, serviceKey: config.supabaseServiceKey });
  const asaas = config.asaas.apiKey ? createAsaasClient(config.asaas) : { createCheckout: missing, listCustomerPayments: missing };
  return assemble(store, asaas, config, { verifyToken: store.verifyToken });
}

async function missing() { assertConfigured(readConfig(), ["asaas"]); }

export default function handle(request) {
  handler ||= build();
  return handler(request);
}
