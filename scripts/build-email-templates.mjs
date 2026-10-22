// Gera os modelos de e-mail do Supabase Auth em supabase/templates/ a partir de um layout único.
// O layout é o mesmo dos e-mails enviados pelo servidor (server/email-layout.js).
// Uso: node scripts/build-email-templates.mjs — depois cole cada arquivo em
// Supabase → Authentication → Emails → Templates (exige SMTP próprio configurado).
import { mkdirSync, writeFileSync } from "node:fs";
import { renderEmail } from "../server/email-layout.js";

const OUT = new URL("../supabase/templates/", import.meta.url);

const templates = [
  {
    file: "confirmacao.html",
    slot: "Confirm signup",
    subject: "Confirme seu e-mail — Voxelia",
    preheader: "Falta só um passo para ativar sua conta.",
    title: "Confirme seu e-mail",
    body: "Falta só um passo para ativar sua conta na Voxelia. Confirme que <b>{{ .Email }}</b> é o seu endereço.",
    button: "Confirmar e-mail",
    note: "Se você não criou esta conta, pode ignorar este e-mail.",
  },
  {
    file: "recuperacao-senha.html",
    slot: "Reset Password",
    subject: "Redefina sua senha — Voxelia",
    preheader: "Recebemos um pedido para redefinir sua senha.",
    title: "Redefina sua senha",
    body: "Recebemos um pedido para redefinir a senha da conta <b>{{ .Email }}</b>. Use o botão abaixo para criar uma nova senha.",
    button: "Criar nova senha",
    note: "Se você não fez esse pedido, ignore este e-mail. Sua senha atual continua valendo.",
  },
  {
    file: "troca-email.html",
    slot: "Change Email Address",
    subject: "Confirme seu novo e-mail — Voxelia",
    preheader: "Confirme a troca do e-mail da sua conta.",
    title: "Confirme seu novo e-mail",
    body: "Recebemos um pedido para trocar o e-mail da sua conta de <b>{{ .Email }}</b> para <b>{{ .NewEmail }}</b>.",
    button: "Confirmar novo e-mail",
    note: "Se você não pediu essa troca, ignore este e-mail. Nada será alterado.",
  },
];

// Variáveis do Supabase: {{ .ConfirmationURL }}, {{ .SiteURL }}, {{ .Email }}, {{ .NewEmail }}.
const page = (t) => renderEmail({
  ...t,
  url: "{{ .ConfirmationURL }}",
  siteUrl: "{{ .SiteURL }}",
  artUrl: "{{ .SiteURL }}/email/personagens.png",
  note: `${t.note} Por segurança, o link expira depois de um tempo.`,
  comment: `Modelo "${t.slot}" do Supabase Auth. Assunto sugerido: ${t.subject}`,
});

mkdirSync(OUT, { recursive: true });
for (const t of templates) writeFileSync(new URL(t.file, OUT), page(t));
console.log(templates.map((t) => `${t.slot.padEnd(22)} → supabase/templates/${t.file}  (assunto: ${t.subject})`).join("\n"));
