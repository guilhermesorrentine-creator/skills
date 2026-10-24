# Modelos de e-mail do Supabase Auth

Gerados por `node scripts/build-email-templates.mjs` a partir de um layout único (identidade da Voxelia, com modo noturno por `prefers-color-scheme`; clientes sem suporte mostram a versão clara).

| Modelo no Supabase | Arquivo | Assunto |
|---|---|---|
| Confirm signup | `confirmacao.html` | Confirme seu e-mail — Voxelia |
| Reset Password | `recuperacao-senha.html` | Redefina sua senha — Voxelia |
| Change Email Address | `troca-email.html` | Confirme seu novo e-mail — Voxelia |

Como aplicar: Supabase → Authentication → Emails → Templates → cole o assunto e o HTML de cada arquivo. A edição dos modelos exige SMTP próprio configurado (Authentication → SMTP Settings), com domínio e remetente definidos.

Os botões usam `{{ .SiteURL }}/…?token_hash={{ .TokenHash }}&type=…`: confira em Authentication → URL Configuration que o **Site URL** é o domínio de produção.
