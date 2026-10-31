import { createHmac, timingSafeEqual } from "node:crypto";

const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
// Preço da oferta vitalícia na Cakto. Mudar aqui exige o mesmo valor no produto Cakto, em commercial_editions e em src/lib/billing-client.js.
export const CAKTO_PRICE_CENTS = 3990;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function caktoCheckoutUrl(checkoutSlug, orderId) {
  if (!/^[a-zA-Z0-9_-]{4,80}$/.test(checkoutSlug || "") || !UUID.test(orderId || ""))
    throw httpError(503, "cakto_not_configured", "Checkout Cakto indisponível.");
  const url = new URL(`https://pay.cakto.com.br/${checkoutSlug}`);
  url.searchParams.set("callback", orderId);
  return url.href;
}

export function verifyCaktoWebhook(rawBody, timestamp, signature, secret, now = Date.now()) {
  if (!secret || !Buffer.isBuffer(rawBody) || rawBody.length > 1_000_000 || !/^\d{10}$/.test(timestamp || "")) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 300_000) return false;
  const expected = `v1=${createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex")}`;
  return String(signature || "").split(",").some((part) => {
    const given = Buffer.from(part.trim());
    const wanted = Buffer.from(expected);
    return given.length === wanted.length && timingSafeEqual(given, wanted);
  });
}

const cents = (value) => Math.round(Number(value) * 100);

// A Cakto pode repassar ao comprador uma taxa (`charged_fees`, ex.: R$ 0,99 no Pix): o preço da oferta
// continua 39,90 e o valor pago é preço + taxa. Desconto não é aceito (cupons desligados).
function paidOfferPrice(data) {
  const fees = cents(data.charged_fees || 0);
  return cents(data.offer?.price) === CAKTO_PRICE_CENTS && cents(data.discount || 0) === 0
    && fees >= 0 && fees < CAKTO_PRICE_CENTS && cents(data.amount) === CAKTO_PRICE_CENTS + fees;
}

export function validCaktoOrder(data, config) {
  return Boolean(data && UUID.test(data.id || "") && UUID.test(data.callback || "")
    && data.offer_type === "main" && !data.subscription
    && String(data.product?.id || "") === config.productId
    && String(data.offer?.id || "") === config.offerId
    && data.product?.type === "unique" && data.currency === "BRL" && data.offer?.currency === "BRL"
    && paidOfferPrice(data)
    && Number(data.installments) === 1 && typeof data.customer?.email === "string");
}

export function approvedCaktoPurchase(data, config) {
  return validCaktoOrder(data, config) && data.status === "paid" && Boolean(data.paidAt);
}
