import { lazy, Suspense, useCallback, useEffect } from "react";
import AuroraBackground from "./components/effects/AuroraBackground.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { AccountPage, CheckoutReturnPage, LegalPage, NotFound } from "./pages/AccountPages.jsx";
import { AuthProvider, useAccount, useAuth } from "./lib/auth.jsx";
import { navigate, safeNext, usePathname } from "./lib/router.jsx";

const LibraryApp = lazy(() => import("./pages/LibraryApp.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const authModes = { "/entrar": "login", "/cadastro": "signup", "/recuperar-senha": "recover", "/redefinir-senha": "reset" };
const legalSlugs = ["termos", "privacidade", "assinatura-e-cancelamento"];
const Loading = () => <main className="view loading-line wrap" role="status">Verificando acesso…</main>;
function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return <Loading/>;
}

function Routes() {
  const path = usePathname().replace(/\/$/, "") || "/";
  const { recovery } = useAuth();
  const { account, loading, signedIn, reload, error } = useAccount();

  // Links antigos `/#skill/<id>` e `/#repo/<nome>` passam a abrir dentro de /app.
  useEffect(() => {
    const legacy = () => { if (location.pathname === "/" && /^#(skill|repo)\//.test(location.hash)) navigate(`/app${location.search}${location.hash}`, { replace: true }); };
    legacy();
    window.addEventListener("hashchange", legacy);
    return () => window.removeEventListener("hashchange", legacy);
  }, []);
  useEffect(() => {
    if (path === "/planos") navigate("/#planos", { replace: true });
    if (recovery && path !== "/redefinir-senha") navigate("/redefinir-senha", { replace: true });
  }, [path, recovery]);

  // Entrar: sessão + acesso validado no servidor → /app; sem acesso → assinatura; sem sessão → login.
  const enter = useCallback((next = "/app") => {
    if (!signedIn) navigate(`/entrar?next=${encodeURIComponent(next)}`);
    else if (account?.access) navigate(safeNext(next));
    else navigate("/minha-assinatura?motivo=sem-acesso");
  }, [signedIn, account]);
  const afterLogin = useCallback(async (next) => {
    const fresh = account || await reload();
    navigate(fresh?.access ? next : "/minha-assinatura?motivo=sem-acesso", { replace: true });
  }, [account, reload]);

  const requireSession = (render) => {
    if (loading) return <Loading/>;
    if (!signedIn) return <Redirect to={`/entrar?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`}/>;
    return render();
  };

  if (path === "/") return <LandingPage account={signedIn ? account : null} onEnter={enter}/>;
  if (authModes[path]) return <AuthPage key={path} mode={authModes[path]} account={account} onAuthenticated={afterLogin}/>;
  if (path === "/checkout/retorno") return requireSession(() => <CheckoutReturnPage account={account} reload={reload}/>);
  if (path === "/minha-assinatura") return requireSession(() => <AccountPage account={account} reload={reload} error={error}/>);
  if (path === "/app") return requireSession(() => {
    if (!account?.access) return <Redirect to="/minha-assinatura?motivo=sem-acesso"/>;
    return <Suspense fallback={<Loading/>}><LibraryApp account={account}/></Suspense>;
  });
  if (path === "/admin") return requireSession(() => <Suspense fallback={<Loading/>}><AdminPage/></Suspense>);
  const slug = path.slice(1);
  if (legalSlugs.includes(slug)) return <LegalPage slug={slug}/>;
  return <NotFound/>;
}

export default function Root() {
  return <AuthProvider>
    <div className="site-shell">
      <AuroraBackground/>
      <Routes/>
    </div>
  </AuthProvider>;
}
