import { useState } from "react";
import { apiFetch } from "../../lib/auth.jsx";
import { useT } from "../../i18n/index.js";

// Link de conexão MCP: o Claude, o ChatGPT e outros agentes passam a consultar a Voxelia no próprio chat.
export default function AiConnect() {
  const { t } = useT();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = async (rotate = false) => {
    if (rotate && !window.confirm(t("app.ai.confirm"))) return;
    setBusy(true); setError("");
    try { setUrl((await apiFetch(rotate ? "/api/account/mcp/rotate" : "/api/account/mcp", { method: rotate ? "POST" : "GET" })).url); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const copy = async (value, label) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 2500); } catch { /* o texto fica visível para copiar à mão */ }
  };
  const cli = `claude mcp add --transport http voxelia ${url}`;

  return <section className="panel ai-connect">
    <h2>{t("app.ai.title")}</h2>
    <p>{t("app.ai.lead")}</p>
    {!url ? <button type="button" className="btn btn-primary" onClick={() => load(false)} disabled={busy}>{busy ? t("app.ai.generating") : t("app.ai.generate")}</button> : <div className="stack">
      <label htmlFor="mcp-url">{t("app.ai.link")} <span className="muted small">{t("app.ai.linkHint")}</span></label>
      <div className="row"><input id="mcp-url" className="input" readOnly value={url} onFocus={(e) => e.target.select()}/><button type="button" className="btn btn-ghost" onClick={() => copy(url, "link")}>{copied === "link" ? t("app.ai.copied") : t("common.copy")}</button></div>
      <ol className="ai-steps">
        <li><b>Claude</b> {t("app.ai.claude")}</li>
        <li><b>ChatGPT</b>{t("app.ai.chatgpt")}</li>
        <li><b>Claude Code</b>{t("app.ai.code")} <code>{cli}</code> <button type="button" className="link small" onClick={() => copy(cli, "cli")}>{copied === "cli" ? t("app.ai.cmdCopied") : t("app.ai.copyCmd")}</button></li>
      </ol>
      <p className="small muted">{t("app.ai.menus")} <button type="button" className="link small" onClick={() => load(true)} disabled={busy}>{t("app.ai.rotate")}</button></p>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
