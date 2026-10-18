import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const input = argument("--input");
const output = resolve(argument("--output") || "src/data/catalog.json");
if (!input) {
  console.error("Uso: node scripts/import-catalog.mjs --input <catalogo.json> [--output src/data/catalog.json]");
  process.exit(2);
}

const sanitize = (value) => {
  if (typeof value === "string") return value
    .replace(/[A-Z]:\\Users\\[^\\\s"']+(?:\\[^\\\s"']+)*/gi, "[caminho local]")
    .replace(/\\\\[^\\\s"']+\\[^\\\s"']+(?:\\[^\\\s"']+)*/g, "[caminho de rede]");
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "local_dir") continue;
      clean[key] = sanitize(entry);
    }
    return clean;
  }
  return value;
};

const records = JSON.parse(await readFile(resolve(input), "utf8")).map(sanitize);
for (const record of records) {
  let url;
  try { url = new URL(record.url); } catch { throw new Error(`URL inválida no registro ${record.name}.`); }
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error(`URL fora da lista permitida no registro ${record.name}; use um link HTTPS do GitHub.`);
  }
  const normalized = record.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  record.category = normalized === "conteudo" ? "conteudo" : normalized;
}

const serialized = JSON.stringify(records, null, 2) + "\n";
if (/gh[pousr]_[A-Za-z0-9]{10,}|sk-proj-[A-Za-z0-9_-]{10,}|Bearer\s+[A-Za-z0-9._-]{12,}/.test(serialized)) {
  throw new Error("O catálogo contém um padrão parecido com credencial; revise a fonte antes de publicar.");
}
if (/[A-Z]:\\\\Users\\\\[^\\"\s]+/i.test(serialized)) {
  throw new Error("O catálogo ainda contém um caminho pessoal.");
}

await writeFile(output, serialized, "utf8");
await mkdir("public/data", { recursive: true });
await writeFile("public/data/catalog.json", serialized, "utf8");
console.log(`Catálogo salvo: ${records.length} repositórios, ${records.reduce((sum, item) => sum + (item.count || 0), 0)} skills.`);
