import { useEffect, useState } from "react";
import { Link, navigate } from "../../lib/router.jsx";
import { useLibrary } from "../../lib/library-context.jsx";
import { categoryLabel, resourcePath, typeLabel } from "../../lib/resources.js";
import { CopyButton } from "../../components/shared.jsx";

export function CollectionsPage() {
  const { me, actions } = useLibrary();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return <div className="page">
    <header className="page-head"><h1>Minhas coleções</h1><p className="muted">Privadas por padrão. Você pode gerar um link só de visualização.</p></header>
    <form className="inline-form" onSubmit={async (event) => { event.preventDefault(); setError(""); try { const c = await actions.createCollection(name); setName(""); navigate(`/app/colecoes/${c.id}`); } catch (e) { setError(e.message); } }}>
      <label className="sr-only" htmlFor="new-col">Nome da coleção</label>
      <input id="new-col" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova coleção" maxLength={80}/>
      <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Criar coleção</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {me.collections.length === 0 ? <div className="empty"><h3>Nenhuma coleção ainda.</h3><p>Crie uma acima ou use o marcador nos cards para salvar recursos.</p></div>
      : <div className="f-grid">{me.collections.map((c, i) => <Link key={c.id} to={`/app/colecoes/${c.id}`} className="f-card" data-category={["software", "conteudo", "ciencia", "empreendedorismo"][i % 4]}>
        <span className="tag-mono">{c.items.length} item(ns){c.shared ? " · link ativo" : ""}</span><h3>{c.name}</h3>{c.description && <p>{c.description}</p>}
      </Link>)}</div>}
  </div>;
}

export function CollectionPage({ id }) {
  const { me, byId, actions } = useLibrary();
  const collection = me.collections.find((c) => c.id === id);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (collection) setDraft({ name: collection.name, description: collection.description }); }, [collection?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!collection) return <div className="page"><div className="empty"><h3>Coleção não encontrada.</h3><Link className="btn btn-secondary btn-sm" to="/app/colecoes">Ver coleções</Link></div></div>;
  const items = collection.items.map((rid) => byId.get(rid) || { id: rid, title: "Recurso indisponível na sua edição", type: null });
  const move = (index, delta) => { const order = [...collection.items]; const [row] = order.splice(index, 1); order.splice(index + delta, 0, row); actions.reorder(collection.id, order).catch(() => {}); };
  const shareUrl = collection.shareToken ? `${location.origin}/c/${collection.shareToken}` : "";

  return <div className="page">
    <Link className="btn btn-ghost btn-sm back" to="/app/colecoes">← Coleções</Link>
    {editing ? <form className="panel stack" onSubmit={async (e) => { e.preventDefault(); await actions.updateCollection(collection.id, draft); setEditing(false); }}>
      <label className="field">Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} required/></label>
      <label className="field">Descrição<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400}/></label>
      <div className="row"><button type="submit" className="btn btn-primary btn-sm">Salvar</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancelar</button></div>
    </form> : <header className="page-head page-head-row"><div><h1>{collection.name}</h1>{collection.description && <p className="muted">{collection.description}</p>}</div>
      <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Editar</button>
        <button type="button" className="btn btn-secondary btn-sm danger" onClick={async () => { if (window.confirm(`Excluir a coleção “${collection.name}”? Os recursos não são apagados.`)) { await actions.deleteCollection(collection.id); navigate("/app/colecoes"); } }}>Excluir</button></div>
    </header>}

    <section className="panel share-panel"><h2>Compartilhamento</h2>
      {collection.shareToken ? <>
        <p className="small">Qualquer pessoa com o link vê o nome da coleção e os títulos. O link não permite editar nem abre conteúdos pagos.</p>
        <div className="row"><code className="share-url">{shareUrl}</code><CopyButton value={shareUrl}>Copiar link</CopyButton></div>
        <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await actions.share(collection.id, true); setMessage("Novo link gerado; o anterior deixou de funcionar."); }}>Gerar novo link</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await actions.share(collection.id, false); setMessage("Link revogado."); }}>Revogar link</button></div>
      </> : <><p className="small">A coleção é privada.</p><button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await actions.share(collection.id, true); setMessage("Link de visualização criado."); }}>Criar link de visualização</button></>}
      {message && <p className="form-ok" role="status">{message}</p>}
    </section>

    {items.length === 0 ? <div className="empty"><h3>Coleção vazia.</h3><p>Use o marcador nos cards ou na página de um recurso para adicionar.</p></div>
      : <ol className="col-items">{items.map((item, index) => <li key={item.id} className="col-item">
        <div className="col-item-main">{item.type ? <Link to={resourcePath(item.id)}>{item.title}</Link> : <span className="muted">{item.title}</span>}{item.type && <span className="muted small">{typeLabel[item.type]} · {categoryLabel[item.category]}</span>}</div>
        <div className="row">
          <button type="button" className="icon-btn" aria-label={`Mover ${item.title} para cima`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" className="icon-btn" aria-label={`Mover ${item.title} para baixo`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
          <button type="button" className="icon-btn" aria-label={`Remover ${item.title} da coleção`} onClick={() => actions.setInCollection(collection.id, item.id, false)}>×</button>
        </div>
      </li>)}</ol>}
  </div>;
}
