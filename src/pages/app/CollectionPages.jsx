import { useEffect, useState } from "react";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { resourcePath } from "../../lib/resources.js";
import { useT } from "../../i18n/index.js";
import { CopyButton } from "../../components/shared.jsx";

export function CollectionsPage() {
  const { t } = useT();
  const { me, actions } = useLibrary();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return <div className="page">
    <header className="page-head"><h1>{t("app.collections.title")}</h1><p className="muted">{t("app.collections.lead")}</p></header>
    <form className="inline-form" onSubmit={async (event) => { event.preventDefault(); setError(""); try { const c = await actions.createCollection(name); setName(""); navigate(`/app/colecoes/${c.id}`); } catch (e) { setError(e.message); } }}>
      <label className="sr-only" htmlFor="new-col">{t("app.collections.name")}</label>
      <input id="new-col" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("app.collections.placeholder")} maxLength={80}/>
      <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{t("app.collections.create")}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {me.collections.length === 0 ? <div className="empty"><h3>{t("app.collections.emptyTitle")}</h3><p>{t("app.collections.empty")}</p></div>
      : <div className="f-grid">{me.collections.map((c, i) => <Link key={c.id} to={`/app/colecoes/${c.id}`} className="f-card" data-category={["software", "conteudo", "ciencia", "empreendedorismo"][i % 4]}>
        <span className="tag-mono">{t("app.home.items", { n: c.items.length })}{c.shared ? t("app.collections.linkActive") : ""}</span><h3>{c.name}</h3>{c.description && <p>{c.description}</p>}
      </Link>)}</div>}
  </div>;
}

export function CollectionPage({ id }) {
  const { t } = useT();
  const { me, byId, actions } = useLibrary();
  const collection = me.collections.find((c) => c.id === id);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (collection) setDraft({ name: collection.name, description: collection.description }); }, [collection?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!collection) return <div className="page"><div className="empty"><h3>{t("app.collections.notFound")}</h3><Link className="btn btn-secondary btn-sm" to="/app/colecoes">{t("app.collections.seeAll")}</Link></div></div>;
  const items = collection.items.map((rid) => byId.get(rid) || { id: rid, title: t("app.collections.unavailable"), type: null });
  const move = (index, delta) => { const order = [...collection.items]; const [row] = order.splice(index, 1); order.splice(index + delta, 0, row); actions.reorder(collection.id, order).catch(() => {}); };
  const shareUrl = collection.shareToken ? `${location.origin}/c/${collection.shareToken}` : "";

  return <div className="page">
    <Link className="btn btn-ghost btn-sm back" to="/app/colecoes">{t("app.collections.back")}</Link>
    {editing ? <form className="panel stack" onSubmit={async (e) => { e.preventDefault(); await actions.updateCollection(collection.id, draft); setEditing(false); }}>
      <label className="field">{t("app.collections.nameField")}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} required/></label>
      <label className="field">{t("app.collections.description")}<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400}/></label>
      <div className="row"><button type="submit" className="btn btn-primary btn-sm">{t("app.collections.save")}</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>{t("app.collections.cancel")}</button></div>
    </form> : <header className="page-head page-head-row"><div><h1>{collection.name}</h1>{collection.description && <p className="muted">{collection.description}</p>}</div>
      <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>{t("app.collections.edit")}</button>
        <button type="button" className="btn btn-secondary btn-sm danger" onClick={async () => { if (window.confirm(t("app.collections.confirmDelete", { name: collection.name }))) { await actions.deleteCollection(collection.id); navigate("/app/colecoes"); } }}>{t("app.collections.delete")}</button></div>
    </header>}

    <section className="panel share-panel"><h2>{t("app.collections.sharing")}</h2>
      {collection.shareToken ? <>
        <p className="small">{t("app.collections.shareInfo")}</p>
        <div className="row"><code className="share-url">{shareUrl}</code><CopyButton value={shareUrl}>{t("app.collections.copyLink")}</CopyButton></div>
        <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await actions.share(collection.id, true); setMessage(t("app.collections.newLinkDone")); }}>{t("app.collections.newLink")}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await actions.share(collection.id, false); setMessage(t("app.collections.revoked")); }}>{t("app.collections.revoke")}</button></div>
      </> : <><p className="small">{t("app.collections.private")}</p><button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await actions.share(collection.id, true); setMessage(t("app.collections.linkCreated")); }}>{t("app.collections.createLink")}</button></>}
      {message && <p className="form-ok" role="status">{message}</p>}
    </section>

    {items.length === 0 ? <div className="empty"><h3>{t("app.collections.emptyCollectionTitle")}</h3><p>{t("app.collections.emptyCollection")}</p></div>
      : <ol className="col-items">{items.map((item, index) => <li key={item.id} className="col-item">
        <div className="col-item-main">{item.type ? <Link to={resourcePath(item.id)}>{item.title}</Link> : <span className="muted">{item.title}</span>}{item.type && <span className="muted small">{t(`type.${item.type}`)} · {t(`cat.${item.category}`)}</span>}</div>
        <div className="row">
          <button type="button" className="icon-btn" aria-label={t("app.collections.up", { title: item.title })} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" className="icon-btn" aria-label={t("app.collections.down", { title: item.title })} disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
          <button type="button" className="icon-btn" aria-label={t("app.collections.remove", { title: item.title })} onClick={() => actions.setInCollection(collection.id, item.id, false)}>×</button>
        </div>
      </li>)}</ol>}
  </div>;
}
