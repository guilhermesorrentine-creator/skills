// Parser de Markdown seguro e mínimo (sem HTML). Usado pelos guias e testado em Node.
export const slug = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "secao";

export function safeHref(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null; } catch { return null; }
}

export function parseMarkdown(source = "") {
  const lines = String(source).replace(/\r\n/g, "\n").split("\n");
  const blocks = []; const headings = []; const used = new Map();
  let i = 0;
  const uniqueId = (text) => { const base = slug(text); const n = (used.get(base) || 0) + 1; used.set(base, n); return n > 1 ? `${base}-${n}` : base; };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const code = []; i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[1], text: code.join("\n") });
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length; const text = heading[2].trim(); const id = uniqueId(text);
      if (level === 2) headings.push({ id, text });
      blocks.push({ type: "heading", level, text, id }); i++; continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      blocks.push({ type: "list", ordered, items }); continue;
    }
    if (line.startsWith(">")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: quote.join(" ") }); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|```|\s*([-*]|\d+\.)\s|>)/.test(lines[i])) para.push(lines[i++].trim());
    blocks.push({ type: "p", text: para.join(" ") });
  }
  return { blocks, headings };
}


// Marcadores «assim» indicam o que a pessoa troca pelo seu: destacados na tela, copiados sem as aspas.
export const splitPlaceholders = (text) => text.split(/(«[^»\n]+»)/).filter(Boolean).map((part) => (part.startsWith("«") && part.endsWith("»") ? { placeholder: part.slice(1, -1) } : part));
export const stripPlaceholders = (text) => text.replace(/«([^»\n]+)»/g, "$1");
