// E-mails de boas-vindas (compra confirmada e acesso liberado pela administração) e o envio.
// O envio usa a API HTTP da Resend; sem RESEND_API_KEY/EMAIL_FROM, nada é enviado e quem chamou
// recebe `sent: false` (a administração pode copiar o link e enviar por outro canal).
import { escapeHtml, renderEmail } from "./email-layout.js";

const FIRST_STEPS = [
  { title: "Entre no Arsenal", text: "Use sempre este e-mail para acessar a plataforma." },
  { title: "Busque pelo objetivo", text: "Escreva o que quer fazer, como “criar um site” ou “editar vídeos”." },
  { title: "Siga um guia passo a passo", text: "Cada recurso tem o que é, como instalar e como usar." },
  { title: "Salve o que importa", text: "Favoritos e coleções ficam na sua conta, em qualquer dispositivo." },
];

// `kind`: "purchase" (pagamento confirmado; a pessoa já tem senha), "invite" (conta criada pela
// administração; o botão leva a criar a senha) ou "grant" (conta existente recebeu acesso).
export function welcomeEmail({ kind, email, editionName, actionUrl, appUrl }) {
  const who = `<b>${escapeHtml(email)}</b>`;
  const edition = escapeHtml(editionName || "Arsenal IA");
  const content = {
    purchase: {
      subject: "Seu acesso ao Arsenal IA está liberado",
      preheader: "Pagamento confirmado. Seu acesso vitalício já está ativo.",
      title: "Bem-vindo ao Arsenal IA",
      body: `Seu pagamento foi confirmado e o acesso vitalício à <b>${edition}</b> está ativo para ${who}. É só entrar com o e-mail e a senha que você criou no cadastro.`,
      button: "Entrar no Arsenal",
      note: "Pagamento único, sem mensalidade. Esqueceu a senha? Use “Esqueci a senha” na tela de entrada.",
    },
    invite: {
      subject: "Seu acesso ao Arsenal IA foi liberado",
      preheader: "Crie sua senha e entre na plataforma.",
      title: "Seu acesso está pronto",
      body: `Você recebeu acesso completo ao Arsenal IA com o e-mail ${who}. Crie sua senha pelo botão abaixo e você já entra na plataforma.`,
      button: "Criar minha senha e entrar",
      note: "O link é pessoal e vale por tempo limitado. Se ele expirar, use “Esqueci a senha” na tela de entrada com este e-mail.",
    },
    grant: {
      subject: "Seu acesso ao Arsenal IA foi liberado",
      preheader: "Seu acesso completo já está ativo.",
      title: "Seu acesso está ativo",
      body: `O acesso completo ao Arsenal IA foi liberado para ${who}. Entre com o e-mail e a senha que você já usa.`,
      button: "Entrar no Arsenal",
      note: "Esqueceu a senha? Use “Esqueci a senha” na tela de entrada.",
    },
  }[kind];
  const url = actionUrl || `${appUrl}/entrar`;
  const html = renderEmail({ ...content, url, steps: FIRST_STEPS, siteUrl: appUrl, artUrl: `${appUrl}/email/personagens.png` });
  const text = [
    content.title, "",
    content.body.replace(/<[^>]+>/g, ""), "",
    `${content.button}: ${url}`, "",
    ...FIRST_STEPS.map((step, i) => `${i + 1}. ${step.title} — ${step.text}`), "",
    content.note.replace(/<[^>]+>/g, ""),
  ].join("\n");
  return { subject: content.subject, html, text };
}

export function createMailer({ apiKey, from }, fetcher = fetch) {
  if (!apiKey || !from) return null;
  return {
    async send({ to, subject, html, text }) {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (!response.ok) throw new Error(`Envio de e-mail recusado (${response.status}).`);
      return response.json().catch(() => ({}));
    },
  };
}
