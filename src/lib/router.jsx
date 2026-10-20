import { useEffect, useState } from "react";

// Roteamento por caminho (mesmo domínio). A Vercel reescreve rotas desconhecidas para index.html.
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener(location.pathname));

export function navigate(to, { replace = false } = {}) {
  if (to === `${location.pathname}${location.search}${location.hash}`) return;
  history[replace ? "replaceState" : "pushState"](null, "", to);
  emit();
  if (!to.includes("#")) window.scrollTo({ top: 0, behavior: "instant" });
}

export function usePathname() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    listeners.add(setPath); window.addEventListener("popstate", onPop);
    return () => { listeners.delete(setPath); window.removeEventListener("popstate", onPop); };
  }, []);
  return path;
}

// Destino pós-login: só caminhos internos (evita redirecionamento aberto).
export function safeNext(value, fallback = "/app") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}

export function Link({ to, children, ...props }) {
  return <a href={to} {...props} onClick={(event) => {
    props.onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault(); navigate(to);
  }}>{children}</a>;
}
