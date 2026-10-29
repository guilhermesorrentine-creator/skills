// E-mails de boas-vindas (compra confirmada e acesso liberado pela administração) e o envio.
// O envio usa Resend ou Gmail SMTP; sem configuração, nada é enviado e quem chamou
// recebe `sent: false` (a administração pode copiar o link e enviar por outro canal).
import { escapeHtml, renderEmail } from "./email-layout.js";
import nodemailer from "nodemailer";

const FIRST_STEPS = [
  { title: "Entre na Voxelia", text: "Use sempre este e-mail para acessar a plataforma." },
  { title: "Busque pelo objetivo", text: "Escreva o que quer fazer, como “criar um site” ou “editar vídeos”." },
  { title: "Siga um guia passo a passo", text: "Cada recurso tem o que é, como instalar e como usar." },
  { title: "Salve o que importa", text: "Favoritos e coleções ficam na sua conta, em qualquer dispositivo." },
];

// `kind`: "purchase" (pagamento confirmado; a pessoa já tem senha), "invite" (conta criada pela
// administração; o botão leva a criar a senha) ou "grant" (conta existente recebeu acesso).
export function welcomeEmail({ kind, email, editionName, actionUrl, appUrl }) {
  const who = `<b>${escapeHtml(email)}</b>`;
  const edition = escapeHtml(editionName || "Voxelia");
  const content = {
    purchase: {
      subject: "Seu acesso à Voxelia está liberado",
      preheader: "Pagamento confirmado. Seu acesso vitalício já está ativo.",
      title: "Bem-vindo à Voxelia",
      body: `Seu pagamento foi confirmado e o acesso vitalício à <b>${edition}</b> está ativo para ${who}. É só entrar com o e-mail e a senha que você criou no cadastro.`,
      button: "Entrar na Voxelia",
      note: "Pagamento único, sem mensalidade. Esqueceu a senha? Use “Esqueci a senha” na tela de entrada.",
    },
    purchase_invite: {
      subject: "Sua compra Voxelia foi confirmada",
      preheader: "Crie sua senha para acessar o acervo vitalício.",
      title: "Seu acesso está pronto",
      body: `Seu pagamento foi confirmado. O acervo vitalício da <b>${edition}</b> está liberado para ${who}. Crie sua senha pelo botão abaixo para entrar.`,
      button: "Criar minha senha e entrar",
      note: "O link é pessoal e vale por tempo limitado. Se expirar, use “Esqueci a senha” na tela de entrada.",
    },
    invite: {
      subject: "Seu acesso à Voxelia foi liberado",
      preheader: "Crie sua senha e entre na plataforma.",
      title: "Seu acesso está pronto",
      body: `Você recebeu acesso completo à Voxelia com o e-mail ${who}. Crie sua senha pelo botão abaixo e você já entra na plataforma.`,
      button: "Criar minha senha e entrar",
      note: "O link é pessoal e vale por tempo limitado. Se ele expirar, use “Esqueci a senha” na tela de entrada com este e-mail.",
    },
    grant: {
      subject: "Seu acesso à Voxelia foi liberado",
      preheader: "Seu acesso completo já está ativo.",
      title: "Seu acesso está ativo",
      body: `O acesso completo à Voxelia foi liberado para ${who}. Entre com o e-mail e a senha que você já usa.`,
      button: "Entrar na Voxelia",
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

export function createMailer({ apiKey, from, gmailUser, gmailAppPassword }, fetcher = fetch, createTransport = nodemailer.createTransport) {
  if (apiKey && from) return {
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
  if (!gmailUser || !gmailAppPassword) return null;
  const transport = createTransport({ host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: gmailUser, pass: gmailAppPassword }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  return { send: ({ to, subject, html, text }) => transport.sendMail({ from: `Voxelia <${gmailUser}>`, to, subject, html, text }) };
}
