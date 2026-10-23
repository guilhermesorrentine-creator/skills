const synonyms = {
  criar: ["create", "build", "make", "gerar"],
  construir: ["build", "create"],
  site: ["website", "web", "landing"],
  landing: ["site", "website", "web"],
  pagina: ["page", "website"],
  aplicativo: ["app", "application"],
  desenvolver: ["develop", "build", "code"],
  automatizar: ["automation", "automate", "workflow"],
  automacao: ["automation", "automate", "workflow"],
  whatsapp: ["messaging", "chat", "message"],
  video: ["video", "motion", "animation", "remotion"],
  videos: ["video", "motion", "animation"],
  dados: ["data", "analytics", "analysis"],
  analise: ["analysis", "analytics", "research"],
  design: ["ui", "ux", "interface", "visual"],
  interface: ["ui", "ux", "design"],
  tokens: ["token", "context", "compact", "caveman", "megacave"],
  economizar: ["reduce", "token", "compact", "caveman"],
  seguranca: ["security", "secure", "audit"],
  pesquisa: ["research", "science", "scientific"],
  cientifica: ["science", "scientific", "research"],
  testes: ["test", "testing", "quality"],
  melhorar: ["improve", "optimize", "refactor"],
  app: ["application", "mobile", "android", "ios"],
  mobile: ["android", "ios", "app"],
  tarefas: ["task", "tasks", "workflow", "automation"],
  sistema: ["system", "app", "application"],
  analisar: ["analysis", "analytics", "analyze", "data"],
  editar: ["edit", "editing", "editor"],
  imagem: ["image", "images", "visual"],
  documentacao: ["docs", "documentation", "readme"],
  // Espanhol: os objetivos da interface em es viram termos do acervo (em inglês).
  crear: ["create", "build", "make"],
  sitio: ["website", "web", "site", "landing"],
  web: ["website", "site", "landing"],
  aplicacion: ["app", "application"],
  datos: ["data", "analytics", "analysis"],
  analizar: ["analysis", "analytics", "analyze", "data"],
  tareas: ["task", "tasks", "workflow", "automation"],
  automatizacion: ["automation", "automate", "workflow"],
  seguridad: ["security", "secure", "audit"],
  mejorar: ["improve", "optimize", "refactor"],
  investigacion: ["research", "science", "scientific"],
  imagen: ["image", "images", "visual"],
};

// Palavras de intenção ("Quero criar um site") não descrevem o conteúdo e são ignoradas no ranking.
const stopwords = new Set(["quero", "preciso", "gostaria", "vou", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "meu", "minha", "meus", "minhas", "para", "pra", "o", "a", "os", "as", "e", "em", "no", "na", "com", "por", "que", "como", "i", "want", "need", "to", "the", "an", "of", "my", "for", "and", "quiero", "necesito", "el", "la", "los", "las", "mi", "mis", "del", "y", "en", "con"]);

export function normalize(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

const terms = (value) => normalize(value).split(/\s+/).filter(Boolean);

export function queryTerms(query = "") {
  const all = terms(query);
  const meaningful = all.filter((term) => !stopwords.has(term));
  return meaningful.length ? meaningful : all;
}
const distanceOne = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, errors = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++errors > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return errors + (i < a.length || j < b.length ? 1 : 0) <= 1;
};

export function buildSearchIndex(catalog) {
  const repos = [];
  const skills = [];
  for (const repo of catalog) {
    const repoUrl = safeGitHubUrl(repo.url);
    const repoSearch = normalize(`${repo.name} ${repo.summary || ""} ${repo.category}`);
    const repoRecord = { ...repo, repoUrl, normalized: repoSearch, skillRecords: [] };
    repos.push(repoRecord);
    for (const skill of repo.skills || []) {
      const fields = {
        name: normalize(skill.name),
        description: normalize(skill.description || ""),
        path: normalize(skill.path || ""),
        repo: repoSearch,
      };
      const record = {
        ...skill,
        id: `${repo.name}::${skill.path || skill.name}`,
        category: repo.category,
        repoName: repo.name,
        repoUrl,
        repoSummary: repo.summary || "",
        fields,
        normalized: Object.values(fields).join(" "),
        skillUrl: repoUrl && skill.path
          ? `${repoUrl}/blob/HEAD/${skill.path.split("/").map(encodeURIComponent).join("/")}`
          : null,
      };
      skills.push(record);
      repoRecord.skillRecords.push(record);
    }
  }
  return { repos, skills };
}

// Dono do repositório (conta ou organização no GitHub), lido da URL validada: crédito ao criador.
export function repoOwner(url) {
  const safe = safeGitHubUrl(url);
  const owner = safe ? new URL(safe).pathname.split("/").filter(Boolean)[0] : "";
  return owner ? { name: owner, url: `https://github.com/${owner}` } : null;
}

export function safeGitHubUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password) return null;
    const path = url.pathname.replace(/\/$/, "");
    if (path.split("/").filter(Boolean).length !== 2) return null;
    return `https://github.com${path}`;
  } catch { return null; }
}

export function scoreText(query, fieldMap) {
  if (!normalize(query)) return 0;
  const searchTerms = queryTerms(query);
  const normalizedQuery = searchTerms.join(" ");
  const name = fieldMap.name || "";
  let score = 0;
  if (name === normalizedQuery) score += 100;
  else if (name.startsWith(normalizedQuery)) score += 65;
  else if (name.includes(normalizedQuery)) score += 38;
  const weights = { name: 12, path: 5, description: 4, repo: 1 };
  const allFields = Object.entries(fieldMap);
  const contentFields = allFields.filter(([field]) => field !== "repo");
  let covered = 0;
  for (const term of searchTerms) {
    let best = 0;
    for (const [field, value] of allFields) {
      const weight = weights[field] || 1;
      if (value === term) best = Math.max(best, 13 * weight);
      else if (value.split(" ").some((word) => word.startsWith(term))) best = Math.max(best, 7 * weight);
      else if (value.includes(term)) best = Math.max(best, 3 * weight);
      else if (term.length >= 5 && value.split(" ").some((word) => word.length >= 5 && distanceOne(term, word))) best = Math.max(best, 1.5 * weight);
    }
    if (best) { covered++; score += best; continue; }
    const aliases = synonyms[term] || [];
    if (aliases.some((alias) => contentFields.some(([, value]) => value.split(" ").some((word) => word === alias || word.startsWith(alias))))) {
      covered++;
      score += 1.5;
    }
  }
  if (searchTerms.length > 1) score *= covered / searchTerms.length;
  if (covered === searchTerms.length && searchTerms.length > 1) score *= 1.2;
  return score;
}

export function searchSkills(index, query) {
  return index.skills.map((skill) => ({ ...skill, score: scoreText(query, skill.fields) }))
    .filter((skill) => !normalize(query) || skill.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.repoName.localeCompare(b.repoName));
}

export function searchRepos(index, query) {
  return index.repos.map((repo) => {
    const ownScore = scoreText(query, { name: normalize(repo.name), description: normalize(repo.summary || ""), path: "", repo: "" });
    const skillScore = repo.skillRecords.reduce((max, skill) => Math.max(max, scoreText(query, skill.fields)), 0);
    return { ...repo, score: Math.max(ownScore, skillScore * 0.45) };
  })
    .filter((repo) => !normalize(query) || repo.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function getMatchReason(skill, query) {
  if (!normalize(query)) return "Parte do catálogo";
  const q = queryTerms(query);
  const matched = [];
  if (q.some((term) => skill.fields.name.split(" ").some((word) => word.includes(term)))) matched.push("nome da skill");
  if (q.some((term) => skill.fields.description.includes(term))) matched.push("descrição original");
  if (q.some((term) => skill.fields.path.includes(term))) matched.push("caminho no repositório");
  if (q.some((term) => skill.fields.repo.includes(term))) matched.push("contexto do repositório");
  const aliases = q.flatMap((term) => synonyms[term] || []);
  if (aliases.some((alias) => skill.normalized.split(" ").includes(alias))) matched.push("termo relacionado do vocabulário local");
  return matched.length ? `Correspondência em ${matched.join(", ")}` : "Correspondência aproximada de termos";
}

export function filterResults(items, { category = "todas", repo = "todos", sort = "relevance", query = "" } = {}) {
  const filtered = items.filter((item) => (category === "todas" || item.category === category)
    && (repo === "todos" || (item.repoName || item.name) === repo));
  if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name) || (a.repoName || "").localeCompare(b.repoName || ""));
  return filtered;
}

export function getSkillIdFromHash(hash = "") {
  if (!hash.startsWith("#skill/")) return null;
  try { return decodeURIComponent(hash.slice(7)); } catch { return null; }
}

// Sugestões da busca: só dados do catálogo e o vocabulário local de objetivos.
export function buildSuggestions(index, query, skillMatches, { goals = [], areas = [], repoMatches } = {}) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return { skills: [], repos: [], areas: [], goals: goals.slice(0, 4) };
  const searchTerms = queryTerms(query);
  const related = (label) => {
    const value = normalize(label);
    return searchTerms.some((term) => value.includes(term) || (synonyms[term] || []).some((alias) => value.includes(alias)));
  };
  return {
    skills: skillMatches.slice(0, 5),
    repos: (repoMatches || searchRepos(index, query)).slice(0, 3),
    areas: areas.filter((area) => related(area.label) || related(area.id)),
    goals: goals.filter((goal) => normalize(goal).includes(normalizedQuery) && normalize(goal) !== normalizedQuery).slice(0, 3),
  };
}

const genericNameTerms = new Set(["skill", "skills", "agent", "agents", "plugin", "create", "best", "practices", "cli", "anything"]);

// Relacionadas por critérios objetivos: mesmo repositório e mesma categoria com termo em comum no nome.
export function relatedSkills(index, skill, limit = 6) {
  const nameTerms = new Set(skill.fields.name.split(" ").filter((term) => term.length >= 4 && !genericNameTerms.has(term)));
  const byName = (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  const unique = new Set([skill.name]);
  const pick = (list, reason, max) => list.sort(byName).filter((item) => !unique.has(item.name) && unique.add(item.name)).slice(0, max).map((item) => ({ skill: item, reason }));
  const sameRepo = pick(index.skills.filter((item) => item.repoName === skill.repoName && item.id !== skill.id), "Mesmo repositório", Math.ceil(limit / 2));
  const sameTopic = pick(index.skills.filter((item) => item.repoName !== skill.repoName && item.category === skill.category
    && item.fields.name.split(" ").some((term) => nameTerms.has(term))), "Mesma categoria e termo em comum no nome", limit - sameRepo.length);
  return [...sameRepo, ...sameTopic];
}

// Índice unificado (skills, subagentes, workflows, guias, ferramentas, referências).
export function buildResourceIndex(resources = []) {
  return resources.map((item) => {
    const fields = {
      name: normalize(item.title),
      description: normalize(`${item.summary || ""} ${(item.tags || []).join(" ")}`),
      path: normalize(item.path || ""),
      repo: normalize(`${item.source_name || ""} ${item.type} ${item.category}`),
    };
    return { ...item, fields, normalized: Object.values(fields).join(" ") };
  });
}

// Ordenação estável: relevância, depois título e id.
export function searchResources(records, query, { types = null, category = "todas", source = "todas" } = {}) {
  const filtered = records.filter((item) => (!types || types.includes(item.type))
    && (category === "todas" || item.category === category) && (source === "todas" || item.source_name === source));
  if (!normalize(query)) return [...filtered].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  return filtered.map((item) => ({ item, score: scoreText(query, item.fields) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title) || a.item.id.localeCompare(b.item.id))
    .map(({ item, score }) => ({ ...item, score }));
}

// Caminhos editoriais: correspondem quando todos os termos significativos da busca
// aparecem no objetivo ou nas palavras-chave cadastradas pela administração.
export function matchPaths(paths = [], query = "") {
  const searchTerms = queryTerms(query);
  if (!normalize(query) || !searchTerms.length) return [];
  return paths.filter((path) => {
    const haystack = normalize(`${path.goal} ${(path.keywords || []).join(" ")}`).split(" ");
    return searchTerms.every((term) => haystack.some((word) => word === term || word.startsWith(term) || (synonyms[term] || []).includes(word)));
  });
}
