export const areas = [
  { id: "todas", label: "Todas", code: "ALL" },
  { id: "software", label: "Software", code: "SOFTWARE" },
  { id: "empreendedorismo", label: "Empreendedorismo", code: "EMPREENDEDORISMO" },
  { id: "conteudo", label: "Conteúdo", code: "CONTEUDO" },
  { id: "ciencia", label: "Ciência", code: "CIENCIA" },
];

export const areaNames = Object.fromEntries(areas.slice(1).map((area) => [area.id, area.label]));

// Vocabulário local de objetivos (não é IA): vira consulta comum no índice.
export const intentions = [
  "Quero criar um site",
  "Preciso melhorar meu design",
  "Quero automatizar tarefas",
  "Preciso analisar dados",
  "Quero desenvolver um aplicativo",
  "Quero criar vídeos",
  "Preciso melhorar a segurança de um sistema",
  "Economizar tokens",
  "Pesquisa científica",
];
