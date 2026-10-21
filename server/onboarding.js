// Entrada de novas pessoas: boas-vindas após a compra e convite feito pela administração.
// O convite cria a conta pelo Supabase Auth (link de uso único para a pessoa criar a própria senha);
// nenhuma senha é gerada, guardada ou enviada por e-mail.
import { welcomeEmail } from "./email.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const badRequest = (code, message) => Object.assign(new Error(message), { status: 400, code });

export function createOnboarding({ store, mailer, config }) {
  async function deliver(to, message) {
    if (!mailer) return false;
    await mailer.send({ to, ...message });
    return true;
  }

  // Uma vez por pessoa: chamada quando uma licença é ativada. Falha de envio não desfaz a ativação.
  async function welcomeBuyer(userId, edition) {
    try {
      const events = await store.listLicenseEvents(userId);
      if (events.some((event) => event.kind === "welcome_email")) return;
      const profile = await store.getProfile(userId);
      if (!profile?.email) return;
      const sent = await deliver(profile.email, welcomeEmail({ kind: "purchase", email: profile.email, editionName: edition?.name, appUrl: config.appUrl }));
      if (sent) await store.insertLicenseEvent({ user_id: userId, kind: "welcome_email", details: { kind: "purchase" } });
    } catch (error) {
      console.error("[onboarding] boas-vindas não enviadas:", error.message);
    }
  }

  // Admin: cria a conta se preciso, libera o acesso (todas as edições quando `editionId` é nulo),
  // audita e envia as boas-vindas. Sem envio configurado, devolve o link para a administração.
  async function inviteUser({ email, reason, editionId = null, actorId }) {
    const address = String(email || "").trim().toLowerCase();
    const why = String(reason || "").trim();
    if (!EMAIL.test(address)) throw badRequest("invalid_email", "Informe um e-mail válido.");
    if (why.length < 10) throw badRequest("invalid_reason", "Informe uma justificativa com pelo menos 10 caracteres.");

    let profile = await store.findProfileByEmail(address);
    let actionUrl = null;
    const created = !profile;
    const setPasswordUrl = `${config.appUrl}/criar-senha`;
    if (created) {
      const invite = await store.createInvitedUser(address, setPasswordUrl);
      actionUrl = invite.actionUrl;
      profile = (await store.getProfile(invite.userId)) || { id: invite.userId, email: address };
    } else if (!(await store.hasSignedIn(profile.id))) {
      // Convidada antes e nunca entrou (link expirado ou perdido): manda um link novo de criar senha.
      actionUrl = await store.createPasswordLink(address, setPasswordUrl);
    }
    const kind = actionUrl ? "invite" : "grant";

    const grants = await store.listGrants(profile.id);
    const active = grants.find((grant) => !grant.revoked_at && (!grant.ends_at || new Date(grant.ends_at) > new Date()));
    const grant = active || await store.insertGrant({ user_id: profile.id, reason: why, granted_by: actorId, starts_at: new Date().toISOString(), ends_at: null, edition_id: editionId });
    await store.insertAudit({ actor_id: actorId, action: created ? "invite_user" : "grant_access", target_user_id: profile.id, details: { grant_id: grant.id, reason: why, edition_id: editionId, created } });

    let sent = false;
    let mailError = null;
    try {
      sent = await deliver(address, welcomeEmail({ kind, email: address, actionUrl, appUrl: config.appUrl }));
    } catch (error) {
      mailError = error.message;
    }
    if (sent) await store.insertAudit({ actor_id: actorId, action: "welcome_email", target_user_id: profile.id, details: { kind } });
    // O link de convite só volta para a administração quando o e-mail não saiu.
    return { userId: profile.id, email: address, created, alreadyHadAccess: Boolean(active), sent, mailError, link: sent ? null : actionUrl || `${config.appUrl}/entrar` };
  }

  return { welcomeBuyer, inviteUser };
}
