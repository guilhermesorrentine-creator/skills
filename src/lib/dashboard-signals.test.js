import test from "node:test";
import assert from "node:assert/strict";
import { paidSignal, reelSignal } from "./dashboard-signals.js";

test("campanha não recebe diagnóstico otimista sem fonte ou amostra", () => {
  assert.equal(paidSignal({ error: "sem token" }).title, "Dados indisponíveis");
  assert.equal(paidSignal({ spendCents: 1000, impressions: 500, trafficTest: true }).title, "Ainda cedo");
  assert.equal(paidSignal({ spendCents: 3000, impressions: 1200, linkClicks: 3, trafficTest: true }).title, "Criativo pede ajuste");
});

test("retorno e gargalo da página usam venda real e visitas do site", () => {
  assert.equal(paidSignal({ spendCents: 3000, salesCents: 9700, profitCents: 6200 }).title, "Retorno positivo");
  assert.equal(paidSignal({ spendCents: 3000, salesCents: 9700, profitCents: -500 }).title, "Vendeu, mas ainda não se pagou");
  assert.equal(paidSignal({ spendCents: 3000, impressions: 1200, linkClicks: 20, siteVisits: 60, buyClicks: 0, trafficTest: true }).title, "Página pede ajuste");
});

test("Reel recente ou sem histórico não recebe julgamento de desempenho", () => {
  assert.equal(reelSignal({ views: 400, ageDays: 1, referenceViews: 1000 }).title, "Em evolução");
  assert.equal(reelSignal({ views: 400, ageDays: 10, referenceViews: null }).title, "Sem histórico suficiente");
  assert.equal(reelSignal({ views: 1500, ageDays: 10, referenceViews: 1000 }).title, "Acima do padrão");
});

test("custo por visita usa as visitas do funil do site, não a contagem da Meta", () => {
  const base = { spendCents: 3400, impressions: 1500, linkClicks: 38, landingViews: 2, trafficTest: true, buyClicks: 2 };
  assert.equal(paidSignal({ ...base, siteVisits: 33 }).title, "Tráfego com bom sinal");
  assert.equal(paidSignal({ ...base, siteVisits: 20 }).title, "Visita cara");
});
