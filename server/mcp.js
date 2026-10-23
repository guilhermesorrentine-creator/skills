// Servidor MCP da Voxelia: o Claude, o ChatGPT e outros clientes consultam o acervo direto no chat.
// Transporte HTTP "streamable" sem sessão (cada POST é um JSON-RPC, resposta em JSON). Cada comprador
// tem uma URL com token próprio; a licença é conferida a cada chamada, então um estorno encerra o acesso.
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildResourceIndex, matchPaths, searchResources } from "../src/lib/search.js";
import { CATEGORIES, TYPES, categoryLabel, resourcePath, typeLabel } from "../src/lib/resources.js";
import { repoSummaries } from "./library.js";

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_BODY = 20000;

const INSTRUCTIONS = `A Voxelia organiza mais de 2 mil Agent Skills de repositórios públicos, com guias em português.
Use buscar_skills quando a pessoa quiser fazer algo com IA (criar um site, editar vídeo, prospectar clientes, analisar dados...).
Depois use detalhar_recurso no resultado mais promissor para trazer o passo a passo. Responda em português do Brasil,
cite sempre o autor e a fonte original e inclua o link da página na Voxelia.`;

const TOOLS = [
  {
    name: "buscar_skills",
    title: "Buscar no acervo da Voxelia",
    description: "Encontra skills, subagentes, workflows, ferramentas e guias para um objetivo descrito em linguagem natural (português ou inglês). Devolve os mais relevantes com id, resumo, autor e link.",
    inputSchema: {
      type: "object",
      properties: {
        objetivo: { type: "string", description: "O que a pessoa quer fazer, por exemplo: \"criar uma landing page\" ou \"roteiro de Reels\"." },
        tipo: { type: "string", enum: TYPES.map((t) => t.id), description: "Opcional: limita a um tipo de recurso." },
        categoria: { type: "string", enum: CATEGORIES.map((c) => c.id), description: "Opcional: software, empreendedorismo, conteudo ou ciencia." },
        limite: { type: "integer", minimum: 1, maximum: 20, description: "Quantos resultados (padrão 8)." },
      },
      required: ["objetivo"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "detalhar_recurso",
    title: "Detalhar um recurso",
    description: "Traz o conteúdo completo de um recurso pelo id devolvido em buscar_skills: descrição, passo a passo (quando houver), fonte, autor, licença e como instalar.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "O id exato devolvido por buscar_skills." } }, required: ["id"] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "listar_repositorios",
    title: "Listar repositórios do acervo",
    description: "Lista os repositórios públicos que compõem o acervo, com área, resumo e quantidade de skills.",
    inputSchema: { type: "object", properties: { categoria: { type: "string", enum: CATEGORIES.map((c) => c.id) } } },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

export function createMcp({ store, commerce, library, loadCatalog, config }) {
  const sign = (userId, version) => createHmac("sha256", config.claimSecret).update(`mcp:${userId}:${version}`).digest("base64url").slice(0, 32);
  const urlFor = (userId, version) => `${config.appUrl}/api/mcp/${userId}.${version}.${sign(userId, version)}`;
  const page = (id) => `${config.appUrl}${resourcePath(id)}`;

  function requireSecret() {
    if (!config.claimSecret) throw Object.assign(new Error("Conexão com IAs indisponível neste ambiente."), { status: 503, code: "not_configured" });
  }
  async function connectionUrl(userId) { requireSecret(); return urlFor(userId, await store.getMcpVersion(userId)); }
  // Novo link: o anterior deixa de funcionar na hora.
  async function rotate(userId) { requireSecret(); const version = (await store.getMcpVersion(userId)) + 1; await store.setMcpVersion(userId, version); return urlFor(userId, version); }

  async function authenticate(token) {
    if (!config.claimSecret) return null;
    const [userId, version, mac] = String(token || "").split(".");
    if (!/^[\w-]{1,64}$/.test(userId || "") || !/^\d{1,6}$/.test(version || "") || !mac) return null;
    const expected = Buffer.from(sign(userId, Number(version)));
    const given = Buffer.from(mac);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return (await store.getMcpVersion(userId)) === Number(version) ? userId : null;
  }

  const text = (value, isError = false) => ({ content: [{ type: "text", text: value }], ...(isError && { isError: true }) });
  const describe = (item) => [
    `- ${item.title} (${typeLabel[item.type] || item.type}, ${categoryLabel[item.category] || item.category})`,
    `  id: ${item.id}`,
    item.summary && `  ${item.summary.slice(0, 280)}`,
    (item.author || item.source_name) && `  Fonte: ${[item.source_name, item.author && `por ${item.author}`].filter(Boolean).join(" ")}`,
    `  Na Voxelia: ${page(item.id)}`,
  ].filter(Boolean).join("\n");

  const tools = {
    async buscar_skills(args, rank) {
      const goal = String(args.objetivo || "").trim().slice(0, 300);
      if (!goal) return text("Informe o objetivo da pessoa.", true);
      const limit = Math.min(20, Math.max(1, Number.parseInt(args.limite, 10) || 8));
      const lib = await library.libraryFor(rank);
      // A mesma skill aparece em mais de uma pasta de alguns repositórios (traduções, cópias por agente):
      // fica uma por nome e fonte, na posição da primeira, com o resumo mais completo entre as cópias.
      const unique = new Map();
      for (const item of searchResources(buildResourceIndex(lib.resources), goal, { types: args.tipo ? [args.tipo] : null, category: args.categoria || "todas" })) {
        const key = `${item.source_name}:${item.title}`;
        const kept = unique.get(key);
        if (!kept) unique.set(key, item);
        else if ((item.summary || "").length > (kept.summary || "").length) unique.set(key, { ...item, score: kept.score });
      }
      const found = [...unique.values()].slice(0, limit);
      const paths = matchPaths(lib.paths, goal).slice(0, 2);
      if (!found.length && !paths.length) return text(`Nada encontrado para "${goal}". Tente outras palavras (em inglês também funciona) ou sem filtros.`);
      const pathText = paths.map((path) => `Caminho recomendado: ${path.goal}\n${path.steps.map((step, i) => `  ${i + 1}. ${step.resource_id}${step.reason ? `: ${step.reason}` : ""}`).join("\n")}`).join("\n\n");
      return text([pathText, found.length && `Resultados para "${goal}":\n${found.map(describe).join("\n")}`].filter(Boolean).join("\n\n"));
    },
    async detalhar_recurso(args, rank) {
      const result = await library.resourceFor(String(args.id || "").slice(0, 400), rank);
      if (!result) return text("Recurso não encontrado. Use o id exato devolvido por buscar_skills.", true);
      if (result.locked) return text(`"${result.resource.title}" faz parte de uma edição superior à da sua licença. Veja em ${page(result.resource.id)}.`);
      const item = result.resource;
      const folder = item.path ? item.path.split("/").slice(0, -1).join("/") : "";
      const install = item.type === "skill" && item.repo_url
        ? `Como instalar: copie a pasta \`${folder || item.title}\` do repositório ${item.repo_url} para a pasta de skills do agente (no Claude Code: ~/.claude/skills/ ou .claude/skills/ do projeto). A skill passa a ser usada sozinha quando o pedido combina com a descrição.`
        : "";
      return text([
        `${item.title} (${typeLabel[item.type] || item.type}, ${categoryLabel[item.category] || item.category})`,
        item.summary,
        item.body_md && `Passo a passo:\n${item.body_md.slice(0, MAX_BODY)}`,
        item.instructions && `Instruções para o agente:\n${item.instructions.slice(0, MAX_BODY)}`,
        install,
        [item.author && `Autor: ${item.author}`, item.license && `Licença: ${item.license}`, item.source_url && `Fonte: ${item.source_url}`].filter(Boolean).join(" · "),
        `Página na Voxelia: ${page(item.id)}`,
      ].filter(Boolean).join("\n\n"));
    },
    async listar_repositorios(args) {
      const repos = repoSummaries(await loadCatalog()).filter((repo) => !args.categoria || repo.category === args.categoria);
      return text(repos.map((repo) => `- ${repo.name} (${categoryLabel[repo.category] || repo.category}, ${repo.count} skills): ${repo.summary.slice(0, 200)}${repo.url ? ` ${repo.url}` : ""}`).join("\n") || "Nenhum repositório nesta área.");
    },
  };

  const reply = (id, result) => ({ jsonrpc: "2.0", id, result });
  const failure = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  async function dispatch(userId, message) {
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return failure(message?.id, -32600, "Requisição JSON-RPC inválida.");
    const { id, method, params = {} } = message;
    if (id === undefined) return null; // notificações (ex.: notifications/initialized) não têm resposta
    if (method === "initialize") {
      const protocolVersion = VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[0];
      return reply(id, { protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "voxelia", title: "Voxelia", version: "1.0.0" }, instructions: INSTRUCTIONS });
    }
    if (method === "ping") return reply(id, {});
    if (method === "tools/list") return reply(id, { tools: TOOLS });
    if (method === "tools/call") {
      const tool = tools[params.name];
      if (!tool) return failure(id, -32602, `Ferramenta desconhecida: ${params.name}`);
      const [{ rank }, status] = await Promise.all([commerce.userEntitlement(userId), commerce.mcpStatus(userId)]);
      if (rank < 1 || !status.active) return reply(id, text("A conexão da Voxelia com IAs faz parte do Voxelia Pro e não está ativa nesta conta. Veja em Minha licença no site.", true));
      try { return reply(id, await tool(params.arguments || {}, rank)); }
      catch (error) { console.error("[mcp]", error); return reply(id, text("Erro ao consultar a Voxelia. Tente de novo em instantes.", true)); }
    }
    return failure(id, -32601, `Método não suportado: ${method}`);
  }

  const respond = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

  async function handle(request, token) {
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
    const userId = await authenticate(token);
    if (!userId) return respond(401, failure(null, -32001, "Link de conexão inválido ou substituído. Gere um novo em Minha licença, no site da Voxelia."));
    let payload;
    try { payload = await request.json(); } catch { return respond(400, failure(null, -32700, "JSON inválido.")); }
    const batch = Array.isArray(payload) ? payload.slice(0, 20) : [payload];
    const out = (await Promise.all(batch.map((message) => dispatch(userId, message)))).filter(Boolean);
    if (!out.length) return respond(202);
    return respond(200, Array.isArray(payload) ? out : out[0]);
  }

  return { handle, connectionUrl, rotate };
}
