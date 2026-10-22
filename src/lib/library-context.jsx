import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "./auth.jsx";
import { buildResourceIndex } from "./search.js";
import { loadFavorites, loadRecent } from "./local-state.js";

const LibraryContext = createContext(null);
const SYNC_FLAG = "biblioteca-total:synced:v4";
const readFlag = () => { try { return localStorage.getItem(SYNC_FLAG) === "1"; } catch { return true; } };
const writeFlag = () => { try { localStorage.setItem(SYNC_FLAG, "1"); } catch { /* opcional */ } };

// Catálogo autorizado e dados pessoais do usuário (favoritos, histórico, coleções), vindos da API.
export function LibraryProvider({ children }) {
  const [library, setLibrary] = useState(null);
  const [me, setMe] = useState({ favorites: [], recent: [], collections: [] });
  const [error, setError] = useState(null);
  const [localPending, setLocalPending] = useState(null);
  const [compare, setCompare] = useState([]);
  const started = useRef(false);

  const reloadMe = useCallback(async () => setMe(await apiFetch("/api/me")), []);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    Promise.all([apiFetch("/api/library"), apiFetch("/api/me")]).then(([lib, mine]) => {
      setLibrary(lib); setMe(mine);
      const favorites = loadFavorites(); const recent = loadRecent();
      if (!readFlag() && (favorites.length || recent.length)) setLocalPending({ favorites, recent });
    }).catch(setError);
  }, []);

  const index = useMemo(() => buildResourceIndex(library?.resources || []), [library]);
  const byId = useMemo(() => new Map(index.map((item) => [item.id, item])), [index]);

  const actions = useMemo(() => ({
    async toggleFavorite(id) {
      const on = !me.favorites.includes(id);
      setMe((state) => ({ ...state, favorites: on ? [id, ...state.favorites] : state.favorites.filter((item) => item !== id) }));
      try { await apiFetch("/api/me/favorite", { method: "POST", body: { id, on } }); } catch (cause) { await reloadMe(); throw cause; }
    },
    async visit(id) {
      setMe((state) => ({ ...state, recent: [{ id, visitedAt: new Date().toISOString() }, ...state.recent.filter((item) => item.id !== id)].slice(0, 30) }));
      apiFetch("/api/me/visit", { method: "POST", body: { id } }).catch(() => {});
    },
    async clearRecent() { await apiFetch("/api/me/recent/clear", { method: "POST" }); await reloadMe(); },
    // Importa favoritos e histórico do navegador; os dados locais só ficam marcados como sincronizados.
    async importLocal() { await apiFetch("/api/me/import", { method: "POST", body: localPending }); writeFlag(); setLocalPending(null); await reloadMe(); },
    dismissLocal() { writeFlag(); setLocalPending(null); },
    async createCollection(name, description = "") { const { collection } = await apiFetch("/api/collections", { method: "POST", body: { name, description } }); await reloadMe(); return collection; },
    async updateCollection(id, patch) { await apiFetch("/api/collections/update", { method: "POST", body: { id, ...patch } }); await reloadMe(); },
    async deleteCollection(id) { await apiFetch("/api/collections/delete", { method: "POST", body: { id } }); await reloadMe(); },
    async setInCollection(id, resourceId, inside) { await apiFetch("/api/collections/item", { method: "POST", body: { id, resourceId, action: inside ? "add" : "remove" } }); await reloadMe(); },
    async reorder(id, order) { setMe((state) => ({ ...state, collections: state.collections.map((c) => (c.id === id ? { ...c, items: order } : c)) })); await apiFetch("/api/collections/reorder", { method: "POST", body: { id, order } }); },
    // Comparação de até 3 skills (somente nesta sessão).
    toggleCompare(id) { setCompare((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : ids.length >= 3 ? ids : [...ids, id])); },
    clearCompare() { setCompare([]); },
    async share(id, enabled) { const result = await apiFetch("/api/collections/share", { method: "POST", body: { id, enabled } }); await reloadMe(); return result; },
  }), [me.favorites, localPending, reloadMe]);

  const value = { library, index, byId, me, actions, error, localPending, compare, loading: !library && !error };
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export const useLibrary = () => useContext(LibraryContext);
