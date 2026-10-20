import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../src/data/catalog.json", import.meta.url);
const outputPath = new URL("../public/data/catalog.json", import.meta.url);
const catalog = JSON.parse(await readFile(sourcePath, "utf8"));
const categories = new Set(["software", "empreendedorismo", "conteudo", "ciencia"]);
const repoNames = new Set();
const skillIds = new Set();
const secretPattern = /gh[pousr]_[A-Za-z0-9]{10,}|sk-proj-[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._-]{12,}/;
const localPathPattern = /(?:[A-Z]:\\Users\\|\\\\[^\\\s]+\\[^\\\s]+)/i;

if (!Array.isArray(catalog)) throw new Error("O catálogo precisa ser uma lista.");
for (const [index, repo] of catalog.entries()) {
  if (!repo || typeof repo.name !== "string" || !repo.name.trim()) throw new Error(`Repositório sem nome na posição ${index}.`);
  if (repoNames.has(repo.name)) throw new Error(`Nome de repositório duplicado: ${repo.name}.`);
  repoNames.add(repo.name);
  if (!categories.has(repo.category)) throw new Error(`Categoria desconhecida em ${repo.name}: ${repo.category}.`);
  try {
    const url = new URL(repo.url);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.pathname.split("/").filter(Boolean).length !== 2) throw new Error();
  } catch { throw new Error(`URL inválida ou fora do GitHub em ${repo.name}.`); }
  if (!Array.isArray(repo.skills)) throw new Error(`Lista de skills inválida em ${repo.name}.`);
  if (repo.count !== undefined && repo.count !== repo.skills.length) throw new Error(`Contagem divergente em ${repo.name}: campo ${repo.count}, lista ${repo.skills.length}.`);
  for (const skill of repo.skills) {
    if (!skill || typeof skill.name !== "string" || !skill.name.trim()) throw new Error(`Skill sem nome em ${repo.name}.`);
    if (skill.path && (typeof skill.path !== "string" || skill.path.startsWith("/") || skill.path.split(/[\\/]/).includes(".."))) throw new Error(`Caminho inválido em ${repo.name}/${skill.name}.`);
    const id = `${repo.name}::${skill.path || skill.name}`;
    if (skillIds.has(id)) throw new Error(`Identificador de skill duplicado: ${id}.`);
    skillIds.add(id);
  }
}

const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
if (secretPattern.test(serialized)) throw new Error("O catálogo contém um padrão parecido com credencial.");
if (localPathPattern.test(serialized) || /"local_dir"\s*:/.test(serialized)) throw new Error("O catálogo contém caminho local ou local_dir.");
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(outputPath, serialized, "utf8");
console.log(`Catálogo publicado no diretório público: ${repoNames.size} repositórios, ${skillIds.size} skills.`);
