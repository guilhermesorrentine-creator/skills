// /oferta estática (tráfego pago): funil próprio, aviso de cookies, Pixel com consentimento e compra direta na Cakto.
// Sem React: a página aparece com o HTML e este arquivo só acrescenta os eventos. Mesmas chaves do app.
(() => {
  const body = document.body;
  const CHECKOUT = body.dataset.checkout;
  const PIXEL = /^\d{5,20}$/.test(body.dataset.pixel || "") ? body.dataset.pixel : "";
  const CONSENT = "voxelia:consent:v1";
  const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
  const write = (store, key, value) => { try { store.setItem(key, value); } catch { /* navegação privada */ } };
  const params = new URLSearchParams(location.search);

  let sid = read(localStorage, "vx-sid");
  if (!sid && window.crypto?.getRandomValues) {
    sid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
    write(localStorage, "vx-sid", sid);
  }
  let origin = null;
  try { origin = JSON.parse(read(sessionStorage, "vx-origin") || "null"); } catch { /* inválido */ }
  if (!origin || params.get("utm_source")) {
    let ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch { /* inválido */ }
    origin = { source: params.get("utm_source") || (ref && !ref.endsWith(location.hostname) ? ref : "direto"),
      campaign: params.get("utm_campaign") || "", content: params.get("utm_content") || "" };
    write(sessionStorage, "vx-origin", JSON.stringify(origin));
  }
  const funnel = (name, extra = {}) => {
    if (!sid) return;
    const data = JSON.stringify({ name, sid, path: location.pathname, ...origin, ...extra });
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/funnel", new Blob([data], { type: "application/json" }))) return; } catch { /* fetch */ }
    fetch("/api/funnel", { method: "POST", headers: { "content-type": "application/json" }, body: data, keepalive: true }).catch(() => {});
  };

  // Pixel do Meta só com consentimento (LGPD), igual ao restante do site.
  let pixelReady = false;
  const pixel = () => {
    if (pixelReady || !PIXEL || read(localStorage, CONSENT) !== "granted") return pixelReady;
    if (!window.fbq) {
      const fbq = function (...args) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
      Object.assign(fbq, { push: fbq, loaded: true, version: "2.0", queue: [] });
      window.fbq = window._fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
    pixelReady = true;
    return true;
  };
  const banner = document.getElementById("consent");
  if (PIXEL && banner && !read(localStorage, CONSENT)) {
    banner.hidden = false;
    banner.addEventListener("click", (event) => {
      const choice = event.target.closest("button")?.dataset.consent;
      if (!choice) return;
      write(localStorage, CONSENT, choice);
      banner.hidden = true;
      pixel();
    });
  }
  pixel();

  // Preço de lançamento: o aviso some sozinho em 16/11/2026 (o preço novo exige rebuild de qualquer forma).
  if (Date.now() >= Date.parse("2026-11-16T00:00:00-03:00")) document.querySelectorAll("[data-launch]").forEach((el) => el.remove());

  funnel("view");
  const price = document.getElementById("preco");
  if (price && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { funnel("buy_page"); seen.disconnect(); } }, { threshold: 0.3 });
    seen.observe(price);
  }

  // Compra: o pedido local nasce no webhook da Cakto com este callback; aqui nada espera o servidor.
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c / 4)).toString(16)));
  const checkoutUrl = () => {
    const order = uuid();
    const url = new URL(CHECKOUT);
    url.searchParams.set("callback", order);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (params.get(key)) url.searchParams.set(key, params.get(key));
    return { order, href: url.href };
  };
  const buy = (event) => {
    if (!CHECKOUT) return;
    event?.preventDefault();
    const { order, href } = checkoutUrl();
    funnel("buy_click");
    funnel("checkout", { order });
    if (pixel()) window.fbq("track", "InitiateCheckout", { currency: "BRL", value: Number(body.dataset.price || 0), content_ids: ["voxelia-vitalicio"], content_type: "product" });
    document.querySelectorAll("[data-buy]").forEach((el) => { el.setAttribute("aria-busy", "true"); el.textContent = "Abrindo o pagamento…"; });
    location.href = href;
  };
  document.querySelectorAll("[data-buy]").forEach((el) => { el.dataset.label = el.textContent; el.addEventListener("click", buy); });
  // Voltou da Cakto pelo botão "voltar": o navegador restaura a página como estava; devolve o texto do botão.
  addEventListener("pageshow", () => document.querySelectorAll("[data-buy]").forEach((el) => { el.removeAttribute("aria-busy"); el.textContent = el.dataset.label; }));
  if (params.get("comprar") === "1") buy();
})();
