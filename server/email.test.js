import test from "node:test";
import assert from "node:assert/strict";
import { createMailer } from "./email.js";

test("Gmail SMTP envia o convite pela conta configurada", async () => {
  let settings;
  let message;
  const mailer = createMailer({ gmailUser: "voxelia@example.com", gmailAppPassword: "app-password-test" }, fetch,
    (options) => { settings = options; return { sendMail: async (input) => { message = input; return { accepted: [input.to] }; } }; });
  await mailer.send({ to: "buyer@example.com", subject: "Acesso", html: "<p>Olá</p>", text: "Olá" });
  assert.equal(settings.host, "smtp.gmail.com");
  assert.equal(settings.port, 465);
  assert.equal(settings.secure, true);
  assert.equal(settings.auth.user, "voxelia@example.com");
  assert.deepEqual(message, { from: "Voxelia <voxelia@example.com>", to: "buyer@example.com",
    subject: "Acesso", html: "<p>Olá</p>", text: "Olá" });
});

test("Gmail SMTP não é habilitado com configuração incompleta", () => {
  assert.equal(createMailer({ gmailUser: "voxelia@example.com" }), null);
  assert.equal(createMailer({ gmailAppPassword: "app-password-test" }), null);
});
