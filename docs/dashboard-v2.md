# Dashboard Voxelia v2

O painel privado fica em `/admin/dashboard` e usa a autorização do Admin atual. As janelas são Visão geral, Analytics, Meta Ads, Orgânico, Funil, Financeiro, Clientes e pedidos, Índices e Configurações. Os valores de negócio usam centavos inteiros e dias de Brasília.

Orgânico lê os Reels da conta profissional `@voxelia.ia` pelo Instagram Graph API. Requer `META_INSTAGRAM_TOKEN` com acesso às mídias e Insights, além de `META_INSTAGRAM_USER_ID`. O gráfico mostra visualizações e horas assistidas acumuladas de cada Reel publicado no período escolhido; não representa visualizações ocorridas naquele dia. Quando um Insight falha, a métrica aparece indisponível e não entra no total. A Visão geral prioriza faturamento e lucro, e os sinais de campanha usam cores e texto. A aba Índices explica os termos usados no painel e as métricas da Meta; os nomes nas telas oferecem ajuda ao toque, teclado e mouse.

**Vendas** registra o valor integral do pedido na confirmação e lança reembolsos como valores negativos na data do estorno. **Caixa** registra o líquido disponibilizado no saldo Asaas por parcela; um estorno debitado aparece como saída. **A receber** lista parcelas ainda sem crédito. Lucro, ROAS e meta usam Vendas, gasto Meta, taxas e despesas por competência. A meta começa em R$ 15.000 de lucro entre 22/10 e 05/12/2026 e pode ser editada.

As consultas ao Asaas e Meta Ads usam cache privado de dez minutos; Atualizar agora o ignora. Falha da fonte ou limite de registros bloqueia os indicadores dependentes. A consulta da Meta requer `META_ADS_TOKEN` com `ads_read` e `META_AD_ACCOUNT_ID` no servidor. O token é separado do `META_CAPI_TOKEN`.

As notas de estratégia são importadas manualmente do Obsidian como Markdown. O administrador informa a pasta relativa ao cofre (`Marketing/...`), escolhe os arquivos e vincula cada nota a uma campanha ou anúncio. A UTM também é cadastrada explicitamente, sem adivinhar pela nomenclatura. A tela mostra o Markdown como texto seguro. Não há diário de testes nem integração com Claude nesta versão.

Para publicar: aplicar `supabase/migrations/20261024180000_owner_dashboard.sql`, configurar o token da Meta, importar as notas do cofre, cadastrar os vínculos A/C/D e verificar um ciclo real de Pix, parcelamento e estorno no Asaas. Executar `npm test` e `npm run build`; revisar o painel em celular e desktop. O merge e a publicação dependem de ordem do dono.
