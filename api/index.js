import handle from "../server/app.js";
import { readConfig } from "../server/config.js";
import { createConversions } from "../server/meta.js";

// Uma única função atende /api/* (limite de funções do plano Hobby). A rewrite em vercel.json
// encaminha subcaminhos (ex.: /api/admin/overview) para cá; o roteamento usa a URL original.
export const GET = handle;
export const POST = async (request) => {
  const url = new URL(request.url);
  if (process.env.VERCEL_ENV === "preview" && url.pathname === "/api/__validation/meta-purchase-20261025") {
    const config = readConfig();
    const conversions = createConversions({ ...config.meta, testEventCode: "TEST18095" });
    if (!conversions) return Response.json({ error: "meta_not_configured" }, { status: 503 });
    const paymentId = "sandbox-validation-20261025-001";
    const sent = await conversions.subscriptionPurchase({
      subscription: {
        user_id: "meta-test-user",
        ad_tracking: { consent: true, pageUrl: "https://skills-c4rx6qpw3-guilherme-s-projects28.vercel.app/oferta" },
        attribution: { source: "meta", campaign: "teste_vendas40", content: "C" },
      },
      payment: { asaas_payment_id: paymentId, value_cents: 4990 },
      eventTime: new Date(),
    });
    return Response.json({ sent, eventId: `purchase-subscription-${paymentId}`, value: 49.9, currency: "BRL", pixelId: config.meta.pixelId });
  }
  return handle(request);
};
