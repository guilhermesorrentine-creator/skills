import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { authActions, authConfigured, useAuth } from "../lib/auth.jsx";
import { Link, navigate, safeNext } from "../lib/router.jsx";
import { subscribe } from "../lib/billing-client.js";
import { motionTokens } from "../lib/motion-tokens.js";

const copy = {
  login: { title: "Entrar", lead: "Acesse sua conta da Biblioteca Total.", submit: "Entrar" },
  signup: { title: "Criar conta", lead: "Só e-mail e senha. Os dados de pagamento ficam no ambiente do Asaas.", submit: "Criar conta" },
  recover: { title: "Recuperar senha", lead: "Enviaremos um link para você criar uma nova senha.", submit: "Enviar link" },
  reset: { title: "Nova senha", lead: "Defina a nova senha da sua conta.", submit: "Salvar nova senha" },
};

// Login, cadastro, recuperação e redefinição de senha (Supabase Auth).
export default function AuthPage({ mode, account, onAuthenticated }) {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next"));
  const plan = params.get("plano");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const text = copy[mode];
  const query = location.search;

  // Já autenticado: segue para o plano escolhido ou para o destino pedido.
  useEffect(() => {
    if (!user || mode === "reset" || !account) return;
    if (plan && !account.access) subscribe(plan, { signedIn: true }).catch((cause) => setError(cause.message));
    else onAuthenticated(next);
  }, [user, account, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setDone("");
    try {
      if (mode === "login") await authActions.signIn(email, password);
      else if (mode === "signup") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const data = await authActions.signUp(email, password);
        if (!data.session) setDone("Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre.");
      } else if (mode === "recover") { await authActions.recover(email); setDone("Se houver uma conta com este e-mail, o link de recuperação foi enviado."); }
      else if (mode === "reset") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        await authActions.updatePassword(password); setDone("Senha atualizada."); navigate("/app");
      }
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  return <main id="conteudo" className="view auth-view">
    <motion.div className="auth-card" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
      <Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">BT</span><span className="brand-name">BIBLIOTECA<b>_TOTAL</b></span></Link>
      <p className="sys-tag"><span className="status-dot"/> AUTH://{mode.toUpperCase()}</p>
      <h1>{text.title}</h1>
      <p className="auth-lead">{plan && mode !== "recover" ? "Entre ou crie sua conta para continuar a contratação do plano escolhido." : text.lead}</p>
      {!authConfigured && <p className="form-error" role="alert">Login indisponível neste ambiente: o Supabase ainda não foi configurado (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).</p>}
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {mode !== "reset" && <label className="auth-field">E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label>}
        {mode !== "recover" && <label className="auth-field">{mode === "reset" ? "Nova senha" : "Senha"}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)}/></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="form-ok" role="status">{done}</p>}
        <button type="submit" className="button button-primary auth-submit" disabled={busy || !authConfigured} aria-busy={busy}>{busy ? "Aguarde…" : text.submit}</button>
      </form>
      <div className="auth-links">
        {mode === "login" && <><Link to={`/cadastro${query}`}>Criar conta</Link><Link to={`/recuperar-senha${query}`}>Esqueci a senha</Link></>}
        {mode === "signup" && <Link to={`/entrar${query}`}>Já tenho conta</Link>}
        {(mode === "recover" || mode === "reset") && <Link to="/entrar">Voltar ao login</Link>}
        <Link to="/">← Voltar ao início</Link>
      </div>
    </motion.div>
  </main>;
}
