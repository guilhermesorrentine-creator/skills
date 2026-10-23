// Qualidade da busca no acervo real: pedidos comuns em português precisam achar a skill certa entre as
// primeiras (é o que a IA do cliente recebe pelo MCP). O acervo é quase todo em inglês.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skillResources } from "./library.js";
import { buildResourceIndex, searchResources } from "../src/lib/search.js";

const catalog = JSON.parse(readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8"));
const index = buildResourceIndex(skillResources(catalog));
const top = (query, n) => searchResources(index, query).slice(0, n).map((item) => `${item.source_name}/${item.title}`);

test("pedidos comuns em português acham a skill certa no acervo real", () => {
  const cases = [
    ["prospectar clientes", /lead|scraper|outreach|sales/],
    ["auditoria de segurança", /security|audit/],
    ["memória entre sessões", /mem/i],
    ["roteiro de reels para instagram", /instagram|reel/],
    ["plano de negócios", /founder/],
    ["escrever artigo científico", /scientific/],
    ["revisão de literatura", /literature/],
    ["clonar voz", /voice|tts|speech|elevenlabs/],
    ["criar uma landing page", /frontend|website|web-design/],
    ["proposta para um cliente", /offer|proposal|pitch/, 5],
  ];
  for (const [query, expected, n = 3] of cases) {
    const found = top(query, n);
    assert.ok(found.some((name) => expected.test(name)), `"${query}" trouxe: ${found.join(", ")}`);
  }
});

test("termo curto não casa com palavra maior: \"post\" não traz postgres", () => {
  assert.ok(!top("legenda para post do instagram", 5).some((name) => /postgres|poster/.test(name)));
});
