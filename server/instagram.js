// Reels orgânicos publicados pela conta profissional da Voxelia. A credencial nunca sai do servidor.
const graphHost = "https://graph.facebook.com/";
const brazilDay = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const safePermalink = (value) => /^https:\/\/(?:www\.)?instagram\.com\//i.test(value || "") ? value : null;
const metricValue = (insight) => {
  const value = insight?.total_value?.value ?? insight?.values?.[0]?.value;
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
};

async function instagramAccountId(graph, token, fetchImpl) {
  let next = `${graph}/me/accounts?${new URLSearchParams({ fields: "instagram_business_account{id,username}", limit: "100", access_token: token })}`;
  for (let page = 0; page < 10 && next; page++) {
    const response = await fetchImpl(next);
    const payload = await response.json();
    if (!response.ok) throw new Error("O token da Meta Ads não permite consultar as Páginas vinculadas. Autorize pages_show_list, instagram_basic e instagram_manage_insights para ler o Orgânico.");
    const account = payload.data?.map((item) => item.instagram_business_account).find((item) => item?.username?.toLowerCase() === "voxelia.ia" && /^\d+$/.test(String(item.id)));
    if (account) return String(account.id);
    next = payload.paging?.next || null;
    if (next && !next.startsWith(graphHost)) throw new Error("Paginação inesperada da Meta.");
  }
  throw new Error("A conta @voxelia.ia não apareceu nas Páginas acessíveis ao token da Meta. Confira o vínculo e a permissão pages_show_list.");
}

export async function loadInstagramReels(config, from, to, fetchImpl = fetch) {
  const token = config.instagramToken || config.adsToken;
  if (!token) return { rows: [], error: "Configure o token da Meta Ads ou do Instagram no servidor.", checkedAt: null };
  const version = /^v\d+\.\d+$/.test(config.graphVersion || "") ? config.graphVersion : "v24.0";
  const graph = `${graphHost}${version}`;
  const params = new URLSearchParams({ fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count", limit: "50", access_token: token });
  let next = null;
  const rows = [];
  let warning = null;
  try {
    const accountId = /^\d+$/.test(config.instagramUserId || "") ? config.instagramUserId : await instagramAccountId(graph, token, fetchImpl);
    // Seguidores e posts da conta (o número de agora, não do período). Falha aqui não esconde os Reels.
    let profile = null;
    try {
      const response = await fetchImpl(`${graph}/${accountId}?${new URLSearchParams({ fields: "followers_count,media_count", access_token: token })}`);
      const payload = await response.json();
      if (response.ok && Number.isFinite(Number(payload.followers_count))) profile = { followers: Number(payload.followers_count), posts: Number(payload.media_count) || 0 };
    } catch { /* segue sem perfil */ }
    next = `${graph}/${accountId}/media?${params}`;
    for (let page = 0; page < 20 && next; page++) {
      const response = await fetchImpl(next);
      const payload = await response.json();
      if (!response.ok) throw new Error("O token da Meta não permite ler os Reels de @voxelia.ia. Confira instagram_basic e o vínculo com a Página.");
      const media = Array.isArray(payload.data) ? payload.data : [];
      for (const item of media) {
        if (item.media_product_type !== "REELS" || !item.timestamp) continue;
        const on = brazilDay(item.timestamp);
        if (on < from || on > to) continue;
        if (rows.length === 100) { warning = "Mais de 100 Reels no período; mostre um período menor."; break; }
        const insightBase = `${graph}/${encodeURIComponent(item.id)}/insights?`;
        let views = null;
        let watchMs = null;
        const insightMetric = async (metric) => {
          try {
            const response = await fetchImpl(`${insightBase}${new URLSearchParams({ metric, access_token: token })}`);
            const payload = await response.json();
            return response.ok ? metricValue(payload.data?.find((entry) => entry.name === metric)) : null;
          } catch { return null; }
        };
        [views, watchMs] = await Promise.all([insightMetric("views"), insightMetric("ig_reels_video_view_total_time")]);
        if (views === null || watchMs === null) warning = "Alguns Reels não retornaram todas as métricas.";
        rows.push({ id: String(item.id), on, caption: String(item.caption || "").slice(0, 180), permalink: safePermalink(item.permalink),
          views, watchMs, likes: Number(item.like_count || 0), comments: Number(item.comments_count || 0) });
      }
      if (warning?.startsWith("Mais de 100")) break;
      if (!payload.paging?.next || media.some((item) => item.timestamp && brazilDay(item.timestamp) < from)) { next = null; break; }
      next = payload.paging.next;
      if (!next.startsWith(graphHost)) throw new Error("Paginação inesperada do Instagram.");
    }
    if (next && !warning) warning = "Limite de páginas atingido; período parcial.";
    return { rows, profile, warning, error: null, checkedAt: new Date().toISOString() };
  } catch (error) { return { rows: [], error: error.message, checkedAt: null }; }
}
