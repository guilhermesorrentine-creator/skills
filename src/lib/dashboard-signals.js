// Sinais explicáveis para leitura rápida. Nenhum sinal pausa campanhas ou substitui a decisão do dono.
export function paidSignal({ error, spendCents = 0, impressions = 0, linkClicks = null, landingViews = 0,
  siteVisits = null, buyClicks = null, salesCents = null, profitCents = null, trafficTest = false }) {
  // Visitas vêm do funil do site; a contagem da Meta (landing views) só entra sem UTM vinculada.
  const visits = siteVisits ?? landingViews;
  if (error) return { tone: "muted", title: "Dados indisponíveis", detail: "Confira a conexão da Meta antes de avaliar." };
  if (!spendCents && !impressions) return { tone: "muted", title: "Sem entrega ainda", detail: "A campanha ainda não teve gasto ou impressões no período." };
  if (salesCents > 0 && profitCents != null)
    return profitCents >= 0
      ? { tone: "good", title: "Retorno positivo", detail: "As vendas atribuídas já cobrem anúncios e taxas." }
      : { tone: "warn", title: "Vendeu, mas ainda não se pagou", detail: "As vendas atribuídas estão abaixo do gasto e das taxas." };
  if (!trafficTest) return { tone: "neutral", title: "Em observação", detail: "Sem meta de tráfego definida para classificar esta campanha." };
  if (spendCents < 2000 && impressions < 1000) return { tone: "neutral", title: "Ainda cedo", detail: "Avalie após cerca de R$ 20 gastos ou 1.000 impressões." };
  if (impressions >= 1000 && linkClicks != null && linkClicks / impressions < 0.007)
    return { tone: "warn", title: "Criativo pede ajuste", detail: "CTR de link abaixo de 0,7% após 1.000 impressões." };
  if (siteVisits != null && siteVisits >= 50 && buyClicks === 0)
    return { tone: "warn", title: "Página pede ajuste", detail: "Pelo menos 50 visitas do site, sem clique em comprar." };
  if (spendCents >= 2000 && visits >= 20 && spendCents / visits > 120)
    return { tone: "warn", title: "Visita cara", detail: "Custo por visita à página acima de R$ 1,20." };
  if (linkClicks != null && impressions >= 1000 && linkClicks / impressions >= 0.007 && visits >= 20 && spendCents / visits <= 120)
    return { tone: "good", title: "Tráfego com bom sinal", detail: "CTR e custo por visita estão dentro do plano; acompanhe os checkouts." };
  return { tone: "neutral", title: "Em observação", detail: "Acompanhe visitas ao site, checkouts e vendas antes de decidir." };
}

export function reelSignal({ views, ageDays, referenceViews }) {
  if (views == null) return { tone: "muted", title: "Visualizações indisponíveis" };
  if (ageDays < 7) return { tone: "neutral", title: "Em evolução" };
  if (referenceViews == null) return { tone: "neutral", title: "Sem histórico suficiente" };
  if (views >= referenceViews * 1.25) return { tone: "good", title: "Acima do padrão" };
  if (views <= referenceViews * 0.75) return { tone: "warn", title: "Abaixo do padrão" };
  return { tone: "neutral", title: "Na faixa habitual" };
}
