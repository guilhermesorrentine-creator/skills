// API de Conversões do Meta: o evento Purchase sai do servidor quando o Asaas confirma o
// pagamento, só para quem aceitou cookies de marketing no site (consentimento salvo no pedido).
// Sem META_PIXEL_ID/META_CAPI_TOKEN nada é enviado. Falha no envio nunca bloqueia a licença.
import { createHash } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";
const FB_COOKIE = /^fb\.\d\.\d{10,16}\.[\w.-]{1,200}$/;
const sha256 = (value) => createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");

// Dados do navegador guardados no pedido. Só existe com consentimento; tudo validado e limitado.
export function readTracking(input, request) {
  if (!input || input.consent !== true) return null;
  const pick = (value) => (typeof value === "string" && FB_COOKIE.test(value) ? value : null);
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64) || null;
  const pageUrl = typeof input.pageUrl === "string" && /^https:\/\/[^\s]{1,500}$/.test(input.pageUrl) ? input.pageUrl : null;
  return {
    consent: true,
    fbp: pick(input.fbp),
    fbc: pick(input.fbc),
    ip,
    userAgent: (request.headers.get("user-agent") || "").slice(0, 400) || null,
    pageUrl,
  };
}

export function createConversions({ pixelId, token, testEventCode }, fetcher = fetch) {
  if (!pixelId || !token) return null;
  return {
    // `order.ad_tracking` vem de readTracking; sem consentimento, não envia.
    async purchase({ order, email, editionCode, eventTime }) {
      const tracking = order.ad_tracking;
      if (!tracking?.consent) return false;
      const userData = { external_id: [sha256(order.user_id)] };
      if (email) userData.em = [sha256(email)];
      if (tracking.fbp) userData.fbp = tracking.fbp;
      if (tracking.fbc) userData.fbc = tracking.fbc;
      if (tracking.ip) userData.client_ip_address = tracking.ip;
      if (tracking.userAgent) userData.client_user_agent = tracking.userAgent;
      const event = {
        event_name: "Purchase",
        event_time: Math.floor(eventTime.getTime() / 1000),
        event_id: `purchase-${order.id}`,
        action_source: "website",
        user_data: userData,
        custom_data: { currency: "BRL", value: order.amount_cents / 100, content_ids: editionCode ? [editionCode] : [], content_type: "product" },
      };
      if (tracking.pageUrl) event.event_source_url = tracking.pageUrl;
      const body = { data: [event], access_token: token };
      if (testEventCode) body.test_event_code = testEventCode;
      const response = await fetcher(`${GRAPH}/${encodeURIComponent(pixelId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Meta recusou o evento (${response.status}).`);
      return true;
    },
  };
}
