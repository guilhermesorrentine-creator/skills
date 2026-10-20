// Destaques editoriais: IDs reais do catálogo (`repositório::caminho`).
// Não indicam popularidade; servem como vitrine inicial por área.
export const FEATURED_SKILL_IDS = [
  "superpowers::skills/brainstorming/SKILL.md",
  "security-audit-skill::skills/security-audit/SKILL.md",
  "founder-skill::skills/founder-cfo/SKILL.md",
  "instagram-agent-skill::skills/ig-carousel/SKILL.md",
  "anatomy::SKILL.md",
  "VoiceStudio::skills/voicestudio/SKILL.md",
  "scientific-agent-skills::skills/literature-review/SKILL.md",
  "scientific-agent-skills::skills/rdkit/SKILL.md",
];

const byId = (a, b) => a.id.localeCompare(b.id);

// IDs ausentes são substituídos de forma determinística pelas primeiras skills (ordem de ID) da mesma área.
export function resolveFeatured(skills, { ids = FEATURED_SKILL_IDS, category = "todas", count = 6 } = {}) {
  const pool = category === "todas" ? skills : skills.filter((skill) => skill.category === category);
  const lookup = new Map(pool.map((skill) => [skill.id, skill]));
  const chosen = ids.map((id) => lookup.get(id)).filter(Boolean);
  const seen = new Set(chosen.map((skill) => skill.id));
  const fallback = [...pool].sort(byId).filter((skill) => !seen.has(skill.id) && skill.description);
  return [...chosen, ...fallback].slice(0, count);
}

// Amostra pequena para a cena 3D: resultados da busca primeiro, depois destaques de cada área.
export function pickHeroSkills(skills, { matches = [], query = "", count = 12 } = {}) {
  const areas = ["software", "empreendedorismo", "conteudo", "ciencia"];
  const picked = query ? matches.slice(0, 4) : [];
  const seen = new Set(picked.map((skill) => skill.id));
  const perArea = areas.map((category) => resolveFeatured(skills, { category, count: count }).filter((skill) => !seen.has(skill.id)));
  for (let round = 0; picked.length < count && perArea.some((list) => list[round]); round++) {
    for (const list of perArea) if (list[round] && picked.length < count && !seen.has(list[round].id)) { picked.push(list[round]); seen.add(list[round].id); }
  }
  return picked;
}

// Padrão do mosaico: 16 cartões em 6 linhas de 4 colunas, sem buracos com auto-placement comum
// (a ordem visual segue a ordem do DOM). L = 2×2, W = 2×1, M = 1×2, S = 1×1.
const MOSAIC_PATTERN = ["L", "S", "S", "S", "S", "W", "M", "S", "S", "S", "S", "S", "S", "L", "S", "S"];
export const MOSAIC_PAGE = 48;
export function mosaicSize(position) {
  return MOSAIC_PATTERN[position % MOSAIC_PATTERN.length];
}
