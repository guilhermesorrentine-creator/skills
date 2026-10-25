import { createHmac, timingSafeEqual } from "node:crypto";
import { activeGrants, entitlement, licenseLabels, quote } from "./licensing.js";
import { checkoutUrl } from "./asaas.js";
import { createSubscriptions } from "./subscriptions.js";

const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 86400000;
const GUARANTEE_DAYS = 15;
const REFUND_REQUESTED = "Reembolso pedido";
// Voxelia Pro: acervo vitalício + conexão MCP por 12 meses, parcelável em 12x no cartão.
const MCP_EDITION = "pro-anual";
const MCP_DAYS = 365;
const RENEW_DAYS = 30; // a renovação do Pro abre 30 dias antes de a conexão vencer
const INSTALLMENTS = { [MCP_EDITION]: 12 };
const installmentsFor = (edition) => INSTALLMENTS[edition?.code] || 1;
const CONFIRMED = new Set(["RECEIVED", "CONFIRMED"]);
const PAID_PAYMENT = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REFUND_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED"]);
const DISPUTE = new Set(["PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"]);

// Pagamento único por edição (Asaas Checkout avulso) e licença vitalícia.
export function createCommerce({ store, asaas, config, onboarding = null, conversions = null, now = () => new Date() }) {
  const subscriptions = createSubscriptions({ store, asaas, config, now });
  async function userEntitlement(userId) {
    const [license, grants, editions, monthly] = await Promise.all([store.getLicense(userId), store.listGrants(userId), store.listEditions({ onSaleOnly: false }), subscriptions.status(userId)]);
    const permanent = entitlement({ license, grants, editions, now: now() });
    const pro = editions.find((edition) => edition.code === MCP_EDITION);
    const rank = Math.max(permanent.rank, monthly.active ? pro?.rank || 2 : 0);
    return { license, grants, editions, monthly, ...permanent, access: rank > 0, rank,
      edition: rank > permanent.rank ? pro || null : permanent.edition,
      reason: rank > permanent.rank ? "subscription" : permanent.reason };
  }

  async function accountState(user) {
    const [ent, profile, orders, open] = await Promise.all([userEntitlement(user.id), store.getProfile(user.id), store.listOrders(user.id), store.getOpenOrder(user.id, now())]);
    const forSale = ent.editions.filter((edition) => edition.on_sale).sort((a, b) => a.rank - b.rank);
    const latest = forSale.at(-1) || null;
    const upgrade = latest && ent.rank > 0 && latest.rank > ent.rank ? quote({ target: latest, license: ent.license, editions: ent.editions, orders }) : null;
    const pro = forSale.find((edition) => edition.code === MCP_EDITION);
    const renewal = pro ? renewalQuote(pro, ent, orders) : null;
    const events = ent.license ? await store.listLicenseEvents(user.id) : [];
    return {
      email: user.email,
      isAdmin: Boolean(profile?.is_admin),
      access: ent.access,
      accessReason: ent.reason,
      rank: ent.rank,
      edition: ent.reason === "subscription" ? { code: "voxelia-mensal", name: "Voxelia mensal", rank: ent.rank, priceCents: 4990,
        features: ["Acervo de skills enquanto a assinatura estiver paga", "Conexão com Claude, ChatGPT e Claude Code enquanto a assinatura estiver paga"], onSale: true, installments: 1, mcp: true }
        : ent.edition ? publicEdition(ent.edition) : null,
      license: ent.license ? {
        status: ent.license.status,
        statusLabel: licenseLabels[ent.license.status],
        activatedAt: ent.license.activated_at,
      } : null,
      orders: orders.filter((order) => order.status !== "creating").map((order) => ({
        id: order.id, kind: order.kind, status: order.status, amountCents: order.amount_cents, listPriceCents: order.list_price_cents,
        creditCents: order.credit_cents, createdAt: order.created_at, paidAt: order.paid_at,
        edition: publicEdition(ent.editions.find((edition) => edition.id === order.edition_id)),
      })),
      history: events.map((event) => ({ kind: event.kind, createdAt: event.created_at, to: ent.editions.find((edition) => edition.id === event.to_edition_id)?.name || null })),
      latestEdition: latest ? publicEdition(latest) : null,
      upgrade: upgrade && !upgrade.error ? { edition: publicEdition(latest), ...upgrade } : null,
      pendingOrder: open?.checkout_url ? { url: open.checkout_url, expiresAt: open.expires_at } : null,
      refund: refundState(orders),
      mcp: ent.monthly.active ? { active: true, until: ent.monthly.until } : mcpWindow(orders, ent.editions, ent.grants),
      subscription: { ...ent.monthly, priceCents: 4990 },
      renewal: renewal ? { edition: publicEdition(pro), amount: renewal.amount } : null,
    };
  }

  // Conexão MCP: 12 meses por pagamento do Pro (não estornado). Renovar antes de vencer soma ao prazo restante.
  // Concessão vigente que cobre o Pro (todas as edições ou edição igual/maior) também libera, pelo prazo dela.
  function mcpWindow(orders, editions, grants = []) {
    const pro = editions.find((edition) => edition.code === MCP_EDITION);
    if (!pro) return { active: false, until: null };
    const covering = activeGrants(grants, now()).filter((grant) => !grant.edition_id || (editions.find((edition) => edition.id === grant.edition_id)?.rank || 0) >= pro.rank);
    if (covering.some((grant) => !grant.ends_at)) return { active: true, until: null, grant: true };
    const paidAt = orders.filter((order) => order.edition_id === pro.id && order.status === "paid" && !order.refunded_at && order.paid_at)
      .map((order) => new Date(order.paid_at).getTime()).sort((a, b) => a - b);
    const paidEnd = paidAt.reduce((until, at) => Math.max(until, at) + MCP_DAYS * DAY, 0);
    const grantEnd = Math.max(0, ...covering.map((grant) => new Date(grant.ends_at).getTime()));
    const end = Math.max(paidEnd, grantEnd);
    return { active: end > now().getTime(), until: end ? new Date(end).toISOString() : null, ...(grantEnd > paidEnd && { grant: true }) };
  }
  // Quem já tem o Pro compra de novo a conexão por mais 12 meses, sem crédito, perto do vencimento ou depois dele.
  function renewalQuote(target, ent, orders) {
    if (target?.code !== MCP_EDITION || ent.edition?.code !== MCP_EDITION) return null;
    const { until, grant } = mcpWindow(orders, ent.editions, ent.grants);
    if (grant || (until && new Date(until).getTime() - now().getTime() > RENEW_DAYS * DAY)) return null;
    return { kind: "purchase", listPrice: target.price_cents, credit: 0, amount: target.price_cents };
  }
  async function mcpStatus(userId) {
    const [orders, editions, grants, monthly] = await Promise.all([store.listOrders(userId), store.listEditions({ onSaleOnly: false }), store.listGrants(userId), subscriptions.status(userId)]);
    const legacy = mcpWindow(orders, editions, grants);
    return monthly.active ? { active: true, until: monthly.until } : legacy;
  }

  // Cobrança do pedido pela referência gravada nela (vale para parcelas) ou, em pedidos antigos, pelo valor.
  const paysOrder = (payment, order) => CONFIRMED.has(payment.status)
    && (payment.externalReference === order.id || (!payment.externalReference && Math.round(Number(payment.value) * 100) === order.amount_cents));

  // Garantia: o último pedido pago pode ser reembolsado até 15 dias depois do pagamento.
  function refundable(orders) {
    const order = orders.find((item) => item.status === "paid" && !item.refunded_at && item.amount_cents > 0);
    if (!order?.paid_at) return null;
    const until = new Date(new Date(order.paid_at).getTime() + GUARANTEE_DAYS * DAY);
    return until > now() ? { order, until } : null;
  }
  function refundState(orders) {
    const found = refundable(orders);
    if (!found) return null;
    return { orderId: found.order.id, until: found.until.toISOString(), amountCents: found.order.amount_cents, requested: String(found.order.error || "").startsWith(REFUND_REQUESTED) };
  }

  // Cobrança do Asaas que pagou o pedido: a registrada para ele ou, se faltar, a do cliente com o mesmo valor.
  async function paidPaymentId(order) {
    const local = await store.findPaymentByOrder(order.id);
    if (local?.asaas_payment_id) return local.asaas_payment_id;
    const customer = order.asaas_customer_id || (await store.getProfile(order.user_id))?.asaas_customer_id;
    if (!customer) return null;
    const remote = await asaas.listCustomerPayments(customer);
    return (remote?.data || []).find((payment) => paysOrder(payment, order))?.id || null;
  }

  // Estorna no Asaas, marca o pedido e recalcula a licença (sem pedido pago válido, o acesso termina).
  async function refundOrder(order, reason, actorId) {
    const paymentId = await paidPaymentId(order);
    if (!paymentId) throw httpError(404, "payment_not_found", "Cobrança do pedido não encontrada no Asaas.");
    // Parcelado no cartão: estorna o parcelamento inteiro, não só uma parcela.
    const remote = await asaas.getPayment?.(paymentId).catch(() => null);
    if (remote?.installment) await asaas.refundInstallment(remote.installment);
    else await asaas.refundPayment(paymentId, { description: `Garantia Voxelia${reason ? `: ${reason}` : ""}`.slice(0, 500) });
    await store.updateOrder(order.id, { status: "refunded", refunded_cents: order.amount_cents, refunded_at: now().toISOString(), error: null });
    await recomputeLicense(order.user_id, "refunded");
    await store.insertAudit({ actor_id: actorId, action: "refund", target_user_id: order.user_id, details: { order_id: order.id, payment: paymentId, reason } });
    return { refunded: true };
  }

  // Pedido de reembolso do cliente, dentro da garantia: estorno automático. Se o Asaas recusar
  // (por exemplo, sem saldo), o pedido fica marcado para a administração estornar pelo painel.
  async function requestRefund(user, reason) {
    const found = refundable(await store.listOrders(user.id));
    if (!found) throw httpError(422, "refund_unavailable", `O prazo de ${GUARANTEE_DAYS} dias da garantia terminou ou não há pagamento para reembolsar.`);
    const why = String(reason || "").trim().slice(0, 300);
    try {
      return await refundOrder(found.order, why, user.id);
    } catch (error) {
      await store.updateOrder(found.order.id, { error: `${REFUND_REQUESTED} em ${now().toISOString().slice(0, 10)}${why ? `: ${why}` : ""} | ${String(error.message).slice(0, 200)}` });
      await store.insertAudit({ actor_id: user.id, action: "refund_requested", target_user_id: user.id, details: { order_id: found.order.id, reason: why, error: String(error.message).slice(0, 200) } });
      return { refunded: false, requested: true };
    }
  }

  async function adminRefund(orderId, actorId) {
    const order = await store.getOrder(String(orderId || ""));
    if (!order || order.status !== "paid") throw httpError(404, "not_found", "Pedido pago não encontrado.");
    return refundOrder(order, "pela administração", actorId);
  }

  // Chave do retorno da compra sem cadastro: só quem iniciou o pagamento a recebe (vai na URL de sucesso).
  function claimKey(orderId) {
    if (!config.claimSecret) throw httpError(503, "not_configured", "Compra sem cadastro indisponível neste ambiente.");
    return createHmac("sha256", config.claimSecret).update(`claim:${orderId}`).digest("base64url").slice(0, 32);
  }
  const withClaim = (result, orderId, claim) => (claim && orderId ? { ...result, order: orderId, key: claimKey(orderId) } : result);

  // Cria (ou reaproveita) o pedido e o Checkout avulso no Asaas. Preço sempre do servidor.
  // Com `claim`, o retorno do pagamento leva o pedido e a chave para a pessoa criar a senha sem e-mail.
  // Com `payer` (nome e CPF), cobra direto: devolve o QR do Pix para a nossa página e a fatura para cartão.
  // `method` "card" parcela no cartão quando a edição permite (Pro: 12x); "pix" gera o QR à vista.
  async function startCheckout(user, editionCode, tracking = null, { claim = false, payer = null, method = "pix" } = {}, retried = false) {
    const target = await store.getEditionByCode(String(editionCode || ""));
    if (!target || !target.on_sale) throw httpError(404, "edition_not_found", "Edição indisponível para compra.");
    const open = await store.getOpenOrder(user.id, now());
    if (open?.checkout_url && open.edition_id === target.id) {
      const payment = payer ? await store.findPaymentByOrder(open.id) : null;
      if (!payment) return withClaim({ url: open.checkout_url, reused: true }, open.id, claim);
      const isCard = payment.billing_type === "CREDIT_CARD";
      const wantsCard = method === "card" && installmentsFor(target) > 1;
      // Trocou de forma de pagamento: cancela a cobrança anterior e gera a nova no mesmo pedido.
      if (isCard !== wantsCard) return withClaim(await chargeDirect(user, open, target, { kind: open.kind, amount: open.amount_cents }, payer, method, payment), open.id, claim);
      return withClaim({ url: open.checkout_url, reused: true, pix: isCard ? null : await pixFor(payment.asaas_payment_id), amountCents: open.amount_cents, installments: isCard ? installmentsFor(target) : 1 }, open.id, claim);
    }
    if (open) throw httpError(409, "order_in_progress", "Você já tem um pagamento em andamento. Conclua ou aguarde ele expirar.");

    const [ent, orders] = await Promise.all([userEntitlement(user.id), store.listOrders(user.id)]);
    const quoted = quote({ target, license: ent.license, editions: ent.editions, orders });
    const price = quoted.error === "already_owned" ? renewalQuote(target, ent, orders) || quoted : quoted;
    if (price.error === "already_owned") throw httpError(409, "already_owned", "Sua licença já inclui esta edição.");
    const expiresAt = new Date(now().getTime() + (payer ? DAY : config.asaas.checkoutMinutes * 60000)).toISOString();
    const base = { user_id: user.id, edition_id: target.id, kind: price.kind, list_price_cents: price.listPrice, credit_cents: price.credit, amount_cents: price.amount };

    if (price.amount === 0) {
      const order = await store.insertOrder({ ...base, status: "paid", paid_at: now().toISOString() });
      if (!order) throw httpError(409, "order_in_progress", "Já existe um pedido em andamento.");
      await activateLicense(user.id, order, "upgrade_without_charge");
      return { url: null, activated: true };
    }
    if (price.amount < 500) throw httpError(422, "amount_below_minimum", "O valor da diferença é menor que o mínimo aceito pelo meio de pagamento. Fale com o suporte.");

    // O índice único parcial impede dois pedidos em aberto simultâneos.
    const order = await store.insertOrder({ ...base, status: "creating", expires_at: expiresAt });
    if (!order) {
      // Pedido vencido ainda marcado em aberto (a cobrança direta não tem evento de expiração): encerra e tenta de novo.
      if (retried) throw httpError(409, "order_in_progress", "Você já tem um pagamento em andamento.");
      for (const stale of await store.listOrders(user.id)) if (["creating", "pending"].includes(stale.status) && stale.expires_at && new Date(stale.expires_at) <= now()) await store.updateOrder(stale.id, { status: "expired" });
      return startCheckout(user, editionCode, tracking, { claim, payer, method }, true);
    }
    if (tracking) await saveTracking(order.id, tracking);
    if (payer) return withClaim(await chargeDirect(user, order, target, price, payer, method), order.id, claim);
    const back = claim ? `&pedido=${order.id}&chave=${claimKey(order.id)}` : "";
    try {
      const checkout = await asaas.createCheckout({
        billingTypes: ["PIX", "CREDIT_CARD"],
        chargeTypes: ["DETACHED"],
        minutesToExpire: config.asaas.checkoutMinutes,
        externalReference: order.id,
        callback: {
          successUrl: `${config.appUrl}/checkout/retorno?resultado=sucesso${back}`,
          cancelUrl: `${config.appUrl}/checkout/retorno?resultado=cancelado`,
          expiredUrl: `${config.appUrl}/checkout/retorno?resultado=expirado`,
        },
        items: [{ name: target.name, description: price.kind === "upgrade" ? `Upgrade para ${target.name}` : target.name, quantity: 1, value: price.amount / 100 }],
      });
      const url = checkoutUrl(checkout, config.asaas.checkoutHost);
      await store.updateOrder(order.id, { status: "pending", asaas_checkout_id: checkout.id, checkout_url: url });
      return withClaim({ url, reused: false }, order.id, claim);
    } catch (error) {
      await store.updateOrder(order.id, { status: "failed", error: String(error.message).slice(0, 500) });
      throw error.status ? error : httpError(502, "asaas_error", "Não foi possível iniciar o pagamento.");
    }
  }

  // Cobrança direta: cliente no Asaas (reaproveitado se a conta já tiver), cobrança Pix ou cartão e o QR.
  async function chargeDirect(user, order, target, price, payer, method = "pix", previous = null) {
    try {
      if (previous) await cancelPayment(previous);
      let customer = (await store.getProfile(user.id))?.asaas_customer_id;
      if (!customer) {
        customer = (await asaas.createCustomer({ name: payer.name, cpfCnpj: payer.document, email: user.email, externalReference: user.id, notificationDisabled: true })).id;
        await store.setCustomerId(user.id, customer);
      }
      const installments = method === "card" ? installmentsFor(target) : 1;
      const common = {
        customer, externalReference: order.id,
        dueDate: new Date(now().getTime() + DAY).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }),
        description: price.kind === "upgrade" ? `Upgrade para ${target.name}` : target.name,
      };
      const payment = await asaas.createPayment(installments > 1
        ? { ...common, billingType: "CREDIT_CARD", installmentCount: installments, totalValue: price.amount / 100 }
        : { ...common, billingType: "UNDEFINED", value: price.amount / 100 });
      const url = safeAsaasUrl(payment.invoiceUrl);
      await store.upsertPayment({ asaas_payment_id: payment.id, order_id: order.id, user_id: user.id, asaas_customer_id: customer, status: payment.status, value_cents: Math.round(Number(payment.value || price.amount / 100) * 100), billing_type: payment.billingType || null, confirmed_at: null, invoice_url: url });
      await store.updateOrder(order.id, { status: "pending", asaas_customer_id: customer, checkout_url: url });
      return { url, reused: false, pix: installments > 1 ? null : await pixFor(payment.id), amountCents: price.amount, installments };
    } catch (error) {
      await store.updateOrder(order.id, { status: "failed", error: String(error.message).slice(0, 500) });
      // Recusa do Asaas (CPF, nome) volta com a mensagem dele para a pessoa corrigir.
      throw error.code === "asaas_error" && error.upstreamStatus === 400 ? httpError(422, "asaas_rejected", error.message) : error.status ? error : httpError(502, "asaas_error", "Não foi possível iniciar o pagamento.");
    }
  }

  // Cobrança substituída (troca de Pix para cartão ou o contrário): some do Asaas para não haver pagamento em dobro.
  async function cancelPayment(row) {
    try {
      const remote = await asaas.getPayment?.(row.asaas_payment_id);
      if (remote?.installment) await asaas.deleteInstallment(remote.installment);
      else await asaas.deletePayment(row.asaas_payment_id);
      await store.upsertPayment({ ...row, status: "DELETED" });
    } catch (error) {
      throw Object.assign(new Error(`Não foi possível trocar a forma de pagamento: ${error.message}`), { status: 409, code: "payment_switch_failed" });
    }
  }

  // Sem QR (falha pontual do Asaas), a fatura ainda aceita Pix e cartão.
  async function pixFor(paymentId) {
    try {
      const qr = await asaas.pixQrCode(paymentId);
      return qr?.encodedImage && qr?.payload ? { image: qr.encodedImage, payload: qr.payload } : null;
    } catch (error) {
      console.error("[asaas] QR do Pix indisponível:", error.message);
      return null;
    }
  }

  // Compra sem cadastro: e-mail (e, na cobrança direta, nome e CPF). A conta nasce sem senha (nenhum
  // e-mail é enviado) e a pessoa cria a senha no retorno do pagamento. E-mail de conta já usada exige login.
  async function guestCheckout(email, editionCode, tracking = null, payer = null, method = "pix") {
    const address = String(email || "").trim().toLowerCase();
    if (!EMAIL.test(address) || address.length > 254) throw httpError(400, "invalid_email", "Informe um e-mail válido.");
    const buyer = payer && validPayer(payer);
    let profile = await store.findProfileByEmail(address);
    if (profile && await store.hasSignedIn(profile.id)) throw httpError(409, "account_exists", "Este e-mail já tem conta na Voxelia. Entre para concluir a compra.");
    if (!profile) {
      const invite = await store.createInvitedUser(address, `${config.appUrl}/criar-senha`);
      profile = { id: invite.userId, email: address };
    }
    return startCheckout({ id: profile.id, email: address }, editionCode, tracking, { claim: true, payer: buyer, method });
  }

  // Compra com login (upgrade para o Pro, por exemplo): mesma cobrança direta, com nome e CPF.
  async function accountCheckout(user, editionCode, tracking = null, payer = null, method = "pix") {
    if (!payer) return startCheckout(user, editionCode, tracking);
    return startCheckout(user, editionCode, tracking, { claim: true, payer: validPayer(payer), method });
  }

  // Retorno da compra sem cadastro: com a chave certa e o pedido pago, devolve um link de uso único
  // para criar a senha. Nada é liberado pela URL: o pagamento é sempre o confirmado pelo webhook.
  async function claimAccess(orderId, key) {
    const id = String(orderId || "");
    const given = Buffer.from(String(key || ""));
    const expected = Buffer.from(id ? claimKey(id) : "");
    if (!id || given.length !== expected.length || !timingSafeEqual(given, expected)) throw httpError(403, "invalid_claim", "Link de retorno inválido.");
    let order = await store.getOrder(id);
    if (!order) throw httpError(404, "not_found", "Pedido não encontrado.");
    // Quem paga o Pix fica nesta tela: consulta o Asaas direto, sem depender só do webhook.
    if (order.status === "pending" && order.asaas_customer_id) {
      try { if (await settleFromAsaas(order, "activated")) order = { ...order, status: "paid" }; } catch (error) { console.error("[asaas] consulta do pedido:", error.message); }
    }
    if (order.status !== "paid") return { status: order.status };
    if (await store.hasSignedIn(order.user_id)) return { status: "paid", login: true };
    const profile = await store.getProfile(order.user_id);
    if (!profile?.email) throw httpError(404, "not_found", "Conta do pedido não encontrada.");
    return { status: "paid", url: await store.createPasswordLink(profile.email, `${config.appUrl}/criar-senha`) };
  }

  // Dados de anúncio (com consentimento) ficam no pedido; falha aqui não impede a compra.
  async function saveTracking(orderId, tracking) {
    try { await store.updateOrder(orderId, { ad_tracking: tracking }); } catch (error) { console.error("[meta] rastreio não salvo:", error.message); }
  }

  // Purchase para a API de Conversões, uma vez por pedido (só na transição para pago).
  async function reportPurchase(order) {
    if (!conversions || !order.ad_tracking || order.amount_cents <= 0) return;
    try {
      const [profile, editions] = await Promise.all([store.getProfile(order.user_id), store.listEditions({ onSaleOnly: false })]);
      await conversions.purchase({ order, email: profile?.email, editionCode: editions.find((edition) => edition.id === order.edition_id)?.code, eventTime: now() });
    } catch (error) {
      console.error("[meta] Purchase não enviado:", error.message);
    }
  }

  async function activateLicense(userId, order, kind = "activated") {
    const editions = await store.listEditions({ onSaleOnly: false });
    const target = editions.find((edition) => edition.id === order.edition_id);
    const license = await store.getLicense(userId);
    if (!license) {
      const created = await store.insertLicense({ user_id: userId, edition_id: target.id, status: "active", origin_order_id: order.id, activated_at: now().toISOString() });
      await store.insertLicenseEvent({ license_id: created.id, user_id: userId, kind, to_edition_id: target.id, order_id: order.id });
      await onboarding?.welcomeBuyer(userId, target);
      return;
    }
    const currentRank = editions.find((edition) => edition.id === license.edition_id)?.rank || 0;
    const patch = { status: "active" };
    if (target.rank > currentRank || ["refunded", "revoked"].includes(license.status)) patch.edition_id = target.rank >= currentRank ? target.id : license.edition_id;
    if (!(await store.updateLicense(license.id, patch, license.version))) throw new Error("Licença alterada em paralelo; reprocessar.");
    await store.insertLicenseEvent({ license_id: license.id, user_id: userId, kind: order.kind === "upgrade" ? "upgraded" : kind, from_edition_id: license.edition_id, to_edition_id: patch.edition_id || license.edition_id, order_id: order.id });
  }

  // Recalcula a edição a partir dos pedidos pagos restantes (após estorno).
  async function recomputeLicense(userId, reason) {
    const [license, orders, editions] = await Promise.all([store.getLicense(userId), store.listOrders(userId), store.listEditions({ onSaleOnly: false })]);
    if (!license) return;
    const valid = orders.filter((order) => order.status === "paid" && !order.refunded_at);
    const best = valid.map((order) => editions.find((edition) => edition.id === order.edition_id)).sort((a, b) => b.rank - a.rank)[0];
    const patch = best ? { edition_id: best.id } : { status: "refunded" };
    await store.updateLicense(license.id, patch, license.version);
    await store.insertLicenseEvent({ license_id: license.id, user_id: userId, kind: reason, from_edition_id: license.edition_id, to_edition_id: best?.id || null });
  }

  function verifyWebhookToken(received) {
    const expected = Buffer.from(config.asaas.webhookToken || "");
    const given = Buffer.from(String(received || ""));
    return expected.length > 0 && expected.length === given.length && timingSafeEqual(expected, given);
  }

  async function receiveWebhook(token, payload) {
    if (!verifyWebhookToken(token)) throw httpError(401, "invalid_token", "Token do webhook inválido.");
    if (!payload?.id || !payload?.event) throw httpError(400, "invalid_event", "Evento sem identificador.");
    const { inserted, event } = await store.insertEvent({ id: String(payload.id), event: String(payload.event), payload, status: "received" });
    if (!inserted && event?.status === "processed") return { duplicate: true, status: "processed" };
    return { duplicate: !inserted, ...(await processEvent(event || { id: payload.id, event: payload.event, payload })) };
  }

  async function finish(row, status, note = null) {
    await store.updateEvent(row.id, { status, note, processed_at: status === "processed" ? now().toISOString() : null, attempts: (row.attempts || 0) + 1 });
    return { status, note };
  }

  async function processEvent(row) {
    const payload = row.payload;
    try {
      if (payload.event.startsWith("SUBSCRIPTION_")) {
        const result = await subscriptions.subscriptionEvent(payload);
        const finished = await finish(row, result?.status || "processed", result?.note);
        if (result?.status === "processed") await retryUnlinked(row.id);
        return finished;
      }
      if (payload.event.startsWith("CHECKOUT_")) {
        const result = await subscriptions.checkoutEvent(payload);
        if (result) { const finished = await finish(row, result.status, result.note); await retryUnlinked(row.id); return finished; }
        return await handleCheckout(row, payload);
      }
      if (!payload.payment) return finish(row, "processed", "Evento sem cobrança; apenas registrado.");
      if (payload.payment.subscription) {
        const result = await subscriptions.paymentEvent(payload);
        return finish(row, result.status, result.note);
      }
      return await handlePayment(row, payload);
    } catch (error) {
      return finish(row, "failed", String(error.message).slice(0, 500));
    }
  }

  async function retryUnlinked(except) {
    for (const pending of await store.listEvents({ status: "unlinked", limit: 50 }))
      if (pending.id !== except && (pending.event.startsWith("SUBSCRIPTION_") || pending.payload?.payment?.subscription)) await processEvent(pending);
  }

  async function handleCheckout(row, payload) {
    const checkout = payload.checkout || {};
    const order = (checkout.id && await store.findOrderByCheckout(checkout.id)) || (checkout.externalReference && await store.getOrder(checkout.externalReference));
    if (!order) return finish(row, "unlinked", "Checkout sem pedido correspondente.");
    if (payload.event === "CHECKOUT_PAID") {
      if (order.status === "paid") return finish(row, "processed", "Pedido já pago.");
      if (Array.isArray(checkout.items) && checkout.items.length) {
        const total = Math.round(checkout.items.reduce((sum, item) => sum + Number(item.value || 0) * Number(item.quantity || 1), 0) * 100);
        if (total !== order.amount_cents) return finish(row, "failed", `Valor divergente: checkout ${total}, pedido ${order.amount_cents}.`);
      }
      await store.updateOrder(order.id, { status: "paid", paid_at: now().toISOString(), asaas_customer_id: checkout.customer || order.asaas_customer_id || null });
      if (checkout.customer) await store.setCustomerId(order.user_id, checkout.customer);
      await activateLicense(order.user_id, { ...order, status: "paid" }, order.kind === "upgrade" ? "upgraded" : "activated");
      await reportPurchase(order);
      for (const pending of await store.listEvents({ status: "unlinked", limit: 50 })) if (pending.id !== row.id) await processEvent(pending);
      return finish(row, "processed", "Licença ativada.");
    }
    const statusByEvent = { CHECKOUT_CANCELED: "canceled", CHECKOUT_EXPIRED: "expired" };
    if (statusByEvent[payload.event] && ["creating", "pending"].includes(order.status)) await store.updateOrder(order.id, { status: statusByEvent[payload.event] });
    return finish(row, "processed");
  }

  async function handlePayment(row, payload) {
    const payment = payload.payment;
    const profile = payment.customer ? await store.findProfileByCustomer(payment.customer) : null;
    if (!profile) return finish(row, "unlinked", "Cliente ainda não vinculado a uma conta.");
    const valueCents = Math.round(Number(payment.value || 0) * 100);
    const existing = await store.getPayment(payment.id);
    const orders = await store.listOrders(profile.id);
    const order = (payment.externalReference && orders.find((item) => item.id === payment.externalReference))
      || (existing?.order_id && orders.find((item) => item.id === existing.order_id))
      || orders.find((item) => ["paid", "refunded"].includes(item.status) && item.amount_cents === valueCents && item.asaas_customer_id === payment.customer)
      || orders.find((item) => item.status === "pending" && item.amount_cents === valueCents && item.asaas_customer_id === payment.customer);
    await store.upsertPayment({
      asaas_payment_id: payment.id, order_id: order?.id || null, user_id: profile.id, asaas_customer_id: payment.customer,
      status: payment.status, value_cents: valueCents, billing_type: payment.billingType || null,
      confirmed_at: payment.confirmedDate || payment.paymentDate || null, invoice_url: safeAsaasUrl(payment.invoiceUrl),
    });
    if (PAID_PAYMENT.has(payload.event) && order?.status === "pending") {
      await store.updateOrder(order.id, { status: "paid", paid_at: now().toISOString() });
      await activateLicense(profile.id, { ...order, status: "paid" });
      await reportPurchase(order);
      return finish(row, "processed", "Licença ativada pela confirmação da cobrança.");
    }
    if (REFUND_EVENTS.has(payload.event) && order && ["paid", "refunded"].includes(order.status)) {
      const refunded = Array.isArray(payment.refunds)
        ? payment.refunds.filter((item) => item.status === "DONE").reduce((sum, item) => sum + Math.round(Number(item.value || 0) * 100), 0)
        : payload.event === "PAYMENT_REFUNDED" ? valueCents : 0;
      const previous = Number(existing?.refunded_cents || 0);
      const total = Math.min(order.amount_cents, Number(order.refunded_cents || 0) + Math.max(0, refunded - previous));
      await store.upsertPayment({ asaas_payment_id: payment.id, order_id: order.id, user_id: profile.id, asaas_customer_id: payment.customer,
        status: payment.status, value_cents: valueCents, billing_type: payment.billingType || null,
        confirmed_at: payment.confirmedDate || payment.paymentDate || null, refunded_cents: refunded, invoice_url: safeAsaasUrl(payment.invoiceUrl) });
      // Qualquer estorno (inclusive parcial ou de uma parcela) encerra o acesso, como antes (PR #10);
      // `refunded_cents` guarda só o valor efetivamente devolvido, para o painel financeiro.
      const full = total >= order.amount_cents;
      await store.updateOrder(order.id, { refunded_cents: total, status: "refunded", ...(order.status !== "refunded" && { refunded_at: now().toISOString() }) });
      if (order.status !== "refunded") await recomputeLicense(profile.id, "refunded");
      return finish(row, "processed", full ? "Pedido estornado; licença recalculada." : "Reembolso parcial registrado; licença recalculada.");
    }
    if (DISPUTE.has(payload.event)) {
      const license = await store.getLicense(profile.id);
      if (license?.status === "active") {
        await store.updateLicense(license.id, { status: "disputed" }, license.version);
        await store.insertLicenseEvent({ license_id: license.id, user_id: profile.id, kind: "disputed", order_id: order?.id || null, details: { event: payload.event } });
      }
      return finish(row, "processed", "Contestação registrada; acesso mantido até a decisão administrativa.");
    }
    return finish(row, "processed", order ? null : "Cobrança sem pedido correspondente.");
  }

  // Procura no Asaas uma cobrança paga do pedido e, se houver, marca pago e ativa a licença.
  async function settleFromAsaas(order, kind) {
    const customer = order.asaas_customer_id || (await store.getProfile(order.user_id))?.asaas_customer_id;
    if (!customer) return null;
    const remote = await asaas.listCustomerPayments(customer);
    const paid = (remote?.data || []).find((payment) => paysOrder(payment, order));
    if (!paid) return null;
    await store.updateOrder(order.id, { status: "paid", paid_at: now().toISOString(), asaas_customer_id: customer });
    await activateLicense(order.user_id, { ...order, status: "paid" }, kind);
    await reportPurchase(order);
    return paid;
  }

  // Reconciliação de um pedido pendente: procura cobranças pagas do cliente no Asaas.
  async function reconcileOrder(orderId, actorId) {
    const order = await store.getOrder(orderId);
    if (!order) throw httpError(404, "not_found", "Pedido não encontrado.");
    if (order.status === "paid") return { changed: false, reason: "Pedido já pago." };
    const paid = await settleFromAsaas(order, "reconciled");
    if (!paid) return { changed: false, reason: "Nenhuma cobrança paga correspondente." };
    await store.insertAudit({ actor_id: actorId, action: "reconcile_order", target_user_id: order.user_id, details: { order_id: order.id, payment: paid.id } });
    return { changed: true };
  }

  // Decisão administrativa sobre uma licença (contestação, revogação, restauração), auditada.
  async function setLicenseStatus(userId, status, reason, actorId) {
    if (!["active", "revoked"].includes(status)) throw httpError(400, "invalid_status", "Situação inválida.");
    if (String(reason || "").trim().length < 10) throw httpError(400, "invalid_reason", "Justificativa obrigatória (mínimo 10 caracteres).");
    const license = await store.getLicense(userId);
    if (!license) throw httpError(404, "not_found", "Licença não encontrada.");
    await store.updateLicense(license.id, { status }, license.version);
    await store.insertLicenseEvent({ license_id: license.id, user_id: userId, kind: `admin_${status}`, details: { reason } });
    await store.insertAudit({ actor_id: actorId, action: "license_status", target_user_id: userId, details: { from: license.status, to: status, reason } });
    return { status };
  }

  return { userEntitlement, accountState, startCheckout, guestCheckout, accountCheckout, mcpStatus, claimAccess, requestRefund, adminRefund, receiveWebhook, processEvent, reconcileOrder, setLicenseStatus, verifyWebhookToken, subscriptions };
}

export function publicEdition(edition) {
  if (!edition) return null;
  return { code: edition.code, name: edition.name, rank: edition.rank, priceCents: edition.price_cents, description: edition.description, features: edition.features || [], onSale: edition.on_sale, installments: installmentsFor(edition), mcp: edition.code === MCP_EDITION };
}

// Nome e CPF/CNPJ que o Asaas exige para cobrar. Confere os dígitos do CPF para errar aqui, não no banco.
function validPayer({ name, document }) {
  const fullName = String(name || "").trim().replace(/\s+/g, " ");
  const digits = String(document || "").replace(/\D/g, "");
  if (fullName.length < 3 || fullName.length > 100) throw httpError(400, "invalid_name", "Informe seu nome completo.");
  if (!(digits.length === 14 || (digits.length === 11 && validCpf(digits)))) throw httpError(400, "invalid_document", "Confira o CPF.");
  return { name: fullName, document: digits };
}

function validCpf(cpf) {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const check = (len) => { const sum = [...cpf.slice(0, len)].reduce((acc, d, i) => acc + Number(d) * (len + 1 - i), 0); return ((sum * 10) % 11) % 10; };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

function safeAsaasUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "asaas.com" || url.hostname.endsWith(".asaas.com")) ? url.toString() : null;
  } catch { return null; }
}
