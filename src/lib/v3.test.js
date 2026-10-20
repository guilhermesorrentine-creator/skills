import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSearchIndex, buildSuggestions, queryTerms, relatedSkills, searchSkills } from "./search.js";
import { FEATURED_SKILL_IDS, mosaicSize, pickHeroSkills, resolveFeatured } from "./featured.js";

const catalog = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
const index = buildSearchIndex(catalog);
const areas = [{ id: "software", label: "Software" }, { id: "ciencia", label: "Ciência" }];

test("busca por objetivo ignora palavras de intenção", () => {
  assert.deepEqual(queryTerms("Quero criar um site"), ["criar", "site"]);
  assert.deepEqual(queryTerms("de"), ["de"]);
  for (const goal of ["Quero criar um site", "Preciso melhorar meu design", "Quero automatizar tarefas", "Preciso analisar dados", "Quero desenvolver um aplicativo", "Quero criar vídeos", "Preciso melhorar a segurança de um sistema"]) {
    assert.ok(searchSkills(index, goal).length > 0, goal);
  }
  assert.ok(searchSkills(index, "Preciso melhorar a segurança de um sistema").slice(0, 10).some((skill) => /secur/i.test(skill.name)));
});

test("sugestões vêm do catálogo e do vocabulário local", () => {
  const goals = ["Criar um site", "Analisar dados"];
  const query = "ciencia";
  const suggestions = buildSuggestions(index, query, searchSkills(index, query), { goals, areas });
  assert.ok(suggestions.skills.length <= 5);
  assert.deepEqual(suggestions.areas.map((area) => area.id), ["ciencia"]);
  assert.deepEqual(buildSuggestions(index, "", [], { goals, areas }).goals, goals);
  assert.deepEqual(buildSuggestions(index, "criar", [], { goals, areas }).goals, ["Criar um site"]);
});

test("destaques editoriais existem no catálogo e têm reserva determinística", () => {
  const ids = new Set(index.skills.map((skill) => skill.id));
  for (const id of FEATURED_SKILL_IDS) assert.ok(ids.has(id), id);
  const withMissing = resolveFeatured(index.skills, { ids: ["inexistente::x", FEATURED_SKILL_IDS[0]], count: 3 });
  assert.equal(withMissing[0].id, FEATURED_SKILL_IDS[0]);
  assert.deepEqual(withMissing.map((s) => s.id), resolveFeatured(index.skills, { ids: ["inexistente::x", FEATURED_SKILL_IDS[0]], count: 3 }).map((s) => s.id));
  assert.ok(resolveFeatured(index.skills, { category: "ciencia" }).every((skill) => skill.category === "ciencia"));
  const hero = pickHeroSkills(index.skills, { count: 12 });
  assert.equal(hero.length, 12);
  assert.equal(new Set(hero.map((skill) => skill.category)).size, 4);
});

test("relacionadas usam critérios objetivos e o mosaico é estável", () => {
  const skill = index.skills.find((item) => item.id === "scientific-agent-skills::skills/rdkit/SKILL.md");
  const related = relatedSkills(index, skill);
  assert.ok(related.length > 0 && related.length <= 6);
  assert.ok(related.every(({ skill: item, reason }) => item.id !== skill.id && (item.repoName === skill.repoName || item.category === skill.category) && reason));
  assert.deepEqual(Array.from({ length: 16 }, (_, i) => mosaicSize(i)), Array.from({ length: 16 }, (_, i) => mosaicSize(i + 16)));
  const cells = { L: 4, W: 2, M: 2, S: 1 };
  assert.equal(Array.from({ length: 16 }, (_, i) => cells[mosaicSize(i)]).reduce((a, b) => a + b), 24);
});
