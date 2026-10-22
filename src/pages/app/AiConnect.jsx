import { useState } from "react";
import { apiFetch } from "../../lib/auth.jsx";

// Link de conexão MCP: o Claude, o ChatGPT e outros agentes passam a consultar a Voxelia no próprio chat.
export default function AiConnect() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = async (rotate = false) => {
    if (rotate && !window.confirm("Gerar um novo link? O link atual para de funcionar e será preciso colar o novo nas IAs conectadas.")) return;
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
    <h2>Use a Voxelia dentro do Claude e do ChatGPT</h2>
    <p>Conecte uma vez e peça no próprio chat: “qual skill uso para criar uma landing page?”. A IA consulta o acervo da Voxelia e traz o passo a passo, com fonte e autor. Incluído na sua licença.</p>
    {!url ? <button type="button" className="btn btn-primary" onClick={() => load(false)} disabled={busy}>{busy ? "Gerando…" : "Gerar meu link de conexão"}</button> : <div className="stack">
      <label htmlFor="mcp-url">Seu link pessoal <span className="muted small">(não compartilhe: ele dá acesso à sua licença)</span></label>
      <div className="row"><input id="mcp-url" className="input" readOnly value={url} onFocus={(e) => e.target.select()}/><button type="button" className="btn btn-ghost" onClick={() => copy(url, "link")}>{copied === "link" ? "Copiado!" : "Copiar"}</button></div>
      <ol className="ai-steps">
        <li><b>Claude</b> (claude.ai ou app): Configurações → Conectores → Adicionar conector personalizado → cole o link.</li>
        <li><b>ChatGPT</b>: Configurações → Apps e conectores → modo desenvolvedor → Criar → cole o link (sem autenticação).</li>
        <li><b>Claude Code</b>: rode no terminal <code>{cli}</code> <button type="button" className="link small" onClick={() => copy(cli, "cli")}>{copied === "cli" ? "copiado" : "copiar comando"}</button></li>
      </ol>
      <p className="small muted">Os nomes dos menus podem variar conforme o plano e a versão de cada app. Link vazou? <button type="button" className="link small" onClick={() => load(true)} disabled={busy}>Gerar um novo</button></p>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
