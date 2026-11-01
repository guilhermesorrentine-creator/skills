// Configuração do servidor. Segredos vêm só de variáveis de ambiente do servidor (nunca `VITE_`).
export function readConfig(env = process.env) {
  const asaasEnv = env.ASAAS_ENV === "production" && env.ASAAS_ALLOW_PRODUCTION === "true" ? "production" : "sandbox";
  // Em previews da Vercel, o retorno do checkout volta para o próprio preview (APP_URL é o domínio de produção).
  const previewUrl = env.VERCEL_ENV === "preview" && env.VERCEL_BRANCH_URL ? `https://${env.VERCEL_BRANCH_URL}` : "";
  return {
    appUrl: (previewUrl || env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    // Assina o retorno da compra sem cadastro. Sem CLAIM_SECRET, usa a chave de serviço (também secreta).
    claimSecret: env.CLAIM_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || env.ASAAS_WEBHOOK_TOKEN || "",
    asaas: {
      env: asaasEnv,
      apiKey: env.ASAAS_API_KEY || "",
      webhookToken: env.ASAAS_WEBHOOK_TOKEN || "",
      baseUrl: asaasEnv === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3",
      checkoutHost: asaasEnv === "production" ? "https://asaas.com" : "https://sandbox.asaas.com",
      checkoutMinutes: Math.min(1440, Math.max(10, Number(env.ASAAS_CHECKOUT_MINUTES) || 60)),
    },
    cakto: {
      offerId: env.CAKTO_OFFER_ID || "",
      checkoutSlug: env.CAKTO_CHECKOUT_SLUG || "",
      productId: env.CAKTO_PRODUCT_ID || "",
      webhookSecret: env.CAKTO_WEBHOOK_SECRET || "",
      // "1" quando a API de Conversões estiver ligada no produto da Cakto: ela envia o Purchase e o nosso servidor não repete.
      sendsPurchase: env.CAKTO_SENDS_PURCHASE === "1",
    },
    // E-mails de boas-vindas: Resend ou Gmail SMTP com senha de app, só no servidor.
    email: { apiKey: env.RESEND_API_KEY || "", from: env.EMAIL_FROM || "",
      gmailUser: env.GMAIL_SMTP_USER || "", gmailAppPassword: env.GMAIL_SMTP_APP_PASSWORD || "" },
    // API de Conversões do Meta (Purchase). O token é segredo; o ID do Pixel é público.
    meta: { appUrl: (previewUrl || env.APP_URL || "http://localhost:5173").replace(/\/$/, ""), pixelId: env.META_PIXEL_ID || env.VITE_META_PIXEL_ID || "", token: env.META_CAPI_TOKEN || "", testEventCode: env.META_TEST_EVENT_CODE || "",
      adsToken: env.META_ADS_TOKEN || "", adsAccountId: env.META_AD_ACCOUNT_ID || "", graphVersion: env.META_GRAPH_VERSION || "v24.0",
      instagramToken: env.META_INSTAGRAM_TOKEN || "", instagramUserId: env.META_INSTAGRAM_USER_ID || "",
      oauthAppId: env.META_OAUTH_APP_ID || "", oauthAppSecret: env.META_OAUTH_APP_SECRET || "", oauthEncryptionKey: env.META_OAUTH_ENCRYPTION_KEY || "" },
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
