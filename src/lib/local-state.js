const FAVORITES_KEY = "biblioteca-total:favorites:v1";
const RECENT_KEY = "biblioteca-total:recent:v1";
const browserStorage = () => { try { return globalThis.localStorage; } catch { return null; } };

function read(storage, key, fallback) {
  try {
    const value = storage?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}

function write(storage, key, value) {
  if (!storage) return false;
  try { storage?.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function loadFavorites(storage = browserStorage()) {
  const value = read(storage, FAVORITES_KEY, []);
  return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === "string"))] : [];
}

export function toggleFavorite(ids, id, storage = browserStorage()) {
  const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  return write(storage, FAVORITES_KEY, next) ? next : ids;
}

export function loadRecent(storage = browserStorage()) {
  const value = read(storage, RECENT_KEY, []);
  return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string").slice(0, 20) : [];
}

export function recordRecent(items, id, storage = browserStorage()) {
  const next = [{ id, visitedAt: new Date().toISOString() }, ...items.filter((item) => item.id !== id)].slice(0, 20);
  return write(storage, RECENT_KEY, next) ? next : items;
}

export function clearRecent(storage = browserStorage()) {
  if (!storage) return false;
  try { storage?.removeItem(RECENT_KEY); return true; }
  catch { return false; }
}

export function toggleComparison(ids, id, limit = 3) {
  if (ids.includes(id)) return { ids: ids.filter((item) => item !== id), limited: false };
  if (ids.length >= limit) return { ids, limited: true };
  return { ids: [...ids, id], limited: false };
}

export function getCatalogControls(search = "") {
  const params = new URLSearchParams(search);
  return {
    query: params.get("q") || "",
    category: params.get("area") || "todas",
    kind: params.get("tipo") === "repositorios" ? "repositorios" : "skills",
    repo: params.get("repo") || "todos",
    view: ["favoritos", "recentes"].includes(params.get("ver")) ? params.get("ver") : "todos",
  };
}

export function setCatalogControls(url, controls) {
  const next = new URL(url);
  for (const key of ["q", "area", "tipo", "repo", "ver"]) next.searchParams.delete(key);
  if (controls.query) next.searchParams.set("q", controls.query);
  if (controls.category !== "todas") next.searchParams.set("area", controls.category);
  if (controls.kind === "repositorios") next.searchParams.set("tipo", controls.kind);
  if (controls.repo !== "todos") next.searchParams.set("repo", controls.repo);
  if (controls.view !== "todos") next.searchParams.set("ver", controls.view);
  return next;
}
