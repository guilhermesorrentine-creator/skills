# Modelos de e-mail do Supabase Auth

Gerados por `node scripts/build-email-templates.mjs` a partir de um layout único (identidade da Biblioteca Total, com modo noturno por `prefers-color-scheme`; clientes sem suporte mostram a versão clara).

| Modelo no Supabase | Arquivo | Assunto |
|---|---|---|
| Confirm signup | `confirmacao.html` | Confirme seu e-mail — Biblioteca Total |
| Reset Password | `recuperacao-senha.html` | Redefina sua senha — Biblioteca Total |
| Change Email Address | `troca-email.html` | Confirme seu novo e-mail — Biblioteca Total |

Como aplicar: Supabase → Authentication → Emails → Templates → cole o assunto e o HTML de cada arquivo. A edição dos modelos exige SMTP próprio configurado (Authentication → SMTP Settings), com domínio e remetente definidos.
