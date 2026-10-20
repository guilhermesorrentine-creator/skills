// Catálogo unificado: Agent Skills (src/data/catalog.json, canônico no repositório) + recursos
// gerenciados pela administração (tabela `resources`). Filtrado pelos direitos do usuário.
import { canAccessResource } from "./licensing.js";
import { safeGitHubUrl } from "../src/lib/search.js";

export const RESOURCE_TYPES = ["skill", "subagent", "workflow", "guide", "tool", "reference"];
export const CATEGORIES = ["software", "empreendedorismo", "conteudo", "ciencia"];

export function skillResources(catalog) {
  const out = [];
  for (const repo of catalog) {
    const repoUrl = safeGitHubUrl(repo.url);
    for (const skill of repo.skills || []) {
      out.push({
        id: `${repo.name}::${skill.path || skill.name}`,
        type: "skill",
        category: repo.category,
        title: skill.name,
        summary: skill.description || "",
        tags: [],
        source_name: repo.name,
        source_url: repoUrl && skill.path ? `${repoUrl}/blob/HEAD/${skill.path.split("/").map(encodeURIComponent).join("/")}` : repoUrl,
        repo_name: repo.name,
        path: skill.path || "",
        visibility: "edition",
        min_edition_rank: 1,
        status: "published",
        external: true,
      });
    }
  }
  return out;
}

export function repoSummaries(catalog) {
  return catalog.map((repo) => ({ name: repo.name, category: repo.category, summary: repo.summary || "", url: safeGitHubUrl(repo.url), count: (repo.skills || []).length }));
}

const listFields = ({ body_md, instructions, ...rest }) => ({ ...rest, has_body: Boolean(body_md), has_instructions: Boolean(instructions) });

export function createLibrary({ store, loadCatalog }) {
  async function all() {
    const [catalog, managed] = await Promise.all([loadCatalog(), store.listResources({ status: "published" })]);
    return { catalog, resources: [...managed.map((item) => ({ ...item, external: Boolean(item.source_url) })), ...skillResources(catalog)] };
  }

  // Índice autorizado para a busca local: só o que a edição do usuário permite, sem corpo dos guias.
  async function libraryFor(rank) {
    const { catalog, resources } = await all();
    const visible = resources.filter((item) => canAccessResource(item, rank));
    const ids = new Set(visible.map((item) => item.id));
    const [relations, paths] = await Promise.all([store.listRelations(), store.listGoalPaths({ status: "published" })]);
    return {
      resources: visible.map(listFields),
      repos: repoSummaries(catalog),
      relations: relations.filter((rel) => ids.has(rel.from_id) && ids.has(rel.to_id)),
      // Um caminho só aparece se todos os seus passos forem acessíveis e existentes.
      paths: paths.filter((path) => path.steps.length > 0 && path.steps.every((step) => ids.has(step.resource_id))),
    };
  }

  async function resourceFor(id, rank) {
    const managed = await store.getResource(id);
    if (managed && managed.status === "published") return canAccessResource(managed, rank) ? { resource: managed } : { locked: true, resource: listFields(managed) };
    const skill = skillResources(await loadCatalog()).find((item) => item.id === id);
    if (!skill) return null;
    return canAccessResource(skill, rank) ? { resource: skill } : { locked: true, resource: { id: skill.id, title: skill.title, type: skill.type, category: skill.category } };
  }

  async function exists(id) {
    if (typeof id !== "string" || !id || id.length > 400) return false;
    const managed = await store.getResource(id);
    if (managed) return managed.status === "published";
    return skillResources(await loadCatalog()).some((item) => item.id === id);
  }

  async function titles(ids) {
    const { resources } = await all();
    const byId = new Map(resources.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter(Boolean).map(({ id, title, type, category }) => ({ id, title, type, category }));
  }

  // Contagens públicas por tipo (sem títulos): usadas na landing para não anunciar conteúdo inexistente.
  async function stats() {
    const { catalog, resources } = await all();
    const byType = Object.fromEntries(RESOURCE_TYPES.map((type) => [type, resources.filter((item) => item.type === type).length]));
    return { repos: catalog.length, byType };
  }

  return { libraryFor, resourceFor, exists, titles, stats };
}

// Validação dos recursos cadastrados pela administração (texto simples e Markdown seguro).
export function validateResource(input) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400, code: "invalid_resource" }); };
  const id = String(input.id || "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(id)) fail("Identificador inválido: use letras minúsculas, números e hífen.");
  if (!RESOURCE_TYPES.includes(input.type) || input.type === "skill") fail("Tipo inválido (skills vêm do catálogo do repositório).");
  if (!CATEGORIES.includes(input.category)) fail("Categoria inválida.");
  const title = String(input.title || "").trim();
  if (!title) fail("Título obrigatório.");
  const url = (value) => {
    if (!value) return null;
    try { const parsed = new URL(value); if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error(); return parsed.toString(); }
    catch { return fail("Links precisam ser HTTPS válidos."); }
  };
  return {
    id, type: input.type, category: input.category, title: title.slice(0, 160),
    summary: String(input.summary || "").trim().slice(0, 600),
    body_md: String(input.body_md || "").slice(0, 60000),
    instructions: String(input.instructions || "").slice(0, 20000),
    tags: (Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",")).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 20),
    source_name: String(input.source_name || "").trim().slice(0, 120),
    source_url: url(input.source_url), preview_url: url(input.preview_url),
    author: String(input.author || "").trim().slice(0, 120), license: String(input.license || "").trim().slice(0, 120),
    visibility: ["public", "demo", "edition"].includes(input.visibility) ? input.visibility : "edition",
    min_edition_rank: Number.isInteger(Number(input.min_edition_rank)) && Number(input.min_edition_rank) >= 1 ? Number(input.min_edition_rank) : 1,
    status: ["draft", "published", "hidden"].includes(input.status) ? input.status : "draft",
  };
}
