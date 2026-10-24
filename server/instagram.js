// Reels orgânicos publicados pela conta profissional da Voxelia. A credencial nunca sai do servidor.
const graphHost = "https://graph.facebook.com/";
const brazilDay = (value) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const safePermalink = (value) => /^https:\/\/(?:www\.)?instagram\.com\//i.test(value || "") ? value : null;
const metricValue = (insight) => {
  const value = insight?.total_value?.value ?? insight?.values?.[0]?.value;
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
};

export async function loadInstagramReels(config, from, to, fetchImpl = fetch) {
  if (!config.instagramToken || !/^\d+$/.test(config.instagramUserId || ""))
    return { rows: [], error: "Configure META_INSTAGRAM_TOKEN e META_INSTAGRAM_USER_ID no servidor.", checkedAt: null };
  const token = config.instagramToken;
  const version = /^v\d+\.\d+$/.test(config.graphVersion || "") ? config.graphVersion : "v24.0";
  const graph = `${graphHost}${version}`;
  const params = new URLSearchParams({ fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count", limit: "50", access_token: token });
  let next = `${graph}/${config.instagramUserId}/media?${params}`;
  const rows = [];
  let warning = null;
  try {
    for (let page = 0; page < 20 && next; page++) {
      const response = await fetchImpl(next);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || `Instagram respondeu ${response.status}.`);
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
    return { rows, warning, error: null, checkedAt: new Date().toISOString() };
  } catch (error) { return { rows: [], error: error.message, checkedAt: null }; }
}
