# Voxelia 4.0 — arquitetura, comércio e operação

## Arquitetura

- **Frontend:** React + Vite + Motion, roteamento por caminho (`src/lib/router.jsx`), SPA com fallback na Vercel.
- **Backend:** uma Vercel Function (`api/index.js` + rewrite de `/api/*`) → `server/app.js` → `server/routes.js`. Regras puras em `server/licensing.js`; serviços em `commerce.js` (pedidos, Asaas, licenças), `library.js` (catálogo unificado) e `me.js` (favoritos, histórico, coleções).
- **Dados:** Supabase Auth (contas) e Postgres (`supabase/migrations/`). RLS em todas as tabelas; o navegador nunca grava direto.
- **Catálogo:** Agent Skills em `src/data/catalog.json` (canônico no repositório); demais tipos na tabela `resources`, cadastrados pela administração. A API une os dois e filtra pela edição do usuário.

## Rotas

`/` landing · `/entrar` `/cadastro` `/recuperar-senha` `/redefinir-senha` · `/checkout/retorno` · `/acesso-pendente` · `/app` (início) · `/app/skills` `/app/subagentes` `/app/workflows` `/app/ferramentas` `/app/guias` · `/app/buscar` · `/app/recursos/:id` · `/app/colecoes` `/app/colecoes/:id` · `/app/favoritos` `/app/recentes` `/app/comparar` · `/app/minha-licenca` · `/admin` · `/c/:token` (coleção compartilhada, `noindex`) · `/termos` `/privacidade` `/compra-e-reembolso`.

Links antigos: `#skill/<id>` → `/app/recursos/<id>`; `#repo/<nome>` → `/app/skills?fonte=<nome>`.

## Modelo comercial

- **Edição 1 — R$ 97,90**, pagamento único, licença vitalícia (sem expiração por data). Cadastrada pela migração como *fora de venda*; ative em `/admin` → Edições.
- **Upgrade** = `max(0, preço_destino − crédito_elegível)`, em centavos. Crédito = pedidos pagos e não estornados. Ex.: 1→2 (R$ 147,90) = R$ 50,00; 1→3 (R$ 197,90) = R$ 100,00. Preços futuros são ilustrativos até aprovação.
- **Versão técnica ≠ edição comercial:** deploys não criam edições; só a administração cria.
- Pedidos guardam preço, crédito e valor praticados; mudar o preço não altera direitos adquiridos.

## Asaas (Sandbox)

- `POST /v3/checkouts` com `chargeTypes: ["DETACHED"]`, `billingTypes: ["PIX", "CREDIT_CARD"]`, `externalReference` = ID do pedido, callbacks para `/checkout/retorno`. Sem parcelamento, sem assinatura.
- Um pedido em aberto por usuário (índice único parcial); cliques repetidos reaproveitam o link.
- **Webhook** `POST /api/webhooks/asaas`: valida `asaas-access-token` (tempo constante); o ID do evento é chave primária (reenvio não reaplica).
  - `CHECKOUT_PAID`: localiza o pedido pelo checkout (ou `externalReference`), confere o valor, marca pago e ativa/eleva a licença.
  - `CHECKOUT_CANCELED/EXPIRED`: encerra o pedido pendente.
  - `PAYMENT_CONFIRMED/RECEIVED`: registra a cobrança; ativa pedido pendente do mesmo cliente e valor (redundância).
  - `PAYMENT_REFUNDED`: pedido estornado; licença recalculada (sem pedidos válidos → `refunded`).
  - `PAYMENT_CHARGEBACK_*`: licença `disputed` com acesso mantido até decisão auditada em `/admin` → Licenças.
  - Evento sem pedido/cliente conhecido fica `unlinked` e é reprocessado quando o `CHECKOUT_PAID` chega; falhas ficam `failed` para reprocessar.
- **Conciliação:** `/admin` → Pedidos → Conciliar consulta `GET /v3/payments?customer=`.

## Boas-vindas e convites

- **Compra confirmada:** ao ativar a primeira licença, o servidor envia o e-mail "Seu acesso à Voxelia está liberado", com o botão "Entrar na Voxelia" e os primeiros passos. Sai uma única vez por pessoa (registrado como evento `welcome_email`); falha de envio não desfaz a ativação.
- **Convite pelo admin** (`/admin` → Usuários e acessos → Convidar e liberar): informa e-mail, acesso (completo = todas as edições, inclusive futuras) e justificativa. Se a conta não existe, é criada pelo Supabase Auth e o e-mail traz **"Criar minha senha e entrar"**, um link de uso único que leva a `/criar-senha`. Se já existe, o e-mail traz "Entrar na Voxelia". Tudo fica na auditoria.
- **Nenhuma senha é gerada, guardada ou enviada.** A pessoa cria a própria senha pelo link.
- **Envio:** API da Resend (`RESEND_API_KEY` e `EMAIL_FROM`, com domínio verificado). Sem elas, nada é enviado e o admin recebe o link do convite para mandar por outro canal, só para a própria pessoa.
- **Layout:** `server/email-layout.js`, o mesmo dos modelos do Supabase (`scripts/build-email-templates.mjs`). Personagens em `public/email/personagens.png`, gerado por `node scripts/build-email-art.mjs` a partir de `src/components/categories/sprites.js`.
- **Supabase:** a URL `/criar-senha` de cada ambiente precisa estar em Authentication → URL Configuration → Redirect URLs.

## Proteção do conteúdo

- `public/` só tem `data/demo.json` (23 skills de amostra, sem caminhos). O build foi verificado sem o catálogo completo.
- `/api/library` e `/api/resource` exigem login e licença; recursos de edição superior voltam bloqueados, sem corpo.
- **Limitação:** o repositório GitHub e as fontes das skills são públicos; o catálogo não é secreto. O valor vendido é curadoria, organização, busca, guias próprios e ferramentas de organização. Guias próprios ficam no banco (não no repositório).
- Antes de vender, revisar licenças e avisos de autoria dos repositórios indexados.

## Configuração

1. Supabase: rodar as migrações em ordem (`20261020180000_billing.sql`, `20261021120000_v4_editions_resources.sql`). URLs de autenticação: Site URL = domínio de produção; redirects para produção, previews e `localhost:5173`.
2. Administrador: `update public.profiles set is_admin = true where email = '<email>';`
3. Variáveis na Vercel (ver `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Config); `SUPABASE_URL`, `APP_URL`, `ASAAS_ENV=sandbox`, `ASAAS_CHECKOUT_MINUTES` (Config); `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (Secret).
4. Asaas Sandbox: webhook para `https://<domínio>/api/webhooks/asaas` com o token, eventos de Checkout e Cobrança.
5. Produção do Asaas só com `ASAAS_ENV=production` **e** `ASAAS_ALLOW_PRODUCTION=true`, após homologação autorizada.

## Guia administrativo

- **Recursos e guias:** id estável (minúsculas e hífen), tipo, área, resumo, conteúdo em Markdown seguro, instruções copiáveis, link HTTPS, visibilidade (pública, demonstrativa, por edição) e status (rascunho, publicado, oculto). Toda gravação é auditada.
- **Caminhos:** objetivo, palavras-chave e passos `id | justificativa`; só aparecem publicados e com todos os passos acessíveis.
- **Relações:** `id | related|requires|next`.
- **Edições, pedidos, licenças, webhooks, acessos excepcionais e auditoria** na mesma tela.

## Homologação (Sandbox)

1. Ativar a Edição 1 em `/admin`. 2. Criar conta, comprar com Pix de teste e com cartão de teste. 3. Conferir `/checkout/retorno` → acesso liberado após o webhook. 4. Reenviar o mesmo evento no Asaas (sem efeito duplicado). 5. Estornar e contestar uma cobrança de teste. 6. Simular upgrade criando a Edição 2 em venda. 7. Testar coleção compartilhada em janela anônima.

## Recuperação

- Webhook com falha: `/admin` → Webhooks → Reprocessar. Pedido pago sem licença: Conciliar.
- Banco: backups do Supabase (plano gratuito tem retenção limitada — avaliar plano pago antes de vender).
- Rollback do site: promover um deploy anterior na Vercel. As migrações são aditivas.

## Pendências comerciais e jurídicas

Nome jurídico, CNPJ e endereço; e-mail de suporte (`VITE_SUPPORT_EMAIL`); política de reembolso e cancelamento; termos de acesso vitalício e alcance de atualizações gratuitas; preços de edições futuras; decisão padrão para contestações.
