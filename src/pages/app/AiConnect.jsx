import { useState } from "react";
import { apiFetch } from "../../lib/auth.jsx";

// Link de conexão MCP: o Claude, o ChatGPT e outros agentes passam a consultar a Voxelia no próprio chat.
export default function AiConnect({ until }) {
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
  const geminiCli = `gemini mcp add --transport http voxelia ${url}`;

  return <section className="panel ai-connect">
    <h2>Use a Voxelia dentro do Claude e do ChatGPT</h2>
    <p>Conecte uma vez e peça no próprio chat: “qual skill uso para criar uma landing page?”. A IA consulta o acervo da Voxelia e traz o passo a passo, com fonte e autor. Incluído no seu Voxelia Pro{until ? ` até ${new Date(until).toLocaleDateString("pt-BR")}` : ""}.</p>
    {!url ? <button type="button" className="btn btn-primary" onClick={() => load(false)} disabled={busy}>{busy ? "Gerando…" : "Gerar meu link de conexão"}</button> : <div className="stack">
      <label htmlFor="mcp-url">Seu link pessoal <span className="muted small">(não compartilhe: ele dá acesso à sua licença)</span></label>
      <div className="row"><input id="mcp-url" className="input" readOnly value={url} onFocus={(e) => e.target.select()}/><button type="button" className="btn btn-ghost" onClick={() => copy(url, "link")}>{copied === "link" ? "Copiado!" : "Copiar"}</button></div>
      <div className="ai-connection-options">
        <section><h3>Claude no navegador ou aplicativo</h3><ol className="ai-steps"><li>Abra <b>Personalizar → Conectores</b> na sua conta Claude.</li><li>Clique em <b>+</b> ao lado de Conectores e escolha <b>Adicionar conector personalizado</b>.</li><li>Nomeie como <b>Voxelia</b>, cole seu link pessoal e confirme. Se perguntar sobre autenticação, escolha <b>sem login</b>.</li></ol></section>
        <section><h3>ChatGPT</h3><p>O aplicativo do ChatGPT para computador não oferece a criação desse conector. A OpenAI disponibiliza a conexão MCP personalizada no <b>ChatGPT pela web</b>, para contas Business ou Enterprise/Edu com permissão do administrador. Se você usa um plano pessoal ou não vê “Plugins”, essa opção não estará disponível na sua conta.</p><p>Em um workspace compatível, abra o ChatGPT no navegador e vá a <b>Plugins → + → Adicionar servidor MCP personalizado</b>. Cole seu link como endereço HTTPS do servidor.</p></section>
        <section><h3>Gemini</h3><p>No Brasil, o aplicativo e o site do Gemini ainda não oferecem a conexão de apps MCP personalizados; a opção do Google está limitada aos Estados Unidos e ao inglês. Para usar a Voxelia com Gemini no computador, instale o <b>Gemini CLI</b> e rode no terminal:</p><p><code>{geminiCli}</code> <button type="button" className="link small" onClick={() => copy(geminiCli, "gemini")}>{copied === "gemini" ? "copiado" : "copiar comando"}</button></p></section>
        <section><h3>Claude Code</h3><p>No terminal, rode <code>{cli}</code> <button type="button" className="link small" onClick={() => copy(cli, "cli")}>{copied === "cli" ? "copiado" : "copiar comando"}</button></p></section>
      </div>
      <p className="small muted">Os nomes dos menus podem variar conforme o plano e a versão de cada app. Link vazou? <button type="button" className="link small" onClick={() => load(true)} disabled={busy}>Gerar um novo</button></p>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}
