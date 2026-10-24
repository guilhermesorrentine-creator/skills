import test from "node:test";
import assert from "node:assert/strict";
import { loadInstagramReels } from "./instagram.js";

test("Instagram sem credencial não apresenta zeros falsos", async () => {
  const result = await loadInstagramReels({}, "2026-10-01", "2026-10-31");
  assert.equal(result.rows.length, 0);
  assert.match(result.error, /token da Meta Ads/);
});

test("reutiliza token da Meta Ads e descobre apenas @voxelia.ia", async () => {
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(url);
    const metric = new URL(url).searchParams.get("metric");
    if (url.includes("/me/accounts")) return { ok: true, json: async () => ({ data: [{ instagram_business_account: { id: "91", username: "outra.conta" } }, { instagram_business_account: { id: "42", username: "voxelia.ia" } }] }) };
    if (metric) return { ok: true, json: async () => ({ data: [{ name: metric, total_value: { value: 5 } }] }) };
    return { ok: true, json: async () => ({ data: [{ id: "7", media_product_type: "REELS", timestamp: "2026-10-20T13:00:00+0000" }] }) };
  };
  const result = await loadInstagramReels({ adsToken: "ads-secret" }, "2026-10-01", "2026-10-31", fetchMock);
  assert.equal(result.rows[0].views, 5);
  assert.ok(calls.some((url) => url.includes("/42/media")));
  assert.ok(!JSON.stringify(result).includes("ads-secret"));
});

test("falta de permissão das Páginas aparece como erro sem vazar token", async () => {
  const result = await loadInstagramReels({ adsToken: "ads-secret" }, "2026-10-01", "2026-10-31", async () => ({ ok: false, json: async () => ({ error: { message: "ads-secret" } }) }));
  assert.match(result.error, /pages_show_list/);
  assert.ok(!JSON.stringify(result).includes("ads-secret"));
});

test("Reels mostram visualizações e tempo total sem expor token", async () => {
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(url);
    const metric = new URL(url).searchParams.get("metric");
    const payload = metric === "views" ? { data: [{ name: "views", values: [{ value: 50 }] }] }
      : metric === "ig_reels_video_view_total_time" ? { data: [{ name: metric, total_value: { value: 7200000 } }] }
        : { data: [{ id: "42", media_product_type: "REELS", timestamp: "2026-10-20T13:00:00+0000", permalink: "https://www.instagram.com/reel/abc", caption: "Teste" }], paging: {} };
    return { ok: true, json: async () => payload };
  };
  const result = await loadInstagramReels({ instagramToken: "secret-token", instagramUserId: "123" }, "2026-10-01", "2026-10-31", fetchMock);
  assert.equal(result.rows[0].views, 50);
  assert.equal(result.rows[0].watchMs, 7200000);
  assert.ok(calls.length === 3);
  assert.ok(!JSON.stringify(result).includes("secret-token"));
});

test("métrica de horas indisponível fica nula sem esconder visualizações", async () => {
  const fetchMock = async (url) => {
    const metric = new URL(url).searchParams.get("metric");
    if (metric === "ig_reels_video_view_total_time") return { ok: false, json: async () => ({ error: { message: "Sem permissão" } }) };
    if (metric === "views") return { ok: true, json: async () => ({ data: [{ name: "views", total_value: { value: 9 } }] }) };
    return { ok: true, json: async () => ({ data: [{ id: "42", media_product_type: "REELS", timestamp: "2026-10-20T13:00:00+0000" }] }) };
  };
  const result = await loadInstagramReels({ instagramToken: "x", instagramUserId: "123" }, "2026-10-01", "2026-10-31", fetchMock);
  assert.equal(result.rows[0].views, 9);
  assert.equal(result.rows[0].watchMs, null);
  assert.ok(result.warning);
});
