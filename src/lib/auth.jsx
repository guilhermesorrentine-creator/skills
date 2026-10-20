import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const authConfigured = Boolean(supabase);
// Sem Supabase em desenvolvimento local, a API pode usar o atalho BT_DEV_BYPASS do servidor.
const devMode = !authConfigured && import.meta.env.DEV;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authConfigured);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo(() => ({ session, user: session?.user || null, loading, recovery, devMode, setRecovery }), [session, loading, recovery]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

const translate = (message = "") => {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail pelo link enviado antes de entrar.";
  if (/already registered|already been registered/i.test(message)) return "Este e-mail já tem cadastro. Entre ou recupere a senha.";
  if (/password should be at least/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos.";
  return message || "Não foi possível concluir. Tente novamente.";
};
const requireClient = () => { if (!supabase) throw new Error("Login indisponível: o Supabase ainda não foi configurado."); return supabase; };
const run = async (promise) => { const { data, error } = await promise; if (error) throw new Error(translate(error.message)); return data; };

export const authActions = {
  signIn: (email, password) => run(requireClient().auth.signInWithPassword({ email, password })),
  signUp: (email, password) => run(requireClient().auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/entrar` } })),
  recover: (email) => run(requireClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/redefinir-senha` })),
  updatePassword: (password) => run(requireClient().auth.updateUser({ password })),
  signOut: () => (supabase ? supabase.auth.signOut() : Promise.resolve()),
};

// Chamada à API do próprio site com o token da sessão.
export async function apiFetch(path, { method = "GET", body } = {}) {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
  const response = await fetch(path, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || "Falha na comunicação com o servidor."), { status: response.status, code: data.error });
  return data;
}

// Situação da conta validada no servidor (nunca deduzida no navegador).
export function useAccount() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, account: null, error: null });
  const signedIn = Boolean(user) || devMode;
  const reload = useCallback(async (refresh = false) => {
    if (!signedIn) { setState({ loading: false, account: null, error: null }); return null; }
    try {
      const account = await apiFetch(`/api/billing/subscription${refresh ? "?refresh=1" : ""}`);
      setState({ loading: false, account, error: null });
      return account;
    } catch (error) { setState({ loading: false, account: null, error }); return null; }
  }, [signedIn]);
  useEffect(() => { if (!authLoading) reload(); }, [authLoading, reload, user?.id]);
  return { ...state, loading: authLoading || state.loading, signedIn, reload };
}
