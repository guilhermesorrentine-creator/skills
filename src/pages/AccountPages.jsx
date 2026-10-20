import { useEffect, useRef, useState } from "react";
import { authActions } from "../lib/auth.jsx";
import { Link, navigate } from "../lib/router.jsx";
import { formatPrice, purchase } from "../lib/billing-client.js";
import { categoryLabel, typeLabel } from "../lib/resources.js";
import { Brand } from "../components/site/SiteNav.jsx";

function Shell({ title, eyebrow, children, signedIn = true }) {
  return <main id="conteudo" className="simple">
    <div className="simple-wrap">
      <nav className="simple-nav" aria-label="Conta"><Brand/>{signedIn && <span className="row"><Link className="link" to="/app">Biblioteca</Link><button type="button" className="link" onClick={async () => { await authActions.signOut(); navigate("/"); }}>Sair</button></span>}</nav>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </div>
  </main>;
}

// Retorno do Asaas: nunca libera acesso pela URL; consulta o servidor até a confirmação chegar.
export function CheckoutReturnPage({ account, reload }) {
  const result = new URLSearchParams(location.search).get("resultado");
  const [tries, setTries] = useState(0);
  const timer = useRef(0);
  const confirmed = account?.access;
  useEffect(() => {
    if (confirmed || result !== "sucesso" || tries >= 40) return;
    timer.current = window.setTimeout(async () => { await reload(); setTries((v) => v + 1); }, 3000);
    return () => window.clearTimeout(timer.current);
  }, [confirmed, result, tries, reload]);
  return <Shell eyebrow="Pagamento" title={confirmed ? "Pagamento confirmado" : result === "sucesso" ? "Aguardando confirmação do pagamento" : result === "expirado" ? "O link de pagamento expirou" : "Pagamento não concluído"}>
    <div className="panel stack">
      {confirmed && <><p>O Asaas confirmou o pagamento. Seu acesso vitalício está ativo.</p><button type="button" className="btn btn-primary" onClick={() => navigate("/app")}>Abrir a Biblioteca</button></>}
      {!confirmed && result === "sucesso" && <><p className="waiting"><span className="spinner" aria-hidden="true"/> Recebemos seu retorno. O acesso é liberado somente quando o Asaas confirma o pagamento — no Pix costuma ser imediato; no cartão, alguns instantes.</p>
        {tries >= 40 && <p>A confirmação ainda não chegou. Você pode fechar esta página: o acesso será liberado automaticamente quando o pagamento for confirmado.</p>}
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>Verificar agora</button></>}
      {!confirmed && result !== "sucesso" && <><p>Nenhum pagamento foi confirmado. Você pode tentar de novo quando quiser.</p><button type="button" className="btn btn-primary" onClick={() => navigate("/acesso-pendente")}>Voltar à compra</button></>}
    </div>
  </Shell>;
}

// Conta sem licença: mostra pedido pendente ou a oferta da edição à venda.
export function AccessPendingPage({ account, error, reload }) {
  const [editions, setEditions] = useState(null);
  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState("");
  useEffect(() => { fetch("/api/editions").then((r) => (r.ok ? r.json() : { editions: [] })).then((d) => setEditions(d.editions || [])).catch(() => setEditions([])); }, []);
  const edition = editions?.[0];
  const buy = async () => { setBusy(true); setBuyError(""); try { await purchase(edition.code, { signedIn: true }); } catch (e) { setBuyError(e.message); setBusy(false); } };
  return <Shell eyebrow="Acesso" title={account?.pendingOrder ? "Pagamento em andamento" : "Garanta seu acesso vitalício"}>
    {error && <p className="form-error" role="alert">Não foi possível verificar sua conta: {error.message} <button type="button" className="link" onClick={() => reload()}>Tentar de novo</button></p>}
    {account?.license && !account.access && <p className="notice">Situação da licença: {account.license.statusLabel}. Fale com o suporte se precisar.</p>}
    {account?.pendingOrder && <div className="panel stack"><p>Você iniciou um pagamento que ainda não foi confirmado.</p><a className="btn btn-primary" href={account.pendingOrder.url}>Continuar pagamento</a><button type="button" className="btn btn-secondary" onClick={() => reload()}>Já paguei — verificar</button></div>}
    {!account?.pendingOrder && <div className="panel stack">
      {editions == null ? <p className="muted">Carregando…</p> : edition ? <>
        <p className="eyebrow">{edition.name}</p>
        <p className="l-price"><b>{formatPrice(edition.priceCents)}</b><span>pagamento único</span></p>
        <p className="muted">Acesso vitalício à edição adquirida. Sem mensalidade. Pix ou cartão pelo Asaas.</p>
        <button type="button" className="btn btn-primary" onClick={buy} disabled={busy}>{busy ? "Abrindo pagamento…" : "Comprar agora"}</button>
      </> : <p>As vendas ainda não foram abertas. Assim que a edição estiver disponível, você poderá comprar por aqui.</p>}
      {buyError && <p className="form-error" role="alert">{buyError}</p>}
    </div>}
  </Shell>;
}

// Visualização pública de coleção compartilhada: só títulos; não abre conteúdo pago.
export function SharedCollectionPage({ token }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const meta = document.createElement("meta"); meta.name = "robots"; meta.content = "noindex, nofollow"; document.head.append(meta);
    fetch(`/api/shared?token=${encodeURIComponent(token)}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message); setState({ data: d }); }).catch((e) => setState({ error: e }));
    return () => meta.remove();
  }, [token]);
  return <Shell eyebrow="Coleção compartilhada" title={state.data?.name || (state.error ? "Link indisponível" : "Carregando…")} signedIn={false}>
    {state.error && <p className="muted">{state.error.message}</p>}
    {state.data && <>{state.data.description && <p className="muted">{state.data.description}</p>}
      <ol className="col-items">{state.data.items.map((item) => <li key={item.id} className="col-item"><div className="col-item-main"><b>{item.title}</b><span className="muted small">{typeLabel[item.type]} · {categoryLabel[item.category]}</span></div></li>)}</ol>
      <p className="small muted">Para abrir os recursos é preciso ter acesso à Biblioteca Total. <Link className="link" to="/">Conheça</Link></p></>}
  </Shell>;
}

const legal = {
  termos: { title: "Termos de uso", sections: ["Objeto do serviço e descrição da plataforma", "Cadastro e responsabilidades do usuário", "Licença vitalícia por edição: alcance e limites", "Conteúdo de terceiros e licenças dos repositórios indexados", "Disponibilidade, manutenção e suporte", "Limitação de responsabilidade", "Foro e legislação aplicável"] },
  privacidade: { title: "Política de privacidade", sections: ["Dados coletados (e-mail, favoritos, histórico, coleções, dados de pagamento recebidos do Asaas)", "Finalidade e base legal (LGPD)", "Operadores (Supabase, Asaas, Vercel)", "Compartilhamento opcional de coleções", "Direitos do titular e canal de contato", "Retenção e exclusão"] },
  "compra-e-reembolso": { title: "Compra e reembolso", sections: ["Preço, pagamento único e meios de pagamento", "Liberação do acesso após confirmação", "Upgrades opcionais e cálculo da diferença", "Direito de arrependimento (CDC) e reembolsos", "Contestações e estornos", "Contato para cobrança"] },
};

// Documentos jurídicos: estrutura preparada, sem texto fictício.
export function LegalPage({ slug }) {
  const doc = legal[slug];
  return <Shell eyebrow="Documento" title={doc.title} signedIn={false}>
    <p className="notice" role="note">Documento pendente de aprovação do proprietário. O texto final ainda não foi redigido e esta página não tem valor jurídico.</p>
    <ol className="legal-outline">{doc.sections.map((s) => <li key={s}>{s}</li>)}</ol>
    <Link className="link" to="/">← Voltar ao início</Link>
  </Shell>;
}

export function NotFound({ inApp = false }) {
  const body = <div className="empty"><h3>Página não encontrada.</h3><p>O endereço não existe nesta versão.</p><Link className="btn btn-secondary btn-sm" to={inApp ? "/app" : "/"}>Voltar</Link></div>;
  return inApp ? <div className="page">{body}</div> : <Shell title="Página não encontrada" signedIn={false}>{body}</Shell>;
}
