# Retorno da oferta Cakto (29/10/2026)

Projeto: `biblioteca-total` (`nziuujuejzslgurycryt`). Não executar no projeto MHM.

A migration `20261027120000_voxelia_cakto_vitalicio.sql` altera os dados comerciais da Edição 1 e desativa a venda da mensalidade. Em `orders`, só acrescenta colunas; cria `cakto_webhook_events` com RLS sem políticas públicas. Não apaga pedidos nem assinaturas. Antes da aplicação havia 4 pedidos, 2 edições e 1 plano.

Valores anteriores consultados diretamente no projeto em 29/10/2026:

- `edicao-1`: nome `Voxelia — Edição 1`, preço `9790`, descrição `Acesso vitalício aos recursos incluídos na Edição 1.`, recursos `[]`, `on_sale=true`.
- `pro-anual`: preço `59880`, `on_sale=false`.
- `voxelia-mensal`: preço `4990`, `active=true`.

Se a nova oferta precisar ser retirada depois da migration: desativar o produto Cakto, voltar ao deployment anterior e restaurar somente estes campos comerciais com SQL revisado. Preservar as colunas e a tabela de eventos caso já tenham recebido dados; não apagá-las automaticamente. Pedidos pagos ou assinaturas existentes continuam com os valores registrados em cada pedido.

O projeto está no plano Free e o painel informa **No backups**. Portanto, não há restauração integral automática ou ponto no tempo. A recuperação desta mudança depende dos valores comerciais exportados acima. A migration não altera pedidos existentes; suas novas colunas são aditivas e a tabela de webhooks começa vazia. Se já houver dados novos, preservar a estrutura e os eventos.

Retorno comercial, somente após conferir o projeto e a situação das compras posteriores:

```sql
begin;
update public.commercial_editions
set name = 'Voxelia — Edição 1', price_cents = 9790,
    description = 'Acesso vitalício aos recursos incluídos na Edição 1.',
    features = array[]::text[], on_sale = true, updated_at = now()
where code = 'edicao-1';
update public.commercial_editions set on_sale = false, updated_at = now() where code = 'pro-anual';
update public.plans set active = true where code = 'voxelia-mensal';
commit;
```

O histórico remoto de migrations termina em `20261026124758_meta_oauth_instagram_account` e diverge das numerações locais. Aplicar apenas o SQL revisado por uma chamada específica, sem `db push` em lote nem reparo geral de histórico. O proprietário autorizou esta migration após este plano de recuperação.
