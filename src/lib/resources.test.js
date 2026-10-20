import test from "node:test";
import assert from "node:assert/strict";
import { buildResourceIndex, matchPaths, searchResources } from "./search.js";

test("busca unificada filtra por tipo, categoria e fonte com ordem estável", () => {
  const records = buildResourceIndex([
    { id: "a", type: "tool", category: "software", title: "21st.dev", summary: "Componentes React para interfaces", tags: ["react", "ui"], source_name: "21st.dev" },
    { id: "b", type: "skill", category: "software", title: "landing-page", summary: "Create landing pages", source_name: "repo-a", path: "skills/landing/SKILL.md" },
    { id: "c", type: "guide", category: "conteudo", title: "Editar vídeos com IA", summary: "Guia prático", tags: ["video"] },
  ]);
  assert.deepEqual(searchResources(records, "componentes react").map((r) => r.id), ["a"]);
  assert.deepEqual(searchResources(records, "", { types: ["tool", "reference"] }).map((r) => r.id), ["a"]);
  assert.deepEqual(searchResources(records, "video", { category: "conteudo" }).map((r) => r.id), ["c"]);
  assert.deepEqual(searchResources(records, "Quero criar um site").map((r) => r.id), ["b"]);
  assert.deepEqual(searchResources(records, "").map((r) => r.id), ["a", "c", "b"]);
});

test("caminhos editoriais só aparecem quando os termos batem com objetivo ou palavras-chave", () => {
  const paths = [{ goal: "Criar um site com IA", keywords: ["site", "landing"], steps: [{ resource_id: "a" }] }];
  assert.equal(matchPaths(paths, "Quero criar um site com IA").length, 1);
  assert.equal(matchPaths(paths, "editar vídeo").length, 0);
  assert.equal(matchPaths(paths, "").length, 0);
});

import { parseMarkdown, safeHref } from "./markdown-parse.js";

test("markdown seguro: títulos viram sumário, código é bloco, links só HTTPS", () => {
  const { blocks, headings } = parseMarkdown("## Passo 1\nTexto **forte**\n\n```bash\nnpm test\n```\n\n- item\n- [ruim](javascript:alert(1))\n\n## Passo 1");
  assert.deepEqual(headings.map((h) => h.id), ["passo-1", "passo-1-2"]);
  assert.equal(blocks.find((b) => b.type === "code").text, "npm test");
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("http://example.com"), null);
  assert.equal(safeHref("https://21st.dev"), "https://21st.dev/");
  assert.ok(!JSON.stringify(blocks).includes("<script"));
});
