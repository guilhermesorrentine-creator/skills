# Oferta vitalícia pela Cakto

## Decisão comercial

A oferta planejada da Edição 1 é **R$ 39,90 em pagamento único**, por Pix ou cartão, com acesso vitalício ao acervo. Não inclui conexão automática com IA. Assinaturas mensais e compras antigas pelo Asaas conservam os direitos contratados, mas não serão oferecidas a novos clientes após a mudança. A página `/oferta` e os caminhos públicos de compra devem seguir essa oferta quando a publicação for autorizada. O preço de R$ 19,90 abaixo registra etapas anteriores do projeto.

## Fluxo técnico

O servidor cria um pedido local com preço em centavos e envia o comprador ao checkout hospedado na Cakto com o ID do pedido em `callback`. O retorno do navegador nunca libera acesso. Só o webhook assinado, com produto, oferta, valor, moeda, comprador e pedido correspondentes, marca a venda como paga e libera a licença. Eventos ficam registrados para auditoria e reprocessamento. Duplicatas não criam outra licença. Reembolso ou contestação recalcula o acesso. O `Purchase` da Meta usa o ID da transação Cakto e só é enviado com consentimento de marketing; uma falha temporária pode ser repetida com o mesmo ID.

A venda e a taxa informada pela Cakto entram no painel financeiro. O painel ainda não conhece a data em que a Cakto disponibiliza o saldo: **Caixa no Asaas** continua mostrando apenas créditos do Asaas. Não interpretar esse card como caixa consolidado entre os dois provedores.

O comprador sem conta recebe um e-mail para criar a senha após a confirmação. O retorno automático da Cakto para `/checkout/retorno` depende do recurso **Redirect pós-pagamento**, liberado pela Cakto após análise. Até essa liberação, o e-mail de boas-vindas precisa estar operacional, pois o `callback` do webhook confirma a venda mesmo se a pessoa fechar a página de pagamento. O envio pode usar Resend ou Gmail SMTP (`GMAIL_SMTP_USER` e `GMAIL_SMTP_APP_PASSWORD`, senha de app do Google). A compra sem conta falha antes de abrir o checkout se nenhum dos dois estiver configurado.

## Antes de ativar

1. Confirmar o ID do produto no painel ou em um evento real de teste. O checkout público expõe o ID interno da oferta `xjg2gb9`; o ID do produto `eab775e9-b5c9-4f22-8bcb-490e8338b66e` veio da URL de administração enviada pelo proprietário.
2. Criar um webhook da Cakto apontando para `/api/webhooks/cakto` e guardar seu segredo em `CAKTO_WEBHOOK_SECRET` no servidor. Configurar também `CAKTO_PRODUCT_ID`, `CAKTO_OFFER_ID` e `CAKTO_CHECKOUT_SLUG`. Nenhum segredo deve ter prefixo `VITE_`.
3. A migration `20261027120000_voxelia_cakto_vitalicio.sql` foi aplicada somente ao projeto `biblioteca-total` em 29/10/2026, registrada remotamente como `20261029123959_voxelia_cakto_vitalicio`. O histórico local e remoto continua divergente; não usar `db push` em lote. O plano Free não oferece backup automático; os campos comerciais anteriores e o retorno estão em `docs/cakto-retorno.md`.
4. Fazer um teste de ponta a ponta em ambiente isolado, com evento real de teste da Cakto, incluindo aprovação, duplicata e estorno. Não criar compra fictícia contabilizada como venda real.
5. Conferir as opções da nova oferta: o checkout público estava ativo em 28/10/2026. O parcelamento foi ajustado de até 9 para 1 parcela; o campo de cupom ainda aparecia. A integração local aceita apenas compra única por R$ 19,90 em 1 parcela. Desativar cupons e o produto até validar o webhook. Publicar o código e testar o fluxo antes de voltar a ativá-lo.

Antes da ativação, conferir também se o pixel da própria Cakto já envia `Purchase` ao Pixel `1134502832307010`. Se enviar, alinhar os IDs de deduplicação ou desligar uma das fontes para não contar duas compras. O teste de webhook da Cakto usa um payload fixo que não corresponde a esta oferta; ele serve para validar entrega e assinatura, não para liberar uma licença.

Produto Cakto: `eab775e9-b5c9-4f22-8bcb-490e8338b66e`. Oferta: `xjg2gb9`. Checkout: `https://pay.cakto.com.br/xjg2gb9_1253369`.


## Atualização de 29/10/2026

A Cakto mostrou a oferta original e o checkout xjg2gb9_1253369 a R$ 19,90. O webhook Voxelia — compras foi salvo com compra aprovada, reembolso e chargeback. O código local passou em 95 testes e na build, mas o banco de produção ainda não recebeu esta migration e o site não foi publicado. A conta Gmail zack74522@gmail.com exige confirmação adicional para verificar se senhas de app estão disponíveis. Não anunciar entrega automática até validar o envio real e o webhook.

## Entrega sem Gmail SMTP

O Google confirmou em 29/10/2026 que senhas de app não estão disponíveis para zack74522@gmail.com. A página /oferta agora pede cadastro ou login Voxelia antes de abrir o checkout. O comprador confirma o e-mail de cadastro pelo Supabase Auth, entra e paga com o mesmo e-mail na Cakto. O webhook de compra aprovada concede a licença à conta já autenticada; o comprador entra novamente para ver o acervo. Gmail fica como contato de suporte, sem promessa de envio automático por SMTP.

Em 29/10/2026: 95/95 testes e build aprovados; migration aplicada e verificada (4 pedidos preservados, 8 colunas novas, tabela de eventos vazia com RLS); preview protegida `https://skills-75ll0h4vz-guilherme-s-projects28.vercel.app` pronta. A rota do webhook rejeitou requisição sem assinatura com HTTP 401. A Vercel lista `CAKTO_WEBHOOK_SECRET` em Preview e Production, mas a interface retorna os valores cifrados, então os IDs e o segredo ainda não foram verificados funcionalmente. A preview usa o Supabase de produção: não enviar evento de teste que registre compra fictícia. O produto Cakto segue inativo e o domínio principal segue com a oferta antiga. **Ainda falta provar uma compra aprovada real em ambiente de teste isolado e a entrega automática, sem cobrança real.**

Depois da verificação, o dono autorizou restaurar temporariamente os campos comerciais para manter a produção antiga coerente. O banco voltou a Edição 1 por R$ 97,90 e `voxelia-mensal` ativo; a API pública confirmou R$ 97,90. A estrutura Cakto permanece instalada, sem eventos ou compras de teste. Antes de publicar a nova oferta, será necessário reaplicar os valores comerciais de R$ 19,90 de forma controlada, depois da validação isolada e da autorização de publicação.

## Go-live (preparado em 29/10/2026)

Em 29/10 o "Confirm email" do Supabase Auth foi desligado com autorização do dono. O cadastro abre a sessão na hora, e a pessoa volta para a `/oferta` já logada, sem depender do limite de 2 e-mails por hora. As variáveis `CAKTO_*` estão na Vercel. O banco já tem as colunas da Cakto e a tabela `dashboard_connections`. Testes: 95/95. Build: ok.

O webhook da Cakto aponta para a produção. Por isso, o teste real só pode ser feito depois do deploy. Ordem:

1. Fazer o merge do PR. A Vercel publica.
2. Logo em seguida, aplicar os valores comerciais da nova oferta com uma chamada específica no projeto `biblioteca-total`:

```sql
begin;
update public.commercial_editions
set name = 'Voxelia — acesso vitalício', price_cents = 3990,
    description = 'Acesso vitalício ao acervo de skills em português. Sem conexão automática com IA.',
    features = array['Acervo de skills com busca por objetivo', 'Guias em português para consultar e copiar', 'Pagamento único, sem mensalidade'],
    on_sale = true, updated_at = now()
where code = 'edicao-1';
update public.commercial_editions set on_sale = false, updated_at = now() where code <> 'edicao-1';
update public.plans set active = false where code = 'voxelia-mensal';
commit;
```

3. Reativar o produto na Cakto, com cupom desligado e 1 parcela.
4. O dono faz uma compra real de R$ 39,90 com a própria conta Voxelia, somente quando autorizar essa validação. Conferir que a licença foi ativada e que `cakto_webhook_events` tem o evento.
5. Pedir o estorno pela Cakto e conferir que o acesso foi cortado.
6. Se algo falhar: desativar o produto na Cakto, reverter o merge e aplicar o retorno de `docs/cakto-retorno.md`.

## Troca de produto e preço (29/10/2026, noite)

O produto `eab775e9…` ficou bloqueado pela Cakto ("contate o suporte") e o checkout respondia 404. O dono pediu um produto novo com as mesmas características:

- produto `6ca0a662-b9c7-4cfd-892d-69527ddbdc3b`;
- oferta `n67ozi6`;
- checkout `n67ozi6_1258848`.

O produto novo já está no webhook "Voxelia — compras", e a Vercel recebeu os três IDs. Em seguida, o dono pediu o preço de **R$ 39,90**. O preço passa a existir só em dois lugares do código, `CAKTO_PRICE_CENTS` (server/cakto.js) e `OFFER_PRICE` (src/lib/billing-client.js). O valor precisa ser igual também no produto Cakto e em `commercial_editions.price_cents` (`edicao-1` = 3990).

## Página de vendas baseada na referência visual (30/10/2026)

O dono forneceu um ZIP da landing Low Ticket AI e pediu que a `/oferta` adotasse sua estrutura visual com identidade Voxelia. A nova página usa fundo escuro, destaques em ciano e violeta, chamada central, quatro benefícios, prévia ilustrativa da busca, seções de funcionamento e conteúdo, comparação, card da oferta e perguntas frequentes. Não foram reutilizados o pixel, depoimentos, provas de faturamento, promessas de lucro ou temporizadores da referência. O botão de compra mantém o cadastro antes do checkout e o funil existente. O formulário só é mostrado se o preço retornado pelo servidor for R$ 39,90. O HTML pré-renderizado da `/oferta` e o preço estático das páginas públicas foram alinhados a R$ 39,90.

Esta edição está apenas no código local. O banco de produção ainda mantém os valores comerciais anteriores e o produto Cakto precisa estar confirmado em R$ 39,90 antes da publicação. A migration histórica que registrou R$ 19,90 não deve ser reaplicada; a troca comercial final precisa ser uma operação separada e autorizada.

## Compra por e-mail antes do checkout (30/10/2026)

A `/oferta` local agora pede apenas o e-mail antes de abrir a Cakto. O servidor cria uma conta sem senha e associa o pedido a ela. Após o webhook de compra aprovada, libera a licença e gera um link pessoal para criar senha; a conta já possui o e-mail informado. Uma conta que já entrou na Voxelia precisa fazer login para comprar. A compra sem conta permanece bloqueada enquanto não houver envio automático de e-mail comprovadamente funcional. As variáveis de Gmail SMTP presentes na Vercel não demonstram entrega; a conta Google usada anteriormente não disponibilizou senha de app. Não alterar o preço de produção isoladamente: banco, checkout Cakto e site publicado precisam mostrar R$ 39,90 no mesmo momento da ativação.

Em 30/10/2026, consulta somente de leitura confirmou que `biblioteca-total` já apresenta `edicao-1` por 3990 centavos e `voxelia-mensal` inativo; a API pública `/api/editions` também devolve 3990 centavos. Não foi necessário atualizar o banco novamente. A paleta do código local passou a usar azul e ciano da nova oferta no site e no painel. Testes: 95/95; build: aprovada. A publicação do fluxo de compra por e-mail ainda depende de envio automático comprovado e validação da oferta Cakto.

## Login antes do checkout, com opção Google

O dono optou por manter o acervo na Voxelia e evitar a dependência de e-mail pós-compra. A `/oferta` local voltou a exigir conta antes do checkout; oferece Google quando o provedor estiver ativado no Supabase, além de e-mail e senha. O retorno do OAuth preserva `/oferta` como destino mesmo para conta ainda sem licença. O checkout da Cakto deve usar o mesmo e-mail da conta autenticada; o webhook compara ambos antes de liberar acesso. Em 30/10/2026, a API pública do Supabase indicou `external.google=false`; não anunciar Google como disponível nem publicar o botão antes de configurar o cliente OAuth e habilitar o provedor no projeto `biblioteca-total`.

Com autorização do dono, foi criado no Google Cloud da conta `zack74522@gmail.com` o projeto isolado `Voxelia Login` (`voxelia-login`). A tela de consentimento recebeu o nome Voxelia, suporte `zack74522@gmail.com` e público externo. A etapa final exige que o dono aceite a Política de dados do usuário dos serviços de API do Google. Até essa aceitação, não há cliente OAuth nem provedor Google ativo no Supabase. O código local esconde o botão Google enquanto a API pública do Supabase não indicar o provedor ativo. Nenhum domínio foi comprado.

Após o dono aceitar essa política, o cliente OAuth web `Voxelia Supabase Auth` foi criado no projeto `voxelia-login` com retorno exclusivo para `https://nziuujuejzslgurycryt.supabase.co/auth/v1/callback`. O segredo foi inserido no provedor Google do Supabase `biblioteca-total`, sem ser salvo no repositório. A interface e a API pública confirmaram `external.google=true`; a rota `/auth/v1/authorize` redireciona ao Google com o cliente correto. O app Google ainda precisa sair do modo de testes para permitir compradores fora da lista de teste. A URL pública do checkout Cakto respondeu HTTP 200 e exibiu R$ 39,90 em 30/10/2026; isso não substitui a prova de compra aprovada e liberação de acesso.
