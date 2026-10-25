import test from "node:test";
import assert from "node:assert/strict";
import { buildLedger, businessDay, summarizeLedger } from "./dashboard-ledger.js";
import { estimateMetaBalance, expenseOccurrences } from "./dashboard.js";

const goal = { goal_cents: 1500000, goal_starts_on: "2026-10-01", goal_ends_on: "2026-12-05" };
const order = (patch = {}) => ({ id: "o1", user_id: "u1", edition_id: "e1", status: "paid", amount_cents: 59880,
  created_at: "2026-10-20T15:00:00Z", paid_at: "2026-10-20T15:00:00Z", refunded_cents: 0, ...patch });
const payment = (id, patch = {}) => ({ id, externalReference: "o1", installment: "ins1", status: "PENDING", value: 49.9,
  netValue: 47.9, confirmedDate: null, creditDate: null, estimatedCreditDate: "2026-11-20", refunds: [], ...patch });
const build = (orders, remotePayments) => buildLedger({ orders, remotePayments, localPayments: [], profiles: [{ id: "u1", email: "a@example.com" }],
  editions: [{ id: "e1", name: "Pro" }], funnel: [{ name: "checkout", order_id: "o1", source: "meta", campaign: "teste60", content: "A" }] });
const summary = (ledger, from = "2026-10-01", to = "2026-10-31") => summarizeLedger({ ledger, expenses: [], ads: [], funnel: [], from, to, goal,
  now: new Date("2026-10-24T15:00:00Z") });

test("fuso de Brasília mantém venda às 22h no mesmo dia", () => {
  assert.equal(businessDay("2026-10-24T01:00:00Z"), "2026-10-23");
});

test("mensalidade entra no painel com origem, taxa e crédito real do Asaas", () => {
  const ledger = buildLedger({ orders: [], localPayments: [], profiles: [{ id: "u1", email: "a@example.com" }], editions: [], funnel: [],
    subscriptions: [{ id: "s1", user_id: "u1", asaas_subscription_id: "sub_1", attribution: { source: "meta", campaign: "teste60", content: "C" } }],
    subscriptionPayments: [], remotePayments: [{ id: "pay_1", subscription: "sub_1", status: "RECEIVED", value: 49.9, netValue: 48.4,
      billingType: "CREDIT_CARD", confirmedDate: "2026-10-24", creditDate: "2026-10-25", refunds: [] }] });
  const result = summary(ledger);
  assert.equal(result.salesCents, 4990);
  assert.equal(result.cashCents, 4840);
  assert.equal(result.feesCents, 150);
  assert.equal(result.metaSalesCents, 4990);
  assert.equal(ledger.orderRows[0].product, "Voxelia mensal");
});

test("recarga de R$ 60 não duplica o custo dos anúncios no lucro", () => {
  const expenses = [{ kind: "meta_deposit", title: "Recarga Meta Ads via Pix", amount_cents: 6000, starts_on: "2026-10-23", recurring: false }];
  const ads = [{ on: "2026-10-23", spendCents: 306 }];
  const occurrences = expenseOccurrences(expenses, "2026-10-23", "2026-10-24");
  const metrics = summarizeLedger({ ledger: build([], []), expenses: occurrences, ads, funnel: [], from: "2026-10-23", to: "2026-10-24", goal,
    now: new Date("2026-10-24T15:00:00Z") });
  assert.equal(metrics.expenseCents, 0);
  assert.equal(metrics.adCents, 306);
  assert.equal(metrics.profitCents, -306);
  assert.deepEqual(estimateMetaBalance(expenses, ads, "2026-10-24"), { estimatedCents: 5694, depositedCents: 6000, spentCents: 306, since: "2026-10-23" });
  assert.equal(estimateMetaBalance(expenses, ads, "2026-10-24", "Meta indisponível").estimatedCents, null);
});

test("Pix confirmado entra em Vendas; só crédito entra no Caixa", () => {
  const ledger = build([order({ amount_cents: 9790 })], [payment("pix", { installment: null, value: 97.9, netValue: 95.9, status: "CONFIRMED", confirmedDate: "2026-10-20", creditDate: null })]);
  assert.equal(summary(ledger).salesCents, 9790);
  assert.equal(summary(ledger).cashCents, 0);
  assert.equal(summary(ledger).receivableCents, 9790);
});

test("Pro 12x registra venda integral, uma parcela no caixa e onze a receber", () => {
  const parts = Array.from({ length: 12 }, (_, i) => payment(`p${i}`, i === 0 ? { status: "RECEIVED", confirmedDate: "2026-10-20", creditDate: "2026-10-22" } : {}));
  const ledger = build([order()], parts);
  const result = summary(ledger);
  assert.equal(result.salesCents, 59880);
  assert.equal(result.cashCents, 4790);
  assert.equal(result.receivableCents, 54890);
  assert.equal(result.feesCents, 2400);
  assert.equal(result.goal.guaranteeCents, 57480);
});

test("Pix reembolsado no mesmo dia zera Vendas e mantém taxa no Caixa", () => {
  const ledger = build([order({ amount_cents: 9790, status: "refunded", refunded_cents: 9790, refunded_at: "2026-10-20T20:00:00Z" })],
    [payment("pix", { installment: null, value: 97.9, netValue: 95.9, status: "REFUNDED", confirmedDate: "2026-10-20", creditDate: "2026-10-20", refunds: [{ status: "DONE", value: 97.9, dateCreated: "2026-10-20" }] })]);
  assert.equal(summary(ledger).salesCents, 0);
  assert.equal(summary(ledger).cashCents, -200);
  assert.equal(summary(ledger).sales, 0);
  assert.equal(ledger.sales.length, 2);
});

test("reembolso parcial e reembolso em outro mês são lançamentos negativos na data", () => {
  const ledger = build([order({ amount_cents: 9790, refunded_cents: 3000, refunded_at: "2026-11-04T15:00:00Z" })],
    [payment("pix", { installment: null, value: 97.9, netValue: 95.9, status: "PARTIALLY_REFUNDED", confirmedDate: "2026-10-20", creditDate: "2026-10-22", refunds: [{ status: "DONE", value: 30, dateCreated: "2026-11-04" }] })]);
  assert.equal(summary(ledger).salesCents, 9790);
  assert.equal(summary(ledger, "2026-11-01", "2026-11-30").salesCents, -3000);
  assert.equal(summary(ledger, "2026-11-01", "2026-11-30").sales, 0);
});

test("reembolso de 12x após uma parcela cancela o futuro a receber", () => {
  const parts = Array.from({ length: 12 }, (_, i) => payment(`p${i}`, i === 0 ? { status: "REFUNDED", confirmedDate: "2026-10-20", creditDate: "2026-10-22", refunds: [{ status: "DONE", value: 49.9, dateCreated: "2026-11-04" }] } : {}));
  const ledger = build([order({ status: "refunded", refunded_cents: 59880, refunded_at: "2026-11-04T15:00:00Z" })], parts);
  assert.equal(summary(ledger).receivableCents, 0);
  assert.equal(summary(ledger, "2026-11-01", "2026-11-30").salesCents, -59880);
  assert.equal(summary(ledger, "2026-11-01", "2026-11-30").cashCents, -4990);
});

test("pedido pago pelo Checkout do Asaas (sem cobrança local) é ligado pela sessão de checkout", () => {
  const ledger = build([order({ amount_cents: 9790, asaas_checkout_id: "chk_1" })],
    [payment("pix", { externalReference: "sessao-do-checkout", checkoutSession: "chk_1", installment: null, value: 97.9, netValue: 95.9, status: "RECEIVED", confirmedDate: "2026-10-22", creditDate: "2026-10-22" })]);
  assert.equal(ledger.incomplete, false);
  assert.equal(summary(ledger).salesCents, 9790);
  assert.equal(summary(ledger).cashCents, 9590);
});
