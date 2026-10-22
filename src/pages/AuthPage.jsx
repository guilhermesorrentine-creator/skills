import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useReduced } from "../lib/motion-pref.jsx";
import { authActions, authConfigured, useAuth } from "../lib/auth.jsx";
import { Link, navigate, safeNext } from "../lib/router.jsx";
import { purchase } from "../lib/billing-client.js";
import { Brand } from "../components/site/SiteNav.jsx";
import { motionTokens } from "../lib/motion-tokens.js";
import { useT } from "../i18n/index.js";
import LanguageSelect from "../components/site/LanguageSelect.jsx";

// Login, cadastro, recuperação e redefinição de senha (Supabase Auth).
export default function AuthPage({ mode, account, onAuthenticated }) {
  const reduced = useReduced();
  const { t } = useT();
  const { user, loading: authLoading, setInvited, setRecovery } = useAuth();
  const setsPassword = mode === "reset" || mode === "invite";
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next"));
  const plan = params.get("edicao");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const text = t(`auth.${mode}`);
  const query = location.search;

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
      if (mode === "login") await authActions.signIn(email, password);
      else if (mode === "signup") {
        if (password.length < 8) throw new Error(t("auth.errors.short"));
        const data = await authActions.signUp(email, password);
        if (!data.session) setDone(t("auth.created"));
      } else if (mode === "recover") { await authActions.recover(email); setDone(t("auth.recoverSent")); }
      else if (setsPassword) {
        if (password.length < 8) throw new Error(t("auth.errors.short"));
        await authActions.updatePassword(password); setDone(t("auth.saved")); setInvited(false); setRecovery(false); navigate("/app");
      }
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  return <main id="conteudo" className="auth-view">
    <motion.div className="auth-card" initial={reduced ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}>
      <Brand/>
            <h1>{text.title}</h1>
      <p className="auth-lead">{plan && mode !== "recover" ? t("auth.continuePurchase") : text.lead}</p>
      {mode === "invite" && authConfigured && !authLoading && !user && <p className="form-error" role="alert">{t("auth.inviteExpired")} <Link to="/recuperar-senha">{t("auth.forgot")}</Link> {t("auth.inviteExpiredEnd")}</p>}
      {!authConfigured && <p className="form-error" role="alert">{t("auth.notConfigured")}</p>}
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {!setsPassword && <label className="auth-field">{t("auth.email")}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label>}
        {mode !== "recover" && <label className="auth-field">{setsPassword ? t("auth.newPassword") : t("auth.password")}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)}/></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {done && <p className="form-ok" role="status">{done}</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={busy || !authConfigured} aria-busy={busy}>{busy ? t("auth.wait") : text.submit}</button>
      </form>
      <div className="auth-links">
        {mode === "login" && <><Link to={`/cadastro${query}`}>{t("common.signup")}</Link><Link to={`/recuperar-senha${query}`}>{t("auth.forgot")}</Link></>}
        {mode === "signup" && <Link to={`/entrar${query}`}>{t("auth.haveAccount")}</Link>}
        {(mode === "recover" || setsPassword) && <Link to="/entrar">{t("auth.backToLogin")}</Link>}
        <Link to="/">{t("common.backHome")}</Link>
      </div>
      <LanguageSelect className="auth-lang"/>
    </motion.div>
  </main>;
}
