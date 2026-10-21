// Gera `public/data/demo.json`: contagens reais e uma amostra pequena e fixa para a demonstração pública.
// A landing usa apenas este arquivo; o catálogo completo não é necessário para ela.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolveFeatured } from "../src/lib/featured.js";
import { repoOwner, safeGitHubUrl } from "../src/lib/search.js";

const PER_AREA = 6;
const areas = ["software", "empreendedorismo", "conteudo", "ciencia"];
const catalog = JSON.parse(await readFile(new URL("../src/data/catalog.json", import.meta.url), "utf8"));
const skills = catalog.flatMap((repo) => (repo.skills || []).map((skill) => ({
  id: `${repo.name}::${skill.path || skill.name}`,
  name: skill.name,
  description: skill.description || "",
  category: repo.category,
  repoName: repo.name,
})));
const shorten = (text) => text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text;
const demo = {
  stats: {
    repos: catalog.length,
    skills: skills.length,
    byArea: Object.fromEntries(areas.map((area) => [area, skills.filter((skill) => skill.category === area).length])),
  },
  // Créditos: cada repositório indexado, com o link para o criador original.
  repos: catalog.map((repo) => ({ name: repo.name, category: repo.category, url: safeGitHubUrl(repo.url), owner: repoOwner(repo.url), skills: (repo.skills || []).length })),
  skills: areas.flatMap((category) => resolveFeatured(skills, { category, count: PER_AREA })
    .map(({ id, name, description, repoName }) => ({ id, name, description: shorten(description), category, repoName }))),
};
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/demo.json", import.meta.url), `${JSON.stringify(demo, null, 2)}\n`, "utf8");
console.log(`Demonstração pública: ${demo.skills.length} skills de amostra.`);
