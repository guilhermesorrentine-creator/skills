// Gera `public/data/repos.json`: a vitrine pública de cada repositório (/r/<nome>), usada pelos links
// dos Reels. Só o que é público: nome, criador, contagem de skills e o começo do guia ("O que é").
// O guia completo continua exclusivo do sistema. Repositório sem guia não ganha página.
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { repoOwner, safeGitHubUrl } from "../src/lib/search.js";

const GUIDES = new URL("../../guias-arsenal/", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../src/data/catalog.json", import.meta.url), "utf8"));

const plain = (md) => md.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
const front = (md, key) => (md.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m")) || [])[1] || "";

const repos = [];
for (const repo of catalog) {
  const file = new URL(`guia-${repo.name}.md`, GUIDES);
  if (!existsSync(file)) continue;
  const md = await readFile(file, "utf8");
  const body = md.replace(/^---[\s\S]*?---\n/, "");
  const intro = (body.split(/^## /m).find((s) => s.startsWith("O que é")) || "").split("\n").slice(1).join("\n");
  repos.push({
    name: repo.name,
    category: repo.category,
    url: safeGitHubUrl(repo.url),
    owner: repoOwner(repo.url),
    skills: (repo.skills || []).length,
    guideId: front(md, "id"),
    title: front(md, "title"),
    summary: front(md, "summary"),
    license: front(md, "license"),
    intro: intro.split(/\n\s*\n/).map(plain).filter(Boolean).slice(0, 3),
    sections: [...body.matchAll(/^## (.+)$/gm)].map((m) => plain(m[1])).filter((s) => !s.startsWith("O que é") && !s.startsWith("Créditos")),
  });
}
await writeFile(new URL("../public/data/repos.json", import.meta.url), `${JSON.stringify(repos, null, 1)}\n`, "utf8");

// Sitemap: páginas públicas fixas + uma por repositório.
const base = "https://skills-five-snowy.vercel.app";
const kits = ["criadores", "empreendedores", "programadores", "pesquisadores"];
const urls = ["/", "/conecta", "/links", "/termos", "/privacidade", "/compra-e-reembolso", ...kits.map((k) => `/kit/${k}`), ...repos.map((r) => `/r/${encodeURIComponent(r.name)}`)];
await writeFile(new URL("../public/sitemap.xml", import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join("\n")}\n</urlset>\n`, "utf8");
console.log(`Vitrine pública: ${repos.length} repositórios com página.`);
