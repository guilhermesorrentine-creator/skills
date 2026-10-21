import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReduced } from "../../lib/motion-pref.jsx";
import { cardReveal } from "../../lib/motion-tokens.js";
import { Link } from "../../lib/router.jsx";
import { categoryLabel, resourcePath, typeLabel } from "../../lib/resources.js";
import { useLibrary } from "../../lib/library-context.jsx";
import { Highlight } from "../shared.jsx";

export function FavoriteToggle({ id, title }) {
  const { me, actions } = useLibrary();
  const on = me.favorites.includes(id);
  return <button type="button" className="icon-btn" aria-pressed={on} aria-label={on ? `Remover ${title} dos favoritos` : `Favoritar ${title}`} title={on ? "Favorito" : "Favoritar"} onClick={() => actions.toggleFavorite(id).catch(() => {})}>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  </button>;
}

// Menu "Salvar em coleção": marcar/desmarcar coleções e criar uma nova na hora.
export function SaveToCollection({ id, title }) {
  const { me, actions } = useLibrary();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const esc = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const inAny = me.collections.some((c) => c.items.includes(id));
  return <div className="save-menu" ref={ref}>
    <button type="button" className="icon-btn" aria-haspopup="true" aria-expanded={open} aria-pressed={inAny} aria-label={`Salvar ${title} em coleção`} title="Salvar em coleção" onClick={() => setOpen((v) => !v)}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z" fill={inAny ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
    </button>
    {open && <div className="save-pop" role="group" aria-label="Coleções">
      <p className="save-pop-title">Salvar em…</p>
      {me.collections.length === 0 && <p className="muted small">Você ainda não tem coleções.</p>}
      <ul>{me.collections.map((c) => <li key={c.id}><label className="save-check"><input type="checkbox" checked={c.items.includes(id)} disabled={busy}
        onChange={async (event) => { setBusy(true); try { await actions.setInCollection(c.id, id, event.target.checked); } finally { setBusy(false); } }}/> {c.name}</label></li>)}</ul>
      <form className="save-new" onSubmit={async (event) => { event.preventDefault(); if (!name.trim()) return; setBusy(true); try { const created = await actions.createCollection(name.trim()); await actions.setInCollection(created.id, id, true); setName(""); } finally { setBusy(false); } }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova coleção" aria-label="Nome da nova coleção" maxLength={80}/>
        <button type="submit" className="btn btn-secondary btn-sm" disabled={busy || !name.trim()}>Criar</button>
      </form>
    </div>}
  </div>;
}

function ResourceCard({ item, query = "", extra = null, index = 0 }) {
  const reduced = useReduced();
  return <motion.article className="r-card" data-category={item.category} {...cardReveal(reduced, index)}>
    <div className="r-card-top"><span className="badge">{categoryLabel[item.category]}</span><span className="badge badge-type">{typeLabel[item.type]}</span>{item.external && item.type !== "skill" && <span className="badge badge-type">Externo</span>}</div>
    <h3><Link to={resourcePath(item.id)}><Highlight text={item.title} query={query}/></Link></h3>
    <p><Highlight text={item.summary || "Sem descrição na fonte."} query={query}/></p>
    <div className="r-card-foot">
      <span className="r-card-source" title={item.author ? `${item.source_name}, de ${item.author}` : undefined}>{item.source_name || "Voxelia"}{item.author && item.type === "skill" ? <span className="r-card-owner"> · {item.author}</span> : null}</span>
      <span className="r-card-actions">{extra}<FavoriteToggle id={item.id} title={item.title}/><SaveToCollection id={item.id} title={item.title}/></span>
    </div>
  </motion.article>;
}

export default memo(ResourceCard);
