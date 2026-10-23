// Regras puras de licença vitalícia, direitos por edição e cálculo de upgrade (valores em centavos).
// Nenhuma licença expira por data. O acesso depende de uma licença ativa (ou em disputa, enquanto
// a administração decide) ou de uma concessão excepcional registrada.

const ACCESS_STATUSES = new Set(["active", "disputed"]);

// Concessão vigente: não revogada, já iniciada e dentro do prazo (sem prazo = para sempre).
export function activeGrants(grants = [], now = new Date()) {
  const time = new Date(now).getTime();
  return grants.filter((item) => !item.revoked_at && new Date(item.starts_at).getTime() <= time && (!item.ends_at || new Date(item.ends_at).getTime() > time));
}

export function entitlement({ license, grants = [], editions = [], now = new Date() }) {
  const byId = new Map(editions.map((edition) => [edition.id, edition]));
  const grant = activeGrants(grants, now)
    .map((item) => ({ ...item, rank: byId.get(item.edition_id)?.rank ?? maxRank(editions) }))
    .sort((a, b) => b.rank - a.rank)[0];
  const licenseRank = license && ACCESS_STATUSES.has(license.status) ? byId.get(license.edition_id)?.rank || 0 : 0;
  const rank = Math.max(licenseRank, grant?.rank || 0);
  return {
    access: rank > 0,
    rank,
    edition: editions.find((edition) => edition.rank === rank) || null,
    reason: licenseRank >= (grant?.rank || 0) && licenseRank > 0 ? `license_${license.status}` : grant ? "grant" : license ? `license_${license.status}` : "no_license",
  };
}

const maxRank = (editions) => editions.reduce((max, edition) => Math.max(max, edition.rank), 1);

// Crédito elegível: soma dos pedidos efetivamente pagos e não estornados.
export function eligibleCredit(orders = []) {
  return orders.filter((order) => order.status === "paid" && !order.refunded_at).reduce((sum, order) => sum + order.amount_cents, 0);
}

// Orçamento de compra ou upgrade: upgrade = max(0, preço_destino − crédito_elegível).
export function quote({ target, license, editions, orders }) {
  if (!target) return { error: "edition_not_found" };
  const current = license && ACCESS_STATUSES.has(license.status) ? editions.find((edition) => edition.id === license.edition_id) : null;
  if (current && current.rank >= target.rank) return { error: "already_owned" };
  const credit = current ? eligibleCredit(orders) : 0;
  const amount = Math.max(0, target.price_cents - credit);
  return { kind: current ? "upgrade" : "purchase", listPrice: target.price_cents, credit, amount };
}

// Recurso visível conforme a edição do usuário. `rank` 0 = visitante sem licença.
export function canAccessResource(resource, rank) {
  if (resource.visibility === "public" || resource.visibility === "demo") return true;
  return rank >= (resource.min_edition_rank || 1);
}

export const licenseLabels = {
  active: "Ativa — acesso vitalício à edição adquirida",
  disputed: "Em análise (contestação de pagamento) — acesso mantido até a decisão",
  refunded: "Reembolsada — sem acesso",
  revoked: "Revogada",
};

export const formatCents = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
