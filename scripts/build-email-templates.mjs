// Gera os modelos de e-mail do Supabase Auth em supabase/templates/ a partir de um layout único.
// HTML de e-mail: tabelas e estilos inline (clientes ignoram CSS moderno); o modo noturno usa
// prefers-color-scheme com classes, e os clientes sem suporte mostram a versão clara.
// Uso: node scripts/build-email-templates.mjs — depois cole cada arquivo em
// Supabase → Authentication → Emails → Templates (exige SMTP próprio configurado).
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../supabase/templates/", import.meta.url);

const light = { bg: "#F7F6F2", surface: "#FFFFFF", text: "#23212B", text2: "#55525F", text3: "#6E6A78", line: "#E4E0D8", primary: "#7445C7", soft: "#ECE5FA" };
const dark = { bg: "#15131B", surface: "#211E29", text: "#F3F1F7", text2: "#C2BDCC", text3: "#9C97A8", line: "#36313F", link: "#B596EC", soft: "#2C2540" };
const font = "'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const templates = [
  {
    file: "confirmacao.html",
    slot: "Confirm signup",
    subject: "Confirme seu e-mail — Biblioteca Total",
    preheader: "Falta só um passo para ativar sua conta.",
    title: "Confirme seu e-mail",
    body: "Falta só um passo para ativar sua conta na Biblioteca Total. Confirme que <b>{{ .Email }}</b> é o seu endereço.",
    button: "Confirmar e-mail",
    note: "Se você não criou esta conta, pode ignorar este e-mail.",
  },
  {
    file: "recuperacao-senha.html",
    slot: "Reset Password",
    subject: "Redefina sua senha — Biblioteca Total",
    preheader: "Recebemos um pedido para redefinir sua senha.",
    title: "Redefina sua senha",
    body: "Recebemos um pedido para redefinir a senha da conta <b>{{ .Email }}</b>. Use o botão abaixo para criar uma nova senha.",
    button: "Criar nova senha",
    note: "Se você não fez esse pedido, ignore este e-mail. Sua senha atual continua valendo.",
  },
  {
    file: "troca-email.html",
    slot: "Change Email Address",
    subject: "Confirme seu novo e-mail — Biblioteca Total",
    preheader: "Confirme a troca do e-mail da sua conta.",
    title: "Confirme seu novo e-mail",
    body: "Recebemos um pedido para trocar o e-mail da sua conta de <b>{{ .Email }}</b> para <b>{{ .NewEmail }}</b>.",
    button: "Confirmar novo e-mail",
    note: "Se você não pediu essa troca, ignore este e-mail. Nada será alterado.",
  },
];

// Ícone da marca (três barras) feito com tabela: SVG não aparece no Gmail.
const logo = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
  <tr>
    <td width="36" height="36" align="center" valign="middle" bgcolor="${light.primary}" style="width:36px;height:36px;border-radius:10px;background:${light.primary};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
        <td valign="bottom" style="padding:0 1px;"><div style="width:4px;height:10px;background:#FFFFFF;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td>
        <td valign="bottom" style="padding:0 1px;"><div style="width:4px;height:16px;background:#FFFFFF;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td>
        <td valign="bottom" style="padding:0 1px;"><div style="width:4px;height:13px;background:#FFFFFF;border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td>
      </tr></table>
    </td>
    <td style="padding-left:10px;font-family:${font};font-size:15px;font-weight:700;color:${light.text};" class="t-text">Biblioteca Total</td>
  </tr>
</table>`;

const page = (t) => `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${t.subject}</title>
<!-- Modelo "${t.slot}" do Supabase Auth. Assunto sugerido: ${t.subject} -->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${light.primary}; }
  @media (max-width: 600px) {
    .card { padding:28px 22px !important; }
    .title { font-size:24px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .t-bg { background:${dark.bg} !important; }
    .t-card { background:${dark.surface} !important; border-color:${dark.line} !important; }
    .t-text { color:${dark.text} !important; }
    .t-text2 { color:${dark.text2} !important; }
    .t-text3 { color:${dark.text3} !important; }
    .t-line { border-color:${dark.line} !important; }
    .t-soft { background:${dark.soft} !important; color:${dark.text2} !important; }
    .t-link { color:${dark.link} !important; }
  }
  /* Outlook.com / app do Outlook em modo escuro */
  [data-ogsc] .t-text { color:${dark.text} !important; }
  [data-ogsc] .t-text2 { color:${dark.text2} !important; }
  [data-ogsc] .t-text3 { color:${dark.text3} !important; }
  [data-ogsc] .t-link { color:${dark.link} !important; }
  [data-ogsb] .t-bg { background:${dark.bg} !important; }
  [data-ogsb] .t-card { background:${dark.surface} !important; }
  [data-ogsb] .t-soft { background:${dark.soft} !important; }
</style>
</head>
<body class="t-bg" style="margin:0;padding:0;background:${light.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${t.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="t-bg" bgcolor="${light.bg}" style="background:${light.bg};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 20px;">${logo}</td></tr>
        <tr>
          <td class="card t-card" bgcolor="${light.surface}" style="background:${light.surface};border:1px solid ${light.line};border-radius:20px;padding:36px 36px 32px;">
            <h1 class="title t-text" style="margin:0 0 14px;font-family:${font};font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;color:${light.text};">${t.title}</h1>
            <p class="t-text2" style="margin:0 0 28px;font-family:${font};font-size:16px;line-height:1.6;color:${light.text2};">${t.body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${light.primary}" style="border-radius:999px;background:${light.primary};">
                  <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${font};font-size:15px;font-weight:700;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:999px;">${t.button}</a>
                </td>
              </tr>
            </table>
            <p class="t-text3" style="margin:28px 0 8px;font-family:${font};font-size:13px;line-height:1.5;color:${light.text3};">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
            <p class="t-soft" style="margin:0;padding:10px 12px;border-radius:10px;background:${light.soft};font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:12px;line-height:1.5;color:${light.text2};word-break:break-all;"><a class="t-link" href="{{ .ConfirmationURL }}" target="_blank" style="color:${light.primary};text-decoration:none;">{{ .ConfirmationURL }}</a></p>
            <p class="t-text3 t-line" style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${light.line};font-family:${font};font-size:13px;line-height:1.5;color:${light.text3};">${t.note} Por segurança, o link expira depois de um tempo.</p>
          </td>
        </tr>
        <tr>
          <td align="center" class="t-text3" style="padding:22px 8px 0;font-family:${font};font-size:12px;line-height:1.5;color:${light.text3};">
            Biblioteca Total · <a class="t-link" href="{{ .SiteURL }}" target="_blank" style="color:${light.primary};text-decoration:none;">Acessar o site</a><br>
            Você recebeu este e-mail porque ele foi usado na Biblioteca Total.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
for (const t of templates) writeFileSync(new URL(t.file, OUT), page(t));
console.log(templates.map((t) => `${t.slot.padEnd(22)} → supabase/templates/${t.file}  (assunto: ${t.subject})`).join("\n"));
