import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildSearchIndex, filterResults, getMatchReason, getSkillIdFromHash, normalize, safeGitHubUrl, searchRepos, searchSkills } from "./search.js";
import { clearRecent, getCatalogControls, loadFavorites, loadRecent, recordRecent, setCatalogControls, toggleComparison, toggleFavorite } from "./local-state.js";

const fixture = [
  { name: "produto-a", category: "software", summary: "Web development tools", url: "https://github.com/acme/product-a", skills: [
    { name: "landing-page", description: "Create a landing page using React", path: "skills/landing/SKILL.md" },
    { name: "security-audit", description: "Audits security of React apps", path: "skills/security/SKILL.md" },
  ] },
  { name: "produto-b", category: "conteudo", summary: "Científica análise e produção de vídeos", url: "https://github.com/acme/product-b", skills: [
    { name: "landing-page", description: "Cria páginas com dados e conteúdo", path: "skills/landing/SKILL.md" },
    { name: "whatsapp-automation", description: "Automates WhatsApp messaging", path: "skills/automation/SKILL.md" },
  ] },
];

test("normaliza acentos, caixa e separadores", () => {
  assert.equal(normalize("Análise_Científica / React"), "analise cientifica react");
});

test("busca habilidade por nome e prioriza correspondência exata", () => {
  const index = buildSearchIndex(fixture);
  const result = searchSkills(index, "landing-page");
  assert.equal(result.length, 2);
  assert.equal(result[0].name, "landing-page");
  assert.equal(result[0].score, result[1].score);
  assert.ok(searchSkills(index, "security audit")[0].name === "security-audit");
});

test("usa sinônimos PT/EN, pesquisa sem acento e corrige erro de digitação simples", () => {
  const index = buildSearchIndex(fixture);
  assert.ok(searchSkills(index, "criar landing page").some((item) => item.repoName === "produto-a"));
  const broad = searchSkills(index, "criar landing page").find((item) => item.name === "security-audit");
  assert.equal(broad, undefined);
  assert.ok(searchSkills(index, "automacao whatsapp").some((item) => item.name === "whatsapp-automation"));
  assert.ok(searchSkills(index, "analise cientifica videos").some((item) => item.repoName === "produto-b"));
  assert.ok(searchSkills(index, "securty").some((item) => item.name === "security-audit"));
});

test("ordena por relevância, e repositórios também refletem suas skills", () => {
  const index = buildSearchIndex(fixture);
  assert.equal(searchSkills(index, "landing-page")[0].name, "landing-page");
  assert.ok(searchRepos(index, "security audit").some((item) => item.name === "produto-a"));
  assert.deepEqual(searchSkills(index, "nada correspondente"), []);
});

test("combina filtros de categoria e repositório sem alterar os resultados-base", () => {
  const results = searchSkills(buildSearchIndex(fixture), "landing");
  assert.equal(filterResults(results, { category: "conteudo", repo: "produto-b" }).length, 1);
  assert.equal(filterResults(results, { category: "software", repo: "produto-b" }).length, 0);
  assert.equal(filterResults(results, { sort: "name" })[0].repoName, "produto-a");
});

test("preserva skills com nome repetido em repositórios diferentes e gera links da origem", () => {
  const skills = buildSearchIndex(fixture).skills.filter((item) => item.name === "landing-page");
  assert.equal(skills.length, 2);
  assert.notEqual(skills[0].id, skills[1].id);
  assert.equal(skills[0].skillUrl, "https://github.com/acme/product-a/blob/HEAD/skills/landing/SKILL.md");
  assert.match(getMatchReason(skills[0], "landing page"), /nome da skill/);
});

test("rejeita URLs fora do GitHub e links com credenciais", () => {
  assert.equal(safeGitHubUrl("https://github.com/acme/repo"), "https://github.com/acme/repo");
  assert.equal(safeGitHubUrl("javascript:alert(1)"), null);
  assert.equal(safeGitHubUrl("https://github.com@evil.example/repo"), null);
  assert.equal(safeGitHubUrl("https://github.com/acme/repo/issues/1"), null);
  assert.equal(safeGitHubUrl("https://github.com/acme/repo?token=secret"), "https://github.com/acme/repo");
});

test("compartilha a skill por hash e conserva filtros na URL", () => {
  const url = setCatalogControls("https://biblioteca.example/?keep=1#skill/produto-a%3A%3Apath", { query: "ação", category: "ciencia", kind: "repositorios", repo: "todos", view: "favoritos" });
  assert.deepEqual(getCatalogControls(url.search), { query: "ação", category: "ciencia", kind: "repositorios", repo: "todos", view: "favoritos" });
  assert.equal(getSkillIdFromHash(url.hash), "produto-a::path");
  assert.equal(url.searchParams.get("keep"), "1");
});

test("favoritos e histórico funcionam localmente e tratam indisponibilidade", () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  const first = toggleFavorite([], "a", storage);
  assert.deepEqual(loadFavorites(storage), first);
  assert.deepEqual(toggleFavorite(first, "a", storage), []);
  const recent = recordRecent(recordRecent([], "a", storage), "b", storage);
  assert.deepEqual(loadRecent(storage).map((item) => item.id), ["b", "a"]);
  clearRecent(storage);
  assert.deepEqual(loadRecent(storage), []);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.deepEqual(loadFavorites(blocked), []);
  assert.deepEqual(toggleFavorite([], "a", blocked), []);
  assert.deepEqual(loadRecent(blocked), []);
  assert.equal(clearRecent(blocked), false);
  assert.deepEqual(toggleFavorite([], "a", null), []);
  assert.equal(clearRecent(null), false);
});

test("comparação remove itens e nunca excede três skills", () => {
  let ids = [];
  for (const id of ["a", "b", "c"]) ids = toggleComparison(ids, id).ids;
  const full = toggleComparison(ids, "d");
  assert.equal(full.limited, true);
  assert.deepEqual(full.ids, ["a", "b", "c"]);
  assert.deepEqual(toggleComparison(ids, "b").ids, ["a", "c"]);
});

test("catálogo completo fica fora de public/ e a demonstração pública não expõe caminhos", () => {
  const result = spawnSync(process.execPath, ["scripts/validate-catalog.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync("public/data/catalog.json"), false);
  const source = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
  assert.equal(source.length, 37);
  assert.equal(source.reduce((total, repo) => total + repo.skills.length, 0), 2281);
  assert.equal(new Set(source.map((repo) => repo.name)).size, source.length);
  spawnSync(process.execPath, ["scripts/build-demo-data.mjs"], { encoding: "utf8" });
  const demo = JSON.parse(readFileSync("public/data/demo.json", "utf8"));
  assert.deepEqual([demo.stats.repos, demo.stats.skills], [37, 2281]);
  assert.ok(demo.skills.length <= 24);
  assert.ok(demo.skills.every((skill) => !("path" in skill)));
});

test("importador normaliza categorias, remove local_dir e rejeita fonte inválida", () => {
  const directory = mkdtempSync(join(tmpdir(), "biblioteca-total-import-"));
  const input = join(directory, "source.json");
  const output = join(directory, "normalized.json");
  const records = [{ name: "demo", category: "Software", url: "https://github.com/acme/demo", local_dir: "C:\\Users\\anama\\repo", skills: [{ name: "sample", description: "A sample skill", path: "skills/sample/SKILL.md" }] }];
  try {
    writeFileSync(input, JSON.stringify(records));
    const ok = spawnSync(process.execPath, ["scripts/import-catalog.mjs", "--input", input, "--output", output], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    const normalized = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(normalized[0].category, "software");
    assert.equal("local_dir" in normalized[0], false);
    const badInput = join(directory, "bad.json");
    writeFileSync(badInput, JSON.stringify([{ ...records[0], url: "https://example.com/acme/demo" }]));
    const bad = spawnSync(process.execPath, ["scripts/import-catalog.mjs", "--input", badInput, "--output", output], { encoding: "utf8" });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /URL fora da lista permitida/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
