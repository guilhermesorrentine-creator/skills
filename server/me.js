import { randomBytes } from "node:crypto";

const httpError = (status, code, message) => Object.assign(new Error(message), { status, code });
const MAX_RECENT = 30;
const newToken = () => randomBytes(18).toString("base64url");

// Favoritos, histórico e coleções do usuário. Toda operação confere o dono (proteção contra IDOR).
export function createMe({ store, library, now = () => new Date() }) {
  async function own(userId, collectionId) {
    const collection = await store.getCollection(String(collectionId || ""));
    if (!collection || collection.user_id !== userId) throw httpError(404, "not_found", "Coleção não encontrada.");
    return collection;
  }
  const requireResource = async (id) => { if (!(await library.exists(id))) throw httpError(400, "invalid_resource", "Recurso inexistente."); };

  return {
    async state(userId) {
      const [favorites, recent, collections] = await Promise.all([store.listFavorites(userId), store.listRecent(userId), store.listCollections(userId)]);
      const items = await Promise.all(collections.map((collection) => store.listCollectionItems(collection.id)));
      return {
        favorites: favorites.map((row) => row.resource_id),
        recent: recent.map((row) => ({ id: row.resource_id, visitedAt: row.visited_at })),
        collections: collections.map((collection, index) => ({
          id: collection.id, name: collection.name, description: collection.description, shared: Boolean(collection.share_token),
          shareToken: collection.share_token, updatedAt: collection.updated_at, items: items[index].sort((a, b) => a.position - b.position).map((row) => row.resource_id),
        })),
      };
    },
    async toggleFavorite(userId, resourceId, on) {
      if (on) { await requireResource(resourceId); await store.addFavorite(userId, resourceId); }
      else await store.removeFavorite(userId, resourceId);
    },
    async visit(userId, resourceId) {
      await requireResource(resourceId);
      await store.upsertRecent(userId, resourceId, now().toISOString(), MAX_RECENT);
    },
    async clearRecent(userId) { await store.clearRecent(userId); },
    // Migração dos dados salvos no navegador: só adiciona, nunca apaga; ignora IDs inexistentes.
    async importLocal(userId, { favorites = [], recent = [] }) {
      let added = 0;
      for (const id of [...new Set(favorites)].slice(0, 500)) if (await library.exists(id)) { await store.addFavorite(userId, id); added++; }
      for (const item of recent.slice(0, MAX_RECENT)) if (item?.id && await library.exists(item.id)) { await store.upsertRecent(userId, item.id, item.visitedAt || now().toISOString(), MAX_RECENT); added++; }
      return { added };
    },
    async createCollection(userId, { name, description }) {
      const clean = String(name || "").trim().slice(0, 80);
      if (!clean) throw httpError(400, "invalid_name", "Dê um nome à coleção.");
      if ((await store.listCollections(userId)).length >= 100) throw httpError(400, "limit", "Limite de 100 coleções atingido.");
      return store.insertCollection({ user_id: userId, name: clean, description: String(description || "").trim().slice(0, 400) });
    },
    async updateCollection(userId, id, { name, description }) {
      await own(userId, id);
      const patch = { updated_at: now().toISOString() };
      if (name !== undefined) { const clean = String(name).trim().slice(0, 80); if (!clean) throw httpError(400, "invalid_name", "Nome obrigatório."); patch.name = clean; }
      if (description !== undefined) patch.description = String(description).trim().slice(0, 400);
      await store.updateCollection(id, patch);
    },
    async deleteCollection(userId, id) { await own(userId, id); await store.deleteCollection(id); },
    async addItem(userId, id, resourceId) {
      await own(userId, id); await requireResource(resourceId);
      const items = await store.listCollectionItems(id);
      if (items.length >= 500) throw httpError(400, "limit", "Limite de 500 itens por coleção.");
      if (!items.some((row) => row.resource_id === resourceId)) await store.insertCollectionItem({ collection_id: id, resource_id: resourceId, position: items.length });
      await store.updateCollection(id, { updated_at: now().toISOString() });
    },
    async removeItem(userId, id, resourceId) { await own(userId, id); await store.deleteCollectionItem(id, resourceId); },
    async reorder(userId, id, order) {
      await own(userId, id);
      const items = await store.listCollectionItems(id);
      const current = new Set(items.map((row) => row.resource_id));
      if (!Array.isArray(order) || order.length !== current.size || !order.every((rid) => current.has(rid))) throw httpError(400, "invalid_order", "Ordem inválida.");
      await store.setCollectionOrder(id, order);
    },
    // Link de visualização: token imprevisível, revogável e regenerável.
    async share(userId, id, enabled) {
      await own(userId, id);
      const token = enabled ? newToken() : null;
      await store.updateCollection(id, { share_token: token, updated_at: now().toISOString() });
      return { shareToken: token };
    },
    // Visão pública: só nome, descrição e títulos. Não revela dono nem libera conteúdo pago.
    async shared(token) {
      if (!/^[A-Za-z0-9_-]{20,40}$/.test(String(token || ""))) throw httpError(404, "not_found", "Link inválido ou revogado.");
      const collection = await store.getCollectionByShareToken(token);
      if (!collection) throw httpError(404, "not_found", "Link inválido ou revogado.");
      const items = (await store.listCollectionItems(collection.id)).sort((a, b) => a.position - b.position);
      return { name: collection.name, description: collection.description, items: await library.titles(items.map((row) => row.resource_id)) };
    },
  };
}
