import test from "node:test";
import assert from "node:assert/strict";
import { DICTS, detectLang, pickLang, translate } from "./core.js";
import { KITS, localizeKit } from "../lib/kits.js";
import { SCENARIOS, localizeScenario } from "../pages/landing/terminal-script.js";

test("idioma do navegador: pt → pt-BR, es → es, outros → en", () => {
  assert.equal(detectLang(["pt-PT", "en"]), "pt-BR");
  assert.equal(detectLang(["es-AR"]), "es");
  assert.equal(detectLang(["en-US", "pt-BR"]), "en");
  assert.equal(detectLang(["fr"]), "en");
  assert.equal(detectLang([]), "pt-BR");
});

test("escolha salva prevalece; valor inválido volta ao navegador", () => {
  assert.equal(pickLang("es", ["pt-BR"]), "es");
  assert.equal(pickLang("de", ["pt-BR"]), "pt-BR");
  assert.equal(pickLang(null, ["en-GB"]), "en");
});

test("interpolação, funções e queda para o português", () => {
  assert.equal(translate("en", "kit.buyFor", { price: "R$ 97,90" }), "Get the kit for R$ 97,90");
  assert.equal(translate("es", "repo.skills", { n: 1 }), "1 skill");
  assert.equal(translate("en", "chave.inexistente"), "chave.inexistente");
});

// Mesma forma em todos os idiomas: nenhuma tela fica pela metade em português.
const shape = (node, path = "") => {
  if (Array.isArray(node)) return [`${path}[${node.length}]`, ...node.flatMap((item, i) => shape(item, `${path}[${i}]`))];
  if (node && typeof node === "object") return Object.keys(node).sort().flatMap((key) => shape(node[key], path ? `${path}.${key}` : key));
  return [`${path}:${typeof node}`];
};

test("en e es têm as mesmas chaves do português", () => {
  const base = shape(DICTS["pt-BR"]);
  for (const lang of ["en", "es"]) assert.deepEqual(shape(DICTS[lang]), base, lang);
});

test("kits e terminal têm versão en/es completa", () => {
  for (const kit of KITS) for (const lang of ["en", "es"]) {
    const local = localizeKit(kit, lang);
    assert.notEqual(local.promise, kit.promise, `${kit.slug} ${lang}`);
    assert.equal(local.tasks.length, kit.tasks.length, `${kit.slug} ${lang}`);
  }
  for (const scenario of SCENARIOS) for (const lang of ["en", "es"]) {
    const local = localizeScenario(scenario, lang);
    assert.equal(local.lessons.length, scenario.lessons.length);
    assert.equal(local.steps.length, scenario.steps.length);
    assert.notEqual(local.title, scenario.title, `${scenario.category} ${lang}`);
  }
});
