import { Fragment } from "react";
import { CopyButton } from "../components/shared.jsx";
import { safeHref, splitPlaceholders, stripPlaceholders } from "./markdown-parse.js";

export { parseMarkdown } from "./markdown-parse.js";

// Markdown seguro e mínimo para guias: gera elementos React (nunca HTML bruto).
// Suporta títulos (## e ###), parágrafos, listas, citações, blocos de código e
// marcação em linha (**negrito**, *itálico*, `código`, [link](https://...)) e «trechos para trocar».
const withPlaceholders = (text, keyPrefix) => splitPlaceholders(text).map((part, n) => (typeof part === "string" ? part : <mark key={`${keyPrefix}-ph${n}`} className="ph" title="Troque pelo seu">{part.placeholder}</mark>));

function inline(text, keyPrefix) {
  const out = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0; let match; let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0]; const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("`")) out.push(<code key={key}>{withPlaceholders(token.slice(1, -1), key)}</code>);
    else if (token.startsWith("**")) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) out.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const [, label, href] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const safe = safeHref(href);
      out.push(safe ? <a key={key} href={safe} target="_blank" rel="noopener noreferrer">{label} ↗</a> : label);
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ blocks }) {
  return blocks.map((block, index) => {
    const key = `b${index}`;
    if (block.type === "heading") return block.level === 2 ? <h2 key={key} id={block.id}>{inline(block.text, key)}</h2> : <h3 key={key} id={block.id}>{inline(block.text, key)}</h3>;
    if (block.type === "code") return <div key={key} className="md-code"><div className="md-code-bar"><span className="tag-mono">{block.lang || "texto"}</span><CopyButton value={stripPlaceholders(block.text)}>Copiar</CopyButton></div><pre><code>{withPlaceholders(block.text, key)}</code></pre></div>;
    if (block.type === "list") { const Tag = block.ordered ? "ol" : "ul"; return <Tag key={key}>{block.items.map((item, n) => <li key={n}>{inline(item, `${key}-${n}`)}</li>)}</Tag>; }
    if (block.type === "quote") return <blockquote key={key}>{inline(block.text, key)}</blockquote>;
    return <p key={key}>{inline(block.text, key).map((part, n) => <Fragment key={n}>{part}</Fragment>)}</p>;
  });
}
