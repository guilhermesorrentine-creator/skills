# Biblioteca Total 4.0 — operação comercial

## Rotas

| Rota | Quem acessa | Conteúdo |
|---|---|---|
| `/` | público | Landing: hero 3D, recursos, agentes, demonstração, como funciona, planos, FAQ |
| `/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | público | Supabase Auth (e-mail e senha) |
| `/planos` | público | redireciona para `/#planos` |
| `/checkout/retorno` | logado | aguarda a confirmação do Asaas; não libera acesso pela URL |
| `/minha-assinatura` | logado | situação, período pago, próxima cobrança, fatura, cancelamento, planos |
| `/app` (+ `#skill/<id>`, `#repo/<nome>`) | acesso válido | sistema completo da 3.0 |
| `/admin` | `profiles.is_admin` | usuários, assinaturas, pagamentos, webhooks, planos, acessos, auditoria |
| `/termos`, `/privacidade`, `/assinatura-e-cancelamento` | público | estrutura dos documentos, **pendente de aprovação** |

Links antigos `/#skill/<id>` são redirecionados para `/app#skill/<id>`; sem acesso, o usuário passa pelo login e pela assinatura.

## Proteção do conteúdo

- `public/data/catalog.json` deixou de existir. O build não contém o catálogo completo (verificado com busca no `dist/`).
- `/api/catalog` exige token do Supabase **e** acesso válido calculado no servidor (`server/access.js`), com `Cache-Control: private, no-store`.
- A landing carrega apenas `public/data/demo.json`: contagens reais e 23 skills de amostra, sem caminhos.
- **Limitação:** este repositório GitHub é público e contém `src/data/catalog.json`; os repositórios indexados também são públicos. O catálogo não é confidencial. O produto vendido é a plataforma de descoberta, busca, comparação e produtividade. Para dados realmente privados, mover o catálogo para um repositório ou banco privado e gerar o arquivo da função no deploy.
- Antes de vender, revisar licenças e avisos de autoria dos repositórios indexados.

## Estados de assinatura

`pending`, `active`, `past_due`, `canceled`, `expired` (derivado), `suspended`.

| Evento do Asaas | Efeito |
|---|---|
| `CHECKOUT_PAID` | vincula o cliente Asaas (`checkout.customer`) à conta; acesso ainda **não** liberado |
| `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` (de assinatura) | `active`; período pago = vencimento + 1 ciclo (monotônico) |
| `PAYMENT_OVERDUE` | `active` → `past_due`; acesso só até o fim do período pago |
| `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_*` | `suspended`, acesso encerrado |
| `SUBSCRIPTION_CREATED/UPDATED` | vincula a assinatura, sincroniza próxima cobrança e ciclo |
| `SUBSCRIPTION_DELETED/INACTIVATED` | `canceled`; acesso até o fim do período pago |
| `CHECKOUT_CANCELED/EXPIRED` | atualiza a intenção de contratação |

Regras: o ID do evento é chave primária (reenvio não reaplica); eventos mais antigos que a última mudança de status não alteram o status; um pagamento que chega antes do vínculo fica `unlinked` e é processado quando o `CHECKOUT_PAID` chega; atualizações usam concorrência otimista (`version`). A reconciliação (`/api/billing/subscription?refresh=1` e botão no admin) recalcula o estado a partir de `GET /subscriptions/{id}` e das cobranças.

## Checkout

`POST /v3/checkouts` com `billingTypes: ["CREDIT_CARD"]`, `chargeTypes: ["RECURRENT"]`, `subscription.cycle` do plano e `nextDueDate` = agora. Não enviamos `customer` nem `customerData`: o pagador informa os dados no Asaas (evita pedir CPF no cadastro). Uma única intenção aberta por usuário (índice único parcial); cliques repetidos reaproveitam o mesmo link. O link só é aceito em domínio `asaas.com`.

## Configuração necessária

1. Projeto Supabase: rodar `supabase/migrations/20261020180000_billing.sql`; habilitar confirmação de e-mail e URLs de redirecionamento (`/entrar`, `/redefinir-senha`).
2. Tornar um administrador: `update public.profiles set is_admin = true where email = '<email>';`
3. Variáveis (ver `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `ASAAS_ENV=sandbox`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, opcional `VITE_SUPPORT_EMAIL`.
4. No Asaas Sandbox: criar webhook para `https://<domínio>/api/webhooks/asaas` com o token de autenticação igual a `ASAAS_WEBHOOK_TOKEN` e os eventos de Checkout, Cobrança e Assinatura listados acima.
5. Criar o plano em `/admin` → Planos (preço em centavos, periodicidade, recursos, regras) e marcar como ativo.
6. Produção exige `ASAAS_ENV=production` **e** `ASAAS_ALLOW_PRODUCTION=true`, somente após homologação autorizada.

## A validar no Sandbox

- Se `CHECKOUT_PAID` traz `checkout.customer` preenchido (o vínculo depende disso; a reconciliação por cliente é o plano B).
- Se o checkout recorrente aceita a assinatura sem `endDate`.
- O domínio exato do link de checkout no Sandbox (usamos `link` da resposta quando presente).

## Pendências comerciais

Preços e planos; política de cancelamento e reembolso; textos de termos e privacidade; dados legais do fornecedor; e-mail de suporte; período de carência após atraso (hoje: nenhum).
