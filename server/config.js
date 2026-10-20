// Configuração do servidor. Segredos vêm só de variáveis de ambiente do servidor (nunca `VITE_`).
export function readConfig(env = process.env) {
  const asaasEnv = env.ASAAS_ENV === "production" && env.ASAAS_ALLOW_PRODUCTION === "true" ? "production" : "sandbox";
  return {
    appUrl: (env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    asaas: {
      env: asaasEnv,
      apiKey: env.ASAAS_API_KEY || "",
      webhookToken: env.ASAAS_WEBHOOK_TOKEN || "",
      baseUrl: asaasEnv === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3",
      checkoutHost: asaasEnv === "production" ? "https://asaas.com" : "https://sandbox.asaas.com",
      checkoutMinutes: Math.min(1440, Math.max(10, Number(env.ASAAS_CHECKOUT_MINUTES) || 60)),
    },
    cancelEnabled: env.BILLING_CANCEL_ENABLED !== "false",
    // Atalho de desenvolvimento local: só existe fora da Vercel e fora de produção.
    devBypass: env.BT_DEV_BYPASS === "1" && !env.VERCEL && env.NODE_ENV !== "production",
  };
}

export function assertConfigured(config, parts) {
  const missing = [];
  if (parts.includes("supabase") && (!config.supabaseUrl || !config.supabaseServiceKey)) missing.push("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  if (parts.includes("asaas") && !config.asaas.apiKey) missing.push("ASAAS_API_KEY");
  if (parts.includes("webhook") && !config.asaas.webhookToken) missing.push("ASAAS_WEBHOOK_TOKEN");
  if (missing.length) {
    const error = new Error(`Configuração ausente no servidor: ${missing.join(", ")}.`);
    error.status = 503; error.code = "not_configured";
    throw error;
  }
}
