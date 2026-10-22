// Vocabulário de tipos e áreas, compartilhado pela landing, pelo sistema e pela administração.
export const TYPES = [
  { id: "skill", label: "Skill", plural: "Skills", route: "skills" },
  { id: "subagent", label: "Subagente", plural: "Subagentes", route: "subagentes" },
  { id: "workflow", label: "Workflow", plural: "Workflows", route: "workflows" },
  { id: "tool", label: "Ferramenta", plural: "Ferramentas", route: "ferramentas" },
  { id: "reference", label: "Referência", plural: "Referências", route: "ferramentas" },
  { id: "guide", label: "Guia", plural: "Guias", route: "guias" },
];
export const typeLabel = Object.fromEntries(TYPES.map((type) => [type.id, type.label]));

export const CATEGORIES = [
  { id: "software", label: "Software", role: "Hacker de terminal" },
  { id: "empreendedorismo", label: "Empreendedorismo", role: "Estrategista" },
  { id: "conteudo", label: "Conteúdo", role: "Criadora audiovisual" },
  { id: "ciencia", label: "Ciência", role: "Pesquisadora" },
];
export const categoryLabel = Object.fromEntries(CATEGORIES.map((category) => [category.id, category.label]));

// Rotas de listagem do sistema e os tipos que cada uma mostra.
export const SECTIONS = [
  { route: "skills", label: "Skills", types: ["skill"] },
  { route: "subagentes", label: "Subagentes", types: ["subagent"] },
  { route: "workflows", label: "Workflows", types: ["workflow"] },
  { route: "ferramentas", label: "Ferramentas", types: ["tool", "reference"] },
  { route: "guias", label: "Guias", types: ["guide"] },
];

export const resourcePath = (id) => `/app/recursos/${encodeURIComponent(id)}`;
