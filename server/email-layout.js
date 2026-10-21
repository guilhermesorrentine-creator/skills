// Layout único dos e-mails da Voxelia (modelos do Supabase Auth e e-mails enviados pelo servidor).
// HTML de e-mail: tabelas e estilos inline; o modo noturno usa prefers-color-scheme com classes
// e os clientes sem suporte mostram a versão clara. Personagens em PNG (clientes não exibem SVG).

const light = { bg: "#F7F6F2", surface: "#FFFFFF", text: "#23212B", text2: "#55525F", text3: "#6E6A78", line: "#E4E0D8", primary: "#7445C7", soft: "#ECE5FA" };
const dark = { bg: "#15131B", surface: "#211E29", text: "#F3F1F7", text2: "#C2BDCC", text3: "#9C97A8", line: "#36313F", link: "#B596EC", soft: "#2C2540" };
const font = "'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Escapa texto vindo de dados (e-mail da pessoa, nome da edição) antes de entrar no HTML.
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

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
    <td style="padding-left:10px;font-family:${font};font-size:15px;font-weight:700;color:${light.text};" class="t-text">Voxelia</td>
  </tr>
</table>`;

const stepsBlock = (steps) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 4px;">
  ${steps.map((step, i) => `<tr>
    <td width="40" valign="top" style="padding:0 12px 14px 0;"><div class="t-soft" style="width:30px;height:30px;line-height:30px;border-radius:50%;background:${light.soft};color:${light.primary};text-align:center;font-family:${font};font-size:14px;font-weight:800;">${i + 1}</div></td>
    <td valign="top" style="padding:3px 0 14px;font-family:${font};font-size:15px;line-height:1.5;"><b class="t-text" style="color:${light.text};">${step.title}</b><br><span class="t-text2" style="color:${light.text2};">${step.text}</span></td>
  </tr>`).join("\n  ")}
</table>`;

// `title`, `body`, `note` e os passos são HTML confiável do próprio projeto; dados de pessoas
// entram já escapados por quem chama. `url` e `siteUrl` podem ser variáveis de modelo do Supabase.
export function renderEmail({ subject, preheader, title, body, button, url, note, steps = [], siteUrl, artUrl, comment = "", fallbackLink = true }) {
  const href = escapeHtml(url);
  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${subject}</title>${comment ? `\n<!-- ${comment} -->` : ""}
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  a { color:${light.primary}; }
  @media (max-width: 600px) {
    .card { padding:28px 22px !important; }
    .title { font-size:25px !important; }
    .btn-wrap, .btn-wrap td, .btn-link { width:100% !important; display:block !important; box-sizing:border-box; }
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="t-bg" bgcolor="${light.bg}" style="background:${light.bg};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 20px;">${logo}</td></tr>
        <tr>
          <td class="t-card" bgcolor="${light.surface}" style="background:${light.surface};border:1px solid ${light.line};border-radius:20px;overflow:hidden;">
            ${artUrl ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" class="t-soft" bgcolor="${light.soft}" style="background:${light.soft};padding:26px 20px 18px;border-radius:20px 20px 0 0;">
              <img src="${escapeHtml(artUrl)}" width="300" alt="Os quatro personagens da Voxelia: Hacker, Estrategista, Criadora e Pesquisadora" style="display:block;width:300px;max-width:100%;height:auto;border:0;image-rendering:pixelated;">
            </td></tr></table>` : ""}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="card" style="padding:34px 36px 32px;">
            <h1 class="title t-text" style="margin:0 0 14px;font-family:${font};font-size:29px;line-height:1.15;font-weight:800;letter-spacing:-0.5px;color:${light.text};">${title}</h1>
            <p class="t-text2" style="margin:0 0 28px;font-family:${font};font-size:16px;line-height:1.6;color:${light.text2};">${body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn-wrap">
              <tr>
                <td align="center" bgcolor="${light.primary}" style="border-radius:14px;background:${light.primary};">
                  <a class="btn-link" href="${href}" target="_blank" style="display:inline-block;padding:18px 34px;font-family:${font};font-size:17px;font-weight:800;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:14px;text-align:center;">${button}</a>
                </td>
              </tr>
            </table>
            ${steps.length ? stepsBlock(steps) : ""}
            ${fallbackLink ? `<p class="t-text3" style="margin:26px 0 8px;font-family:${font};font-size:13px;line-height:1.5;color:${light.text3};">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
            <p class="t-soft" style="margin:0;padding:10px 12px;border-radius:10px;background:${light.soft};font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:12px;line-height:1.5;color:${light.text2};word-break:break-all;"><a class="t-link" href="${href}" target="_blank" style="color:${light.primary};text-decoration:none;">${href}</a></p>` : ""}
            ${note ? `<p class="t-text3 t-line" style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${light.line};font-family:${font};font-size:13px;line-height:1.5;color:${light.text3};">${note}</p>` : ""}
            </td></tr></table>
          </td>
        </tr>
        <tr>
          <td align="center" class="t-text3" style="padding:22px 8px 0;font-family:${font};font-size:12px;line-height:1.5;color:${light.text3};">
            Voxelia · <a class="t-link" href="${escapeHtml(siteUrl)}" target="_blank" style="color:${light.primary};text-decoration:none;">Acessar o site</a><br>
            Você recebeu este e-mail porque ele foi usado na Voxelia.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}
