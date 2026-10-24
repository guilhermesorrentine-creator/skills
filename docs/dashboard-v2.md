# Dashboard Voxelia v2

O painel privado fica em `/admin/dashboard` e usa a autorização do Admin atual. As janelas são Visão geral, Analytics, Meta Ads, Orgânico, Funil, Financeiro, Clientes e pedidos, Índices e Configurações. Os valores de negócio usam centavos inteiros e dias de Brasília.

Orgânico lê os Reels da conta profissional `@voxelia.ia` pelo Instagram Graph API. Tenta reutilizar `META_ADS_TOKEN` e descobrir o ID da conta pela Página vinculada. Isso requer `pages_show_list`, `instagram_basic` e `instagram_manage_insights`; `ads_read` sozinho só libera anúncios. `META_INSTAGRAM_TOKEN` e `META_INSTAGRAM_USER_ID` são alternativas explícitas. O gráfico mostra visualizações e horas assistidas acumuladas de cada Reel publicado no período escolhido; não representa visualizações ocorridas naquele dia. Quando um Insight falha, a métrica aparece indisponível e não entra no total. A aba Índices explica os termos usados no painel e as métricas da Meta; os nomes nas telas oferecem ajuda ao toque, teclado e mouse.

**Vendas** registra o valor integral do pedido na confirmação e lança reembolsos como valores negativos na data do estorno. **Caixa** registra o líquido disponibilizado no saldo Asaas por parcela; um estorno debitado aparece como saída. **A receber** lista parcelas ainda sem crédito. Lucro, ROAS e meta usam Vendas, gasto Meta, taxas e despesas por competência. A meta começa em R$ 15.000 de lucro entre 22/10 e 05/12/2026 e pode ser editada.

As consultas ao Asaas e Meta Ads usam cache privado de dez minutos; Atualizar agora o ignora. Falha da fonte ou limite de registros bloqueia os indicadores dependentes. A consulta da Meta requer `META_ADS_TOKEN` com `ads_read` e `META_AD_ACCOUNT_ID` no servidor. O token é separado do `META_CAPI_TOKEN`.

Recargas por Pix à Meta são lançadas no Financeiro como saída de caixa avulsa. Não entram nas despesas do lucro: o custo dos anúncios já é o gasto efetivo informado pelos Insights da Meta. Ao lado do título Meta Ads, **Saldo estimado Meta** soma as recargas registradas e subtrai o gasto diário desde a primeira recarga. O valor depende do histórico cadastrado e dos Insights disponíveis; não é o saldo oficial da conta de anúncios.

O vínculo UTM é cadastrado explicitamente, sem adivinhar pela nomenclatura. A interface de notas foi removida por enquanto; dados já importados continuam preservados no banco.

Para publicar: aplicar `supabase/migrations/20261024180000_owner_dashboard.sql`, configurar o token da Meta, cadastrar os vínculos UTM e verificar um ciclo real de Pix, parcelamento e estorno no Asaas. Executar `npm test` e `npm run build`; revisar o painel em celular e desktop.
