import { lazy, Suspense, useCallback, useEffect } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { AccessPendingPage, CheckoutReturnPage, LegalPage, NotFound, SharedCollectionPage } from "./pages/AccountPages.jsx";
import { AuthProvider, useAccount, useAuth } from "./lib/auth.jsx";
import { matchPath, navigate, safeNext, usePathname } from "./lib/router.jsx";
import ConsentBanner from "./components/site/ConsentBanner.jsx";

const AppRoutes = lazy(() => import("./pages/app/AppRoutes.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const authModes = { "/entrar": "login", "/cadastro": "signup", "/recuperar-senha": "recover", "/redefinir-senha": "reset", "/criar-senha": "invite" };
const legalSlugs = ["termos", "privacidade", "compra-e-reembolso"];
const Loading = () => <main className="loading-line" role="status">Verificando acesso…</main>;
function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return <Loading/>;
}

// Links antigos: `#skill/<id>` → página do recurso; `#repo/<nome>` → skills filtradas pela fonte.
function legacyTarget() {
  const hash = location.hash;
  if (!["/", "/app"].includes(location.pathname)) return null;
  const decode = (value) => { try { return decodeURIComponent(value); } catch { return null; } };
  if (hash.startsWith("#skill/")) { const id = decode(hash.slice(7)); return id ? `/app/recursos/${encodeURIComponent(id)}` : null; }
  if (hash.startsWith("#repo/")) { const name = decode(hash.slice(6)); return name ? `/app/skills?fonte=${encodeURIComponent(name)}` : null; }
  return null;
}

function Routes() {
  const path = usePathname().replace(/\/$/, "") || "/";
  const { recovery, invited, loading: authLoading, user } = useAuth();
  const { account, loading, signedIn, reload, error } = useAccount();

  useEffect(() => {
    const legacy = () => { const target = legacyTarget(); if (target) navigate(target, { replace: true }); };
    legacy();
    window.addEventListener("hashchange", legacy);
    return () => window.removeEventListener("hashchange", legacy);
  }, []);
  useEffect(() => {
    if (path === "/planos") navigate("/#acesso", { replace: true });
    if (recovery && !["/redefinir-senha", "/criar-senha"].includes(path)) navigate("/redefinir-senha", { replace: true });
    if (invited && !authLoading && user && path !== "/criar-senha") navigate("/criar-senha", { replace: true });
  }, [path, recovery, invited, authLoading, user]);

  // Entrar: sessão + licença validada no servidor → sistema; sem licença → contratação; sem sessão → login.
  const enter = useCallback((next = "/app") => {
    if (!signedIn) navigate(`/entrar?next=${encodeURIComponent(next)}`);
    else navigate(account?.access ? safeNext(next) : "/acesso-pendente");
  }, [signedIn, account]);
  const afterLogin = useCallback(async (next) => {
    const fresh = account || await reload();
    navigate(fresh?.access ? next : "/acesso-pendente", { replace: true });
  }, [account, reload]);

  const requireSession = (render) => {
    if (loading) return <Loading/>;
    if (!signedIn) return <Redirect to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`}/>;
    return render();
  };

  if (path === "/") return <LandingPage account={signedIn ? account : null} signedIn={signedIn} onEnter={enter}/>;
  if (authModes[path]) return <AuthPage key={path} mode={authModes[path]} account={account} onAuthenticated={afterLogin}/>;
  if (path === "/checkout/retorno") return requireSession(() => <CheckoutReturnPage account={account} reload={reload}/>);
  if (path === "/acesso-pendente") return requireSession(() => (account?.access ? <Redirect to="/app"/> : <AccessPendingPage account={account} error={error} reload={reload}/>));
  if (path === "/app" || path.startsWith("/app/")) return requireSession(() => {
    if (!account) return error ? <AccessPendingPage account={null} error={error} reload={reload}/> : <Loading/>;
    if (!account.access) return <Redirect to="/acesso-pendente"/>;
    return <Suspense fallback={<Loading/>}><AppRoutes path={path} account={account}/></Suspense>;
  });
  if (path === "/admin") return requireSession(() => <Suspense fallback={<Loading/>}><AdminPage/></Suspense>);
  const shared = matchPath("/c/:token", path);
  if (shared) return <SharedCollectionPage token={shared.token}/>;
  const slug = path.slice(1);
  if (legalSlugs.includes(slug)) return <LegalPage slug={slug}/>;
  return <NotFound/>;
}

export default function Root() {
  return <AuthProvider><Routes/><ConsentBanner/></AuthProvider>;
}
