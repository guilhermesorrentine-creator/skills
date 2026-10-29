import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useReduced } from "../lib/motion-pref.jsx";
import { arrival, authActions, authConfigured, useAuth } from "../lib/auth.jsx";
import { Link, navigate, safeNext } from "../lib/router.jsx";
import { purchase } from "../lib/billing-client.js";
import { Brand } from "../components/site/SiteNav.jsx";
import { motionTokens } from "../lib/motion-tokens.js";

const copy = {
  login: { title: "Entrar", lead: "Acesse sua conta da Voxelia.", submit: "Entrar" },
  signup: { title: "Criar conta", lead: "Só e-mail e senha. Os dados de pagamento ficam no ambiente da Cakto ou, para compras anteriores, do Asaas.", submit: "Criar conta" },
  recover: { title: "Recuperar senha", lead: "Enviaremos um link para você criar uma nova senha.", submit: "Enviar link" },
  reset: { title: "Nova senha", lead: "Defina a nova senha da sua conta.", submit: "Salvar nova senha" },
  invite: { title: "Crie sua senha", lead: "Seu acesso à Voxelia está pronto. Escolha uma senha para entrar agora e nas próximas vezes.", submit: "Criar senha e entrar" },
  renew: { title: "Peça um link novo", lead: "Este link de senha expirou ou já foi usado. Informe o seu e-mail e enviamos outro.", submit: "Enviar novo link" },
};

// Login, cadastro, recuperação e redefinição de senha (Supabase Auth).
// Links de e-mail com `token_hash` só são verificados quando a pessoa envia a senha (ou confirma o e-mail
// com um clique): prévias do WhatsApp e robôs de e-mail abrem o link sem gastar o uso único.
export default function AuthPage({ mode, account, onAuthenticated }) {
  const reduced = useReduced();
  const { user, loading: authLoading, setInvited, setRecovery } = useAuth();
  const setsPassword = mode === "reset" || mode === "invite";
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next"));
  const plan = params.get("edicao");
  const tokenHash = params.get("token_hash") || "";
  const linkType = params.get("type") || "";
  const confirmsEmail = mode === "login" && Boolean(tokenHash) && ["email", "signup", "email_change"].includes(linkType);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  // Link vencido ou já usado: o Supabase volta com o erro no endereço, ou a verificação falha no envio.
  const [expired, setExpired] = useState(() => setsPassword && arrival.path === location.pathname && Boolean(arrival.error));
  // Página de senha sem token e sem sessão também não tem como salvar: pede um link novo pelo e-mail.
  const asksNewLink = setsPassword && authConfigured && !authLoading && (expired || (!tokenHash && !user));
  const action = asksNewLink ? "recover" : mode;
  const text = asksNewLink ? copy.renew : copy[mode];
  // Links entre as telas levam o destino e o plano, nunca o token do e-mail.
  const carried = new URLSearchParams(location.search);
  carried.delete("token_hash"); carried.delete("type");
  const query = carried.toString() ? `?${carried}` : "";

  // Já autenticado: segue para o plano escolhido ou para o destino pedido.
  useEffect(() => {
    if (!user || setsPassword || !account) return;
    if (plan && !account.access) purchase(plan, { signedIn: true }).catch((cause) => setError(cause.message));
    else onAuthenticated(next);
  }, [user, account, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setDone("");
    try {
      if (action === "login") await authActions.signIn(email, password);
      else if (action === "signup") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        const data = await authActions.signUp(email, password, next);
        if (!data.session) setDone("Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre.");
      } else if (action === "recover") { await authActions.recover(email); setDone("Se houver uma conta com este e-mail, enviamos o link. Abra assim que chegar: ele vale por tempo limitado."); }
      else if (setsPassword) {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (tokenHash) {
          try { await authActions.verifyLink(tokenHash, linkType === "invite" ? "invite" : "recovery"); }
          catch { setExpired(true); return; } // a tela passa a pedir um link novo
          history.replaceState(null, "", location.pathname); // o link já foi usado
        }
        await authActions.updatePassword(password); setDone("Senha salva."); setInvited(false); setRecovery(false); navigate("/app");
      }
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  // Confirmação de cadastro pelo link do e-mail: um clique abre a sessão e segue para o destino.
  const confirmEmail = async () => {
    setBusy(true); setError(""); setDone("");
    try { await authActions.verifyLink(tokenHash, linkType); setDone("E-mail confirmado."); }
    catch (cause) { setError(cause.message); }
    finally { history.replaceState(null, "", location.pathname); setBusy(false); }
  };

  return <main id="conteudo" className="auth-view">
    <motion.div className="auth-card" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
      <Brand/>
      <h1>{text.title}</h1>
      <p className="auth-lead">{plan && action !== "recover" ? "Entre ou crie sua conta para continuar a compra." : text.lead}</p>
      {!authConfigured && <p className="form-error" role="alert">Login indisponível neste ambiente: o Supabase ainda não foi configurado (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).</p>}
      {confirmsEmail && <button type="button" className="btn btn-primary auth-submit" onClick={confirmEmail} disabled={busy || !authConfigured}>{busy ? "Aguarde…" : "Confirmar meu e-mail e entrar"}</button>}
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {(!setsPassword || asksNewLink) && <label className="auth-field">E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label>}
        {action !== "recover" && <label className="auth-field">{setsPassword ? "Nova senha" : "Senha"}<input type="password" autoComplete={action === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)}/></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="form-ok" role="status">{done}</p>}
        {!confirmsEmail && <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !authConfigured} aria-busy={busy}>{busy ? "Aguarde…" : text.submit}</button>}
        {confirmsEmail && <button type="submit" className="btn btn-ghost auth-submit" disabled={busy || !authConfigured}>Entrar com e-mail e senha</button>}
      </form>
      <div className="auth-links">
        {mode === "login" && <><Link to={`/cadastro${query}`}>Criar conta</Link><Link to={`/recuperar-senha${query}`}>Esqueci a senha</Link></>}
        {mode === "signup" && <Link to={`/entrar${query}`}>Já tenho conta</Link>}
        {(mode === "recover" || setsPassword) && <Link to="/entrar">Voltar ao login</Link>}
        <Link to="/">← Voltar ao início</Link>
      </div>
    </motion.div>
  </main>;
}
